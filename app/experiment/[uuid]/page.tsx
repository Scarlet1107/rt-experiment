'use client';

import { useState, useEffect, useRef, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LanguageProvider } from '../../../lib/i18n';
import { generateBlockStimuli } from '../../../lib/experiment/stimuli';
import { saveExperiment } from '../../../lib/storage/indexeddb';
import { syncExperimentToSupabase } from '../../../lib/storage/supabase-sync';
import { generateStaticFeedback } from '../../../lib/experiment/utils';
import {
    getOrGenerateFeedbackPatterns,
    generatePersonalizedBlockFeedback,
    type FeedbackPattern,
    type ParticipantInfo
} from '../../../lib/feedback/personalized';
import { getParticipant } from '../../../lib/storage/indexeddb';
import { StroopStimulus, KeyCode, AnswerType, Trial, BlockResult, Experiment } from '../../../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Play, Pause, Brain, Target, Clock, CheckCircle } from 'lucide-react';

interface ExperimentContentProps {
    uuid: string;
}

// 実験の状態管理
type ExperimentState = 'preparation' | 'running' | 'feedback' | 'break' | 'completed';

interface CurrentTrial {
    blockId: string;
    trialNumber: number;
    stimulus: StroopStimulus;
    startTime: number;
}

interface TrialResult extends Trial {
    blockId: string;
}

