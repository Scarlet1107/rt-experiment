'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../../../lib/i18n';

interface ConsentContentProps {
    uuid: string;
}

function ConsentContent({ uuid }: ConsentContentProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const [isAgreeing, setIsAgreeing] = useState(false);

    const handleAgree = async () => {
        setIsAgreeing(true);

        // 同意をローカルストレージに記録
        localStorage.setItem(`consent-${uuid}`, JSON.stringify({
            agreed: true,
            timestamp: new Date().toISOString(),
        }));

        // 少し待ってから事前ヒアリングページに遷移
        setTimeout(() => {
            router.push(`/survey/${uuid}`);
        }, 500);
    };

    const handleDisagree = () => {
        // 参加を辞退した場合はホームに戻る
        router.push('/');
    };

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

                    <div className="border-t pt-6">
                        <div className="text-sm text-gray-600 space-y-2">
                            <p><strong>参加者ID:</strong> <code className="bg-gray-200 px-2 py-1 rounded text-xs">{uuid}</code></p>
                            <p><strong>日時:</strong> {new Date().toLocaleString()}</p>
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
                                処理中...
                            </>
                        ) : (
                            t.consent.agree
                        )}
                    </button>
                </div>

                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        同意しない場合は、いつでもこのページを離れることができます
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
