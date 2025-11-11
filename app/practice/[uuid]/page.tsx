'use client';

import { useState, useEffect, useRef, use, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../../../lib/i18n';
import { generateBlockStimuli } from '../../../lib/experiment/stimuli';
import { StroopStimulus, KeyCode, AnswerType } from '../../../types';
import { experimentConfig } from '@/lib/config/experiment';
import { Badge } from '@/components/ui/badge';

const PRACTICE_COLOR_HEX = {
    RED: '#e53935',
    BLUE: '#1e88e5',
    GREEN: '#43a047',
} as const;

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
    const { t, language } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const condition = (searchParams.get('condition') as 'static' | 'personalized') || 'static';
    const {
        totalBlocks,
        trialsPerBlock,
        totalTrials,
        practiceTrialCount,
        trialTimeLimitMs,
    } = experimentConfig;

    const [state, setState] = useState<PracticeState>('intro');
    const [stimuli, setStimuli] = useState<StroopStimulus[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [results, setResults] = useState<PracticeResult[]>([]);
    const [showFeedback, setShowFeedback] = useState(false);

    const trialStartRef = useRef<number | null>(null);
    const respondedRef = useRef(false);
    const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const trialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const KEY_TO_ANSWER: Record<KeyCode, AnswerType> = useMemo(() => ({
        F: 'RED',
        J: 'GREEN',
        K: 'BLUE',
        D: 'OTHER',
    }), []);

    const KEY_GUIDE = useMemo(() => [
        { key: 'D', label: language === 'ja' ? 'その他' : 'Other', color: '#4b5563' },
        { key: 'F', label: language === 'ja' ? '赤色' : 'Red', color: PRACTICE_COLOR_HEX.RED },
        { key: 'J', label: language === 'ja' ? '緑色' : 'Green', color: PRACTICE_COLOR_HEX.GREEN },
        { key: 'K', label: language === 'ja' ? '青色' : 'Blue', color: PRACTICE_COLOR_HEX.BLUE },
    ], [language]);

    const renderColoredKeyGuide = () => (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {KEY_GUIDE.map(({ key, label, color }) => (
                <div key={key} className="space-y-2">
                    <Badge
                        variant="outline"
                        className="text-lg sm:text-xl font-semibold p-3 h-16 w-full flex items-center justify-center border-2 bg-white"
                        style={{ borderColor: color, color }}
                    >
                        {key}
                    </Badge>
                    <p className="text-sm font-medium" style={{ color }}>
                        {label}
                    </p>
                </div>
            ))}
        </div>
    );

    const currentStimulus = stimuli[currentIndex] || null;

    const createPracticeStimuli = useCallback(() => {
        const count = Math.max(1, practiceTrialCount);
        return generateBlockStimuli(count);
    }, [practiceTrialCount]);

    const clearTrialTimeout = useCallback(() => {
        if (trialTimeoutRef.current) {
            clearTimeout(trialTimeoutRef.current);
            trialTimeoutRef.current = null;
        }
    }, []);

    const scheduleNextPracticeStep = useCallback(() => {
        if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
        }

        feedbackTimeoutRef.current = setTimeout(() => {
            setShowFeedback(false);
            setCurrentIndex(prevIndex => {
                const nextIndex = prevIndex + 1;
                if (nextIndex >= stimuli.length) {
                    setState('summary');
                    return prevIndex;
                }
                return nextIndex;
            });
        }, 1000);
    }, [stimuli.length]);

    const recordPracticeResult = useCallback((result: PracticeResult) => {
        setResults(prev => [...prev, result]);
        setShowFeedback(true);
        scheduleNextPracticeStep();
    }, [scheduleNextPracticeStep]);

    const handleTrialTimeout = useCallback(() => {
        if (!trialTimeLimitMs || respondedRef.current || !currentStimulus) return;
        respondedRef.current = true;
        clearTrialTimeout();

        const timeoutResult: PracticeResult = {
            stimulus: currentStimulus,
            responseKey: null,
            chosenAnswer: null,
            isCorrect: false,
            reactionTime: trialTimeLimitMs,
        };

        recordPracticeResult(timeoutResult);
    }, [trialTimeLimitMs, currentStimulus, recordPracticeResult, clearTrialTimeout]);

    const scheduleTrialTimeout = useCallback(() => {
        clearTrialTimeout();
        if (!trialTimeLimitMs) return;
        trialTimeoutRef.current = setTimeout(() => {
            handleTrialTimeout();
        }, trialTimeLimitMs);
    }, [trialTimeLimitMs, clearTrialTimeout, handleTrialTimeout]);

    useEffect(() => {
        if (state === 'running' && currentStimulus) {
            trialStartRef.current = performance.now();
            respondedRef.current = false;
            scheduleTrialTimeout();
        } else {
            clearTrialTimeout();
        }
    }, [state, currentStimulus, scheduleTrialTimeout, clearTrialTimeout]);

    useEffect(() => {
        if (state !== 'running') return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                router.push(`/instructions/${uuid}?condition=${condition}`);
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
            clearTrialTimeout();

            const result: PracticeResult = {
                stimulus: currentStimulus!,
                responseKey: key,
                chosenAnswer,
                isCorrect,
                reactionTime: rt,
            };

            recordPracticeResult(result);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [condition, state, currentStimulus, router, uuid, KEY_TO_ANSWER, recordPracticeResult, clearTrialTimeout]);

    useEffect(() => {
        return () => {
            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
            }
            if (trialTimeoutRef.current) {
                clearTimeout(trialTimeoutRef.current);
            }
        };
    }, []);

    const handleStartPractice = useCallback(() => {
        if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
            feedbackTimeoutRef.current = null;
        }
        clearTrialTimeout();
        setStimuli(createPracticeStimuli());
        setCurrentIndex(0);
        setResults([]);
        setShowFeedback(false);
        setState('running');
    }, [createPracticeStimuli, clearTrialTimeout]);

    const handleContinuePractice = () => {
        if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
            feedbackTimeoutRef.current = null;
        }
        clearTrialTimeout();
        setStimuli(createPracticeStimuli());
        setCurrentIndex(0);
        setResults([]);
        setShowFeedback(false);
        setState('running');
    };

    const handleStartMainExperiment = () => {
        router.push(`/experiment/${uuid}?condition=${condition}`);
    };

    useEffect(() => {
        if (state !== 'intro') return;

        const handleIntroHotkey = (event: KeyboardEvent) => {
            if (event.repeat) return;
            const key = event.key.toUpperCase();
            if (['D', 'F', 'J', 'K'].includes(key)) {
                event.preventDefault();
                handleStartPractice();
            }
        };

        window.addEventListener('keydown', handleIntroHotkey);
        return () => window.removeEventListener('keydown', handleIntroHotkey);
    }, [state, handleStartPractice]);

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

                    <div className="bg-blue-50 rounded-lg p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-blue-900">
                            {language === 'ja' ? 'キー操作の確認' : 'Check the key layout'}
                        </h2>
                        {renderColoredKeyGuide()}
                    </div>

                    <button
                        onClick={handleStartPractice}
                        className="px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors"
                    >
                        {language === 'ja' ? '練習開始' : 'Start practice'}
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
                                style={{ color: PRACTICE_COLOR_HEX[currentStimulus.inkColor] }}
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

                    <div className="max-w-2xl mx-auto">
                        {renderColoredKeyGuide()}
                    </div>

                    <div className="text-xs text-gray-500">
                        {language === 'ja' ? 'ESCキーで戻る' : 'Press ESC to return'}
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
                            {language === 'ja' ? '練習完了' : 'Practice complete'}
                        </h1>
                        <p className="text-lg text-gray-600">
                            {language === 'ja' ? 'お疲れ様でした！練習の結果をご確認ください。' : 'Nice work—here is a quick summary of your practice.'}
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                        <h2 className="text-xl font-semibold">
                            {language === 'ja' ? '結果' : 'Results'}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="bg-white p-4 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{accuracy}%</div>
                                <div className="text-sm text-gray-600">
                                    {language === 'ja' ? '正答率' : 'Accuracy'}
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{avgRT}ms</div>
                                <div className="text-sm text-gray-600">
                                    {language === 'ja' ? '平均反応時間' : 'Average RT'}
                                </div>
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
                        <p>
                            {language === 'ja'
                                ? `本番実験では${totalTrials}試行（${trialsPerBlock}試行 × ${totalBlocks}ブロック）を行います。`
                                : `The main task contains ${totalTrials} trials (${trialsPerBlock} per block × ${totalBlocks} blocks).`}
                        </p>
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
