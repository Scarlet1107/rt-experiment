import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { BlockResult, Trial, Experiment } from '@/types';

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error('Supabase credentials are not configured.');
    }

    return createServerClient(url, serviceKey, {
        cookies: {
            getAll() {
                return [];
            },
            setAll() {
                // no-op for API routes
            },
        },
    });
};

interface RestorePayload {
    experimentId: string;
    participantId: string;
    conditionType: 'static' | 'personalized';
    experiment: Array<{
        id: string;
        blockNumber: number;
        experimentId: string;
        trials: Array<{
            id: number;
            blockId: string;
            stimulus: any;
            responseKey: string | null;
            chosenAnswer: string | null;
            isCorrect: boolean | null;
            reactionTime: number | null;
            timestamp: string | Date;
        }>;
        accuracy: number;
        averageRT: number;
        averageRTCorrectOnly: number;
        completedAt: string | Date;
        feedbackShown?: string;
    }>;
}

/**
 * IndexedDB からエクスポートされたデータを Supabase に復元
 * 注意: ParticipantID と ConditionType が完全に一致する場合のみ上書き
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = getAdminClient();
        const payload: RestorePayload = await request.json();

        const { experimentId, participantId, conditionType, experiment: blocks } = payload;

        console.log('データ復元リクエスト受信:', {
            experimentId,
            participantId,
            conditionType,
            blocksCount: blocks.length,
        });

        // バリデーション
        if (!experimentId || !participantId || !conditionType || !blocks) {
            return NextResponse.json(
                { message: '必須フィールドが不足しています' },
                { status: 400 }
            );
        }

        // 既存の実験を確認
        const { data: existingExp, error: fetchError } = await supabase
            .from('experiments')
            .select('*')
            .eq('id', experimentId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 = no rows found
            console.error('実験取得エラー:', fetchError);
            return NextResponse.json(
                { message: '既存データの確認に失敗しました' },
                { status: 500 }
            );
        }

        // ParticipantID と ConditionType が一致するか確認
        if (existingExp) {
            if (
                existingExp.participant_id !== participantId ||
                existingExp.condition_type !== conditionType
            ) {
                return NextResponse.json(
                    {
                        message:
                            'ParticipantID または ConditionType が一致しません。上書きできません。',
                    },
                    { status: 400 }
                );
            }

            // 既存のブロック ID を取得
            const { data: existingBlocks, error: fetchBlocksError } = await supabase
                .from('blocks')
                .select('id')
                .eq('experiment_id', experimentId);

            if (fetchBlocksError) {
                console.error('既存ブロック取得エラー:', fetchBlocksError);
                return NextResponse.json(
                    { message: '既存ブロックデータの確認に失敗しました' },
                    { status: 500 }
                );
            }

            if (existingBlocks && existingBlocks.length > 0) {
                const existingBlockIds = existingBlocks.map(b => b.id);

                // 既存の試行データを削除
                const { error: deleteTrialsError } = await supabase
                    .from('trials')
                    .delete()
                    .in('block_id', existingBlockIds);

                if (deleteTrialsError) {
                    console.error('既存試行削除エラー:', deleteTrialsError);
                    return NextResponse.json(
                        { message: '既存試行データの削除に失敗しました' },
                        { status: 500 }
                    );
                }

                console.log('✅ 既存試行データ削除完了:', existingBlockIds.length, 'ブロックの試行を削除');

                // 既存のブロックデータを削除
                const { error: deleteBlocksError } = await supabase
                    .from('blocks')
                    .delete()
                    .eq('experiment_id', experimentId);

                if (deleteBlocksError) {
                    console.error('既存ブロック削除エラー:', deleteBlocksError);
                    return NextResponse.json(
                        { message: '既存ブロックデータの削除に失敗しました' },
                        { status: 500 }
                    );
                }

                console.log('✅ 既存ブロックデータ削除完了:', existingBlockIds.length, '件');
            }
        }

        // ブロックデータを Supabase に保存
        const blockUpsertData = blocks.map((block) => ({
            id: block.id,
            experiment_id: experimentId,
            block_number: block.blockNumber,
            trial_count: block.trials?.length || 0,
            accuracy: block.accuracy,
            average_rt: block.averageRT,
            average_rt_correct_only: block.averageRTCorrectOnly,
            feedback_shown: block.feedbackShown || null,
            completed_at: typeof block.completedAt === 'string'
                ? block.completedAt
                : (block.completedAt as any).toISOString(),
        }));

        const { error: blockError } = await supabase
            .from('blocks')
            .insert(blockUpsertData);

        if (blockError) {
            console.error('ブロック保存エラー:', blockError);
            return NextResponse.json(
                { message: `ブロックデータの保存に失敗しました: ${blockError.message}` },
                { status: 500 }
            );
        }

        console.log('✅ ブロック保存完了:', blockUpsertData.length, '件');

        // 試行データを Supabase に保存
        const trialUpsertData: any[] = [];
        for (const block of blocks) {
            if (block.trials && block.trials.length > 0) {
                for (const trial of block.trials) {
                    trialUpsertData.push({
                        id: `${block.id}-trial-${trial.id}`,
                        block_id: block.id,
                        trial_number: trial.id,
                        word: trial.stimulus.word,
                        word_type: trial.stimulus.category,
                        ink_color: trial.stimulus.inkColor,
                        is_congruent: trial.stimulus.isCongruent,
                        response_key: trial.responseKey || null,
                        chosen_answer: trial.chosenAnswer || null,
                        is_correct: trial.isCorrect,
                        reaction_time: trial.reactionTime
                            ? Math.round(trial.reactionTime)
                            : null,
                        timestamp: typeof trial.timestamp === 'string'
                            ? trial.timestamp
                            : (trial.timestamp as any).toISOString(),
                    });
                }
            }
        }

        if (trialUpsertData.length > 0) {
            // バッチ処理で試行データを保存
            const batchSize = 100;
            for (let i = 0; i < trialUpsertData.length; i += batchSize) {
                const batch = trialUpsertData.slice(i, i + batchSize);
                console.log(`試行データバッチ処理 (${i + 1}-${Math.min(i + batchSize, trialUpsertData.length)}/${trialUpsertData.length})...`);

                const { error: trialError } = await supabase
                    .from('trials')
                    .insert(batch);

                if (trialError) {
                    console.error('試行保存エラー:', trialError);
                    return NextResponse.json(
                        { message: `試行データの保存に失敗しました (バッチ ${i / batchSize + 1}): ${trialError.message}` },
                        { status: 500 }
                    );
                }
            }
            console.log('✅ 試行保存完了:', trialUpsertData.length, '件');
        }

        return NextResponse.json(
            {
                message: 'データ復元が完了しました',
                restored: {
                    experimentId,
                    blocksCount: blocks.length,
                    trialsCount: trialUpsertData.length,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('❌ データ復元エラー:', error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'データ復元に失敗しました' },
            { status: 500 }
        );
    }
}
