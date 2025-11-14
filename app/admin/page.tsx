'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertCircle, RefreshCw, Home, Users, UserCheck, UserX, Clock, Copy, Link2, Plus, Trash2, Eye, BarChart3, Check } from 'lucide-react';
import type { TonePreference, MotivationStyle, EvaluationFocus } from '@/types';
import { experimentConfig } from '@/lib/config/experiment';

const {
    totalBlocks: configTotalBlocks,
    trialsPerBlock: configTrialsPerBlock,
} = experimentConfig;

type ParticipantStatus = 'pending' | 'active' | 'abandoned' | 'completed';

interface ApiBlock {
    id: string;
    block_number: number;
    accuracy: number | null;
    average_rt: number | null;
    feedback_shown: string | null;
    completed_at: string | null;
}

interface ApiExperiment {
    id: string;
    condition_type: 'static' | 'personalized';
    session_number: number;
    started_at: string | null;
    completed_at: string | null;
    total_trials: number | null;
    overall_accuracy: number | null;
    overall_avg_rt: number | null;
    blocks?: ApiBlock[];
}

interface ApiParticipant {
    id: string;
    language: string | null;
    nickname: string | null;
    name: string | null;
    student_id: string | null;
    handedness: string | null;
    age: number | null;
    gender: string | null;
    preferred_praise: string | null;
    tone_preference: TonePreference | null;
    motivation_style: MotivationStyle | null;
    evaluation_focus: EvaluationFocus | null;
    created_at: string;
    updated_at: string;
    admin_memo: string | null;
    experiments: ApiExperiment[];
}

interface ParticipantSummary {
    id: string;
    nickname: string | null;
    displayName: string | null;
    language: string | null;
    createdAt: Date;
    updatedAt: Date;
    experiments: ApiExperiment[];
    status: ParticipantStatus;
    totalTrials: number;
    completedBlocks: number;
    avgReactionTime: number | null;
    accuracy: number | null;
    lastUpdate: Date;
    profileCompleted: boolean;
    profile: {
        name: string | null;
        studentId: string | null;
        handedness: string | null;
        age: number | null;
        gender: string | null;
        preferredPraise: string | null;
        tonePreference: TonePreference | null;
        motivationStyle: MotivationStyle | null;
        evaluationFocus: EvaluationFocus | null;
    };
    conditionCompletion: {
        static: boolean;
        personalized: boolean;
    };
    adminMemo: string | null;
}

const buildInviteUrl = (origin: string, participantId: string, condition: 'static' | 'personalized') => {
    const base = origin || '[BASE_URL]';
    return `${base}/language/${participantId}?condition=${condition}`;
};

function transformParticipant(participant: ApiParticipant): ParticipantSummary {
    const experiments = participant.experiments ?? [];
    const totalTrials = experiments.reduce((sum, exp) => sum + (exp.total_trials ?? 0), 0);
    const completedBlocks = Math.min(
        configTotalBlocks,
        Math.floor(totalTrials / configTrialsPerBlock)
    );

    const profile = {
        name: participant.name,
        studentId: participant.student_id,
        handedness: participant.handedness,
        age: participant.age,
        gender: participant.gender,
        preferredPraise: participant.preferred_praise,
        tonePreference: participant.tone_preference,
        motivationStyle: participant.motivation_style,
        evaluationFocus: participant.evaluation_focus,
    };
    const profileCompleted = Boolean(participant.name && participant.nickname);

    const accuracyValues = experiments
        .map(exp => exp.overall_accuracy)
        .filter((value): value is number => typeof value === 'number');
    const rtValues = experiments
        .map(exp => exp.overall_avg_rt)
        .filter((value): value is number => typeof value === 'number');

    const avgAccuracy = accuracyValues.length
        ? Math.round(accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length)
        : null;
    const avgReactionTime = rtValues.length
        ? Math.round(rtValues.reduce((sum, value) => sum + value, 0) / rtValues.length)
        : null;

    const hasProgress = experiments.some(exp => (exp.total_trials ?? 0) > 0 || Boolean(exp.started_at));
    const hasStaticCompleted = experiments.some(
        exp => exp.condition_type === 'static' && Boolean(exp.completed_at)
    );
    const hasPersonalizedCompleted = experiments.some(
        exp => exp.condition_type === 'personalized' && Boolean(exp.completed_at)
    );

    const lastActivity = experiments.reduce((latest, exp) => {
        const timestamps = [exp.completed_at, exp.started_at].filter(Boolean) as string[];
        const newest = timestamps.reduce((innerLatest, stamp) => {
            const date = new Date(stamp);
            return date > innerLatest ? date : innerLatest;
        }, latest);
        return newest;
    }, new Date(participant.updated_at));

    let status: ParticipantStatus = 'pending';
    if (hasStaticCompleted && hasPersonalizedCompleted) {
        status = 'completed';
    } else if (hasProgress) {
        const hoursSinceUpdate = (Date.now() - lastActivity.getTime()) / 36e5;
        status = hoursSinceUpdate > 24 ? 'abandoned' : 'active';
    }

    return {
        id: participant.id,
        nickname: participant.nickname,
        displayName: participant.name,
        language: participant.language,
        createdAt: new Date(participant.created_at),
        updatedAt: new Date(participant.updated_at),
        experiments,
        status,
        totalTrials,
        completedBlocks,
        avgReactionTime,
        accuracy: avgAccuracy,
        lastUpdate: lastActivity,
        profileCompleted,
        profile,
        conditionCompletion: {
            static: hasStaticCompleted,
            personalized: hasPersonalizedCompleted,
        },
        adminMemo: participant.admin_memo ?? null,
    };
}

