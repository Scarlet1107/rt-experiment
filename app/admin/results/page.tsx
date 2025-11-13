'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, BarChart3, Home, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type ConditionType = 'static' | 'personalized';
type ConditionFilter = 'all' | ConditionType;
type RtMode = 'all' | 'correctOnly';

interface ApiBlock {
    id: string;
    block_number: number;
    accuracy: number | null;
    average_rt: number | null;
    average_rt_correct_only: number | null;
    completed_at: string | null;
}

interface ApiExperiment {
    id: string;
    condition_type: ConditionType;
    started_at: string | null;
    completed_at: string | null;
    blocks?: ApiBlock[] | null;
}

interface ApiParticipant {
    id: string;
    name: string | null;
    nickname: string | null;
    created_at: string;
    experiments: ApiExperiment[];
}

interface BlockMetric {
    participantId: string;
    participantLabel: string;
    experimentId: string;
    conditionType: ConditionType;
    blockNumber: number;
    accuracy: number | null;
    averageRt: number | null;
    averageRtCorrectOnly: number | null;
    completedAt: Date | null;
}

interface ParticipantWithMetrics {
    id: string;
    label: string;
    createdAt: Date;
    metrics: BlockMetric[];
}

interface AggregatedRow {
    blockNumber: number;
    contributorCount: number;
    avgAccuracy: number | null;
    avgRt: number | null;
}

const conditionDisplay: Record<ConditionType, string> = {
    static: 'Static',
    personalized: 'Personalized',
};

const conditionOrder: Record<ConditionType, number> = {
    static: 0,
    personalized: 1,
};

const rtModeCopy: Record<RtMode, { title: string; description: string }> = {
    all: {
        title: '不正解を含むRT',
        description: '平均反応時間にすべての試行を含めます（デフォルト）。',
    },
    correctOnly: {
        title: '正解のみのRT',
        description: '反応時間を正解試行に限定します。',
    },
};

const conditionFilterCopy: Record<ConditionFilter, string> = {
    all: '両条件',
    static: 'Static',
    personalized: 'Personalized',
};

