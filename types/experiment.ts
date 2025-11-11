import { Language } from '../lib/i18n';

// 基本的な色の型定義
export type Color = 'RED' | 'BLUE' | 'GREEN';
export type KeyCode = 'F' | 'J' | 'K' | 'D';
export type WordType = Color | 'NONSENSE';
export type AnswerType = Color | 'OTHER';
export type TonePreference = 'casual' | 'gentle' | 'formal';
export type MotivationStyle = 'empathetic' | 'cheerleader' | 'advisor';
export type EvaluationFocus = 'self-progress' | 'social-comparison' | 'positive-focus';

// Stroop刺激の定義
export interface StroopStimulus {
    word: string;                    // 表示する単語（常に英語）
    inkColor: Color;                 // 文字色
    correctAnswer: AnswerType;       // 正解
    isCongruent: boolean;            // 一致試行かどうか
    category: 'COLOR_WORD' | 'NONSENSE'; // 刺激タイプ
}

// 個別試行の結果
export interface Trial {
    id: number;                      // 試行ID（ブロック内）
    blockId: string;                 // 所属ブロックID
    stimulus: StroopStimulus;        // 提示された刺激
    responseKey: KeyCode | null;     // 押されたキー
    chosenAnswer: AnswerType | null; // 選択された回答
    isCorrect: boolean | null;       // 正誤
    reactionTime: number | null;     // 反応時間（ms）
    timestamp: Date;                 // 試行実施時刻
}

// ブロックの結果
export interface BlockResult {
    id: string;                      // ブロックID
    blockNumber: number;             // ブロック番号（1-8）
    experimentId: string;            // 所属実験ID
    trials: Trial[];                 // ブロック内の全試行
    accuracy: number;                // 正答率（0-100）
    averageRT: number;               // 平均反応時間（正解試行のみ、ms）
    completedAt: Date;               // ブロック完了時刻
    feedbackShown?: string;          // 表示されたフィードバック内容
}

// 実験全体の結果
export interface Experiment {
    id: string;                      // 実験ID
    participantId: string;           // 参加者ID（UUID）
    conditionType: 'static' | 'personalized'; // 実験条件
    sessionNumber: 1 | 2;            // セッション番号
    language: Language;              // 使用言語
    startedAt: Date;                 // 実験開始時刻
    completedAt?: Date;              // 実験完了時刻
    blocks: BlockResult[];           // 全ブロックの結果
    overallAccuracy?: number;        // 全体正答率
    overallAverageRT?: number;       // 全体平均反応時間
    plannedTotalTrials?: number;     // 想定されていた総試行数
    plannedTrialsPerBlock?: number;  // 想定ブロック当たり試行数
    totalTrialsAttempted?: number;   // 実際に行った試行数
}

// 参加者情報
export interface Participant {
    id: string;                      // 参加者ID（UUID）
    nickname: string;                // 呼び名
    preferredPraise: string;         // 好きな褒め方
    tonePreference: TonePreference;  // 口調
    motivationStyle: MotivationStyle; // 励ましタイプ
    evaluationFocus: EvaluationFocus; // 評価重視タイプ
    language: Language;              // 使用言語
    createdAt: Date;                 // 登録日時
    experiments: Experiment[];       // 実施した実験
}

// フィードバックパターン
export type FeedbackScenarioKey =
    | 'rt_short_acc_up_synergy'
    | 'rt_slow_acc_down_fatigue'
    | 'rt_short_acc_same'
    | 'rt_short_acc_down'
    | 'rt_short_acc_up'
    | 'rt_slow_acc_up'
    | 'rt_slow_acc_same'
    | 'rt_slow_acc_down'
    | 'rt_same_acc_up'
    | 'rt_same_acc_down'
    | 'rt_same_acc_same';

export type FeedbackPattern = Record<FeedbackScenarioKey, string[]>;

// 実験設定
export interface ExperimentConfig {
    totalBlocks: number;               // 総ブロック数
    trialsPerBlock: number;            // ブロック当たりの試行数
    totalTrials: number;               // 総試行数
    feedbackCountdownSeconds: number;  // フィードバック表示時間の上限（秒）
    practiceTrialCount: number;        // 練習パートの試行数
    trialTimeLimitMs: number | null;   // 1試行あたりの制限時間（ms、nullの場合は無制限）
    showProgressDebug: boolean;        // 進捗表示のデバッグ用フラグ
    stimulusDisplayTime?: number;      // 刺激表示時間（ms、制限なしの場合null）
    interTrialInterval?: number;       // 試行間間隔（ms）
    feedbackDuration?: number;         // フィードバック表示時間（ms）
}

// データベース用の型（Supabaseテーブル構造）
export interface ParticipantRow {
    id: string;
    name: string | null;
    student_id: string | null;
    handedness: string | null;
    age: number | null;
    gender: string | null;
    nickname: string | null;
    preferred_praise: string | null;
    tone_preference: TonePreference | null;
    motivation_style: MotivationStyle | null;
    evaluation_focus: EvaluationFocus | null;
    language: string | null;
    created_at: string;
    updated_at: string;
}

export interface ExperimentRow {
    id: string;
    participant_id: string;
    condition_type: string;
    session_number: number;
    started_at: string;
    completed_at?: string;
    total_trials: number;
    overall_accuracy?: number;
    overall_avg_rt?: number;
    created_at: string;
}

export interface BlockRow {
    id: string;
    experiment_id: string;
    block_number: number;
    trial_count: number;
    accuracy: number;
    average_rt: number;
    feedback_shown?: string;
    completed_at: string;
    created_at: string;
}

export interface TrialRow {
    id: string;
    block_id: string;
    trial_number: number;
    word: string;
    word_type: string;
    ink_color: string;
    is_congruent: boolean;
    response_key?: string;
    chosen_answer?: string;
    is_correct?: boolean;
    reaction_time?: number;
    timestamp: string;
}
