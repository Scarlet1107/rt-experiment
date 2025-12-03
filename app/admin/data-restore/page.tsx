'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowLeft, Upload, Info, Zap, ChevronDown } from 'lucide-react';
import type { BlockResult } from '@/types';

interface ImportData {
    experiments: Array<{
        experiment: {
            id: string;
            participantId: string;
            conditionType: 'static' | 'personalized';
            blocks: BlockResult[];
        };
    }>;
}

interface ComparisonData {
    experimentId: string;
    participantId: string;
    conditionType: 'static' | 'personalized';
    current: {
        blocks: BlockResult[];
        totalTrials: number;
    };
    incoming: {
        blocks: BlockResult[];
        totalTrials: number;
    };
}

export default function DataRestorePage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importedData, setImportedData] = useState<ImportData | null>(null);
    const [comparisons, setComparisons] = useState<ComparisonData[]>([]);
    const [selectedComparison, setSelectedComparison] = useState<string | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        const file = files[0];
        if (!file.name.endsWith('.json')) {
            setError('JSON ファイルをアップロードしてください');
            return;
        }

        await processFile(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.currentTarget.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    const fetchCurrentExperimentData = async (
        experimentId: string,
        participantId: string,
        conditionType: string
    ) => {
        try {
            const params = new URLSearchParams({
                experimentId,
                participantId,
                conditionType,
            });

            const response = await fetch(`/api/admin/experiments?${params.toString()}`);

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.experiment;
        } catch (err) {
            console.error('現在のデータ取得エラー:', err);
            return null;
        }
    };

    const processFile = async (file: File) => {
        try {
            setLoading(true);
            setError(null);

            const text = await file.text();
            const data: ImportData = JSON.parse(text);

            if (!data.experiments || !Array.isArray(data.experiments)) {
                throw new Error('無効な JSON 形式です。experiments 配列が見つかりません');
            }

            setImportedData(data);

            // 比較データを生成（Supabase からのデータ取得を含む）
            const newComparisons: ComparisonData[] = [];

            for (const importedExp of data.experiments) {
                const incomingBlocks = importedExp.experiment.blocks || [];
                const incomingTotalTrials = incomingBlocks.reduce(
                    (sum: number, block: BlockResult) => sum + (block.trials?.length || 0),
                    0
                );

                // Supabase から現在のデータを取得
                const currentExp = await fetchCurrentExperimentData(
                    importedExp.experiment.id,
                    importedExp.experiment.participantId,
                    importedExp.experiment.conditionType
                );

                const currentBlocks = currentExp?.blocks || [];
                const currentTotalTrials = currentBlocks.reduce(
                    (sum: number, block: BlockResult) => sum + (block.trials?.length || 0),
                    0
                );

                newComparisons.push({
                    experimentId: importedExp.experiment.id,
                    participantId: importedExp.experiment.participantId,
                    conditionType: importedExp.experiment.conditionType,
                    current: {
                        blocks: currentBlocks,
                        totalTrials: currentTotalTrials,
                    },
                    incoming: {
                        blocks: incomingBlocks,
                        totalTrials: incomingTotalTrials,
                    },
                });
            }

            setComparisons(newComparisons);
            if (newComparisons.length > 0) {
                setSelectedComparison(newComparisons[0].experimentId);
            }
        } catch (err) {
            console.error('Error processing file:', err);
            setError(err instanceof Error ? err.message : 'ファイルの処理に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const toggleBlockExpansion = (blockId: string) => {
        setExpandedBlocks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(blockId)) {
                newSet.delete(blockId);
            } else {
                newSet.add(blockId);
            }
            return newSet;
        });
    };

    const handleRestore = async () => {
        if (!importedData || !selectedComparison) return;

        try {
            setRestoring(true);
            setError(null);

            const comparison = comparisons.find(c => c.experimentId === selectedComparison);
            if (!comparison) {
                setError('復元対象が選択されていません');
                return;
            }

            const serializedBlocks = comparison.incoming.blocks.map(block => ({
                ...block,
                completedAt: block.completedAt instanceof Date
                    ? block.completedAt.toISOString()
                    : block.completedAt,
                trials: (block.trials || []).map(trial => ({
                    ...trial,
                    timestamp: trial.timestamp instanceof Date
                        ? trial.timestamp.toISOString()
                        : trial.timestamp,
                })),
            }));

            console.log('復元リクエスト送信:', {
                experimentId: comparison.experimentId,
                participantId: comparison.participantId,
                conditionType: comparison.conditionType,
                blocksCount: serializedBlocks.length,
                trialsCount: serializedBlocks.reduce((sum: number, b: any) => sum + (b.trials?.length || 0), 0),
            });

            const response = await fetch('/api/admin/restore-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    experimentId: comparison.experimentId,
                    participantId: comparison.participantId,
                    conditionType: comparison.conditionType,
                    experiment: serializedBlocks,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '復元に失敗しました');
            }

            const result = await response.json();
            console.log('復元完了:', result);

            setImportedData(null);
            setComparisons([]);
            setSelectedComparison(null);
            alert(`データ復元が完了しました\n\nブロック: ${result.restored.blocksCount}件\n試行: ${result.restored.trialsCount}件`);

            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (err) {
            console.error('Error restoring data:', err);
            setError(err instanceof Error ? err.message : 'データ復元に失敗しました');
        } finally {
            setRestoring(false);
        }
    };

    const selectedComparisonData = comparisons.find(c => c.experimentId === selectedComparison);

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
                {/* ヘッダー */}
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">データ復元（管理者用）</h1>
                        <p className="mt-2 text-muted-foreground">IndexedDB バックアップから Supabase へのデータ復元</p>
                    </div>
                </div>

                {/* 警告アラート */}
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <p className="font-semibold mb-2">⚠️ 重要</p>
                        <p>
                            このページは本番環境でのデータ復元に使用します。ParticipantID と Condition Type が完全に一致するデータのみが上書きされます。
                        </p>
                        <p className="mt-2 text-sm">
                            プレビューで内容を確認してから復元を実行してください。
                        </p>
                    </AlertDescription>
                </Alert>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* ファイルアップロード */}
                {!importedData && (
                    <Card>
                        <CardHeader>
                            <CardTitle>JSON ファイルをアップロード</CardTitle>
                            <CardDescription>
                                IndexedDB エクスポートされた JSON ファイルをドラッグ＆ドロップまたは選択してください
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                onDrop={handleFileDrop}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full"
                                    disabled={loading}
                                >
                                    <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-lg font-semibold mb-1">
                                        ファイルをドラッグ＆ドロップ
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        または <span className="text-primary font-medium">ここをクリック</span> して選択
                                    </p>
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* インポート情報と比較ビュー */}
                {importedData && (
                    <>
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                <p className="font-semibold mb-2">✅ ファイルをアップロードしました</p>
                                <p>実験データ: <span className="font-mono font-semibold">{importedData.experiments.length}</span> 件</p>
                            </AlertDescription>
                        </Alert>

                        {/* 実験リスト */}
                        {comparisons.length > 1 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>復元対象の実験を選択</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {comparisons.map(comp => (
                                            <button
                                                key={comp.experimentId}
                                                onClick={() => setSelectedComparison(comp.experimentId)}
                                                className={`text-left p-3 rounded-lg border transition-colors ${selectedComparison === comp.experimentId
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-muted hover:border-muted-foreground/50'
                                                    }`}
                                            >
                                                <p className="text-sm font-semibold truncate">ID: {comp.experimentId.slice(0, 12)}...</p>
                                                <p className="text-xs text-muted-foreground">条件: {comp.conditionType}</p>
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Git diff ライクな比較ビュー */}
                        {selectedComparisonData && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>データ差分比較</CardTitle>
                                            <CardDescription>左が現在のデータ、右がアップロード後のデータです</CardDescription>
                                        </div>
                                        <Badge variant={selectedComparisonData.current.totalTrials === 0 ? 'secondary' : 'default'}>
                                            新規 {selectedComparisonData.current.totalTrials === 0 ? '(作成)' : '(上書き)'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* サマリー比較 */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <p className="text-xs font-semibold text-red-700 mb-3">現在のデータ</p>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-red-600">ブロック</p>
                                                    <p className="text-2xl font-bold text-red-700">{selectedComparisonData.current.blocks.length}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-red-600">試行数</p>
                                                    <p className="text-xl font-semibold text-red-700">{selectedComparisonData.current.totalTrials}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <p className="text-xs font-semibold text-green-700 mb-3">アップロード後</p>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-green-600">ブロック</p>
                                                    <p className="text-2xl font-bold text-green-700">{selectedComparisonData.incoming.blocks.length}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-green-600">試行数</p>
                                                    <p className="text-xl font-semibold text-green-700">{selectedComparisonData.incoming.totalTrials}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ブロック詳細比較 */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-lg">ブロック詳細</h4>
                                        {selectedComparisonData.incoming.blocks.map((incomingBlock) => {
                                            const currentBlock = selectedComparisonData.current.blocks.find(b => b.blockNumber === incomingBlock.blockNumber);
                                            const blockId = incomingBlock.id;
                                            const isExpanded = expandedBlocks.has(blockId);

                                            return (
                                                <div key={blockId} className="border rounded-lg overflow-hidden">
                                                    <div
                                                        className="grid grid-cols-2 gap-0 cursor-pointer hover:bg-muted/50"
                                                        onClick={() => toggleBlockExpansion(blockId)}
                                                    >
                                                        {/* 左：現在のデータ */}
                                                        <div className="bg-red-50 border-r border-gray-200 p-4 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <p className="font-semibold text-sm">Block {incomingBlock.blockNumber}</p>
                                                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                            </div>
                                                            {currentBlock ? (
                                                                <>
                                                                    <p className="text-xs"><span className="font-semibold">試行:</span> {currentBlock.trials?.length || 0}</p>
                                                                    <p className="text-xs"><span className="font-semibold">正答率:</span> {currentBlock.accuracy?.toFixed(1) || 'N/A'}%</p>
                                                                    <p className="text-xs"><span className="font-semibold">平均RT:</span> {currentBlock.averageRT?.toFixed(0) || 'N/A'}ms</p>
                                                                </>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground italic">データなし</p>
                                                            )}
                                                        </div>
                                                        {/* 右：アップロード後のデータ */}
                                                        <div className="bg-green-50 p-4 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <p className="font-semibold text-sm">Block {incomingBlock.blockNumber}</p>
                                                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                            </div>
                                                            <p className="text-xs"><span className="font-semibold">試行:</span> {incomingBlock.trials?.length || 0}</p>
                                                            <p className="text-xs"><span className="font-semibold">正答率:</span> {incomingBlock.accuracy?.toFixed(1) || 'N/A'}%</p>
                                                            <p className="text-xs"><span className="font-semibold">平均RT:</span> {incomingBlock.averageRT?.toFixed(0) || 'N/A'}ms</p>
                                                        </div>
                                                    </div>

                                                    {/* 展開時：試行詳細 */}
                                                    {isExpanded && (
                                                        <div className="border-t grid grid-cols-2 gap-0">
                                                            {/* 左：現在の試行データ */}
                                                            <div className="bg-red-50 border-r border-gray-200 p-4">
                                                                <p className="text-xs font-semibold mb-3 text-red-700">現在の試行</p>
                                                                {currentBlock?.trials && currentBlock.trials.length > 0 ? (
                                                                    <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                                                                        {currentBlock.trials.map((trial, trialIdx) => (
                                                                            <div key={trial.id} className="pb-2 border-b border-red-200 last:border-b-0">
                                                                                <p className="font-mono font-semibold">試行 {trialIdx + 1}</p>
                                                                                <p><span className="font-semibold">単語:</span> {trial.stimulus.word}</p>
                                                                                <p><span className="font-semibold">色:</span> {trial.stimulus.inkColor}</p>
                                                                                <p><span className="font-semibold">正誤:</span> {trial.isCorrect === null ? 'timeout' : trial.isCorrect ? '○' : '×'}</p>
                                                                                <p><span className="font-semibold">RT:</span> {trial.reactionTime ? Math.round(trial.reactionTime) : '-'}ms</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-muted-foreground italic">試行データなし</p>
                                                                )}
                                                            </div>
                                                            {/* 右：アップロード後の試行データ */}
                                                            <div className="bg-green-50 p-4">
                                                                <p className="text-xs font-semibold mb-3 text-green-700">アップロード後の試行</p>
                                                                {incomingBlock.trials && incomingBlock.trials.length > 0 ? (
                                                                    <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                                                                        {incomingBlock.trials.map((trial, trialIdx) => (
                                                                            <div key={trial.id} className="pb-2 border-b border-green-200 last:border-b-0">
                                                                                <p className="font-mono font-semibold">試行 {trialIdx + 1}</p>
                                                                                <p><span className="font-semibold">単語:</span> {trial.stimulus.word}</p>
                                                                                <p><span className="font-semibold">色:</span> {trial.stimulus.inkColor}</p>
                                                                                <p><span className="font-semibold">正誤:</span> {trial.isCorrect === null ? 'timeout' : trial.isCorrect ? '○' : '×'}</p>
                                                                                <p><span className="font-semibold">RT:</span> {trial.reactionTime ? Math.round(trial.reactionTime) : '-'}ms</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-muted-foreground italic">試行データなし</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* アクション */}
                                    <div className="flex gap-3 pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setImportedData(null);
                                                setComparisons([]);
                                                setSelectedComparison(null);
                                                setExpandedBlocks(new Set());
                                            }}
                                        >
                                            キャンセル
                                        </Button>
                                        <Button
                                            onClick={handleRestore}
                                            disabled={restoring}
                                            className="ml-auto"
                                        >
                                            <Zap className="h-4 w-4 mr-2" />
                                            {restoring ? '復元中...' : 'このデータで復元'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