function ExperimentContent({ uuid }: ExperimentContentProps) {
    const router = useRouter();

    // 実験全体の状態
    const [experimentState, setExperimentState] = useState<ExperimentState>('preparation');
    const [currentBlock, setCurrentBlock] = useState(0); // 1-8
    const [totalBlocks] = useState(8);
    const [trialsPerBlock] = useState(60);

    // 現在のブロック・試行管理
    const [blockStimuli, setBlockStimuli] = useState<StroopStimulus[]>([]);
    const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
    const [currentTrial, setCurrentTrial] = useState<CurrentTrial | null>(null);

    // 結果データ
    const [blockResults, setBlockResults] = useState<BlockResult[]>([]);
    const [currentBlockTrials, setCurrentBlockTrials] = useState<TrialResult[]>([]);

    // フィードバック関連
    const [blockFeedback, setBlockFeedback] = useState<string>('');
    const [isShowingFeedback, setIsShowingFeedback] = useState(false);

    // パーソナライズドフィードバック用の状態
    const [feedbackPatterns, setFeedbackPatterns] = useState<FeedbackPattern | null>(null);
    const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
    const [conditionType, setConditionType] = useState<'static' | 'personalized'>('static');

    // キー入力管理
    const trialStartRef = useRef<number>(0);
    const hasRespondedRef = useRef(false);

    // キー対応表
    const KEY_TO_ANSWER: Record<KeyCode, AnswerType> = useMemo(() => ({
        'F': 'RED',
        'J': 'GREEN',
        'K': 'BLUE',
        'D': 'OTHER'
    }), []);

    // 色の表示用
    const COLOR_TO_HEX = {
        'RED': '#ef4444',
        'GREEN': '#22c55e',
        'BLUE': '#3b82f6'
    };

    // 実験初期化（参加者情報とフィードバックパターンの取得）
    useEffect(() => {
        const initializeExperiment = async () => {
            try {
                // 参加者情報を取得
                const participant = await getParticipant(uuid);
                if (participant) {
                    const info: ParticipantInfo = {
                        nickname: participant.nickname,
                        preferredPraise: participant.preferredPraise,
                        avoidExpressions: participant.avoidExpressions,
                        language: participant.language as 'ja' | 'en'
                    };
                    setParticipantInfo(info);

                    // URL パラメータから条件タイプを判定（簡易実装）
                    // TODO: より洗練された条件割り当てロジックに変更
                    const urlParams = new URLSearchParams(window.location.search);
                    const condition = urlParams.get('condition') as 'static' | 'personalized' || 'static';
                    setConditionType(condition);

                    // パーソナライズド条件の場合、フィードバックパターンを生成
                    if (condition === 'personalized') {
                        const patterns = await getOrGenerateFeedbackPatterns(info);
                        setFeedbackPatterns(patterns);
                    }
                }
            } catch (error) {
                console.error('Failed to initialize experiment:', error);
                // デフォルト値で続行
                setConditionType('static');
            }
        };

        initializeExperiment();
    }, [uuid]);

    // 新しいブロックを開始
    const startNewBlock = async () => {
        const nextBlockNumber = currentBlock + 1;
        setCurrentBlock(nextBlockNumber);

        // 新しい刺激セットを生成
        const stimuli = generateBlockStimuli();
        setBlockStimuli(stimuli);
        setCurrentTrialIndex(0);
        setCurrentBlockTrials([]);

        // 最初の試行を準備
        await prepareNextTrial(stimuli, 0, nextBlockNumber);
        setExperimentState('running');
    };

    // ブロックフィードバック生成
    const generateBlockFeedback = useCallback(async (result: BlockResult) => {
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
                result.averageRT
            );
        }

        setBlockFeedback(feedback);
        setIsShowingFeedback(true);
    }, [conditionType, feedbackPatterns, participantInfo, blockResults]);

    // ブロック完了処理
    const completeBlock = useCallback(async () => {
        // ブロック結果を計算
        const correctTrials = currentBlockTrials.filter(t => t.isCorrect);
        const accuracy = Math.round((correctTrials.length / currentBlockTrials.length) * 100);
        const avgRT = correctTrials.length > 0
            ? Math.round(correctTrials.reduce((sum, t) => sum + (t.reactionTime || 0), 0) / correctTrials.length)
            : 0;

        const blockResult: BlockResult = {
            id: `block-${currentBlock}`,
            blockNumber: currentBlock,
            experimentId: uuid,
            trials: currentBlockTrials,
            accuracy,
            averageRT: avgRT,
            completedAt: new Date(),
            feedbackShown: '' // フィードバック後に設定
        };

        setBlockResults(prev => [...prev, blockResult]);

        // フィードバック表示へ
        await generateBlockFeedback(blockResult);
        setExperimentState('feedback');
    }, [currentBlockTrials, currentBlock, uuid, generateBlockFeedback]);

    // 次の試行を準備
    const prepareNextTrial = useCallback(async (stimuli: StroopStimulus[], trialIndex: number, blockNum: number) => {
        if (trialIndex >= stimuli.length) {
            // ブロック完了
            await completeBlock();
            return;
        }

        const stimulus = stimuli[trialIndex];
        const trial: CurrentTrial = {
            blockId: `block-${blockNum}`,
            trialNumber: trialIndex + 1,
            stimulus,
            startTime: 0 // 実際の開始時に設定
        };

        setCurrentTrial(trial);
        hasRespondedRef.current = false;

        // 少し待ってから試行開始
        setTimeout(() => {
            trialStartRef.current = performance.now();
        }, 500);
    }, [completeBlock]);

    // 試行結果を記録
    const recordTrialResult = useCallback(async (responseKey: KeyCode, reactionTime: number) => {
        if (!currentTrial || hasRespondedRef.current) return;

        hasRespondedRef.current = true;
        const chosenAnswer = KEY_TO_ANSWER[responseKey];
        const isCorrect = chosenAnswer === currentTrial.stimulus.correctAnswer;

        const trialResult: TrialResult = {
            id: currentBlockTrials.length + 1,
            blockId: currentTrial.blockId,
            stimulus: currentTrial.stimulus,
            responseKey,
            chosenAnswer,
            isCorrect,
            reactionTime,
            timestamp: new Date()
        };

        setCurrentBlockTrials(prev => [...prev, trialResult]);

        // 次の試行へ
        setTimeout(async () => {
            const nextIndex = currentTrialIndex + 1;
            setCurrentTrialIndex(nextIndex);
            await prepareNextTrial(blockStimuli, nextIndex, currentBlock);
        }, 300);
    }, [currentTrial, hasRespondedRef, KEY_TO_ANSWER, currentBlockTrials.length, currentTrialIndex, blockStimuli, currentBlock, prepareNextTrial]);

    // フィードバック終了後の処理
    const finishFeedback = () => {
        setIsShowingFeedback(false);

        if (currentBlock >= totalBlocks) {
            // 実験完了
            completeExperiment();
        } else {
            // 次のブロックへ
            setExperimentState('break');
        }
    };

    // 実験完了処理
    const completeExperiment = async () => {
        setExperimentState('completed');

        // 実験データを保存
        const experiment: Experiment = {
            id: uuid,
            participantId: uuid,
            conditionType: conditionType, // 動的に設定された条件タイプ
            sessionNumber: 1, // TODO: セッション番号を動的に設定
            language: participantInfo?.language || 'ja', // 参加者の選択言語
            startedAt: new Date(),
            completedAt: new Date(),
            blocks: blockResults,
            overallAccuracy: Math.round(blockResults.reduce((sum, b) => sum + b.accuracy, 0) / blockResults.length),
            overallAverageRT: Math.round(blockResults.reduce((sum, b) => sum + b.averageRT, 0) / blockResults.length)
        };

        try {
            await saveExperiment(experiment);
            await syncExperimentToSupabase(experiment.id);
        } catch (error) {
            console.error('データ保存エラー:', error);
        }

        // 完了ページへ遷移
        router.push(`/complete/${uuid}`);
    };

    // キーボードイベントハンドラ
    useEffect(() => {
        if (experimentState !== 'running' || !currentTrial) return;

        const handleKeyPress = (event: KeyboardEvent) => {
            const key = event.key.toUpperCase() as KeyCode;

            if (['F', 'J', 'K', 'D'].includes(key) && !hasRespondedRef.current) {
                const reactionTime = performance.now() - trialStartRef.current;
                recordTrialResult(key, reactionTime);
            }

            // ESCキーで中断
            if (event.key === 'Escape') {
                router.push(`/practice/${uuid}`);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [experimentState, currentTrial, currentBlock, uuid, router, recordTrialResult]);

    // 進捗計算
    const totalTrials = totalBlocks * trialsPerBlock;
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
                            <CardTitle className="text-3xl">本番実験の開始</CardTitle>
                            <CardDescription className="text-lg">
                                これから8ブロック（480試行）の本番実験を行います
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center">
                                        <Target className="mr-2 h-4 w-4" />
                                        実験構成
                                    </h3>
                                    <ul className="text-sm space-y-1 text-muted-foreground">
                                        <li>• 総試行数: 480試行</li>
                                        <li>• ブロック数: 8ブロック</li>
                                        <li>• 各ブロック: 60試行</li>
                                        <li>• ブロック間にフィードバック表示</li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="font-semibold flex items-center">
                                        <Clock className="mr-2 h-4 w-4" />
                                        所要時間
                                    </h3>
                                    <ul className="text-sm space-y-1 text-muted-foreground">
                                        <li>• 予想時間: 約15-20分</li>
                                        <li>• ブロック間で休憩可能</li>
                                        <li>• ESCキーで中断・練習に戻る</li>
                                    </ul>
                                </div>
                            </div>

                            <Separator />

                            <div className="text-center">
                                <Button size="lg" onClick={startNewBlock} className="px-8">
                                    <Play className="mr-2 h-4 w-4" />
                                    実験を開始
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 実行中画面 */}
                {experimentState === 'running' && currentTrial && (
                    <div className="space-y-8">
                        {/* 進捗表示 */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">
                                        ブロック {currentBlock}/{totalBlocks} - 試行 {currentTrial.trialNumber}/{trialsPerBlock}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        全体進捗: {progressPercent}%
                                    </span>
                                </div>
                                <Progress value={progressPercent} className="h-2" />
                            </CardContent>
                        </Card>

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

                        {/* キー割り当て表示 */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-4 gap-4 text-center">
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="text-lg p-2">D</Badge>
                                        <p className="text-sm text-muted-foreground">その他</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="text-lg p-2">F</Badge>
                                        <p className="text-sm text-muted-foreground">赤色</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="text-lg p-2">J</Badge>
                                        <p className="text-sm text-muted-foreground">緑色</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="text-lg p-2">K</Badge>
                                        <p className="text-sm text-muted-foreground">青色</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* フィードバック画面 */}
                {experimentState === 'feedback' && isShowingFeedback && (
                    <Card>
                        <CardHeader className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                </div>
                            </div>
                            <CardTitle>ブロック {currentBlock} 完了</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="bg-muted/30 rounded-lg p-6">
                                <div className="font-mono text-center space-y-3">
                                    {blockFeedback.split('\n').map((line, index) => (
                                        <div key={index} className={line.includes(':') ? 'text-lg' : 'text-sm text-muted-foreground'}>
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="text-center">
                                <Button onClick={finishFeedback}>
                                    {currentBlock >= totalBlocks ? '実験完了' : '次のブロックへ'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ブロック間休憩 */}
                {experimentState === 'break' && (
                    <Card>
                        <CardHeader className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <Pause className="h-8 w-8 text-blue-600" />
                                </div>
                            </div>
                            <CardTitle>休憩時間</CardTitle>
                            <CardDescription>
                                次のブロック（{currentBlock + 1}/{totalBlocks}）の準備ができたら開始してください
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="text-center space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="font-medium">完了ブロック</p>
                                        <p className="text-2xl font-bold text-green-600">{currentBlock}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium">残りブロック</p>
                                        <p className="text-2xl font-bold text-blue-600">{totalBlocks - currentBlock}</p>
                                    </div>
                                </div>

                                <Button size="lg" onClick={startNewBlock} className="px-8">
                                    <Play className="mr-2 h-4 w-4" />
                                    次のブロックを開始
                                </Button>
                            </div>
                        </CardContent>
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
                            <CardTitle className="text-3xl">実験完了！</CardTitle>
                            <CardDescription>
                                お疲れ様でした。実験データの保存中です...
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
