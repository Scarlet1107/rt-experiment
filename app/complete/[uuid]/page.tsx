'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { LanguageProvider } from '../../../lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Download, Home, Calendar, Clock, Target } from 'lucide-react';

interface CompleteContentProps {
    uuid: string;
}

function CompleteContent({ uuid }: CompleteContentProps) {
    const [experimentData, setExperimentData] = useState<{
        totalTrials: number;
        completedBlocks: number;
        overallAccuracy: number;
        overallAverageRT: number;
        condition: string;
        completedAt: Date;
        sessionNumber: number;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true); useEffect(() => {
        // TODO: 実験データをlocalStorageまたはIndexedDBから取得
        setTimeout(() => {
            setExperimentData({
                totalTrials: 480,
                completedBlocks: 8,
                overallAccuracy: 87,
                overallAverageRT: 652,
                condition: 'static', // TODO: 実際の条件を取得
                completedAt: new Date(),
                sessionNumber: 1
            });
            setIsLoading(false);
        }, 1000);
    }, [uuid]);

    const handleDownloadData = () => {
        // TODO: 実験データのJSON形式でのダウンロード機能
        const dataStr = JSON.stringify(experimentData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `experiment-data-${uuid}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
                <Card className="w-full max-w-2xl">
                    <CardContent className="p-8 text-center">
                        <div className="space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="text-muted-foreground">実験データを処理しています...</p>
                        </div>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-4xl space-y-8">

                {/* 完了メッセージ */}
                <Card>
                    <CardHeader className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="p-4 bg-green-100 rounded-full">
                                <CheckCircle className="h-12 w-12 text-green-600" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl">実験完了！</CardTitle>
                        <CardDescription className="text-lg">
                            お疲れ様でした。実験データが正常に保存されました。
                        </CardDescription>
                    </CardHeader>
                </Card>

                {/* 実験結果サマリー */}
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Target className="mr-2 h-5 w-5" />
                                実験結果
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {experimentData?.overallAccuracy}%
                                    </div>
                                    <div className="text-sm text-muted-foreground">全体正答率</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {experimentData?.overallAverageRT}ms
                                    </div>
                                    <div className="text-sm text-muted-foreground">平均反応時間</div>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">総試行数:</span>
                                    <span className="font-medium">{experimentData?.totalTrials}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">完了ブロック:</span>
                                    <span className="font-medium">{experimentData?.completedBlocks}/8</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Calendar className="mr-2 h-5 w-5" />
                                実験情報
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">実験条件:</span>
                                    <Badge variant={experimentData?.condition === 'personalized' ? 'default' : 'secondary'}>
                                        {experimentData?.condition === 'personalized' ? 'Personalized' : 'Static'}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">セッション番号:</span>
                                    <span className="font-medium">{experimentData?.sessionNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">完了日時:</span>
                                    <span className="font-medium">
                                        {experimentData?.completedAt?.toLocaleDateString('ja-JP')} {experimentData?.completedAt?.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">参加者ID:</span>
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                        {uuid.slice(0, 8)}...
                                    </code>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 次のステップ */}
                <Card>
                    <CardHeader>
                        <CardTitle>次のステップ</CardTitle>
                        <CardDescription>
                            次回のセッションと今後の流れについて
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {experimentData?.sessionNumber === 1 ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div className="space-y-2">
                                        <h3 className="font-medium text-blue-900">セッション2のご案内</h3>
                                        <p className="text-sm text-blue-800">
                                            最低1日間隔を空けてから、セッション2（異なる条件での実験）にご参加ください。
                                            セッション2のURLは別途お送りいたします。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                    <div className="space-y-2">
                                        <h3 className="font-medium text-green-900">全セッション完了</h3>
                                        <p className="text-sm text-green-800">
                                            全ての実験セッションが完了しました。ご協力いただき、誠にありがとうございました。
                                            研究結果は学術発表にて公表予定です。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button variant="outline" onClick={handleDownloadData}>
                                <Download className="mr-2 h-4 w-4" />
                                データダウンロード
                            </Button>

                            <Button asChild>
                                <Link href="/">
                                    <Home className="mr-2 h-4 w-4" />
                                    ホームに戻る
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 謝辞 */}
                <Card className="bg-muted/30">
                    <CardContent className="p-6 text-center">
                        <h3 className="font-medium mb-2">ご協力ありがとうございました</h3>
                        <p className="text-sm text-muted-foreground">
                            この研究は認知心理学の発展に貢献し、学術的な知見の向上を目指しています。<br />
                            ご質問やご意見がございましたら、研究責任者までお気軽にお問い合わせください。
                        </p>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

interface CompletePageProps {
    params: Promise<{ uuid: string }>;
}

export default function CompletePage({ params }: CompletePageProps) {
    const { uuid } = use(params);

    return (
        <LanguageProvider>
            <CompleteContent uuid={uuid} />
        </LanguageProvider>
    );
}
