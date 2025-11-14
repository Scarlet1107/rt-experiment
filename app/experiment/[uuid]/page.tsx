'use client';

import { useState, useEffect, useRef, use, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../../../lib/i18n';
import { generateBlockStimuli } from '../../../lib/experiment/stimuli';
import { saveExperiment, getParticipant, saveParticipant } from '../../../lib/storage/indexeddb';
import { syncExperimentToSupabase, getParticipantFromSupabase } from '../../../lib/storage/supabase-sync';
import { generateStaticFeedback, calculatePerformanceStats } from '../../../lib/experiment/utils';
import {
    getOrGenerateFeedbackPatterns,
    generatePersonalizedBlockFeedback,
    type FeedbackPattern,
    type ParticipantInfo
} from '../../../lib/feedback/personalized';
import { StroopStimulus, KeyCode, AnswerType, Trial, BlockResult, Experiment, TonePreference, MotivationStyle, EvaluationFocus } from '../../../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Play, Brain, Target, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { experimentConfig } from '@/lib/config/experiment';

interface ExperimentContentProps {
    uuid: string;
}

const toParticipantInfo = (participant: any): ParticipantInfo | null => {
    if (!participant) return null;

    return {
        id: participant.id,
        nickname: participant.nickname,
        preferredPraise: participant.preferredPraise,
        tonePreference: participant.tonePreference,
        motivationStyle: participant.motivationStyle,
        evaluationFocus: participant.evaluationFocus,
        language: (participant.language as 'ja' | 'en') || 'ja'
    };
};

const fromLocalStorage = (key: string): ParticipantInfo | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return toParticipantInfo(parsed);
    } catch (error) {
        console.warn('Failed to parse participant data from localStorage:', error);
        return null;
    }
};

const storageKeyForParticipant = (uuid: string) => `participant-${uuid}`;

const persistParticipantInfoLocally = (uuid: string, participant: ParticipantInfo) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(storageKeyForParticipant(uuid), JSON.stringify(participant));
    } catch (error) {
        console.warn('Failed to cache participant info in localStorage:', error);
    }
};

const mapSupabaseParticipantToIndexedDB = (record: any) => ({
    id: record.id,
    name: record.name ?? '',
    studentId: record.student_id ?? '',
    handedness: record.handedness ?? '',
    age: typeof record.age === 'number' ? record.age : 0,
    gender: record.gender ?? '',
    nickname: record.nickname ?? '',
    preferredPraise: record.preferred_praise ?? '',
    tonePreference: (record.tone_preference as TonePreference) || 'gentle',
    motivationStyle: (record.motivation_style as MotivationStyle) || 'empathetic',
    evaluationFocus: (record.evaluation_focus as EvaluationFocus) || 'self-progress',
    language: (record.language as 'ja' | 'en') || 'ja',
    createdAt: record.created_at ? new Date(record.created_at) : new Date(),
});

// 実験の状態管理
type ExperimentState = 'preparation' | 'countdown' | 'running' | 'feedback' | 'completed';

interface CurrentTrial {
    blockId: string;
    trialNumber: number;
    stimulus: StroopStimulus;
    startTime: number;
}

interface TrialResult extends Trial {
    blockId: string;
}

interface ParsedFeedback {
    heading: string;
    stats: { label: string; value: string }[];
    notes: string[];
}

const NEXT_TRIAL_DELAY_MS = 500;
const TRIAL_FEEDBACK_DURATION_MS = NEXT_TRIAL_DELAY_MS;

