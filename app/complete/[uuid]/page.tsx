'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../../../lib/i18n';
import { getExperiment } from '../../../lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Download, Calendar, Clock, Target, AlertCircle } from 'lucide-react';
import { experimentConfig } from '@/lib/config/experiment';
import type { Experiment } from '@/types';

interface CompleteContentProps {
    uuid: string;
}

type SaveStatus = 'success' | 'local-only' | 'failed';

function CompleteContent({ uuid }: CompleteContentProps) {
    const { language } = useLanguage();
    const { totalBlocks, totalTrials, trialsPerBlock } = experimentConfig;
    const searchParams = useSearchParams();
    const condition = (searchParams.get('condition') as 'static' | 'personalized') || 'static';
    const rawSaveStatus = searchParams.get('saveStatus') as SaveStatus | null;
    const saveStatus: SaveStatus = rawSaveStatus === 'local-only' || rawSaveStatus === 'failed' || rawSaveStatus === 'success'
        ? rawSaveStatus
        : 'success';
    const [experimentData, setExperimentData] = useState<Experiment | null>(null);
    const [pendingExperimentData, setPendingExperimentData] = useState<Experiment | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const experimentId = `${uuid}-${condition}`;

        const fetchExperiment = async () => {
            try {
                const stored = await getExperiment(experimentId);
                if (stored?.experiment) {
                    setExperimentData(stored.experiment);
                } else {
                    setExperimentData(null);
                }
            } catch (error) {
                console.error('Failed to load experiment data:', error);
                setLoadError(language === 'ja' ? '実験データの取得に失敗しました' : 'Failed to retrieve experiment data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchExperiment();
    }, [condition, uuid, language]);

    useEffect(() => {
        if (saveStatus !== 'failed') {
            setPendingExperimentData(null);
            return;
        }

        if (typeof window === 'undefined') return;
        try {
            const pendingKey = `pending-experiment-${uuid}-${condition}`;
            const cached = sessionStorage.getItem(pendingKey);
            if (cached) {
                const parsed = JSON.parse(cached) as Experiment;
                setPendingExperimentData(parsed);
            }
        } catch (error) {
            console.warn('Failed to load pending experiment data:', error);
        }
    }, [condition, saveStatus, uuid]);

    const displayExperimentData = experimentData ?? pendingExperimentData;

    const plannedTotalTrials = displayExperimentData?.plannedTotalTrials ?? totalTrials;
    const plannedTrialsPerBlock = displayExperimentData?.plannedTrialsPerBlock ?? trialsPerBlock;
    const recordedTrials = displayExperimentData
        ? displayExperimentData.blocks.reduce((sum, block) => sum + block.trials.length, 0)
        : 0;
    const totalTrialsAttempted = displayExperimentData?.totalTrialsAttempted ?? recordedTrials;
    const totalTrialDisplay = displayExperimentData?.completedAt
        ? Math.max(totalTrialsAttempted, plannedTotalTrials)
        : totalTrialsAttempted;
    const blockGoal = plannedTrialsPerBlock > 0
        ? Math.round(plannedTotalTrials / plannedTrialsPerBlock)
        : totalBlocks;
    const blockGoalDisplay = blockGoal || totalBlocks;
    const completedBlocks = displayExperimentData?.blocks.length ?? 0;
    const overallAccuracy = displayExperimentData?.overallAccuracy ?? 0;
    const overallAverageRT = displayExperimentData?.overallAverageRT ?? 0;
    const completedAt = displayExperimentData?.completedAt ? new Date(displayExperimentData.completedAt) : null;
    const sessionNumber = displayExperimentData?.sessionNumber ?? (condition === 'personalized' ? 2 : 1);
    const conditionLabel = (displayExperimentData?.conditionType || condition) === 'personalized' ? 'Personalized' : 'Static';
    const conditionBadgeVariant = (displayExperimentData?.conditionType || condition) === 'personalized' ? 'default' : 'secondary';
    const hasDownloadableData = Boolean(displayExperimentData);
    const shouldShowDownloadFallback = saveStatus !== 'success' && hasDownloadableData;

    const handleDownloadData = () => {
        if (!displayExperimentData) return;
        const dataStr = JSON.stringify(displayExperimentData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `experiment-data-${displayExperimentData.id}.json`;
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
                            <p className="text-muted-foreground">
                                {language === 'ja' ? '実験データを処理しています...' : 'Processing experiment data...'}
                            </p>
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
                        <CardTitle className="text-3xl">
                            {language === 'ja' ? '実験完了！' : 'Experiment finished!'}
                        </CardTitle>
                        <CardDescription className="text-lg">
                            {language === 'ja'
                                ? 'お疲れ様でした。実験データが正常に保存されました。'
                                : 'Great work. Your data has been saved successfully.'}
                        </CardDescription>
                    </CardHeader>
                </Card>

                {loadError && (
                    <Card>
                        <CardContent className="text-center text-sm text-destructive">
                            {loadError}
                        </CardContent>
                    </Card>
                )}

                {saveStatus !== 'success' && (
                    <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="flex gap-3 text-sm text-amber-900">
                            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                                <p className="font-semibold">
                                    {language === 'ja'
                                        ? 'データ保存についてのお知らせ'
                                        : 'Data delivery notice'}
                                </p>
                                <p>
                                    {saveStatus === 'failed'
                                        ? (language === 'ja'
                                            ? 'ブラウザへの保存が完了しませんでした。'
                                            : 'We could not finish saving the session data in your browser.')
                                        : (language === 'ja'
                                            ? 'ネットワークが不安定なため、サーバーへの自動送信に失敗しました。'
                                            : 'A network issue prevented us from uploading your data automatically.')}
                                </p>
                                {hasDownloadableData ? (
                                    <p>
                                        {language === 'ja'
                                            ? '下の「計測データを保存」ボタンからJSONをダウンロードし、担当者へメール等で共有してください。'
                                            : 'Please download the JSON file below and send it to the study contact via email or chat.'}
                                    </p>
                                ) : (
                                    <p>
                                        {language === 'ja'
                                            ? '担当者からの案内があるまで、この画面を閉じずにお待ちください。'
                                            : 'Please keep this window open and contact the study staff for further instructions.'}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!displayExperimentData ? (
                    <Card>
                        <CardContent className="space-y-4 text-center">
                            <p className="text-muted-foreground">
                                {language === 'ja'
                                    ? '実験データを確認できませんでした。ブラウザのストレージが削除された可能性があります。'
                                    : 'We could not locate your experiment data. It may have been cleared from local storage.'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {language === 'ja'
                                    ? '担当者まで状況をご連絡ください。'
                                    : 'Please contact the study staff so we can assist you.'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Target className="mr-2 h-5 w-5" />
                                        {language === 'ja' ? '実験結果' : 'Experiment results'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {overallAccuracy}%
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {language === 'ja' ? '全体正答率' : 'Overall accuracy'}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {overallAverageRT}ms
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {language === 'ja' ? '平均反応時間' : 'Average reaction time'}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                {language === 'ja' ? '総試行数:' : 'Total trials:'}
                                            </span>
                                            <span className="font-medium">{totalTrialDisplay}/{plannedTotalTrials}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                {language === 'ja' ? '完了ブロック:' : 'Blocks completed:'}
                                            </span>
                                            <span className="font-medium">{completedBlocks}/{blockGoalDisplay}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Calendar className="mr-2 h-5 w-5" />
                                        {language === 'ja' ? '実験情報' : 'Experiment details'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                {language === 'ja' ? '実験条件:' : 'Condition:'}
                                            </span>
                                            <Badge variant={conditionBadgeVariant}>{conditionLabel}</Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                {language === 'ja' ? 'セッション番号:' : 'Session number:'}
                                            </span>
                                            <span className="font-medium">{sessionNumber}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                {language === 'ja' ? '完了日時:' : 'Completed at:'}
                                            </span>
                                            <span className="font-medium">
                                                {completedAt
                                                    ? `${completedAt.toLocaleDateString('ja-JP')} ${completedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
                                                    : '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                {language === 'ja' ? '参加者ID:' : 'Participant ID:'}
                                            </span>
                                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                                {uuid.slice(0, 8)}...
                                            </code>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {language === 'ja' ? '次のステップ' : 'Next steps'}
                                </CardTitle>
                                <CardDescription>
                                    {language === 'ja'
                                        ? '次回のセッションと今後の流れについて'
                                        : 'What happens after this session'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-amber-900">
                                            {language === 'ja' ? '次のステップ' : 'Next step'}
                                        </p>
                                        <p className="text-sm text-amber-900">
                                            {language === 'ja'
                                                ? '実験担当者に完了したことを連絡してください。'
                                                : 'Please contact the experiment staff to let them know you have finished.'}
                                        </p>
                                    </div>
                                </div>

                                {sessionNumber === 1 ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-start space-x-3">
                                            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                                            <div className="space-y-2">
                                                <h3 className="font-medium text-blue-900">
                                                    {language === 'ja' ? 'セッション2のご案内' : 'Preparing for session 2'}
                                                </h3>
                                                <p className="text-sm text-blue-800">
                                                    {language === 'ja'
                                                        ? '最低1日間隔を空けてから、セッション2（異なる条件での実験）にご参加ください。セッション2のURLは別途お送りいたします。'
                                                        : 'Please leave at least one day between sessions before joining session 2 (the alternate condition). We will send the session 2 link separately.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-start space-x-3">
                                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                            <div className="space-y-2">
                                                <h3 className="font-medium text-green-900">
                                                    {language === 'ja' ? '全セッション完了' : 'All sessions complete'}
                                                </h3>
                                                <p className="text-sm text-green-800">
                                                    {language === 'ja'
                                                        ? '全ての実験セッションが完了しました。ご協力いただき、誠にありがとうございました。研究結果は学術発表にて公表予定です。'
                                                        : 'You have completed every session—thank you so much for your time. Findings will be shared in future academic publications.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <p className="text-sm text-muted-foreground">
                                    {language === 'ja'
                                        ? '内容を確認したら、この画面は閉じていただいて問題ありません。'
                                        : 'After reviewing this information, you may close this window.'}
                                </p>

                                {shouldShowDownloadFallback && (
                                    <div className="rounded-lg border border-dashed border-amber-300 bg-white/80 p-4 space-y-3">
                                        <p className="text-sm text-amber-900">
                                            {language === 'ja'
                                                ? '自動保存が完了していないため、計測データをダウンロードし担当者まで共有してください。'
                                                : 'Because the automatic upload did not finish, please download the data and share it with the study contact.'}
                                        </p>
                                        <Button variant="outline" onClick={handleDownloadData} className="w-full sm:w-auto">
                                            <Download className="mr-2 h-4 w-4" />
                                            {language === 'ja' ? '計測データを保存' : 'Save data file'}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* 謝辞 */}
                <Card className="bg-muted/30">
                    <CardContent className="p-6 text-center">
                        <h3 className="font-medium mb-2">
                            {language === 'ja' ? 'ご協力ありがとうございました' : 'Thank you for participating'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {language === 'ja'
                                ? '計測したデータは個人が特定できない形で活用させていただきます。不明点やご質問があれば担当者までお気軽にご連絡ください。'
                                : 'We will use your recorded data only in a de-identified form. Please reach out to the study staff if you have any questions.'}
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
