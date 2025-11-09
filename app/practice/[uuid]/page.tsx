'use client';

import { useState, useEffect, useRef, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../../../lib/i18n';
import { generateBlockStimuli } from '../../../lib/experiment/stimuli';
import { StroopStimulus, KeyCode, AnswerType } from '../../../types';

interface PracticeResult {
    stimulus: StroopStimulus;
    responseKey: KeyCode | null;
    chosenAnswer: AnswerType | null;
    isCorrect: boolean | null;
    reactionTime: number | null;
}

type PracticeState = 'intro' | 'running' | 'feedback' | 'summary';

interface PracticeContentProps {
    uuid: string;
}

function PracticeContent({ uuid }: PracticeContentProps) {
    const { t } = useLanguage();
    const router = useRouter();

    const [state, setState] = useState<PracticeState>('intro');
    const [stimuli, setStimuli] = useState<StroopStimulus[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [results, setResults] = useState<PracticeResult[]>([]);
    const [showFeedback, setShowFeedback] = useState(false);

    const trialStartRef = useRef<number | null>(null);
    const respondedRef = useRef(false);
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const KEY_TO_ANSWER: Record<KeyCode, AnswerType> = useMemo(() => ({
        F: 'RED',
        J: 'GREEN',
        K: 'BLUE',
        D: 'OTHER',
    }), []);

    const COLOR_TO_HEX = {
        RED: '#e53935',
        BLUE: '#1e88e5',
        GREEN: '#43a047',
    };

    const currentStimulus = stimuli[currentIndex] || null;

    useEffect(() => {
        // 練習用の刺激を生成（10試行程度）
        const allStimuli = generateBlockStimuli();
        const practiceStimuli = allStimuli.slice(0, 10);
        setStimuli(practiceStimuli);
    }, []);

    useEffect(() => {
        if (state === 'running' && currentStimulus) {
            trialStartRef.current = performance.now();
            respondedRef.current = false;
        }
    }, [state, currentStimulus]);

    useEffect(() => {
        if (state !== 'running') return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                router.push(`/instructions/${uuid}`);
                return;
            }

            if (event.repeat || respondedRef.current) return;

            const key = event.key.toUpperCase() as KeyCode;
            if (!['F', 'J', 'K', 'D'].includes(key)) return;

            const chosenAnswer = KEY_TO_ANSWER[key];
            const rt = performance.now() - (trialStartRef.current ?? performance.now());

            let isCorrect = false;
            if (currentStimulus) {
                if (currentStimulus.category === 'NONSENSE') {
                    isCorrect = chosenAnswer === 'OTHER';
                } else {
                    isCorrect = chosenAnswer === currentStimulus.inkColor;
                }
            }

            respondedRef.current = true;

            const result: PracticeResult = {
                stimulus: currentStimulus!,
                responseKey: key,
                chosenAnswer,
                isCorrect,
                reactionTime: rt,
            };

            setResults(prev => [...prev, result]);
            setShowFeedback(true);

            // フィードバック表示後、次の試行へ
            feedbackTimeoutRef.current = setTimeout(() => {
                setShowFeedback(false);
                const nextIndex = currentIndex + 1;
                if (nextIndex >= stimuli.length) {
                    setState('summary');
                } else {
                    setCurrentIndex(nextIndex);
                }
            }, 1000);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state, currentStimulus, currentIndex, stimuli.length, router, uuid, KEY_TO_ANSWER]);

    useEffect(() => {
        return () => {
            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
            }
        };
    }, []);

    const handleStartPractice = () => {
        setState('running');
        setCurrentIndex(0);
        setResults([]);
    };

    const handleContinuePractice = () => {
        setCurrentIndex(0);
        setResults([]);
        setState('running');
    };

    const handleStartMainExperiment = () => {
        // デフォルトではstatic条件、URLパラメータで条件を指定可能
        const urlParams = new URLSearchParams(window.location.search);
        const condition = urlParams.get('condition') || 'static';
        router.push(`/experiment/${uuid}?condition=${condition}`);
    };

    if (state === 'intro') {
        return (
            <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-6 py-12">
                <div className="max-w-2xl w-full space-y-8 text-center">
                    <div className="space-y-4">
                        <h1 className="text-3xl font-semibold text-gray-900">
                            {t.practice.title}
                        </h1>
                        <p className="text-lg text-gray-600">
                            {t.practice.description}
                        </p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-blue-900 mb-4">
                            キー操作の確認
                        </h2>
                        <div className="grid gap-2 text-sm">
                            <div className="flex justify-between items-center py-2 px-4 bg-white rounded">
                                <span className="font-mono text-lg">D</span>
                                <span>その他</span>
                            </div>
                            <div className="flex justify-between items-center py-2 px-4 bg-white rounded">
                                <span className="font-mono text-lg">F</span>
                                <span className="text-red-600">赤色</span>
                            </div>
                            <div className="flex justify-between items-center py-2 px-4 bg-white rounded">
                                <span className="font-mono text-lg">J</span>
                                <span className="text-green-600">緑色</span>
                            </div>
                            <div className="flex justify-between items-center py-2 px-4 bg-white rounded">
                                <span className="font-mono text-lg">K</span>
                                <span className="text-blue-600">青色</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleStartPractice}
                        className="px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors"
                    >
                        練習開始
                    </button>
                </div>
            </main>
        );
    }

    if (state === 'running') {
        return (
            <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center">
                <div className="text-center space-y-8">
                    <div className="text-sm text-gray-500">
                        {t.practice.trial} {currentIndex + 1} / {stimuli.length}
                    </div>

                    {currentStimulus && (
                        <div className="space-y-6">
                            <div
                                className="text-8xl font-bold tracking-wider"
                                style={{ color: COLOR_TO_HEX[currentStimulus.inkColor] }}
                            >
                                {currentStimulus.word}
                            </div>

                            {showFeedback && results.length > 0 && (
                                <div
                                    className={`text-2xl font-semibold ${results[results.length - 1].isCorrect
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                        }`}
                                >
                                    {results[results.length - 1].isCorrect
                                        ? t.practice.correct
                                        : t.practice.incorrect
                                    }
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid gap-2 text-sm max-w-md mx-auto">
                        <div className="flex justify-between items-center py-2 px-4 bg-gray-100 rounded">
                            <span className="font-mono text-lg">D</span>
                            <span>その他</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-4 bg-gray-100 rounded">
                            <span className="font-mono text-lg">F</span>
                            <span className="text-red-600">赤色</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-4 bg-gray-100 rounded">
                            <span className="font-mono text-lg">J</span>
                            <span className="text-green-600">緑色</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-4 bg-gray-100 rounded">
                            <span className="font-mono text-lg">K</span>
                            <span className="text-blue-600">青色</span>
                        </div>
                    </div>

                    <div className="text-xs text-gray-500">
                        ESCキーで戻る
                    </div>
                </div>
            </main>
        );
    }

    if (state === 'summary') {
        const accuracy = results.length > 0
            ? Math.round((results.filter(r => r.isCorrect).length / results.length) * 100)
            : 0;

        const avgRT = results.filter(r => r.isCorrect && r.reactionTime).length > 0
            ? Math.round(
                results
                    .filter(r => r.isCorrect && r.reactionTime)
                    .reduce((sum, r) => sum + (r.reactionTime || 0), 0) /
                results.filter(r => r.isCorrect && r.reactionTime).length
            )
            : 0;

        return (
            <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-6 py-12">
                <div className="max-w-2xl w-full space-y-8 text-center">
                    <div className="space-y-4">
                        <h1 className="text-3xl font-semibold text-gray-900">
                            練習完了
                        </h1>
                        <p className="text-lg text-gray-600">
                            お疲れ様でした！練習の結果をご確認ください。
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                        <h2 className="text-xl font-semibold">結果</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="bg-white p-4 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{accuracy}%</div>
                                <div className="text-sm text-gray-600">正答率</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{avgRT}ms</div>
                                <div className="text-sm text-gray-600">平均反応時間</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={handleContinuePractice}
                            className="px-6 py-3 text-base font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-colors"
                        >
                            {t.practice.continePractice}
                        </button>

                        <button
                            onClick={handleStartMainExperiment}
                            className="px-6 py-3 text-base font-semibold text-white bg-blue-600 border-2 border-blue-600 rounded-full hover:bg-blue-700 hover:border-blue-700 transition-colors"
                        >
                            {t.practice.continueToMain}
                        </button>
                    </div>

                    <div className="text-sm text-gray-500">
                        <p>本番実験では480試行（60試行 × 8ブロック）を行います。</p>
                    </div>
                </div>
            </main>
        );
    }

    return null;
}

interface PracticePageProps {
    params: Promise<{
        uuid: string;
    }>;
}

export default function PracticePage({ params }: PracticePageProps) {
    const { uuid } = use(params);

    return (
        <LanguageProvider>
            <PracticeContent uuid={uuid} />
        </LanguageProvider>
    );
}
