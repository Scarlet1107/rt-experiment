import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
    Experiment,
    BlockResult,
    Trial,
    StoredExperimentData,
    TonePreference,
    MotivationStyle,
    EvaluationFocus,
} from '../../types';

// IndexedDBのスキーマ定義
interface ExperimentDB extends DBSchema {
    experiments: {
        key: string;
        value: StoredExperimentData;
        indexes: {
            'by-participant': string;
            'by-condition': string;
            'by-sync-status': string;
        };
    };
    participants: {
        key: string;
        value: {
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
            createdAt: Date;
        };
    };
}

const DB_NAME = 'rt-experiment-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<ExperimentDB> | null = null;

/**
 * データベースを初期化
 */
export async function initDB(): Promise<IDBPDatabase<ExperimentDB>> {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB<ExperimentDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // 実験データストア
            if (!db.objectStoreNames.contains('experiments')) {
                const experimentStore = db.createObjectStore('experiments', {
                    keyPath: 'experiment.id'
                });
                experimentStore.createIndex('by-participant', 'experiment.participantId');
                experimentStore.createIndex('by-condition', 'experiment.conditionType');
                experimentStore.createIndex('by-sync-status', 'syncStatus');
            }

            // 参加者データストア
            if (!db.objectStoreNames.contains('participants')) {
                db.createObjectStore('participants', {
                    keyPath: 'id'
                });
            }
        },
    });

    return dbInstance;
}

/**
 * 実験データを保存
 */
export async function saveExperiment(experiment: Experiment): Promise<void> {
    const db = await initDB();

    const storedData: StoredExperimentData = {
        experiment,
        lastSaved: new Date(),
        syncStatus: 'pending'
    };

    await db.put('experiments', storedData);
}

/**
 * 実験データを取得
 */
export async function getExperiment(experimentId: string): Promise<StoredExperimentData | null> {
    const db = await initDB();
    return (await db.get('experiments', experimentId)) || null;
}

/**
 * 参加者の全実験データを取得
 */
export async function getExperimentsByParticipant(participantId: string): Promise<StoredExperimentData[]> {
    const db = await initDB();
    return await db.getAllFromIndex('experiments', 'by-participant', participantId);
}

/**
 * 同期待ちの実験データを取得
 */
export async function getPendingSyncExperiments(): Promise<StoredExperimentData[]> {
    const db = await initDB();
    return await db.getAllFromIndex('experiments', 'by-sync-status', 'pending');
}

/**
 * 実験データの同期状態を更新
 */
export async function updateSyncStatus(
    experimentId: string,
    status: 'pending' | 'synced' | 'failed'
): Promise<void> {
    const db = await initDB();
    const data = await db.get('experiments', experimentId);

    if (data) {
        data.syncStatus = status;
        data.lastSaved = new Date();
        await db.put('experiments', data);
    }
}

/**
 * ブロック結果を保存（部分更新）
 */
export async function saveBlockResult(
    experimentId: string,
    blockResult: BlockResult
): Promise<void> {
    const db = await initDB();
    const data = await db.get('experiments', experimentId);

    if (data) {
        // 既存のブロックがあれば更新、なければ追加
        const blockIndex = data.experiment.blocks.findIndex(
            b => b.blockNumber === blockResult.blockNumber
        );

        if (blockIndex >= 0) {
            data.experiment.blocks[blockIndex] = blockResult;
        } else {
            data.experiment.blocks.push(blockResult);
        }

        data.lastSaved = new Date();
        data.syncStatus = 'pending'; // 再同期が必要

        await db.put('experiments', data);
    }
}

/**
 * 試行結果を保存（リアルタイム更新）
 */
export async function saveTrial(
    experimentId: string,
    blockNumber: number,
    trial: Trial
): Promise<void> {
    const db = await initDB();
    const data = await db.get('experiments', experimentId);

    if (data) {
        const block = data.experiment.blocks.find(b => b.blockNumber === blockNumber);
        if (block) {
            // 既存の試行があれば更新、なければ追加
            const trialIndex = block.trials.findIndex(t => t.id === trial.id);
            if (trialIndex >= 0) {
                block.trials[trialIndex] = trial;
            } else {
                block.trials.push(trial);
            }

            data.lastSaved = new Date();
            data.syncStatus = 'pending';

            await db.put('experiments', data);
        }
    }
}

/**
 * 参加者情報を保存
 */
export async function saveParticipant(participant: {
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
    createdAt: Date;
}): Promise<void> {
    const db = await initDB();
    await db.put('participants', participant);
}

/**
 * 参加者情報を取得
 */
export async function getParticipant(participantId: string) {
    const db = await initDB();
    return await db.get('participants', participantId);
}

/**
 * 実験データをJSONとしてエクスポート
 */
export async function exportExperimentData(experimentId: string): Promise<string> {
    const data = await getExperiment(experimentId);
    if (!data) {
        throw new Error(`Experiment ${experimentId} not found`);
    }

    return JSON.stringify(data.experiment, null, 2);
}

/**
 * 全データをクリア（デバッグ用）
 */
export async function clearAllData(): Promise<void> {
    const db = await initDB();
    await db.clear('experiments');
    await db.clear('participants');
}

/**
 * データベースの統計情報を取得
 */
export async function getDBStats() {
    const db = await initDB();

    const experimentCount = await db.count('experiments');
    const participantCount = await db.count('participants');
    const pendingSync = (await getPendingSyncExperiments()).length;

    return {
        experimentCount,
        participantCount,
        pendingSync,
        dbName: DB_NAME,
        dbVersion: DB_VERSION
    };
}
