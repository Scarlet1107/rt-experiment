'use client';

import { useState, use } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../../../lib/i18n';

interface InstructionsContentProps {
    uuid: string;
}

function InstructionsContent({ uuid }: InstructionsContentProps) {
    const { t, language } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const condition = (searchParams.get('condition') as 'static' | 'personalized') || 'static';
    const [isStarting, setIsStarting] = useState(false);

    const copy = language === 'ja'
        ? {
            heroTitle: 'Stroop実験を攻略しよう',
            heroSubtitle: '色と言葉のズレを読み解きながら、最速かつ最も正確な反応を目指します。',
            measurement: 'この実験ではキー入力の反応速度をミリ秒単位で計測し、正答率とセットでスコア化します。',
            challenge: 'スピードと正確さの両立がハイスコアの鍵。自分らしいプレイスタイルでベストタイムを更新しましょう。',
            examplesTitle: '例題でルールを確認',
            motivation: 'ゲーム感覚で挑戦しながらも、落ち着いた判断が結果を左右します。肩の力を抜いて集中し続けましょう。',
            placeholderLabel: 'ここにスクリーンショットを配置'
        }
        : {
            heroTitle: 'Master the Stroop Challenge',
            heroSubtitle: 'React to the ink color—not the written word—to hit fast and accurate responses.',
            measurement: 'Every key press is logged in milliseconds and paired with accuracy to calculate your score.',
            challenge: 'Balance precision with speed to climb the leaderboard. Stay calm and keep the rhythm.',
            examplesTitle: 'Walkthrough Examples',
            motivation: 'Treat it like a focused mini game—engaging but composed—to keep your best pace.',
            placeholderLabel: 'Place your screenshot here'
        };

    const handleStartPractice = () => {
        setIsStarting(true);
        setTimeout(() => {
            router.push(`/practice/${uuid}?condition=${condition}`);
        }, 300);
    };

    const colorMapping = [
        { key: 'D', label: t.instructions.keyMapping.other, bg: 'bg-gray-800', text: 'text-white' },
        { key: 'F', label: t.instructions.keyMapping.red, bg: 'bg-red-500', text: 'text-white' },
        { key: 'J', label: t.instructions.keyMapping.green, bg: 'bg-green-500', text: 'text-white' },
        { key: 'K', label: t.instructions.keyMapping.blue, bg: 'bg-blue-500', text: 'text-white' },
    ];

    const exampleStimuli = language === 'ja'
        ? [
            {
                badge: '例題 1',
                title: '単語と色が同じとき',
                description: '画面に「blue」が青色で表示されている場合は、色＝青なので K キーが正解です。',
                answer: '→ 青色に対応する K キーを押す',
                src: '/images/examples/match.png',
                alt: '青色で表示された「blue」の一致刺激'
            },
            {
                badge: '例題 2',
                title: '単語と色が違うとき',
                description: '「blue」と書かれていても文字色が緑なら、意味に惑わされず緑＝J キーを押します。',
                answer: '→ 緑色に対応する J キーが正解',
                src: '/images/examples/mismatch.png',
                alt: '緑色で表示された「blue」の不一致刺激'
            },
            {
                badge: '例題 3',
                title: '色以外の単語が出たとき',
                description: '「water」など色名ではない単語が緑色で表示されたら、カテゴリは「その他」と判断します。',
                answer: '→ D キー（その他）を押す',
                src: '/images/examples/nonsense.png',
                alt: '緑色で表示された「WATER」のその他刺激'
            }
        ]
        : [
            {
                badge: 'Example 1',
                title: 'Word and ink color match',
                description: 'If “blue” is printed in blue, ignore the text and confirm the color—press K.',
                answer: '→ Press K for blue',
                src: '/images/examples/match.png',
                alt: 'Congruent sample with blue shown in blue ink'
            },
            {
                badge: 'Example 2',
                title: 'Word and color mismatch',
                description: 'When “blue” appears in green ink, trust the color only—press J for green.',
                answer: '→ Press J for green',
                src: '/images/examples/mismatch.png',
                alt: 'Incongruent sample with blue shown in green ink'
            },
            {
                badge: 'Example 3',
                title: 'Non-color words',
                description: 'If a non-color word like “water” is shown in green, it still counts as “OTHER”.',
                answer: '→ Press D for OTHER',
                src: '/images/examples/nonsense.png',
                alt: 'Non-color sample with WATER shown in green ink'
            }
        ];

    const focusPoints = language === 'ja'
        ? [
            '単語の意味ではなく、文字の色に100%集中する',
            'スピードを意識しつつ、正答率も落とさずに進める',
            'リズムが乱れたら深呼吸して再スタート',
            '練習でキー配置に慣れてから本番へ'
        ]
        : [
            'Focus entirely on the ink color, not the written word',
            'Balance high speed with dependable accuracy',
            'If you lose rhythm, pause briefly and reset your breathing',
            'Use the practice run to build muscle memory'
        ];

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-6 py-12 text-gray-900">
            <div className="mx-auto flex max-w-5xl flex-col gap-10">
                <section className="rounded-3xl border border-slate-100 bg-white/90 p-8 shadow-[0_40px_100px_rgba(15,23,42,0.08)] backdrop-blur">
                    <div className="space-y-6 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">Reaction Time Challenge</p>
                        <h1 className="text-4xl font-bold leading-tight text-slate-900">
                            {copy.heroTitle}
                        </h1>
                        <p className="text-lg text-slate-600">
                            {copy.heroSubtitle}
                        </p>
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-900">
                            <p className="font-semibold">{copy.measurement}</p>
                            <p>{copy.challenge}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-5">
                    <div className="flex items-center gap-3">
                        <span className="rounded-full bg-indigo-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-700">
                            walkthrough
                        </span>
                        <h2 className="text-2xl font-bold text-slate-900">{copy.examplesTitle}</h2>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-3">
                        {exampleStimuli.map(example => (
                            <div key={example.badge} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
                                    <span className="rounded-full bg-indigo-50 px-3 py-1">{example.badge}</span>
                                    <span>{example.title}</span>
                                </div>
                                <div className="mt-4">
                                    <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                        <Image
                                            src={example.src || '/images/examples/match.png'}
                                            alt={example.alt || copy.placeholderLabel}
                                            fill
                                            sizes="(max-width: 1024px) 100vw, 33vw"
                                            className="object-contain"
                                            priority={example.badge === '例題 1' || example.badge === 'Example 1'}
                                        />
                                    </div>
                                    <p className="mt-4 text-sm leading-relaxed text-slate-600">{example.description}</p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">{example.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-slate-900">{t.instructions.keyMapping.title}</h3>
                            <span className="text-xs uppercase tracking-widest text-slate-400">D / F / J / K</span>
                        </div>
                        <div className="grid gap-4">
                            {colorMapping.map(({ key, label, bg, text }) => (
                                <div key={key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-14 w-14 rounded-2xl ${bg} ${text} text-2xl font-bold flex items-center justify-center`}>
                                            {key}
                                        </div>
                                        <div className="text-base font-semibold text-slate-900">{label}</div>
                                    </div>
                                    <span className="text-xs font-medium text-slate-400">KEY {key}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-900">Focus Tips</h3>
                        <ul className="mt-4 space-y-3 text-sm text-slate-600">
                            {focusPoints.map((tip, index) => (
                                <li key={tip} className="flex items-start gap-3">
                                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                                        {index + 1}
                                    </span>
                                    <span>{tip}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                            {copy.motivation}
                        </div>
                    </div>
                </section>

                <section className="flex flex-col items-center gap-4 text-center">
                    <button
                        onClick={handleStartPractice}
                        disabled={isStarting}
                        className="flex min-w-[220px] items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500 px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-600 hover:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isStarting ? (
                            <>
                                <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                                {language === 'ja' ? '読み込み中…' : 'Preparing...'}
                            </>
                        ) : (
                            t.instructions.startButton
                        )}
                    </button>
                    <p className="text-sm text-slate-500">
                        {language === 'ja'
                            ? '練習でキー操作を身体に覚えさせてから、本番でベストスコアを狙いましょう。'
                            : 'Use the practice run to lock in the key positions before chasing your best score.'}
                    </p>
                </section>
            </div>
        </main>
    );
}

interface InstructionsPageProps {
    params: Promise<{
        uuid: string;
    }>;
}

export default function InstructionsPage({ params }: InstructionsPageProps) {
    const { uuid } = use(params);

    return (
        <LanguageProvider>
            <InstructionsContent uuid={uuid} />
        </LanguageProvider>
    );
}
