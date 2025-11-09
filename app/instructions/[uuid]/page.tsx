'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../../../lib/i18n';

interface InstructionsContentProps {
    uuid: string;
}

function InstructionsContent({ uuid }: InstructionsContentProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const [isStarting, setIsStarting] = useState(false);

    const handleStartPractice = () => {
        setIsStarting(true);
        setTimeout(() => {
            router.push(`/practice/${uuid}`);
        }, 300);
    };

    const colorMapping = [
        { key: 'D', color: t.instructions.keyMapping.other, bgColor: 'bg-gray-500', textColor: 'text-white' },
        { key: 'F', color: t.instructions.keyMapping.red, bgColor: 'bg-red-500', textColor: 'text-white' },
        { key: 'J', color: t.instructions.keyMapping.green, bgColor: 'bg-green-500', textColor: 'text-white' },
        { key: 'K', color: t.instructions.keyMapping.blue, bgColor: 'bg-blue-500', textColor: 'text-white' },
    ];

    return (
        <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-6 py-12">
            <div className="max-w-4xl w-full space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-semibold text-gray-900">
                        {t.instructions.title}
                    </h1>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* 説明文 */}
                    <div className="space-y-6">
                        <div className="bg-blue-50 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-blue-900 mb-4">
                                実験の流れ
                            </h2>
                            <div className="space-y-3 text-blue-800">
                                <div className="whitespace-pre-line leading-relaxed">
                                    {t.instructions.description}
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-yellow-900 mb-4">
                                重要なポイント
                            </h2>
                            <ul className="space-y-2 text-yellow-800">
                                <li className="flex items-start">
                                    <span className="text-yellow-600 mr-2">•</span>
                                    単語の意味ではなく、文字の色に注目してください
                                </li>
                                <li className="flex items-start">
                                    <span className="text-yellow-600 mr-2">•</span>
                                    できるだけ早く、正確に回答してください
                                </li>
                                <li className="flex items-start">
                                    <span className="text-yellow-600 mr-2">•</span>
                                    刺激は英語で表示されますが、操作は同じです
                                </li>
                                <li className="flex items-start">
                                    <span className="text-yellow-600 mr-2">•</span>
                                    練習で慣れてから本番に進みましょう
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* キー割り当て */}
                    <div className="space-y-6">
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                                {t.instructions.keyMapping.title}
                            </h2>
                            <div className="grid gap-4">
                                {colorMapping.map(({ key, color, bgColor, textColor }) => (
                                    <div
                                        key={key}
                                        className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-12 h-12 ${bgColor} ${textColor} rounded-lg flex items-center justify-center text-xl font-bold`}>
                                                {key}
                                            </div>
                                            <div className="text-lg font-semibold">
                                                {color}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            キー: {key}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-red-50 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-red-900 mb-4">
                                注意事項
                            </h2>
                            <ul className="space-y-2 text-red-800 text-sm">
                                <li className="flex items-start">
                                    <span className="text-red-600 mr-2">•</span>
                                    静かな環境で実施してください
                                </li>
                                <li className="flex items-start">
                                    <span className="text-red-600 mr-2">•</span>
                                    安定したインターネット接続が必要です
                                </li>
                                <li className="flex items-start">
                                    <span className="text-red-600 mr-2">•</span>
                                    約15分程度の時間を確保してください
                                </li>
                                <li className="flex items-start">
                                    <span className="text-red-600 mr-2">•</span>
                                    実験中はESCキーで中断できます
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-6">
                    <button
                        onClick={handleStartPractice}
                        disabled={isStarting}
                        className="px-8 py-4 text-lg font-semibold text-white bg-green-600 border-2 border-green-600 rounded-full hover:bg-green-700 hover:border-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[200px]"
                    >
                        {isStarting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                準備中...
                            </>
                        ) : (
                            t.instructions.startButton
                        )}
                    </button>
                </div>

                <div className="text-center text-sm text-gray-500">
                    <p>練習では操作方法を覚えることができます。準備ができてから本番に進んでください。</p>
                </div>
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
