'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Download, Home, Info } from 'lucide-react';

interface IndexedDBData {
    experiments: any[];
    participants: any[];
    stats: {
        experimentCount: number;
        participantCount: number;
    };
}

export default function DataRecoveryPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [stats, setStats] = useState<IndexedDBData['stats'] | null>(null);

    const handleExportIndexedDB = async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(false);

            // IndexedDB からデータを取得
            const idbData = await getIndexedDBData();

            if (idbData.experiments.length === 0 && idbData.participants.length === 0) {
                setError('IndexedDB にデータが見つかりません');
                return;
            }

            setStats(idbData.stats);

            // JSON ファイルを生成してダウンロード
            const jsonString = JSON.stringify(idbData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `indexeddb-backup-${new Date().toISOString().replace(/[:.]/g, '').slice(0, -1)}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);

            setSuccess(true);
        } catch (err) {
            console.error('Error exporting IndexedDB:', err);
            setError(err instanceof Error ? err.message : 'IndexedDB からのエクスポートに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 space-y-6">
                {/* ヘッダー */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">データ復元</h1>
                        <p className="mt-2 text-muted-foreground">ブラウザの IndexedDB からローカル実験データを復元します</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            ホームに戻る
                        </Link>
                    </Button>
                </div>

                {/* 情報アラート */}
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        <p className="font-semibold mb-2">このページについて</p>
                        <p>Supabase への同期に失敗したが、ブラウザの IndexedDB に残っているローカル実験データをダウンロードできます。</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            ※ ブラウザのキャッシュをクリアすると IndexedDB のデータは削除されるため、定期的にバックアップをしてください。
                        </p>
                    </AlertDescription>
                </Alert>

                {/* エラーアラート */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* 成功アラート */}
                {success && stats && (
                    <Alert>
                        <AlertDescription className="space-y-2">
                            <p className="font-semibold">✅ ダウンロード完了しました</p>
                            <div className="text-sm space-y-1">
                                <p>実験データ: <span className="font-mono text-foreground">{stats.experimentCount}</span> 件</p>
                                <p>参加者データ: <span className="font-mono text-foreground">{stats.participantCount}</span> 件</p>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* メインカード */}
                <Card>
                    <CardHeader>
                        <CardTitle>IndexedDB データのエクスポート</CardTitle>
                        <CardDescription>
                            ブラウザに保存されているローカル実験データを JSON ファイルとしてダウンロードします
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg bg-muted p-4 space-y-2">
                            <p className="text-sm font-semibold">ダウンロード対象:</p>
                            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                                <li>experiments テーブル - 実験の進行状況、ブロック、試行結果</li>
                                <li>participants テーブル - 参加者のプロフィール情報</li>
                            </ul>
                        </div>

                        <Button
                            onClick={handleExportIndexedDB}
                            disabled={loading}
                            size="lg"
                            className="w-full"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {loading ? 'ダウンロード中...' : 'IndexedDB をダウンロード'}
                        </Button>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                            <p className="text-sm font-semibold text-amber-900">⚠️ 注意</p>
                            <ul className="text-sm space-y-1 list-disc list-inside text-amber-800">
                                <li>ブラウザのキャッシュクリアで IndexedDB データは削除されます</li>
                                <li>複数のブラウザを使用している場合、データがブラウザごとに分かれています</li>
                                <li>Firefox / Chrome / Safari など、ブラウザごとに IndexedDB は独立しています</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                {/* ダウンロード後の手順 */}
                <Card>
                    <CardHeader>
                        <CardTitle>ダウンロード後の手順</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">1. ダウンロードしたファイルを確認</p>
                                <p className="text-sm text-muted-foreground">JSON ファイルが正常にダウンロードされたか確認してください</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">2. データをバックアップ</p>
                                <p className="text-sm text-muted-foreground">ダウンロードしたファイルを安全な場所に保存してください</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">3. 管理者に連絡</p>
                                <p className="text-sm text-muted-foreground">
                                    ダウンロードしたファイルを admin に提出して、Supabase への手動アップロードを依頼してください
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/**
 * IndexedDB からすべてのデータを取得
 */
async function getIndexedDBData(): Promise<IndexedDBData> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('rt-experiment-db');

        request.onerror = () => {
            reject(new Error('IndexedDB を開くことができません'));
        };

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            try {
                const tx = db.transaction(['experiments', 'participants'], 'readonly');

                const experimentsStore = tx.objectStore('experiments');
                const participantsStore = tx.objectStore('participants');

                const experimentsRequest = experimentsStore.getAll();
                const participantsRequest = participantsStore.getAll();

                let experimentResults: any[] = [];
                let participantResults: any[] = [];
                let completed = 0;

                experimentsRequest.onsuccess = () => {
                    experimentResults = experimentsRequest.result;
                    completed++;
                    if (completed === 2) {
                        resolve({
                            experiments: experimentResults,
                            participants: participantResults,
                            stats: {
                                experimentCount: experimentResults.length,
                                participantCount: participantResults.length,
                            },
                        });
                    }
                };

                participantsRequest.onsuccess = () => {
                    participantResults = participantsRequest.result;
                    completed++;
                    if (completed === 2) {
                        resolve({
                            experiments: experimentResults,
                            participants: participantResults,
                            stats: {
                                experimentCount: experimentResults.length,
                                participantCount: participantResults.length,
                            },
                        });
                    }
                };

                experimentsRequest.onerror = () => {
                    reject(new Error('experiments テーブルの読み込みに失敗しました'));
                };

                participantsRequest.onerror = () => {
                    reject(new Error('participants テーブルの読み込みに失敗しました'));
                };
            } catch (error) {
                reject(error);
            }
        };
    });
}
