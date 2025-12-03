import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

/**
 * Supabase から特定の実験データを取得
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const experimentId = searchParams.get('experimentId');
        const participantId = searchParams.get('participantId');
        const conditionType = searchParams.get('conditionType');

        if (!experimentId || !participantId || !conditionType) {
            return NextResponse.json(
                { message: '必須パラメータが不足しています' },
                { status: 400 }
            );
        }

        const supabase = getAdminClient();

        // 実験データを取得
        const { data: experiment, error: expError } = await supabase
            .from('experiments')
            .select(`
                *,
                blocks (
                    *,
                    trials (*)
                )
            `)
            .eq('id', experimentId)
            .eq('participant_id', participantId)
            .eq('condition_type', conditionType)
            .single();

        if (expError && expError.code !== 'PGRST116') {
            // PGRST116 = no rows found（正常）
            console.error('実験取得エラー:', expError);
            return NextResponse.json(
                { message: '実験データの取得に失敗しました' },
                { status: 500 }
            );
        }

        if (!experiment) {
            // データが見つからない場合は null を返す
            return NextResponse.json(
                { experiment: null },
                { status: 200 }
            );
        }

        // ブロック・試行データを型に合わせて変換
        const blocks = (experiment.blocks || []).map((block: any) => ({
            id: block.id,
            blockNumber: block.block_number,
            experimentId: block.experiment_id,
            trials: (block.trials || []).map((trial: any) => ({
                id: trial.trial_number,
                blockId: trial.block_id,
                stimulus: {
                    word: trial.word,
                    inkColor: trial.ink_color,
                    correctAnswer: trial.chosen_answer,
                    isCongruent: trial.is_congruent,
                    category: trial.word_type,
                },
                responseKey: trial.response_key,
                chosenAnswer: trial.chosen_answer,
                isCorrect: trial.is_correct,
                reactionTime: trial.reaction_time,
                timestamp: trial.timestamp,
            })),
            accuracy: block.accuracy,
            averageRT: block.average_rt,
            averageRTCorrectOnly: block.average_rt_correct_only,
            completedAt: block.completed_at,
            feedbackShown: block.feedback_shown,
        }));

        return NextResponse.json(
            {
                experiment: {
                    id: experiment.id,
                    blocks,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('エラー:', error);
        return NextResponse.json(
            { message: error instanceof Error ? error.message : 'エラーが発生しました' },
            { status: 500 }
        );
    }
}
