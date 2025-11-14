'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../../../lib/i18n';

interface ConsentContentProps {
    uuid: string;
}

function ConsentContent({ uuid }: ConsentContentProps) {
    const { t, language } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const condition = (searchParams.get('condition') as 'static' | 'personalized') || 'static';
    const [isAgreeing, setIsAgreeing] = useState(false);
    const [consentTimestamp, setConsentTimestamp] = useState('');

    useEffect(() => {
        const formatter = new Intl.DateTimeFormat(
            language === 'ja' ? 'ja-JP' : 'en-US',
            {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: language !== 'ja',
                timeZone: 'Asia/Tokyo',
            }
        );
        setConsentTimestamp(formatter.format(new Date()));
    }, [language]);

    const handleAgree = async () => {
        setIsAgreeing(true);

        // 同意をローカルストレージに記録
        localStorage.setItem(`consent-${uuid}`, JSON.stringify({
            agreed: true,
            timestamp: new Date().toISOString(),
        }));

        // 少し待ってから事前ヒアリングページに遷移
        setTimeout(() => {
            router.push(`/survey/${uuid}?condition=${condition}`);
        }, 500);
    };

    const handleDisagree = () => {
        // 参加を辞退した場合はホームに戻る
        router.push(`/language/${uuid}?condition=${condition}`);
    };

    const colorVisionCopy = language === 'ja'
        ? 'この実験では、赤・青・緑の3色を文字色として使用します。下記のサンプルを見分けられる方のみご参加いただけます。'
        : 'This study uses three ink colors—red, blue, and green. Please confirm you can distinguish each color below before participating.';

    const colorSwatches = [
        { key: 'S', nameJa: '赤 (Sキー)', nameEn: 'Red (S key)', hex: '#ef4444' },
        { key: 'K', nameJa: '緑 (Kキー)', nameEn: 'Green (K key)', hex: '#22c55e' },
        { key: 'L', nameJa: '青 (Lキー)', nameEn: 'Blue (L key)', hex: '#2563eb' },
    ];

    return (
        <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-6 py-12">
            <div className="max-w-3xl w-full space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-semibold text-gray-900">
                        {t.consent.title}
                    </h1>
                </div>

                <div className="bg-gray-50 rounded-lg p-8 space-y-6">
                    <div className="prose prose-gray max-w-none">
                        <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                            {t.consent.content}
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm text-gray-700">
                            {colorVisionCopy}
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            {colorSwatches.map(color => (
                                <div key={color.key} className="flex flex-col items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{color.key}</span>
                                    <div className="h-16 w-16 rounded-full" style={{ backgroundColor: color.hex }}></div>
                                    <p className="text-sm font-medium text-gray-800 text-center">
                                        {language === 'ja' ? color.nameJa : color.nameEn}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <div className="text-sm text-gray-600 space-y-2">
                            <p>
                                <strong>{language === 'ja' ? '参加者ID:' : 'Participant ID:'}</strong>{' '}
                                <code className="bg-gray-200 px-2 py-1 rounded text-xs">{uuid}</code>
                            </p>
                            <p>
                                <strong>{language === 'ja' ? '日時:' : 'Timestamp:'}</strong> {consentTimestamp || '---'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={handleDisagree}
                        disabled={isAgreeing}
                        className="px-8 py-3 text-base font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t.consent.disagree}
                    </button>

                    <button
                        onClick={handleAgree}
                        disabled={isAgreeing}
                        className="px-8 py-3 text-base font-semibold text-white bg-blue-600 border-2 border-blue-600 rounded-full hover:bg-blue-700 hover:border-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isAgreeing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {language === 'ja' ? '処理中...' : 'Processing...'}
                            </>
                        ) : (
                            t.consent.agree
                        )}
                    </button>
                </div>

                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        {language === 'ja'
                            ? '同意しない場合は、いつでもこのページを離れることができます'
                            : 'You may leave this page at any time if you choose not to participate.'}
                    </p>
                </div>
            </div>
        </main>
    );
}

interface ConsentPageProps {
    params: Promise<{
        uuid: string;
    }>;
}

export default function ConsentPage({ params }: ConsentPageProps) {
    const { uuid } = use(params);

    return (
        <LanguageProvider>
            <ConsentContent uuid={uuid} />
        </LanguageProvider>
    );
}