interface InviteLinkProps {
    label: string;
    url: string;
}

function InviteLinkRow({ label, url }: InviteLinkProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            window.prompt('招待URLをコピーしてください', url);
        }
    };

    return (
        <div className="rounded-md border px-3 py-2 text-left space-y-1">
            <div className="flex items-center text-xs font-semibold text-muted-foreground gap-1">
                <Link2 className="h-3 w-3" />
                {label}
            </div>
            <div className="flex items-center gap-2">
                <p className="text-xs break-all text-foreground flex-1">{url}</p>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {copied ? 'コピー済み' : 'コピー'}
                </Button>
            </div>
        </div>
    );
}

interface DeleteParticipantButtonProps {
    participantId: string;
    participantLabel: string;
    onConfirm: (participantId: string) => Promise<void>;
    disabled?: boolean;
}

function DeleteParticipantButton({
    participantId,
    participantLabel,
    onConfirm,
    disabled,
}: DeleteParticipantButtonProps) {
    const [open, setOpen] = useState(false);
    const [confirmation, setConfirmation] = useState('');
    const isReady = confirmation.trim() === '削除';

    const handleDialogChange = (nextOpen: boolean) => {
        if (disabled) return;
        setOpen(nextOpen);
        if (!nextOpen) {
            setConfirmation('');
        }
    };

    const handleConfirm = async () => {
        if (!isReady) return;
        await onConfirm(participantId);
        setConfirmation('');
        setOpen(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={handleDialogChange}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    size="sm"
                    disabled={disabled}
                >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {disabled ? '削除中' : '削除'}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>参加者を削除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                        {participantLabel} のデータは完全に削除され、元に戻すことはできません。続行するには「削除」と入力してください。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                    <Input
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        placeholder="削除"
                        autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                        この操作は元に戻せません。
                    </p>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={disabled}>キャンセル</AlertDialogCancel>
                    <AlertDialogAction asChild disabled={!isReady || disabled}>
                        <Button variant="destructive" onClick={handleConfirm} disabled={!isReady || disabled}>
                            {disabled ? '削除中' : '削除を確定'}
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function ConditionStatusPill({ label, done }: { label: string; done: boolean }) {
    return (
        <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${done
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 text-slate-500'
                }`}
        >
            {label}: {done ? '完' : '未'}
        </span>
    );
}

export default function AdminDashboard() {
    const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        active: 0,
        abandoned: 0,
        pending: 0,
    });
    const [creating, setCreating] = useState(false);
    const [recentParticipantId, setRecentParticipantId] = useState<string | null>(null);
    const [origin, setOrigin] = useState('');
    const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [rowMemoDrafts, setRowMemoDrafts] = useState<Record<string, string>>({});
    const [rowMemoSaving, setRowMemoSaving] = useState<Record<string, boolean>>({});
    const [rowMemoFeedback, setRowMemoFeedback] = useState<Record<string, string | null>>({});
    const [rowMemoLastSaved, setRowMemoLastSaved] = useState<Record<string, string>>({});
    const [copiedInviteKey, setCopiedInviteKey] = useState<string | null>(null);
    const memoSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

    const computeStats = useCallback((items: ParticipantSummary[]) => {
        const nextStats = items.reduce((acc, participant) => {
            acc.total += 1;
            acc[participant.status] += 1;
            return acc;
        }, { total: 0, completed: 0, active: 0, abandoned: 0, pending: 0 } as Record<ParticipantStatus | 'total', number>);
        setStats({
            total: nextStats.total,
            completed: nextStats.completed,
            active: nextStats.active,
            abandoned: nextStats.abandoned,
            pending: nextStats.pending,
        });
    }, []);

    const loadParticipants = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/admin/participants', { cache: 'no-store' });
            if (!response.ok) {
                throw new Error('参加者データの取得に失敗しました');
            }

            const data = await response.json() as { participants: ApiParticipant[] };
            const summaries = data.participants.map(transformParticipant);
            setParticipants(summaries);
            computeStats(summaries);
            const memoMap = summaries.reduce<Record<string, string>>((acc, participant) => {
                acc[participant.id] = participant.adminMemo ?? '';
                return acc;
            }, {});
            setRowMemoDrafts(memoMap);
            setRowMemoLastSaved(memoMap);
            setRowMemoSaving({});
            setRowMemoFeedback({});
            Object.values(memoSaveTimersRef.current).forEach(timer => {
                if (timer) clearTimeout(timer);
            });
            memoSaveTimersRef.current = {};
        } catch (err) {
            console.error('参加者データの読み込みエラー:', err);
            setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
        } finally {
            setLoading(false);
        }
    }, [computeStats]);

    useEffect(() => {
        loadParticipants();
    }, [loadParticipants]);

    useEffect(() => {
        return () => {
            Object.values(memoSaveTimersRef.current).forEach(timer => {
                if (timer) clearTimeout(timer);
            });
        };
    }, []);

    const updateParticipantMemoLocally = useCallback((participantId: string, memo: string) => {
        setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, adminMemo: memo } : p));
        setRowMemoDrafts(prev => ({ ...prev, [participantId]: memo }));
        setRowMemoLastSaved(prev => ({ ...prev, [participantId]: memo }));
    }, []);

    const handleCreateParticipant = async () => {
        try {
            setCreating(true);
            setError(null);

            const response = await fetch('/api/admin/participants', { method: 'POST' });
            if (!response.ok) {
                throw new Error('参加者IDの発行に失敗しました');
            }

            const { participant }: { participant: ApiParticipant } = await response.json();
            setRecentParticipantId(participant.id);
            await loadParticipants();
        } catch (err) {
            console.error('参加者作成エラー:', err);
            setError(err instanceof Error ? err.message : '参加者の追加に失敗しました');
        } finally {
            setCreating(false);
        }
    };

    const handleSelectParticipant = (participantId: string | null) => {
        setSelectedParticipantId(participantId);
    };

    const handleDeleteParticipant = async (participantId: string) => {
        try {
            setDeletingId(participantId);
            const response = await fetch(`/api/admin/participants/${participantId}`, { method: 'DELETE' });
            if (!response.ok) {
                throw new Error('参加者の削除に失敗しました');
            }

            if (selectedParticipantId === participantId) {
                setSelectedParticipantId(null);
            }

            await loadParticipants();
        } catch (err) {
            console.error('Failed to delete participant:', err);
            setError(err instanceof Error ? err.message : '参加者の削除に失敗しました');
        } finally {
            setDeletingId(null);
        }
    };

    const persistMemo = useCallback(async (participantId: string, memoValue: string) => {
        setRowMemoSaving(prev => ({ ...prev, [participantId]: true }));
        setRowMemoFeedback(prev => ({ ...prev, [participantId]: '保存中...' }));
        try {
            const response = await fetch(`/api/admin/participants/${participantId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminMemo: memoValue }),
            });
            if (!response.ok) {
                throw new Error('メモの保存に失敗しました');
            }
            updateParticipantMemoLocally(participantId, memoValue);
            setRowMemoFeedback(prev => ({ ...prev, [participantId]: '保存しました' }));
        } catch (err) {
            console.error('Failed to save inline memo:', err);
            setRowMemoFeedback(prev => ({ ...prev, [participantId]: '保存に失敗しました' }));
        } finally {
            setRowMemoSaving(prev => ({ ...prev, [participantId]: false }));
            if (memoSaveTimersRef.current[participantId]) {
                clearTimeout(memoSaveTimersRef.current[participantId]!);
                memoSaveTimersRef.current[participantId] = null;
            }
        }
    }, [updateParticipantMemoLocally]);

    const scheduleMemoSave = useCallback((participantId: string, value: string) => {
        if (memoSaveTimersRef.current[participantId]) {
            clearTimeout(memoSaveTimersRef.current[participantId]!);
        }
        const lastSaved = rowMemoLastSaved[participantId] ?? '';
        if (value === lastSaved) {
            setRowMemoFeedback(prev => ({ ...prev, [participantId]: '保存済み' }));
            return;
        }
        memoSaveTimersRef.current[participantId] = setTimeout(() => {
            persistMemo(participantId, value);
        }, 1500);
    }, [persistMemo, rowMemoLastSaved]);

    const handleRowMemoChange = useCallback((participantId: string, value: string) => {
        setRowMemoDrafts(prev => ({ ...prev, [participantId]: value }));
        setRowMemoFeedback(prev => ({ ...prev, [participantId]: value === (rowMemoLastSaved[participantId] ?? '') ? '保存済み' : '入力中...' }));
        scheduleMemoSave(participantId, value);
    }, [rowMemoLastSaved, scheduleMemoSave]);

    const handleCopyInviteLink = async (participantId: string, condition: 'static' | 'personalized') => {
        const url = buildInviteUrl(origin, participantId, condition);
        const key = `${participantId}-${condition}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedInviteKey(key);
            setTimeout(() => {
                setCopiedInviteKey(prev => (prev === key ? null : prev));
            }, 1500);
        } catch {
            window.prompt('招待URLをコピーしてください', url);
        }
    };

    const recentInviteUrls = useMemo(() => {
        if (!recentParticipantId) return null;
        return {
            static: buildInviteUrl(origin, recentParticipantId, 'static'),
            personalized: buildInviteUrl(origin, recentParticipantId, 'personalized'),
        };
    }, [origin, recentParticipantId]);

    const selectedParticipant = useMemo(() => {
        if (!selectedParticipantId) return null;
        return participants.find(p => p.id === selectedParticipantId) || null;
    }, [participants, selectedParticipantId]);
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="w-96">
                    <CardContent className="p-6">
                        <div className="text-center space-y-4">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground">データを読み込んでいます...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 space-y-6">
                {/* ヘッダー */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">管理者ダッシュボード</h1>
                        <p className="mt-2 text-muted-foreground">RT実験の進行状況と参加者データの管理</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/">
                                <Home className="mr-2 h-4 w-4" />
                                ホームに戻る
                            </Link>
                        </Button>
                        <Button variant="secondary" asChild>
                            <Link href="/admin/results">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                成果分析ビュー
                            </Link>
                        </Button>
                        <Button onClick={handleCreateParticipant} disabled={creating}>
                            <Plus className="mr-2 h-4 w-4" />
                            {creating ? '発行中...' : '発行'}
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {recentInviteUrls && (
                    <Alert>
                        <AlertDescription className="space-y-3">
                            <p>
                                新しい参加者ID <code className="px-2 py-1 bg-muted rounded text-xs">{recentParticipantId}</code> を発行しました。
                                以下のURLを参加者に配布してください。
                            </p>
                            <div className="grid gap-3 md:grid-cols-2">
                                <InviteLinkRow label="Static条件" url={recentInviteUrls.static} />
                                <InviteLinkRow label="Personalized条件" url={recentInviteUrls.personalized} />
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* 統計サマリー */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    <Users className="h-6 w-6 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">総参加者数</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <UserCheck className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">完了</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Clock className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">進行中</p>
                                    <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <UserX className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">中断</p>
                                    <p className="text-2xl font-bold text-red-600">{stats.abandoned}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 参加者テーブル */}
                <Card>
                    <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <CardTitle>参加者一覧</CardTitle>
                            <CardDescription>最新の参加者データと進行状況</CardDescription>
                        </div>
                        <Button onClick={loadParticipants} variant="outline" className="w-full lg:w-auto">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            データを更新
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {participants.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                参加者データがありません
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>参加者</TableHead>
                                            <TableHead>メモ</TableHead>
                                            <TableHead>進行状況</TableHead>
                                            <TableHead>招待リンク</TableHead>
                                            <TableHead>最終更新</TableHead>
                                            <TableHead className="text-right min-w-[160px]">操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {participants.map(participant => {
                                            const memoValue = rowMemoDrafts[participant.id] ?? participant.adminMemo ?? '';
                                            const memoFeedbackText = rowMemoFeedback[participant.id] ?? '自動保存されます';
                                            const memoFeedbackColor = memoFeedbackText.includes('失敗')
                                                ? 'text-red-500'
                                                : memoFeedbackText.includes('保存中')
                                                    ? 'text-amber-600'
                                                    : 'text-muted-foreground';
                                            const isMemoSaving = rowMemoSaving[participant.id];
                                            return (
                                                <TableRow key={participant.id}>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="text-base font-semibold">
                                                                {participant.displayName || '氏名未登録'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                                                                <span>ID: {participant.id.slice(0, 8)}...</span>
                                                                <span>ニックネーム: {participant.nickname || '未登録'}</span>
                                                                <span>学籍番号: {participant.profile.studentId || '未登録'}</span>
                                                            </div>
                                                            {!participant.profileCompleted && (
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    プロフィール未入力
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="min-w-[220px] relative">
                                                        <Textarea
                                                            value={memoValue}
                                                            onChange={(event) => handleRowMemoChange(participant.id, event.target.value)}
                                                            rows={3}
                                                            placeholder="本名やLINE名などのメモを入力"
                                                        />
                                                        <span className={cn('block text-xs bottom-3 absolute right-6', memoFeedbackColor)}>
                                                            {isMemoSaving ? '保存中...' : memoFeedbackText}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="w-max">
                                                        <div className="flex flex-col flex-wrap gap-2">
                                                            <ConditionStatusPill label="Static" done={participant.conditionCompletion.static} />
                                                            <ConditionStatusPill label="Personalized" done={participant.conditionCompletion.personalized} />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="w-max flex flex-col space-y-2">
                                                        {(['static', 'personalized'] as const).map(condition => {
                                                            const key = `${participant.id}-${condition}`;
                                                            const copied = copiedInviteKey === key;
                                                            const inviteUrl = buildInviteUrl(origin, participant.id, condition);
                                                            return (
                                                                <div key={key} className="group relative w-full">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="w-full justify-start gap-2 px-2 py-1 text-xs"
                                                                        onClick={() => handleCopyInviteLink(participant.id, condition)}
                                                                    >
                                                                        {copied ? (
                                                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                                        ) : (
                                                                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        )}
                                                                        <span>{condition === 'static' ? 'Static' : 'Personalized'}</span>
                                                                    </Button>
                                                                    <div className="pointer-events-none absolute left-0 top-0 -translate-y-2 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                                                                        <div className="rounded-md border bg-popover px-2 py-1 text-[10px] font-mono text-muted-foreground shadow">
                                                                            {inviteUrl}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {participant.lastUpdate.toLocaleDateString('ja-JP')}<br />
                                                        {participant.lastUpdate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleSelectParticipant(participant.id)}
                                                        >
                                                            <Eye className="h-3.5 w-3.5 mr-1" />
                                                            詳細
                                                        </Button>
                                                        <DeleteParticipantButton
                                                            participantId={participant.id}
                                                            participantLabel={participant.displayName || participant.nickname || participant.id.slice(0, 8)}
                                                            onConfirm={handleDeleteParticipant}
                                                            disabled={deletingId === participant.id}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {selectedParticipant && (
                    <Card>
                        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle>
                                    参加者詳細: {selectedParticipant.displayName || selectedParticipant.nickname || selectedParticipant.id.slice(0, 8)}
                                </CardTitle>
                                <CardDescription>
                                    プロフィールと実験履歴を参照できます
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => handleSelectParticipant(null)}
                                >
                                    一覧に戻る
                                </Button>
                                <DeleteParticipantButton
                                    participantId={selectedParticipant.id}
                                    participantLabel={selectedParticipant.displayName || selectedParticipant.nickname || selectedParticipant.id.slice(0, 8)}
                                    onConfirm={handleDeleteParticipant}
                                    disabled={deletingId === selectedParticipant.id}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-lg border p-4 space-y-1">
                                    <p className="text-xs text-muted-foreground">名前</p>
                                    <p className="font-medium">{selectedParticipant.profile.name || '未入力'}</p>
                                </div>
                                <div className="rounded-lg border p-4 space-y-1">
                                    <p className="text-xs text-muted-foreground">ニックネーム</p>
                                    <p className="font-medium">{selectedParticipant.nickname || '未入力'}</p>
                                </div>
                                <div className="rounded-lg border p-4 space-y-1">
                                    <p className="text-xs text-muted-foreground">学籍番号</p>
                                    <p className="font-medium">{selectedParticipant.profile.studentId || '未入力'}</p>
                                </div>
                                <div className="rounded-lg border p-4 space-y-1">
                                    <p className="text-xs text-muted-foreground">利き手 / 年齢 / 性別</p>
                                    <p className="font-medium">
                                        {selectedParticipant.profile.handedness || '-'} / {selectedParticipant.profile.age ?? '-'} / {selectedParticipant.profile.gender || '-'}
                                    </p>
                                </div>
                                <div className="rounded-lg border p-4 space-y-1 md:col-span-2">
                                    <p className="text-xs text-muted-foreground">好きな褒め方</p>
                                    <p className="font-medium break-words">
                                        {selectedParticipant.profile.preferredPraise || '未入力'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-3">実験履歴</h4>
                                {selectedParticipant.experiments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">まだ実験記録がありません</p>
                                ) : (
                                    <div className="overflow-x-auto rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>条件</TableHead>
                                                    <TableHead>セッション</TableHead>
                                                    <TableHead>開始</TableHead>
                                                    <TableHead>完了</TableHead>
                                                    <TableHead>正答率</TableHead>
                                                    <TableHead>平均RT</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedParticipant.experiments.map(exp => (
                                                    <TableRow key={exp.id}>
                                                        <TableCell>
                                                            <Badge variant={exp.condition_type === 'personalized' ? 'default' : 'secondary'}>
                                                                {exp.condition_type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{exp.session_number}</TableCell>
                                                        <TableCell>{exp.started_at ? new Date(exp.started_at).toLocaleString('ja-JP') : '-'}</TableCell>
                                                        <TableCell>{exp.completed_at ? new Date(exp.completed_at).toLocaleString('ja-JP') : '-'}</TableCell>
                                                        <TableCell>{exp.overall_accuracy ?? '-'}%</TableCell>
                                                        <TableCell>{exp.overall_avg_rt ?? '-'}ms</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>


                            <div>
                                <h4 className="font-semibold mb-3">表示されたフィードバック</h4>
                                {selectedParticipant.experiments.every(exp => !exp.blocks || exp.blocks.length === 0) ? (
                                    <p className="text-sm text-muted-foreground">ブロック単位のフィードバックはまだ記録されていません</p>
                                ) : (
                                    <div className="space-y-4">
                                        {selectedParticipant.experiments.map(exp => (
                                            <div key={`${exp.id}-feedback`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="text-sm font-semibold text-slate-800">
                                                        セッション {exp.session_number} / 条件
                                                        <Badge variant={exp.condition_type === 'personalized' ? 'default' : 'secondary'} className="ml-2">
                                                            {exp.condition_type}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-xs text-slate-500">
                                                        ブロック数: {exp.blocks?.length ?? 0}
                                                    </span>
                                                </div>
                                                {!exp.blocks || exp.blocks.length === 0 ? (
                                                    <p className="mt-3 text-sm text-muted-foreground">フィードバックは記録されていません</p>
                                                ) : (
                                                    <div className="mt-3 space-y-3">
                                                        {exp.blocks.map(block => (
                                                            <div key={block.id} className="rounded-lg border border-white bg-white p-3 shadow-sm">
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    <div className="font-medium text-slate-900">ブロック {block.block_number}</div>
                                                                    <div className="text-xs text-slate-500">
                                                                        正答率 {block.accuracy ?? '-'}% / 平均RT {block.average_rt ?? '-'}ms
                                                                    </div>
                                                                </div>
                                                                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                                                                    {block.feedback_shown || 'フィードバックは記録されていません'}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
