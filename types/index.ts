export * from './experiment';

// 実験状態管理用の型
export type ExperimentState =
    | 'language-selection'
    | 'consent'
    | 'survey'
    | 'instructions'
    | 'practice'
    | 'experiment'
    | 'break'
    | 'feedback'
    | 'completed'
    | 'error';

// UI状態管理用の型
export interface AppState {
    currentState: ExperimentState;
    participantId: string | null;
    conditionType: 'static' | 'personalized' | null;
    currentExperiment: string | null; // 実験ID
    currentBlock: number;
    currentTrial: number;
    isLoading: boolean;
    error: string | null;
}

// ローカルストレージ保存用の型
export interface StoredExperimentData {
    experiment: import('./experiment').Experiment;
    lastSaved: Date;
    syncStatus: 'pending' | 'synced' | 'failed';
}

// エラー型
export interface ExperimentError {
    type: 'network' | 'storage' | 'validation' | 'unknown';
    message: string;
    timestamp: Date;
    context?: Record<string, unknown>;
}
