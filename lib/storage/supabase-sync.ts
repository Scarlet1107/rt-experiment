import { supabase } from '../../utils/supabase/client';
import { v5 as uuidv5 } from 'uuid';
import {
    ParticipantRow,
    ExperimentRow,
    BlockRow,
    TrialRow,
    TonePreference,
    MotivationStyle,
    EvaluationFocus
} from '../../types';
import {
    getExperiment,
    updateSyncStatus,
    getPendingSyncExperiments
} from './indexeddb';

const TRIAL_UUID_NAMESPACE = 'f5f0f5c2-4c70-4c4d-8de5-e6a0c97c7c1f';

/**
 * 実験データをSupabaseに同期
 */
export async function syncExperimentToSupabase(experimentId: string): Promise<boolean> {
    try {
        console.log('=== Supabase同期開始 ===');
        console.log('実験ID:', experimentId);

        const storedData = await getExperiment(experimentId);
        if (!storedData) {
            throw new Error(`Experiment ${experimentId} not found in local storage`);
        }

        const experiment = storedData.experiment;

        // デバッグログ: 実験データの詳細
        console.log('同期対象実験データ:', {
            experimentId: experiment.id,
            participantId: experiment.participantId,
            conditionType: experiment.conditionType,
            blocksCount: experiment.blocks.length,
            totalTrialsInAllBlocks: experiment.blocks.reduce((sum, block) => sum + block.trials.length, 0)
        });

        // ブロック別の詳細ログ
        experiment.blocks.forEach((block, index) => {
            console.log(`ブロック ${index + 1} (ID: ${block.id}):`, {
                blockNumber: block.blockNumber,
                trialsCount: block.trials.length,
                accuracy: block.accuracy,
                averageRT: block.averageRT,
                averageRTCorrectOnly: block.averageRTCorrectOnly
            });
        });

        // 1. 実験レコードを保存/更新
        const experimentRow: Omit<ExperimentRow, 'created_at'> = {
            id: experiment.id,
            participant_id: experiment.participantId,
            condition_type: experiment.conditionType,
            session_number: experiment.sessionNumber,
            started_at: experiment.startedAt.toISOString(),
            completed_at: experiment.completedAt?.toISOString(),
            total_trials: experiment.blocks.reduce((sum, block) => sum + block.trials.length, 0),
            overall_accuracy: experiment.overallAccuracy,
            overall_avg_rt: experiment.overallAverageRT,
            overall_avg_rt_correct_only: experiment.overallAverageRTCorrectOnly,
        };

        console.log('実験テーブルに保存するデータ:', experimentRow);

        const { error: expError } = await supabase
            .from('experiments')
            .upsert(experimentRow);

        if (expError) {
            console.error('実験テーブル保存エラー:', expError);
            throw expError;
        }


        console.log('✅ 実験テーブル保存完了');

        // 2. ブロックデータを保存
        console.log('\n=== ブロックデータ同期開始 ===');
        for (const [blockIndex, block] of experiment.blocks.entries()) {
            console.log(`\n--- ブロック ${blockIndex + 1} / ${experiment.blocks.length} の処理開始 ---`);

            const blockRow: Omit<BlockRow, 'created_at'> = {
                id: block.id,
                experiment_id: experiment.id,
                block_number: block.blockNumber,
                trial_count: block.trials.length,
                accuracy: block.accuracy,
                average_rt: block.averageRT,
                average_rt_correct_only: block.averageRTCorrectOnly,
                feedback_shown: block.feedbackShown,
                completed_at: block.completedAt.toISOString(),
            };

            console.log(`ブロックテーブルに保存するデータ (ID: ${block.id}):`, {
                blockNumber: blockRow.block_number,
                trialCount: blockRow.trial_count,
                accuracy: blockRow.accuracy,
                averageRT: blockRow.average_rt,
                averageRTCorrectOnly: blockRow.average_rt_correct_only
            });

            const { error: blockError } = await supabase
                .from('blocks')
                .upsert(blockRow);

            if (blockError) {
                console.error(`❌ ブロック ${blockIndex + 1} 保存エラー:`, {
                    blockId: block.id,
                    blockNumber: block.blockNumber,
                    error: blockError
                });
                throw blockError;
            }

            console.log(`✅ ブロック ${blockIndex + 1} 保存完了`);

            // 3. 試行データを保存
            console.log(`\n--- ブロック ${blockIndex + 1} の試行データ同期開始 ---`);
            console.log(`保存予定試行数: ${block.trials.length}`);

            for (const [trialIndex, trial] of block.trials.entries()) {
                console.log(`試行 ${trialIndex + 1}/${block.trials.length} 処理開始 (ID: ${trial.id})`);

                const trialRow: Omit<TrialRow, 'created_at'> = {
                    id: `${trial.blockId}-${trial.id}`,
                    block_id: trial.blockId,
                    trial_number: trial.id,
                    word: trial.stimulus.word,
                    word_type: trial.stimulus.category,
                    ink_color: trial.stimulus.inkColor,
                    is_congruent: trial.stimulus.isCongruent,
                    response_key: trial.responseKey || undefined,
                    chosen_answer: trial.chosenAnswer || undefined,
                    is_correct: trial.isCorrect || undefined,
                    reaction_time: trial.reactionTime || undefined,
                    timestamp: trial.timestamp.toISOString(),
                };

                console.log(`試行データ:`, {
                    trialNumber: trialRow.trial_number,
                    word: trialRow.word,
                    inkColor: trialRow.ink_color,
                    isCorrect: trialRow.is_correct,
                    reactionTime: trialRow.reaction_time
                });

                const { error: trialError } = await supabase
                    .from('trials')
                    .upsert(trialRow);

                if (trialError) {
                    console.error(`❌ 試行 ${trialIndex + 1} 保存エラー:`, {
                        trialId: trial.id,
                        blockId: block.id,
                        trialNumber: trial.id,
                        error: trialError
                    });
                    throw trialError;
                }

                if ((trialIndex + 1) % 10 === 0) {
                    console.log(`✅ ${trialIndex + 1} 試行保存完了`);
                }
            }

            console.log(`✅ ブロック ${blockIndex + 1} の全試行 (${block.trials.length}件) 保存完了`);
        }

        console.log('\n✅ 全ブロック同期完了');

        // 同期完了をマーク
        await updateSyncStatus(experiment.id, 'synced');
        return true;

    } catch (error) {
        console.error('❌ 同期処理全体でエラー:', error);
        await updateSyncStatus(experimentId, 'failed');
        return false;
    }
}