export default function AdminResultsPage() {
    const [participants, setParticipants] = useState<ApiParticipant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
    const [participantCondition, setParticipantCondition] = useState<ConditionFilter>('all');
    const [aggregateCondition, setAggregateCondition] = useState<ConditionFilter>('all');
    const [rtMode, setRtMode] = useState<RtMode>('all');

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch('/api/admin/participants', { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error('参加者データの取得に失敗しました');
                }
                const data = await response.json() as { participants: ApiParticipant[] };
                setParticipants(data.participants ?? []);
            } catch (err) {
                console.error('Failed to load admin analytics payload:', err);
                setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const participantsWithMetrics = useMemo<ParticipantWithMetrics[]>(() => {
        return participants.map(part => {
            const label = part.nickname || part.name || `ID ${part.id.slice(0, 8)}`;
            const metrics: BlockMetric[] = (part.experiments ?? []).flatMap(exp => {
                const blocks = exp.blocks ?? [];
                return blocks.map(block => ({
                    participantId: part.id,
                    participantLabel: label,
                    experimentId: exp.id,
                    conditionType: exp.condition_type,
                    blockNumber: block.block_number,
                    accuracy: block.accuracy,
                    averageRt: block.average_rt,
                    averageRtCorrectOnly: block.average_rt_correct_only,
                    completedAt: block.completed_at ? new Date(block.completed_at) : null,
                }));
            });

            const sortedMetrics = metrics.sort((a, b) => {
                if (a.conditionType === b.conditionType) {
                    return a.blockNumber - b.blockNumber;
                }
                return conditionOrder[a.conditionType] - conditionOrder[b.conditionType];
            });

            return {
                id: part.id,
                label,
                createdAt: new Date(part.created_at),
                metrics: sortedMetrics,
            };
        }).filter(part => part.metrics.length > 0);
    }, [participants]);

    useEffect(() => {
        if (participantsWithMetrics.length === 0) return;
        if (selectedParticipantId) return;
        setSelectedParticipantId(participantsWithMetrics[0].id);
    }, [participantsWithMetrics, selectedParticipantId]);

    const blockMetrics = useMemo(() => participantsWithMetrics.flatMap(p => p.metrics), [participantsWithMetrics]);

    const selectedParticipant = useMemo(
        () => participantsWithMetrics.find(p => p.id === selectedParticipantId) ?? null,
        [participantsWithMetrics, selectedParticipantId]
    );

    const filteredParticipantMetrics = useMemo(() => {
        if (!selectedParticipant) return [];
        return selectedParticipant.metrics.filter(metric =>
            participantCondition === 'all' ? true : metric.conditionType === participantCondition
        );
    }, [participantCondition, selectedParticipant]);

    const participantSummary = useMemo(() => {
        if (!filteredParticipantMetrics.length) return null;
        const accuracyValues = filteredParticipantMetrics
            .map(m => m.accuracy)
            .filter((value): value is number => typeof value === 'number');
        const rtValues = filteredParticipantMetrics
            .map(m => getRtValue(m, rtMode))
            .filter((value): value is number => typeof value === 'number');

        const avgAccuracy = accuracyValues.length
            ? Math.round(accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length)
            : null;
        const avgRt = rtValues.length
            ? Math.round(rtValues.reduce((sum, value) => sum + value, 0) / rtValues.length)
            : null;

        return { avgAccuracy, avgRt };
    }, [filteredParticipantMetrics, rtMode]);

    const participantCharts = useMemo(() => {
        return {
            accuracy: filteredParticipantMetrics.map(metric => ({
                x: metric.blockNumber,
                y: metric.accuracy,
                label: `Block ${metric.blockNumber}`,
            })),
            rt: filteredParticipantMetrics.map(metric => ({
                x: metric.blockNumber,
                y: getRtValue(metric, rtMode),
                label: `Block ${metric.blockNumber}`,
            })),
        };
    }, [filteredParticipantMetrics, rtMode]);

    const aggregatedRows = useMemo<AggregatedRow[]>(() => {
        const filtered = blockMetrics.filter(metric =>
            aggregateCondition === 'all' ? true : metric.conditionType === aggregateCondition
        );

        const map = new Map<number, { accuracy: number[]; rt: number[]; contributors: number }>();

        filtered.forEach(metric => {
            const rtValue = getRtValue(metric, rtMode);
            if (!map.has(metric.blockNumber)) {
                map.set(metric.blockNumber, { accuracy: [], rt: [], contributors: 0 });
            }
            const entry = map.get(metric.blockNumber)!;
            if (typeof metric.accuracy === 'number') {
                entry.accuracy.push(metric.accuracy);
            }
            if (typeof rtValue === 'number') {
                entry.rt.push(rtValue);
            }
            entry.contributors += 1;
        });

        return Array.from(map.entries())
            .sort(([a], [b]) => a - b)
            .map(([blockNumber, entry]) => ({
                blockNumber,
                contributorCount: entry.contributors,
                avgAccuracy: entry.accuracy.length
                    ? Math.round(entry.accuracy.reduce((sum, value) => sum + value, 0) / entry.accuracy.length)
                    : null,
                avgRt: entry.rt.length
                    ? Math.round(entry.rt.reduce((sum, value) => sum + value, 0) / entry.rt.length)
                    : null,
            }));
    }, [aggregateCondition, blockMetrics, rtMode]);

    const aggregatedSummary = useMemo(() => {
        if (!aggregatedRows.length) return null;
        const accuracyValues = aggregatedRows
            .map(row => row.avgAccuracy)
            .filter((value): value is number => typeof value === 'number');
        const rtValues = aggregatedRows
            .map(row => row.avgRt)
            .filter((value): value is number => typeof value === 'number');

        return {
            avgAccuracy: accuracyValues.length
                ? Math.round(accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length)
                : null,
            avgRt: rtValues.length
                ? Math.round(rtValues.reduce((sum, value) => sum + value, 0) / rtValues.length)
                : null,
        };
    }, [aggregatedRows]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="w-96">
                    <CardContent className="p-6">
                        <div className="text-center space-y-4">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground">実験結果を集計しています...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">実験結果ビュー</h1>
                        <p className="mt-2 text-muted-foreground">
                            ブロック単位の反応時間と正答率を参加者別・全体平均で確認できます
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/admin">
                                <Home className="mr-2 h-4 w-4" />
                                ダッシュボードに戻る
                            </Link>
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.location.reload();
                                }
                            }}
                        >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            データを再取得
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>表示設定</CardTitle>
                        <CardDescription>反応時間の集計方法を切り替えて解析の観点を揃えます</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium mb-2">反応時間の集計モード</p>
                            <RadioGroup
                                value={rtMode}
                                onValueChange={value => setRtMode(value as RtMode)}
                                className="flex flex-col gap-2 sm:flex-row"
                            >
                                {(['all', 'correctOnly'] as RtMode[]).map(mode => (
                                    <label
                                        key={mode}
                                        className={cn(
                                            'flex flex-1 cursor-pointer items-center gap-3 rounded-md border p-3 transition hover:bg-muted',
                                            rtMode === mode ? 'border-primary bg-primary/5' : 'border-border'
                                        )}
                                    >
                                        <RadioGroupItem value={mode} id={`rt-${mode}`} />
                                        <div>
                                            <p className="text-sm font-semibold">{rtModeCopy[mode].title}</p>
                                            <p className="text-xs text-muted-foreground">{rtModeCopy[mode].description}</p>
                                        </div>
                                    </label>
                                ))}
                            </RadioGroup>
                        </div>
                    </CardContent>
                </Card>

                {participantsWithMetrics.length === 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>まだ集計できるデータがありません</CardTitle>
                            <CardDescription>
                                本番実験を完了した参加者のデータが保存されると、ここでブロック単位の結果を確認できます。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                テスト参加者で本番実験を完走し、管理者ページで「同期」されていることを確認してください。
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
                            <Card className="h-full">
                                <CardHeader>
                                    <CardTitle>参加者一覧</CardTitle>
                                    <CardDescription>ブロック結果が保存されている ID</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[460px] pr-2">
                                        <div className="space-y-2">
                                            {participantsWithMetrics.map(participant => (
                                                <Button
                                                    key={participant.id}
                                                    variant={participant.id === selectedParticipantId ? 'default' : 'ghost'}
                                                    className="w-full justify-start text-left"
                                                    onClick={() => setSelectedParticipantId(participant.id)}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm">{participant.label}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            ブロック数: {participant.metrics.length}
                                                        </span>
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card className="overflow-hidden">
                                <CardHeader className="space-y-2">
                                    <CardTitle>参加者別ブロック指標</CardTitle>
                                    <CardDescription>
                                        選択した参加者のブロックごとの正答率と反応時間を確認できます
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {selectedParticipant ? (
                                        <>
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">対象参加者</p>
                                                    <p className="text-2xl font-semibold">{selectedParticipant.label}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        初回登録: {selectedParticipant.createdAt.toLocaleDateString('ja-JP')}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <p className="text-sm text-muted-foreground">条件フィルター</p>
                                                    <RadioGroup
                                                        value={participantCondition}
                                                        onValueChange={value => setParticipantCondition(value as ConditionFilter)}
                                                        className="flex flex-col gap-2 sm:flex-row"
                                                    >
                                                        {(['all', 'static', 'personalized'] as ConditionFilter[]).map(option => (
                                                            <label
                                                                key={option}
                                                                className={cn(
                                                                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted',
                                                                    participantCondition === option ? 'border-primary bg-primary/5' : 'border-border'
                                                                )}
                                                            >
                                                                <RadioGroupItem value={option} id={`participant-${option}`} />
                                                                {conditionFilterCopy[option]}
                                                            </label>
                                                        ))}
                                                    </RadioGroup>
                                                </div>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <StatCard
                                                    label="平均正答率"
                                                    value={participantSummary?.avgAccuracy != null ? `${participantSummary.avgAccuracy}%` : '—'}
                                                    subLabel="選択中のブロックで算出"
                                                />
                                                <StatCard
                                                    label="平均反応時間"
                                                    value={participantSummary?.avgRt != null ? `${participantSummary.avgRt}ms` : '—'}
                                                    subLabel={rtModeCopy[rtMode].title}
                                                />
                                            </div>

                                            <Sparkline
                                                label="正答率トレンド"
                                                unit="%"
                                                color="#16a34a"
                                                data={participantCharts.accuracy}
                                            />
                                            <Sparkline
                                                label="反応時間トレンド"
                                                unit="ms"
                                                color="#2563eb"
                                                data={participantCharts.rt}
                                            />

                                            <Separator />

                                            {filteredParticipantMetrics.length ? (
                                                <ScrollArea className="h-[320px]">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>条件</TableHead>
                                                                <TableHead>ブロック</TableHead>
                                                                <TableHead>正答率</TableHead>
                                                                <TableHead>平均RT</TableHead>
                                                                <TableHead>完了日時</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {filteredParticipantMetrics.map(metric => (
                                                                <TableRow key={`${metric.experimentId}-${metric.blockNumber}`}>
                                                                    <TableCell>
                                                                        <Badge variant="outline">{conditionDisplay[metric.conditionType]}</Badge>
                                                                    </TableCell>
                                                                    <TableCell>{metric.blockNumber}</TableCell>
                                                                    <TableCell>
                                                                        {typeof metric.accuracy === 'number' ? `${metric.accuracy}%` : '—'}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {formatRtValue(getRtValue(metric, rtMode))}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-muted-foreground">
                                                                        {metric.completedAt
                                                                            ? metric.completedAt.toLocaleString('ja-JP', {
                                                                                month: '2-digit',
                                                                                day: '2-digit',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit',
                                                                            })
                                                                            : '—'}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </ScrollArea>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    選択した条件では表示できるブロック結果がありません。
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            参加者を選択すると詳細が表示されます。
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader className="space-y-2">
                                <CardTitle>複数参加者の平均</CardTitle>
                                <CardDescription>
                                    条件別にブロック番号ごとの平均正答率と平均反応時間を算出します
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <StatCard
                                            label="全体平均正答率"
                                            value={aggregatedSummary?.avgAccuracy != null ? `${aggregatedSummary.avgAccuracy}%` : '—'}
                                            subLabel={`フィルター: ${conditionFilterCopy[aggregateCondition]}`}
                                        />
                                        <StatCard
                                            label="全体平均RT"
                                            value={aggregatedSummary?.avgRt != null ? `${aggregatedSummary.avgRt}ms` : '—'}
                                            subLabel={rtModeCopy[rtMode].title}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm text-muted-foreground">条件フィルター</p>
                                        <RadioGroup
                                            value={aggregateCondition}
                                            onValueChange={value => setAggregateCondition(value as ConditionFilter)}
                                            className="flex flex-col gap-2 sm:flex-row"
                                        >
                                            {(['all', 'static', 'personalized'] as ConditionFilter[]).map(option => (
                                                <label
                                                    key={option}
                                                    className={cn(
                                                        'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted',
                                                        aggregateCondition === option ? 'border-primary bg-primary/5' : 'border-border'
                                                    )}
                                                >
                                                    <RadioGroupItem value={option} id={`aggregate-${option}`} />
                                                    {conditionFilterCopy[option]}
                                                </label>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Sparkline label="平均正答率（ブロック別）" unit="%" color="#16a34a" data={aggregatedRows.map(row => ({
                                        x: row.blockNumber,
                                        y: row.avgAccuracy,
                                        label: `Block ${row.blockNumber}`,
                                    }))} />
                                    <Sparkline label="平均反応時間（ブロック別）" unit="ms" color="#2563eb" data={aggregatedRows.map(row => ({
                                        x: row.blockNumber,
                                        y: row.avgRt,
                                        label: `Block ${row.blockNumber}`,
                                    }))} />
                                </div>

                                {aggregatedRows.length ? (
                                    <ScrollArea className="h-[360px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>ブロック</TableHead>
                                                    <TableHead>サンプル数</TableHead>
                                                    <TableHead>平均正答率</TableHead>
                                                    <TableHead>平均RT</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {aggregatedRows.map(row => (
                                                    <TableRow key={`aggregate-${row.blockNumber}`}>
                                                        <TableCell>{row.blockNumber}</TableCell>
                                                        <TableCell>{row.contributorCount}</TableCell>
                                                        <TableCell>
                                                            {row.avgAccuracy != null ? `${row.avgAccuracy}%` : '—'}
                                                        </TableCell>
                                                        <TableCell>{formatRtValue(row.avgRt)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        選択中の条件では集計できるデータがまだありません。
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}

function getRtValue(metric: BlockMetric, mode: RtMode): number | null {
    if (mode === 'correctOnly') {
        if (typeof metric.averageRtCorrectOnly === 'number') {
            return metric.averageRtCorrectOnly;
        }
        return metric.averageRt;
    }
    return metric.averageRt;
}

function formatRtValue(value: number | null): string {
    return typeof value === 'number' ? `${value}ms` : '—';
}

interface SparklineProps {
    label: string;
    unit: string;
    color: string;
    data: { x: number; y: number | null; label?: string }[];
}

function Sparkline({ label, unit, color, data }: SparklineProps) {
    const validPoints = data.filter(point => typeof point.y === 'number' && !Number.isNaN(point.y));
    if (!validPoints.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{label}</CardTitle>
                    <CardDescription>十分なデータがありません</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const min = Math.min(...validPoints.map(point => point.y as number));
    const max = Math.max(...validPoints.map(point => point.y as number));
    const range = max - min || 1;

    const points = data.map((point, index) => {
        if (typeof point.y !== 'number' || Number.isNaN(point.y)) {
            return null;
        }
        const x = data.length === 1 ? 0 : (index / (data.length - 1)) * 100;
        const y = 90 - ((point.y - min) / range) * 80;
        return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    }).filter(Boolean);

    const avg = Math.round(validPoints.reduce((sum, point) => sum + (point.y as number), 0) / validPoints.length);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{label}</CardTitle>
                <CardDescription>
                    平均 {avg}{unit} / 最小 {Math.round(min)}{unit} / 最大 {Math.round(max)}{unit}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <svg viewBox="0 0 100 100" className="h-32 w-full text-muted-foreground">
                    <path
                        d={points.join(' ')}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </CardContent>
        </Card>
    );
}

interface StatCardProps {
    label: string;
    value: string;
    subLabel?: string;
}

function StatCard({ label, value, subLabel }: StatCardProps) {
    return (
        <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {subLabel && <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>}
        </div>
    );
}
