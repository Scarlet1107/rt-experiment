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
        const storedData = await getExperiment(experimentId);
        if (!storedData) {
            throw new Error(`Experiment ${experimentId} not found in local storage`);
        }

        const experiment = storedData.experiment;

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

        const { error: expError } = await supabase
            .from('experiments')
            .upsert(experimentRow);

        if (expError) throw expError;

        // 2. ブロックデータを保存
        for (const block of experiment.blocks) {
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

            const { error: blockError } = await supabase
                .from('blocks')
                .upsert(blockRow);

            if (blockError) throw blockError;

            // 3. 試行データを保存
            for (const trial of block.trials) {
                const trialUuid = uuidv5(`${experiment.id}-${block.id}-${trial.id}`, TRIAL_UUID_NAMESPACE);
                const trialRow: TrialRow = {
                    id: trialUuid,
                    block_id: block.id,
                    trial_number: trial.id,
                    word: trial.stimulus.word,
                    word_type: trial.stimulus.category === 'COLOR_WORD'
                        ? trial.stimulus.word.toUpperCase()
                        : 'NONSENSE',
                    ink_color: trial.stimulus.inkColor,
                    is_congruent: trial.stimulus.isCongruent,
                    response_key: trial.responseKey || undefined,
                    chosen_answer: trial.chosenAnswer || undefined,
                    is_correct: trial.isCorrect || undefined,
                    reaction_time: trial.reactionTime || undefined,
                    timestamp: trial.timestamp.toISOString(),
                };

                const { error: trialError } = await supabase
                    .from('trials')
                    .upsert(trialRow);

                if (trialError) throw trialError;
            }
        }

        // 同期完了をマーク
        await updateSyncStatus(experimentId, 'synced');
        return true;

    } catch (error) {
        console.error('Sync failed:', error);
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