function ExperimentContent({ uuid }: ExperimentContentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { language } = useLanguage();
    const {
        totalBlocks,
        trialsPerBlock,
        totalTrials,
        feedbackCountdownSeconds,
        trialTimeLimitMs,
        showProgressDebug,
        feedbackButtonDelayMs,
    } = experimentConfig;

    // 実験全体の状態
    const [experimentState, setExperimentState] = useState<ExperimentState>('preparation');
    const [currentBlock, setCurrentBlock] = useState(0); // 1-indexed progress
    const [countdownValue, setCountdownValue] = useState(3);

    // 現在のブロック・試行管理
    const [blockStimuli, setBlockStimuli] = useState<StroopStimulus[]>([]);
    const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
    const [currentTrial, setCurrentTrial] = useState<CurrentTrial | null>(null);

    // 結果データ
    const [blockResults, setBlockResults] = useState<BlockResult[]>([]);
    const [currentBlockTrials, setCurrentBlockTrials] = useState<TrialResult[]>([]);

    useEffect(() => {
        blockResultsRef.current = blockResults;
    }, [blockResults]);

    // currentBlockTrialsRefは各setCurrentBlockTrials内で同期的に更新

    // フィードバック関連
    const [blockFeedback, setBlockFeedback] = useState<string>('');
    const [feedbackCountdown, setFeedbackCountdown] = useState(feedbackCountdownSeconds);
    const [trialFeedback, setTrialFeedback] = useState<'correct' | 'incorrect' | null>(null);

    // パーソナライズドフィードバック用の状態
    const [feedbackPatterns, setFeedbackPatterns] = useState<FeedbackPattern | null>(null);
    const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
    const [conditionType, setConditionType] = useState<'static' | 'personalized'>('static');
    const [isPreparingExperiment, setIsPreparingExperiment] = useState(false);
    const [startStatusMessage, setStartStatusMessage] = useState<string | null>(null);
    const [startError, setStartError] = useState<string | null>(null);
    const [isFeedbackActionAvailable, setIsFeedbackActionAvailable] = useState(false);

    // キー入力管理
    const trialStartRef = useRef<number>(0);
    const hasRespondedRef = useRef(false);
    const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const feedbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const blockResultsRef = useRef<BlockResult[]>([]);
    const isCompletingRef = useRef(false);
    const trialFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const trialTimeoutHandlerRef = useRef<(trial: CurrentTrial) => void>(() => { });
    const feedbackActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prepareTrialInProgressRef = useRef(false); // 重複実行防止フラグ
    const recordTrialInProgressRef = useRef(false); // 試行記録重複防止フラグ
    const currentBlockTrialsRef = useRef<TrialResult[]>([]); // 最新の試行配列を保持

    // キー対応表
    const KEY_TO_ANSWER: Record<KeyCode, AnswerType> = useMemo(() => ({
        'S': 'RED',
        'K': 'GREEN',
        'L': 'BLUE',
        'A': 'OTHER'
    }), []);

    // 色の表示用
    const COLOR_TO_HEX = {
        'RED': '#ef4444',
        'GREEN': '#22c55e',
        'BLUE': '#3b82f6'
    };

    const trialFeedbackText = useMemo(() => (
        language === 'ja'
            ? { correct: '正解', incorrect: '不正解' }
            : { correct: 'Right', incorrect: 'Wrong' }
    ), [language]);

    const parsedBlockFeedback: ParsedFeedback = useMemo(() => {
        if (!blockFeedback) {
            return { heading: '', stats: [], notes: [] };
        }

        const lines = blockFeedback
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);

        if (!lines.length) {
            return { heading: '', stats: [], notes: [] };
        }

        const [heading, ...rest] = lines;
        const stats = rest
            .filter(line => line.includes(':'))
            .map(line => {
                const [label, ...valueParts] = line.split(':');
                return {
                    label: label.trim(),
                    value: valueParts.join(':').trim()
                };
            });

        const notes = rest.filter(line => !line.includes(':'));

        return { heading, stats, notes };
    }, [blockFeedback]);

    // 実験初期化（参加者情報とフィードバックパターンの取得）
    const clearCountdownTimer = useCallback(() => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
    }, []);

    const clearFeedbackTimer = useCallback(() => {
        if (feedbackTimerRef.current) {
            clearInterval(feedbackTimerRef.current);
            feedbackTimerRef.current = null;
        }
    }, []);

    const clearFeedbackActionTimer = useCallback(() => {
        if (feedbackActionTimerRef.current) {
            clearTimeout(feedbackActionTimerRef.current);
            feedbackActionTimerRef.current = null;
        }
    }, []);

    const clearTrialTimeout = useCallback(() => {
        if (trialTimeoutRef.current) {
            clearTimeout(trialTimeoutRef.current);
            trialTimeoutRef.current = null;
        }
    }, []);

    const scheduleTrialTimer = useCallback((onTimeout: () => void) => {
        clearTrialTimeout();
        if (!trialTimeLimitMs) return;
        trialTimeoutRef.current = setTimeout(onTimeout, trialTimeLimitMs);
    }, [trialTimeLimitMs, clearTrialTimeout]);

    const showTrialFeedback = useCallback((status: 'correct' | 'incorrect') => {
        if (trialFeedbackTimerRef.current) {
            clearTimeout(trialFeedbackTimerRef.current);
        }
        setTrialFeedback(status);
        trialFeedbackTimerRef.current = setTimeout(() => {
            setTrialFeedback(null);
        }, TRIAL_FEEDBACK_DURATION_MS);
    }, []);

    // 新しいブロックを開始
    const startNewBlock = useCallback(() => {
        if (experimentState === 'countdown') return;

        const nextBlockNumber = currentBlock + 1;
        if (nextBlockNumber > totalBlocks) {
            return;
        }

        const stimuli = generateBlockStimuli(trialsPerBlock);
        console.log(`📋 ブロック${nextBlockNumber}の刺激生成完了:`, {
            blockNumber: nextBlockNumber,
            trialsPerBlock,
            generatedStimuliCount: stimuli.length,
            stimuli: stimuli.map((s, i) => `${i + 1}: ${s.word}(${s.inkColor})`)
        });
        setBlockStimuli(stimuli);
        setCurrentTrialIndex(0);
        setCurrentBlockTrials([]);
        // refも同期的にリセット
        currentBlockTrialsRef.current = [];
        setCurrentTrial(null);
        setCountdownValue(3);
        setCurrentBlock(nextBlockNumber);
        setExperimentState('countdown');
    }, [experimentState, currentBlock, totalBlocks, trialsPerBlock]);

    const ensureParticipantReady = useCallback(async (): Promise<ParticipantInfo | null> => {
        if (participantInfo) return participantInfo;

        try {
            const participant = await getParticipant(uuid);
            const info = toParticipantInfo(participant);
            if (info) {
                setParticipantInfo(info);
                return info;
            }
        } catch (error) {
            console.error('Failed to load participant from IndexedDB:', error);
        }

        const localInfo = fromLocalStorage(storageKeyForParticipant(uuid));
        if (localInfo) {
            setParticipantInfo(localInfo);
            return localInfo;
        }

        try {
            const remoteRecord = await getParticipantFromSupabase(uuid);
            if (remoteRecord) {
                const normalized = mapSupabaseParticipantToIndexedDB(remoteRecord);
                const info = toParticipantInfo(normalized);

                if (info) {
                    setParticipantInfo(info);
                    persistParticipantInfoLocally(uuid, info);
                    try {
                        await saveParticipant(normalized);
                    } catch (storageError) {
                        console.warn('Failed to persist participant into IndexedDB:', storageError);
                    }
                    return info;
                }
            }
        } catch (error) {
            console.error('Failed to fetch participant from Supabase:', error);
        }

        return null;
    }, [participantInfo, uuid]);

    const handleExperimentStart = useCallback(async () => {
        if (experimentState !== 'preparation' || isPreparingExperiment) return;

        setIsPreparingExperiment(true);
        setStartError(null);
        setStartStatusMessage(
            conditionType === 'personalized'
                ? language === 'ja'
                    ? '参加者情報を読み込んでいます…'
                    : 'Loading participant info…'
                : language === 'ja'
                    ? '実験を準備しています…'
                    : 'Preparing experiment…'
        );

        try {
            let info = participantInfo;
            if (conditionType === 'personalized') {
                if (!info) {
                    info = await ensureParticipantReady();
                }

                if (!info) {
                    setStartStatusMessage(null);
                    setStartError(
                        language === 'ja'
                            ? '参加者情報が見つかりませんでした。プロフィール入力からやり直してください。'
                            : 'We could not locate your participant profile. Please repeat the questionnaire.'
                    );
                    return;
                }

                setStartStatusMessage(language === 'ja' ? '追加の初期設定を行っています…' : 'Finalizing setup…');
                if (!feedbackPatterns) {
                    const patterns = await getOrGenerateFeedbackPatterns(info);
                    setFeedbackPatterns(patterns);
                }
            }

            setStartStatusMessage(language === 'ja' ? '実験をセットアップしています…' : 'Configuring experiment…');
            startNewBlock();
            setStartStatusMessage(null);
        } catch (error) {
            console.error('Failed to prepare experiment start:', error);
            const message =
                conditionType === 'personalized'
                    ? language === 'ja'
                        ? '参加者情報を取得できませんでした。前の画面に戻ってプロフィールを確認してください。'
                        : 'We could not load your participant profile. Please go back and confirm your questionnaire.'
                    : language === 'ja'
                        ? '開始準備中にエラーが発生しました。もう一度お試しください。'
                        : 'Something went wrong while preparing. Please try again.';
            setStartError(message);
        } finally {
            setIsPreparingExperiment(false);
        }
    }, [conditionType, ensureParticipantReady, experimentState, feedbackPatterns, participantInfo, startNewBlock, isPreparingExperiment, language]);

    useEffect(() => {
        const condition = (searchParams.get('condition') as 'static' | 'personalized') || 'static';
        setConditionType(condition);

        const initializeParticipant = async () => {
            try {
                const participant = await getParticipant(uuid);
                const info = toParticipantInfo(participant);
                if (info) {
                    setParticipantInfo(info);
                }
            } catch (error) {
                console.error('Failed to initialize experiment:', error);
                setConditionType('static');
            }
        };

        initializeParticipant();
    }, [uuid, searchParams]);

    // ブロックフィードバック生成
    const resolveBlockFeedback = useCallback(async (result: BlockResult) => {
        const targetLanguage: 'ja' | 'en' = participantInfo?.language || language || 'ja';
        let feedback: string;

        if (conditionType === 'personalized' && feedbackPatterns && participantInfo) {
            // パーソナライズドフィードバック
            const previousResult = blockResults.length > 0 ? blockResults[blockResults.length - 1] : null;

            const currentBlock = {
                blockNumber: result.blockNumber,
                accuracy: result.accuracy,
                averageRT: result.averageRT
            };

            const previousBlock = previousResult ? {
                blockNumber: previousResult.blockNumber,
                accuracy: previousResult.accuracy,
                averageRT: previousResult.averageRT
            } : null;

            feedback = generatePersonalizedBlockFeedback(
                currentBlock,
                previousBlock,
                feedbackPatterns
            );
        } else {
            // 静的フィードバック（機械的な数値情報のみ）
            feedback = generateStaticFeedback(
                result.blockNumber - 1,
                result.accuracy,
                result.averageRT,
                targetLanguage
            );
        }

        return feedback;
    }, [conditionType, feedbackPatterns, participantInfo, blockResults, language]);

    // ブロック完了処理
    const completeBlock = useCallback(async () => {
        // 最新の試行データを使用
        const currentTrials = currentBlockTrialsRef.current;

        // ブロック結果を計算
        const stats = calculatePerformanceStats(currentTrials);
        const accuracy = Math.round(stats.accuracy);
        const avgRTAll = stats.averageRT;
        const avgRTCorrectOnly = stats.averageRTCorrectOnly;

        console.log(`🏁 ブロック${currentBlock}完了処理開始:`, {
            currentTrialsCount: currentTrials.length,
            expectedTrials: trialsPerBlock,
            correctTrials: stats.correctTrials,
            incorrectTrials: stats.incorrectTrials,
            timeoutTrials: stats.timeoutTrials,
            accuracy: stats.accuracy,
            timeoutRate: stats.timeoutRate,
            trials: currentTrials.map(t => ({
                id: t.id,
                stimulus: t.stimulus.word,
                isCorrect: t.isCorrect,
                responseType: t.isCorrect === true ? 'correct' : t.isCorrect === false ? 'incorrect' : 'timeout'
            }))
        });

        const experimentId = `${uuid}-${conditionType}`;
        const blockResult: BlockResult = {
            id: `${experimentId}-block-${currentBlock}`,
            blockNumber: currentBlock,
            experimentId,
            trials: currentTrials,
            accuracy,
            averageRT: avgRTAll,
            averageRTCorrectOnly: avgRTCorrectOnly,
            completedAt: new Date(),
            feedbackShown: '' // フィードバック後に設定
        };

        const feedbackText = await resolveBlockFeedback(blockResult);
        const enrichedResult: BlockResult = { ...blockResult, feedbackShown: feedbackText };

        setBlockResults(prev => {
            const updated = [...prev, enrichedResult];
            blockResultsRef.current = updated;
            return updated;
        });

        setBlockFeedback(feedbackText);
        setExperimentState('feedback');
    }, [conditionType, currentBlock, uuid, resolveBlockFeedback, trialsPerBlock]);

    // 次の試行を準備
    const prepareNextTrial = useCallback(async (stimuli: StroopStimulus[], trialIndex: number, blockNum: number) => {
        // 重複実行防止
        if (prepareTrialInProgressRef.current) {
            console.log(`🚫 prepareNextTrial重複実行をスキップ: ブロック${blockNum}, 試行インデックス${trialIndex}`);
            return;
        }
        prepareTrialInProgressRef.current = true;

        console.log(`🎯 prepareNextTrial呼び出し: ブロック${blockNum}, 試行インデックス${trialIndex}`, {
            trialIndex,
            stimuliLength: stimuli.length,
            willCompleteBlock: trialIndex >= stimuli.length,
            currentBlockTrialsLength: currentBlockTrialsRef.current.length
        });

        if (trialIndex >= stimuli.length) {
            // ブロック完了
            console.log(`🏁 ブロック${blockNum}完了 - completeBlock()呼び出し`, {
                trialIndex,
                stimuliLength: stimuli.length,
                currentBlockTrialsLength: currentBlockTrialsRef.current.length
            });
            prepareTrialInProgressRef.current = false;
            await completeBlock();
            return;
        }

        const stimulus = stimuli[trialIndex];
        const experimentId = `${uuid}-${conditionType}`;
        const trial: CurrentTrial = {
            blockId: `${experimentId}-block-${blockNum}`,
            trialNumber: trialIndex + 1,
            stimulus,
            startTime: 0 // 実際の開始時に設定
        };

        console.log(`▶️ 新しい試行開始: ブロック${blockNum}, 試行${trialIndex + 1}/${stimuli.length}`, {
            stimulus: stimulus.word,
            inkColor: stimulus.inkColor,
            blockId: trial.blockId
        });

        setCurrentTrial(trial);
        hasRespondedRef.current = false;

        // 少し待ってから試行開始
        setTimeout(() => {
            trialStartRef.current = performance.now();
            scheduleTrialTimer(() => {
                trialTimeoutHandlerRef.current?.(trial);
            });
            prepareTrialInProgressRef.current = false; // フラグをリセット
        }, 500);
    }, [completeBlock, scheduleTrialTimer, uuid, conditionType]);

    const handleTrialTimeout = useCallback((timedOutTrial: CurrentTrial) => {
        if (!trialTimeLimitMs || hasRespondedRef.current) return;

        hasRespondedRef.current = true;
        clearTrialTimeout();

        const trialId = currentTrialIndex + 1; // currentTrialIndexを基準に設定
        console.log(`⏰ タイムアウト試行記録: ブロック${currentBlock}, 試行${trialId}/${trialsPerBlock}`, {
            currentTrialIndex,
            currentBlockTrialsLength: currentBlockTrialsRef.current.length,
            trialId,
            blockId: timedOutTrial.blockId,
            stimulus: timedOutTrial.stimulus.word
        });

        const trialResult: TrialResult = {
            id: trialId,
            blockId: timedOutTrial.blockId,
            stimulus: timedOutTrial.stimulus,
            responseKey: null,
            chosenAnswer: null,
            isCorrect: null, // タイムアウト時はnull
            reactionTime: trialTimeLimitMs,
            timestamp: new Date(),
        };

        setCurrentBlockTrials(prev => {
            const updated = [...prev, trialResult];
            // 同期的にrefも更新（タイムアウト時も確実に）
            currentBlockTrialsRef.current = updated;
            console.log(`📊 ブロック${currentBlock}の試行配列更新（タイムアウト）:`, {
                beforeLength: prev.length,
                afterLength: updated.length,
                newTrialId: trialResult.id,
                refUpdated: currentBlockTrialsRef.current.length
            });
            return updated;
        });
        showTrialFeedback('incorrect');

        setTimeout(async () => {
            const nextIndex = currentTrialIndex + 1;
            console.log(`⏭️ 次の試行準備（タイムアウト後）: インデックス${nextIndex} (ブロック${currentBlock})`, {
                currentTrialIndex,
                nextIndex,
                stimuliLength: blockStimuli.length,
                willCompleteBlock: nextIndex >= blockStimuli.length
            });
            setCurrentTrialIndex(nextIndex);
            await prepareNextTrial(blockStimuli, nextIndex, currentBlock);
        }, NEXT_TRIAL_DELAY_MS);
    }, [trialTimeLimitMs, clearTrialTimeout, showTrialFeedback, currentTrialIndex, blockStimuli, currentBlock, prepareNextTrial, trialsPerBlock]);

    trialTimeoutHandlerRef.current = handleTrialTimeout;

    const handleCountdownComplete = useCallback(() => {
        if (!blockStimuli.length) return;
        setExperimentState('running');
        prepareNextTrial(blockStimuli, 0, currentBlock);
    }, [blockStimuli, currentBlock, prepareNextTrial]);

    useEffect(() => {
        if (experimentState !== 'countdown') {
            clearCountdownTimer();
            setCountdownValue(3);
            return;
        }

        clearCountdownTimer();
        setCountdownValue(3);

        countdownTimerRef.current = setInterval(() => {
            setCountdownValue(prev => {
                if (prev <= 1) {
                    clearCountdownTimer();
                    handleCountdownComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return clearCountdownTimer;
    }, [experimentState, clearCountdownTimer, handleCountdownComplete]);

    // 試行結果を記録
    const recordTrialResult = useCallback(async (responseKey: KeyCode, reactionTime: number) => {
        if (!currentTrial || hasRespondedRef.current) return;

        // 重複記録防止
        if (recordTrialInProgressRef.current) {
            console.log(`🚫 試行記録重複実行をスキップ: ブロック${currentBlock}, 試行${currentTrialIndex + 1}`);
            return;
        }
        recordTrialInProgressRef.current = true;

        hasRespondedRef.current = true;
        clearTrialTimeout();
        const chosenAnswer = KEY_TO_ANSWER[responseKey];
        const isCorrect = chosenAnswer === currentTrial.stimulus.correctAnswer;

        const trialId = currentTrialIndex + 1; // currentTrialIndexを基準に設定
        console.log(`🔍 試行記録: ブロック${currentBlock}, 試行${trialId}/${trialsPerBlock}`, {
            currentTrialIndex,
            currentBlockTrialsLength: currentBlockTrialsRef.current.length,
            trialId,
            blockId: currentTrial.blockId,
            stimulus: currentTrial.stimulus.word,
            responseKey,
            chosenAnswer,
            isCorrect,
            isCorrectType: typeof isCorrect,
            reactionTime
        });

        const trialResult: TrialResult = {
            id: trialId,
            blockId: currentTrial.blockId,
            stimulus: currentTrial.stimulus,
            responseKey,
            chosenAnswer,
            isCorrect,
            reactionTime,
            timestamp: new Date()
        };

        setCurrentBlockTrials(prev => {
            const updated = [...prev, trialResult];
            // 同期的にrefも更新（確実にタイミングを制御）
            currentBlockTrialsRef.current = updated;
            console.log(`📊 ブロック${currentBlock}の試行配列更新:`, {
                beforeLength: prev.length,
                afterLength: updated.length,
                newTrialId: trialResult.id,
                refUpdated: currentBlockTrialsRef.current.length
            });
            return updated;
        });
        showTrialFeedback(isCorrect ? 'correct' : 'incorrect');

        // 次の試行へ
        setTimeout(async () => {
            const nextIndex = currentTrialIndex + 1;
            console.log(`⏭️ 次の試行準備: インデックス${nextIndex} (ブロック${currentBlock})`, {
                currentTrialIndex,
                nextIndex,
                stimuliLength: blockStimuli.length,
                willCompleteBlock: nextIndex >= blockStimuli.length
            });
            setCurrentTrialIndex(nextIndex);
            await prepareNextTrial(blockStimuli, nextIndex, currentBlock);
            recordTrialInProgressRef.current = false; // フラグをリセット
        }, NEXT_TRIAL_DELAY_MS);
    }, [currentTrial, hasRespondedRef, KEY_TO_ANSWER, currentTrialIndex, blockStimuli, currentBlock, prepareNextTrial, showTrialFeedback, clearTrialTimeout, trialsPerBlock]);

    // 実験完了処理
    const completeExperiment = useCallback(async () => {
        if (isCompletingRef.current) return;

        isCompletingRef.current = true;
        setExperimentState('completed');

        const results = blockResultsRef.current;
        const totalBlockCount = results.length;
        const overallAccuracy = totalBlockCount
            ? Math.round(results.reduce((sum, b) => sum + b.accuracy, 0) / totalBlockCount)
            : 0;
        const overallAverageRT = totalBlockCount
            ? Math.round(results.reduce((sum, b) => sum + b.averageRT, 0) / totalBlockCount)
            : 0;
        const overallAverageRTCorrectOnly = totalBlockCount
            ? Math.round(results.reduce((sum, b) => sum + b.averageRTCorrectOnly, 0) / totalBlockCount)
            : 0;

        const experimentId = `${uuid}-${conditionType}`;
        const pendingExperimentKey = `pending-experiment-${experimentId}`;
        const sessionNumber: 1 | 2 = conditionType === 'personalized' ? 2 : 1;
        const completedAt = new Date();
        const startedAt = results[0]?.trials[0]?.timestamp ?? completedAt;

        const totalTrialsAttempted = results.reduce((sum, block) => sum + block.trials.length, 0);

        const experiment: Experiment = {
            id: experimentId,
            participantId: uuid,
            conditionType,
            sessionNumber,
            language: participantInfo?.language || language || 'ja',
            startedAt,
            completedAt,
            blocks: results,
            overallAccuracy,
            overallAverageRT,
            overallAverageRTCorrectOnly,
            plannedTotalTrials: totalTrials,
            plannedTrialsPerBlock: trialsPerBlock,
            totalTrialsAttempted,
        };

        let saveStatus: 'success' | 'local-only' | 'failed' = 'failed';
        try {
            await saveExperiment(experiment);
            saveStatus = 'local-only';
            try {
                await syncExperimentToSupabase(experiment.id);
                saveStatus = 'success';
            } catch (syncError) {
                console.error('データ同期エラー:', syncError);
            }
        } catch (error) {
            console.error('データ保存エラー:', error);
            isCompletingRef.current = false;
            if (typeof window !== 'undefined') {
                try {
                    sessionStorage.setItem(pendingExperimentKey, JSON.stringify(experiment));
                } catch (storageError) {
                    console.warn('Failed to cache experiment payload:', storageError);
                }
            }
        }

        if (typeof window !== 'undefined' && saveStatus === 'success') {
            sessionStorage.removeItem(pendingExperimentKey);
        }

        try {
            await fetch(`/api/participants/${uuid}/completion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    condition: conditionType,
                    completedAt: completedAt.toISOString()
                })
            });
        } catch (error) {
            console.error('Failed to update Supabase completion status:', error);
        }

        router.push(`/complete/${uuid}?condition=${conditionType}&saveStatus=${saveStatus}`);
    }, [conditionType, participantInfo?.language, router, uuid, language, totalTrials, trialsPerBlock]);

    // フィードバック終了後の処理
    const advanceAfterFeedback = useCallback(() => {
        clearFeedbackTimer();

        if (currentBlock >= totalBlocks) {
            completeExperiment();
        } else {
            startNewBlock();
        }
    }, [clearFeedbackTimer, completeExperiment, currentBlock, startNewBlock, totalBlocks]);

    useEffect(() => {
        if (experimentState !== 'feedback') {
            clearFeedbackTimer();
            setFeedbackCountdown(feedbackCountdownSeconds);
            return;
        }

        setFeedbackCountdown(feedbackCountdownSeconds);
        feedbackTimerRef.current = setInterval(() => {
            setFeedbackCountdown(prev => {
                if (prev <= 1) {
                    advanceAfterFeedback();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return clearFeedbackTimer;
    }, [advanceAfterFeedback, clearFeedbackTimer, experimentState, feedbackCountdownSeconds]);

    useEffect(() => {
        if (experimentState !== 'feedback') {
            setIsFeedbackActionAvailable(false);
            clearFeedbackActionTimer();
            return;
        }

        clearFeedbackActionTimer();
        setIsFeedbackActionAvailable(false);
        feedbackActionTimerRef.current = setTimeout(() => {
            setIsFeedbackActionAvailable(true);
        }, feedbackButtonDelayMs);

        return clearFeedbackActionTimer;
    }, [clearFeedbackActionTimer, currentBlock, experimentState, feedbackButtonDelayMs]);

    useEffect(() => {
        const handlePreExperimentKey = (event: KeyboardEvent) => {
            if (experimentState !== 'preparation' || event.repeat) return;
            const key = event.key.toUpperCase() as KeyCode;
            if (['A', 'S', 'K', 'L'].includes(key)) {
                event.preventDefault();
                handleExperimentStart();
            }
        };

        window.addEventListener('keydown', handlePreExperimentKey);
        return () => window.removeEventListener('keydown', handlePreExperimentKey);
    }, [experimentState, handleExperimentStart]);

    // キーボードイベントハンドラ
    useEffect(() => {
        if (experimentState !== 'running' || !currentTrial) return;

        const handleKeyPress = (event: KeyboardEvent) => {
            const key = event.key.toUpperCase() as KeyCode;

            if (['A', 'S', 'K', 'L'].includes(key) && !hasRespondedRef.current) {
                const reactionTime = performance.now() - trialStartRef.current;
                recordTrialResult(key, reactionTime);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [experimentState, currentTrial, recordTrialResult]);

    useEffect(() => {
        if (experimentState !== 'feedback' || !isFeedbackActionAvailable) return;

        const handleFeedbackHotkey = (event: KeyboardEvent) => {
            if (event.repeat) return;
            const key = event.key.toUpperCase() as KeyCode;
            if (['A', 'S', 'K', 'L'].includes(key)) {
                event.preventDefault();
                advanceAfterFeedback();
            }
        };

        window.addEventListener('keydown', handleFeedbackHotkey);
        return () => window.removeEventListener('keydown', handleFeedbackHotkey);
    }, [advanceAfterFeedback, experimentState, isFeedbackActionAvailable]);

    useEffect(() => {
        if (experimentState !== 'running') {
            clearTrialTimeout();
        }
    }, [experimentState, clearTrialTimeout]);

    useEffect(() => {
        return () => {
            if (trialFeedbackTimerRef.current) {
                clearTimeout(trialFeedbackTimerRef.current);
            }
            if (trialTimeoutRef.current) {
                clearTimeout(trialTimeoutRef.current);
            }
            if (feedbackActionTimerRef.current) {
                clearTimeout(feedbackActionTimerRef.current);
            }
        };
    }, []);

    // 進捗計算
    const completedTrials = blockResults.reduce((sum, block) => sum + block.trials.length, 0) + currentBlockTrials.length;
    const progressPercent = Math.round((completedTrials / totalTrials) * 100);

    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-4xl">

                {/* 準備画面 */}
                {experimentState === 'preparation' && (
                    <Card>
                        <CardHeader className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Brain className="h-8 w-8 text-primary" />
                                </div>
                            </div>
                            <CardTitle className="text-3xl">
                                {language === 'ja' ? '本番実験の開始' : 'Begin Main Experiment'}
                            </CardTitle>
                            <CardDescription className="text-lg">
                                {language === 'ja'
                                    ? `これから${totalBlocks}ブロック（${totalTrials}試行）の本番実験を行います`
                                    : `You will now complete ${totalBlocks} blocks (${totalTrials} trials) in the main task.`}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center">
                                        <Target className="mr-2 h-4 w-4" />
                                        {language === 'ja' ? '実験構成' : 'Structure'}
                                    </h3>
                                    <ul className="text-sm space-y-1 text-muted-foreground">
                                        <li>
                                            {language === 'ja'
                                                ? `• 総試行数: ${totalTrials}試行`
                                                : `• Total trials: ${totalTrials}`}
                                        </li>
                                        <li>
                                            {language === 'ja'
                                                ? `• ブロック数: ${totalBlocks}ブロック`
                                                : `• Blocks: ${totalBlocks}`}
                                        </li>
                                        <li>
                                            {language === 'ja'
                                                ? `• 各ブロック: ${trialsPerBlock}試行`
                                                : `• Trials per block: ${trialsPerBlock}`}
                                        </li>
                                        <li>
                                            {language === 'ja'
                                                ? '• ブロック間にフィードバック表示'
                                                : '• Feedback appears between blocks'}
                                        </li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center">
                                        <Clock className="mr-2 h-4 w-4" />
                                        {language === 'ja' ? '所要時間' : 'Timing'}
                                    </h3>
                                    <ul className="text-sm space-y-1 text-muted-foreground">
                                        <li>
                                            {language === 'ja'
                                                ? '• 予想時間: 約15-20分'
                                                : '• Estimated duration: about 15–20 minutes'}
                                        </li>
                                        <li>
                                            {language === 'ja'
                                                ? `• フィードバックは${feedbackCountdownSeconds}秒で自動的に次へ進行`
                                                : `• Feedback auto-advances after ${feedbackCountdownSeconds}s`}
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <Separator />

                            {conditionType === 'personalized' && (
                                <Alert className="bg-amber-50 border border-amber-200 text-amber-900">
                                    <Clock className="h-4 w-4 text-amber-600" />
                                    <AlertTitle>
                                        {language === 'ja'
                                            ? '実験開始ボタンを押してから10秒程度時間がかかる場合があります'
                                            : 'After pressing Start, it may take about 10 seconds'}
                                    </AlertTitle>
                                    <AlertDescription>
                                        {language === 'ja'
                                            ? '初期化が完了するまで画面を閉じず、そのままお待ちください。'
                                            : 'Please keep this window open while we finish setting up.'}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Alert className="bg-slate-50 border border-slate-200 text-slate-900">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <AlertTitle>
                                    {language === 'ja' ? '開始前のお願い' : 'Before you begin'}
                                </AlertTitle>
                                <AlertDescription>
                                    {language === 'ja'
                                        ? '本番パートは約15分かかり途中で停止できません。お手洗いなどは先に済ませ、静かで集中できる環境を整えてから開始してください。'
                                        : 'The main phase takes about 15 minutes and cannot be paused. Visit the restroom first and make sure you are in a quiet, focused environment before starting.'}
                                </AlertDescription>
                            </Alert>

                            <div className="text-center space-y-2">
                                <Button
                                    size="lg"
                                    onClick={handleExperimentStart}
                                    className="px-8"
                                    disabled={isPreparingExperiment}
                                >
                                    {isPreparingExperiment ? (
                                        <span className="flex items-center gap-2">
                                            <Spinner className="h-4 w-4" />
                                            {startStatusMessage || (language === 'ja' ? '準備中...' : 'Preparing...')}
                                        </span>
                                    ) : (
                                        <>
                                            <Play className="mr-2 h-4 w-4" />
                                            {language === 'ja' ? '実験を開始' : 'Start experiment'}
                                        </>
                                    )}
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    {language === 'ja'
                                        ? 'A / S / K / L のいずれかを押しても開始できます'
                                        : 'Press any of A / S / K / L to start as well.'}
                                </p>
                                {startError && (
                                    <p className="text-sm text-red-600">
                                        {startError}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {experimentState === 'countdown' && (
                    <Card>
                        <CardContent className="p-16 text-center space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {language === 'ja'
                                    ? `ブロック ${currentBlock}/${totalBlocks} を開始します`
                                    : `Starting block ${currentBlock} of ${totalBlocks}`}
                            </p>
                            <div className="text-8xl font-bold tracking-tight">
                                {countdownValue > 0 ? countdownValue : 'START'}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {language === 'ja'
                                    ? 'カウントダウン終了後に刺激が表示され、反応時間の計測が始まります'
                                    : 'Stimuli appear when the countdown ends, and response times begin.'}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* 実行中画面 */}
                {experimentState === 'running' && currentTrial && (
                    <div className="space-y-8">
                        {showProgressDebug && (
                            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                                <span className="font-medium">
                                    {language === 'ja'
                                        ? `ブロック ${currentBlock}/${totalBlocks} ・ 試行 ${currentTrial.trialNumber}/${trialsPerBlock}`
                                        : `Block ${currentBlock}/${totalBlocks} • Trial ${currentTrial.trialNumber}/${trialsPerBlock}`}
                                </span>
                                <span>
                                    {language === 'ja'
                                        ? `全体進捗: ${progressPercent}%`
                                        : `Overall progress: ${progressPercent}%`}
                                </span>
                            </div>
                        )}

                        {/* 刺激表示 */}
                        <Card>
                            <CardContent className="p-16 text-center">
                                <div
                                    className="text-8xl font-bold tracking-wider"
                                    style={{ color: COLOR_TO_HEX[currentTrial.stimulus.inkColor] }}
                                >
                                    {currentTrial.stimulus.word}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="min-h-[40px] text-center">
                            {trialFeedback && (
                                <span
                                    className={`text-2xl font-bold tracking-wide sm:text-3xl ${trialFeedback === 'correct' ? 'text-emerald-600' : 'text-red-500'}`}
                                >
                                    {trialFeedbackText[trialFeedback]}
                                </span>
                            )}
                        </div>

                        {/* キー割り当て表示 */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-4 gap-4 text-center">
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="text-lg p-2">A</Badge>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'ja' ? 'その他' : 'Other'}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="text-lg p-2">S</Badge>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'ja' ? '赤色' : 'Red'}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="text-lg p-2">K</Badge>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'ja' ? '緑色' : 'Green'}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="text-lg p-2">L</Badge>
                                        <p className="text-sm text-muted-foreground">
                                            {language === 'ja' ? '青色' : 'Blue'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* フィードバック画面 */}
                {experimentState === 'feedback' && (
                    <Card className={conditionType === 'personalized' ? 'bg-primary/5 border-primary/20' : ''}>
                        {conditionType === 'personalized' ? (
                            <CardContent className="p-10 text-center space-y-6">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                        {language === 'ja'
                                            ? `ブロック${currentBlock}のフィードバック`
                                            : `Block ${currentBlock} feedback`}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    {(parsedBlockFeedback.heading || blockFeedback) && (
                                        <p className="text-2xl font-semibold leading-snug">
                                            {parsedBlockFeedback.heading || blockFeedback}
                                        </p>
                                    )}
                                    {parsedBlockFeedback.notes.map((line, index) => (
                                        <p key={index} className="text-lg text-muted-foreground">
                                            {line}
                                        </p>
                                    ))}
                                </div>
                                <div className="space-y-2 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        {language === 'ja'
                                            ? `${feedbackCountdown}秒後に${currentBlock >= totalBlocks ? '完了画面へ' : '次のブロックへ'}進みます`
                                            : `Advancing to the ${currentBlock >= totalBlocks ? 'completion screen' : 'next block'} in ${feedbackCountdown}s`}
                                    </p>
                                    {isFeedbackActionAvailable ? (
                                        <Button
                                            onClick={advanceAfterFeedback}
                                            variant="default"
                                            size="lg"
                                            className="px-6 font-semibold shadow-sm"
                                        >
                                            {language === 'ja' ? '次へ進む' : 'Continue now'}
                                        </Button>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            {language === 'ja'
                                                ? '数秒後に手動で進むことができます'
                                                : 'Manual advance will be available in a few seconds.'}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        ) : (
                            <>
                                <CardHeader className="text-center space-y-4">
                                    <div className="flex justify-center">
                                        <div className="p-3 bg-green-100 rounded-full">
                                            <CheckCircle className="h-8 w-8 text-green-600" />
                                        </div>
                                    </div>
                                    <CardTitle>
                                        {language === 'ja' ? `ブロック ${currentBlock} 完了` : `Block ${currentBlock} complete`}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    <div className="bg-muted/30 rounded-lg p-6">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                                                    {language === 'ja'
                                                        ? `ブロック${currentBlock} サマリー`
                                                        : `Block ${currentBlock} summary`}
                                                </p>
                                                <h3 className="text-2xl font-semibold text-slate-900">
                                                    {parsedBlockFeedback.heading || (language === 'ja' ? 'ブロック結果' : 'Block results')}
                                                </h3>
                                            </div>
                                            {parsedBlockFeedback.stats.length > 0 && (
                                                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                    {parsedBlockFeedback.stats.map((stat, index) => (
                                                        <div key={`${stat.label}-${index}`} className="rounded-xl border border-white/60 bg-white/80 p-4 text-left shadow-sm">
                                                            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                                                                {stat.label}
                                                            </dt>
                                                            <dd className="mt-1 text-2xl font-semibold text-slate-900">
                                                                {stat.value}
                                                            </dd>
                                                        </div>
                                                    ))}
                                                </dl>
                                            )}
                                            {parsedBlockFeedback.notes.length > 0 && (
                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    {parsedBlockFeedback.notes.map((note, index) => (
                                                        <p key={index}>{note}</p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-center space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            {language === 'ja'
                                                ? `自動で${currentBlock >= totalBlocks ? '完了画面へ遷移します' : '次のブロックへ進みます'}（残り ${feedbackCountdown}s）`
                                                : `Auto-advancing to the ${currentBlock >= totalBlocks ? 'completion screen' : 'next block'} in ${feedbackCountdown}s`}
                                        </p>
                                        {isFeedbackActionAvailable ? (
                                            <>
                                                <Button
                                                    onClick={advanceAfterFeedback}
                                                    variant="default"
                                                    size="lg"
                                                    className="px-6 font-semibold"
                                                >
                                                    {language === 'ja' ? '次へ進む' : 'Go to next step now'}
                                                </Button>
                                                <p className="text-xs text-muted-foreground">
                                                    {language === 'ja'
                                                        ? 'A / S / K / L のいずれかを押しても進めます'
                                                        : 'You can also press D, F, J, or K to continue.'}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                {language === 'ja'
                                                    ? '数秒後に手動で進む操作が有効になります'
                                                    : 'Manual advance becomes available in a few seconds.'}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </>
                        )}
                    </Card>
                )}

                {/* 実験完了 */}
                {experimentState === 'completed' && (
                    <Card>
                        <CardHeader className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                </div>
                            </div>
                            <CardTitle className="text-3xl">
                                {language === 'ja' ? '実験完了！' : 'Experiment complete!'}
                            </CardTitle>
                            <CardDescription className="space-y-1 text-base">
                                <span className="block">
                                    {language === 'ja'
                                        ? 'お疲れ様でした。実験データを保存しています。'
                                        : 'Great work. Saving your data now.'}
                                </span>
                                <span className="block text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-2">
                                        <Spinner className="h-3.5 w-3.5" />
                                        {language === 'ja'
                                            ? '保存処理を実行中です。'
                                            : 'Save is in progress.'}
                                    </span>
                                </span>
                                <span className="block text-sm text-muted-foreground">
                                    {language === 'ja'
                                        ? '時間がかかる場合があります。しばらくお待ちください。'
                                        : 'This may take a little while. Please wait for the confirmation.'}
                                </span>
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </div>
        </main>
    );
}

interface ExperimentPageProps {
    params: Promise<{ uuid: string }>;
}

export default function ExperimentPage({ params }: ExperimentPageProps) {
    const { uuid } = use(params);

    return (
        <LanguageProvider>
            <ExperimentContent uuid={uuid} />
        </LanguageProvider>
    );
}
