'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LanguageProvider, useLanguage, Language } from '../../../lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Languages, ArrowRight, AlertCircle } from 'lucide-react';
import ReactCountryFlag from "react-country-flag";

interface LanguageSelectorContentProps {
    uuid: string;
}

function LanguageSelectorContent({ uuid }: LanguageSelectorContentProps) {
    const { language, setLanguage, t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const condition = (searchParams.get('condition') as 'static' | 'personalized') || 'static';
    const [isLoading, setIsLoading] = useState(false);
    const [isSmallViewport, setIsSmallViewport] = useState(false);

    const handleLanguageSelect = async (selectedLanguage: Language) => {
        setIsLoading(true);
        setLanguage(selectedLanguage);

        // 少し待ってから同意書ページに遷移
        setTimeout(() => {
            router.push(`/consent/${uuid}?condition=${condition}`);
        }, 300);
    };

    useEffect(() => {
        const detectViewport = () => {
            if (typeof window === 'undefined') return;
            setIsSmallViewport(window.innerWidth < 1024);
        };

        detectViewport();
        window.addEventListener('resize', detectViewport);
        return () => window.removeEventListener('resize', detectViewport);
    }, []);

    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-2xl">
                {isSmallViewport && (
                    <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-900">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle>
                            <span className="block">この実験はPCでの参加を想定しています</span>
                            <span className="block">This experiment is designed for desktop use</span>
                        </AlertTitle>
                        <AlertDescription className="space-y-1">
                            <p>
                                スマートフォンやタブレットでアクセスしている場合は、PCから参加してください。
                            </p>
                            <p>
                                PCの場合はブラウザの幅を大きくしてから開始してください。
                            </p>
                            <p>
                                If you are on a phone or tablet, please switch to a desktop or laptop.
                            </p>
                            <p>
                                If you are on a PC, enlarge your browser window before you begin.
                            </p>
                        </AlertDescription>
                    </Alert>
                )}
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
                                <ReactCountryFlag
                                    countryCode="JP"
                                    svg
                                    style={{ width: "4em", height: "3em" }}
                                    className='border-1'
                                />
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
                                <ReactCountryFlag
                                    countryCode="US"
                                    svg
                                    style={{ width: "4em", height: "3em" }}
                                    className='border-1'
                                />
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