/**
 * 参加者データをSupabaseに保存
 */
export async function saveParticipantToSupabase(participant: {
    id: string;
    name: string;
    studentId: string;
    handedness: string;
    age: number;
    gender: string;
    nickname: string;
    preferredPraise: string;
    tonePreference: TonePreference;
    motivationStyle: MotivationStyle;
    evaluationFocus: EvaluationFocus;
    language: string;
}): Promise<boolean> {
    try {
        const participantRow: Omit<ParticipantRow, 'created_at' | 'updated_at'> & { updated_at?: string } = {
            id: participant.id,
            name: participant.name,
            student_id: participant.studentId,
            handedness: participant.handedness,
            age: participant.age,
            gender: participant.gender,
            nickname: participant.nickname,
            preferred_praise: participant.preferredPraise,
            tone_preference: participant.tonePreference,
            motivation_style: participant.motivationStyle,
            evaluation_focus: participant.evaluationFocus,
            language: participant.language,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('participants')
            .upsert(participantRow);

        if (error) throw error;
        return true;

    } catch (error) {
        console.error('Failed to save participant:', error);
        return false;
    }
}

/**
 * 全ての同期待ちデータを自動同期
 */
export async function autoSyncPendingData(): Promise<{
    success: number;
    failed: number;
    total: number;
}> {
    const pendingExperiments = await getPendingSyncExperiments();
    let success = 0;
    let failed = 0;

    for (const data of pendingExperiments) {
        const result = await syncExperimentToSupabase(data.experiment.id);
        if (result) {
            success++;
        } else {
            failed++;
        }
    }

    return {
        success,
        failed,
        total: pendingExperiments.length
    };
}

/**
 * Supabaseから参加者データを取得
 */
export async function getParticipantFromSupabase(participantId: string) {
    const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('id', participantId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Supabaseから実験データを取得
 */
export async function getExperimentFromSupabase(experimentId: string) {
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
        .single();

    if (expError) throw expError;
    return experiment;
}

/**
 * 参加者の全実験履歴をSupabaseから取得
 */
export async function getParticipantExperimentsFromSupabase(participantId: string) {
    const { data, error } = await supabase
        .from('experiments')
        .select(`
      *,
      blocks (
        *,
        trials (*)
      )
    `)
        .eq('participant_id', participantId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}
