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
            heroTitle: 'Stroop実験とは？',
            heroIntro: '色を識別する力と注意の切り替えを測る、認知心理学の代表的な課題です。',
            heroDetails: [
                '画面に表示される単語の「意味」ではなく、文字の色だけを素早く判定し、対応するキーを入力します。',
                'ニンテンドー3DSなどで遊んだ脳トレを思い出す方もいるかもしれませんが、今回は研究目的の正式な計測です。',
                'なるべく正確に、そして可能な限り速く回答できるよう意識してください。'
            ],
            spotlight: {
                title: '色に集中して答える実験です',
                description: '原則として文字の意味よりも色に注意し、見えている色のキーを素早く押してください。無意味語だけは特例で「OTHER」を選ぶルールです。'
            },
            examplesTitle: '例題でルールを確認',
            placeholderLabel: 'ここにスクリーンショットを配置'
        }
        : {
            heroTitle: 'What is the Stroop task?',
            heroIntro: 'It is a classic cognitive test that measures how quickly you can identify ink colors when the written word disagrees.',
            heroDetails: [
                'Ignore the meaning of each word and respond only to the ink color using the assigned keys.',
                'If you have tried brain-training titles on handheld consoles such as the Nintendo 3DS, the format may feel familiar, but this session records research-grade data.',
                'Strive for answers that remain both accurate and as fast as possible.'
            ],
            spotlight: {
                title: 'Stay focused on color, not word meaning',
                description: 'Let the ink color guide every answer and press the matching key immediately. The only exception is nonsense words—press OTHER whenever a non-color word appears.'
            },
            examplesTitle: 'Walkthrough Examples',
            placeholderLabel: 'Place your screenshot here'
        };

    const experimentFlowCopy = language === 'ja'
        ? {
            title: '実験の進め方',
            description: 'この実験は「練習」と「本番」の二段階で構成されています。',
            steps: [
                {
                    label: '練習パート',
                    detail: '手順やキー配置に慣れることが目的です。納得できるまで何度でも繰り返してかまいません。'
                },
                {
                    label: '本番パート',
                    detail: '計測は1回限りで途中停止はできません。集中した状態で一気に最後まで進みます。'
                },
                {
                    label: '所要時間',
                    detail: '練習と本番を合わせておよそ20分程度を想定しています。'
                }
            ],
            note: '静かで集中できる環境を整えてから進めてください。'
        }
        : {
            title: 'Experiment flow',
            description: 'The session is organized into two consecutive stages: practice and the main task.',
            steps: [
                {
                    label: 'Practice phase',
                    detail: 'Use it to become familiar with the keys and procedure. You may repeat it as many times as you need.'
                },
                {
                    label: 'Main phase',
                    detail: 'Data collection happens once only and cannot be paused mid-way, so finish it in a single focused run.'
                },
                {
                    label: 'Total duration',
                    detail: 'Expect the practice plus main phase to take roughly 20 minutes overall.'
                }
            ],
            note: 'Please confirm you are in a quiet environment where you can concentrate before proceeding.'
        };

    const focusReminder = language === 'ja'
        ? {
            title: '静かな場所で受けてください',
            detail: 'この実験は集中力を大きく消耗します。通知をオフにし、静かな集中できる環境で取り組んでください。'
        }
        : {
            title: 'Find a quiet spot',
            detail: 'The task demands a lot of sustained focus—silence your notifications and make sure no one will interrupt you.'
        };

    const handleStartPractice = () => {
        setIsStarting(true);
        setTimeout(() => {
            router.push(`/practice/${uuid}?condition=${condition}`);
        }, 300);
    };

    const colorMapping = [
        { key: 'A', label: t.instructions.keyMapping.other, bg: 'bg-gray-800', text: 'text-white' },
        { key: 'S', label: t.instructions.keyMapping.red, bg: 'bg-red-500', text: 'text-white' },
        { key: 'K', label: t.instructions.keyMapping.green, bg: 'bg-green-500', text: 'text-white' },
        { key: 'L', label: t.instructions.keyMapping.blue, bg: 'bg-blue-500', text: 'text-white' },
    ];

    const exampleStimuli = language === 'ja'
        ? [
            {
                badge: '例題 1',
                title: '単語と色が同じとき',
                description: '画面に「blue」が青色で表示されている場合は、色＝青なので L キーが正解です。',
                answer: '→ 青色に対応する L キーを押す',
                src: '/images/examples/match.png',
                alt: '青色で表示された「blue」の一致刺激'
            },
            {
                badge: '例題 2',
                title: '単語と色が違うとき',
                description: '「blue」と書かれていても文字色が緑なら、意味に惑わされず緑＝K キーを押します。',
                answer: '→ 緑色に対応する K キーが正解',
                src: '/images/examples/mismatch.png',
                alt: '緑色で表示された「blue」の不一致刺激'
            },
            {
                badge: '例題 3',
                title: '色以外の単語が出たとき',
                description: '「water」など色名ではない単語が緑色で表示されたら、カテゴリは「その他」と判断します。',
                answer: '→ A キー（その他）を押す',
                src: '/images/examples/nonsense.png',
                alt: '緑色で表示された「WATER」のその他刺激'
            }
        ]
        : [
            {
                badge: 'Example 1',
                title: 'Word and ink color match',
                description: 'If “blue” is printed in blue, ignore the text and confirm the color—press L.',
                answer: '→ Press L for blue',
                src: '/images/examples/match.png',
                alt: 'Congruent sample with blue shown in blue ink'
            },
            {
                badge: 'Example 2',
                title: 'Word and color mismatch',
                description: 'When “blue” appears in green ink, trust the color only—press K for green.',
                answer: '→ Press K for green',
                src: '/images/examples/mismatch.png',
                alt: 'Incongruent sample with blue shown in green ink'
            },
            {
                badge: 'Example 3',
                title: 'Non-color words',
                description: 'If a non-color word like “water” is shown in green, it still counts as “OTHER”.',
                answer: '→ Press A for OTHER',
                src: '/images/examples/nonsense.png',
                alt: 'Non-color sample with WATER shown in green ink'
            }
        ];

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-6 py-12 text-gray-900">
            <div className="mx-auto flex max-w-5xl flex-col gap-10">
                <section className="rounded-3xl border border-slate-100 bg-white/90 p-8 shadow-[0_40px_100px_rgba(15,23,42,0.08)] backdrop-blur">
                    <div className="space-y-6 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">
                            {language === 'ja' ? 'Reaction Time Study' : 'Reaction Time Study'}
                        </p>
                        <h1 className="text-4xl font-bold leading-tight text-slate-900">
                            {copy.heroTitle}
                        </h1>
                        <p className="text-lg text-slate-700">
                            {copy.heroIntro}
                        </p>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left shadow-sm sm:text-center">
                            <p className="text-lg font-semibold text-amber-900">
                                {copy.spotlight.title}
                            </p>
                            <p className="mt-1 text-sm text-amber-800">
                                {copy.spotlight.description}
                            </p>
                        </div>
                        <div className="space-y-3 text-left text-slate-700 sm:text-center">
                            {copy.heroDetails.map(detail => (
                                <p key={detail} className="text-base leading-relaxed">
                                    {detail}
                                </p>
                            ))}
                        </div>
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-left shadow-md sm:text-center">
                            <p className="text-base font-semibold text-rose-900">
                                {focusReminder.title}
                            </p>
                            <p className="mt-1 text-sm text-rose-800">
                                {focusReminder.detail}
                            </p>
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
                            <span className="text-xs uppercase tracking-widest text-slate-400">A / S / K / L</span>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {colorMapping.map(({ key, label, bg, text }) => (
                                <div key={key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:flex-col sm:items-start sm:gap-4 lg:flex-row">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold ${bg} ${text}`}>
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
                        <h3 className="text-xl font-semibold text-slate-900">{experimentFlowCopy.title}</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            {experimentFlowCopy.description}
                        </p>
                        <ul className="mt-4 space-y-3">
                            {experimentFlowCopy.steps.map(step => (
                                <li key={step.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                                    <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                                    <p className="mt-1 text-sm text-slate-600">{step.detail}</p>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                            {experimentFlowCopy.note}
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
