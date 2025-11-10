'use client';

import { useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LanguageProvider, useLanguage, Language } from '../../../lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Languages, ArrowRight } from 'lucide-react';

interface LanguageSelectorContentProps {
    uuid: string;
}

function LanguageSelectorContent({ uuid }: LanguageSelectorContentProps) {
    const { language, setLanguage, t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const condition = (searchParams.get('condition') as 'static' | 'personalized') || 'static';
    const [isLoading, setIsLoading] = useState(false);

    const handleLanguageSelect = async (selectedLanguage: Language) => {
        setIsLoading(true);
        setLanguage(selectedLanguage);

        // 少し待ってから同意書ページに遷移
        setTimeout(() => {
            router.push(`/consent/${uuid}?condition=${condition}`);
        }, 300);
    };

    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-2xl">
                <Card>
                    <CardHeader className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Languages className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl">
                            {t.languageSelector.title}
                        </CardTitle>
                        <CardDescription className="text-lg">
                            {t.languageSelector.subtitle}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleLanguageSelect('ja')}
                                disabled={isLoading}
                                className="h-auto p-6 flex-col space-y-3 border-muted bg-card hover:border-primary hover:bg-primary/5 transition-all"
                            >
                                <div className="text-3xl">🇯🇵</div>
                                <div className="text-lg font-semibold">
                                    {t.languageSelector.japanese}
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleLanguageSelect('en')}
                                disabled={isLoading}
                                className="h-auto p-6 flex-col space-y-3 border-muted bg-card hover:border-primary hover:bg-primary/5 transition-all"
                            >
                                <div className="text-3xl">🇺🇸</div>
                                <div className="text-lg font-semibold">
                                    {t.languageSelector.english}
                                </div>
                            </Button>
                        </div>

                        {isLoading && (
                            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                                <ArrowRight className="h-4 w-4 animate-pulse" />
                                <span className="text-sm">
                                    {language === 'ja' ? '進んでいます...' : 'Loading...'}
                                </span>
                            </div>
                        )}

                        <div className="text-center pt-4">
                            <Badge variant="secondary" className="text-xs">
                                {language === 'ja' ? '参加者ID' : 'Participant ID'}: {uuid.slice(0, 8)}...
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

interface LanguageSelectorPageProps {
    params: Promise<{
        uuid: string;
    }>;
}

export default function LanguageSelectorPage({ params }: LanguageSelectorPageProps) {
    const { uuid } = use(params);

    return (
        <LanguageProvider>
            <LanguageSelectorContent uuid={uuid} />
        </LanguageProvider>
    );
}
