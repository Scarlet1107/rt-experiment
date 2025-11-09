'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Home, Users, UserCheck, UserX, Clock } from 'lucide-react';

// モックデータ用の型定義
interface ParticipantSummary {
    id: string;
    nickname: string;
    language: string;
    created_at: string;
    totalTrials: number;
    completedBlocks: number;
    avgReactionTime: number;
    accuracy: number;
    lastUpdate: Date;
    status: 'active' | 'completed' | 'abandoned';
}

// モックデータ
const mockParticipants: ParticipantSummary[] = [
    {
        id: 'test-uuid-123e4567-e89b-12d3-a456-426614174000',
        nickname: 'テスト参加者',
        language: 'ja',
        created_at: '2024-01-20T10:00:00Z',
        totalTrials: 480,
        completedBlocks: 8,
        avgReactionTime: 650,
        accuracy: 94,
        lastUpdate: new Date('2024-01-20T12:30:00Z'),
        status: 'completed'
    },
    {
        id: 'demo-uuid-987f6543-c21e-87d6-b543-987654321000',
        nickname: 'デモユーザー',
        language: 'en',
        created_at: '2024-01-19T14:00:00Z',
        totalTrials: 240,
        completedBlocks: 4,
        avgReactionTime: 580,
        accuracy: 87,
        lastUpdate: new Date('2024-01-19T16:15:00Z'),
        status: 'active'
    },
    {
        id: 'abandoned-uuid-456b7890-d32f-98e7-c654-456789012000',
        nickname: '中断参加者',
        language: 'ja',
        created_at: '2024-01-18T09:00:00Z',
        totalTrials: 60,
        completedBlocks: 1,
        avgReactionTime: 750,
        accuracy: 78,
        lastUpdate: new Date('2024-01-18T10:00:00Z'),
        status: 'abandoned'
    }
];

export default function AdminDashboard() {
    const [participants, setParticipants] = useState<ParticipantSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        active: 0,
        abandoned: 0
    });

    useEffect(() => {
        loadParticipants();
    }, []);

    const loadParticipants = async () => {
        try {
            setLoading(true);

            // モックデータを使用（実際の実装では Supabase から取得）
            await new Promise(resolve => setTimeout(resolve, 500)); // 読み込み時間をシミュレート

            const summaries = mockParticipants;
            setParticipants(summaries);

            // 統計を計算
            setStats({
                total: summaries.length,
                completed: summaries.filter(p => p.status === 'completed').length,
                active: summaries.filter(p => p.status === 'active').length,
                abandoned: summaries.filter(p => p.status === 'abandoned').length
            });

        } catch (err) {
            console.error('参加者データの読み込みエラー:', err);
            setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const getBadgeVariant = (status: string) => {
        switch (status) {
            case 'completed':
                return 'default' as const;
            case 'active':
                return 'secondary' as const;
            case 'abandoned':
                return 'destructive' as const;
            default:
                return 'outline' as const;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return '完了';
            case 'active': return '進行中';
            case 'abandoned': return '中断';
            default: return '不明';
        }
    };

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
            <div className="container mx-auto px-4 py-8">
                {/* ヘッダー */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">管理者ダッシュボード</h1>
                            <p className="mt-2 text-muted-foreground">RT実験の進行状況と参加者データの管理</p>
                        </div>
                        <Button variant="outline" asChild>
                            <Link href="/">
                                <Home className="mr-2 h-4 w-4" />
                                ホームに戻る
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* エラー表示 */}
                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {error}
                            <Button
                                variant="link"
                                size="sm"
                                onClick={loadParticipants}
                                className="p-0 h-auto ml-2 text-destructive underline"
                            >
                                再読み込み
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {/* 統計サマリー */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                    <CardHeader>
                        <CardTitle>参加者一覧</CardTitle>
                        <CardDescription>
                            最新の参加者データとその進行状況
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {participants.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                参加者データがありません
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>参加者</TableHead>
                                            <TableHead>言語</TableHead>
                                            <TableHead>進行状況</TableHead>
                                            <TableHead>パフォーマンス</TableHead>
                                            <TableHead>最終更新</TableHead>
                                            <TableHead>ステータス</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {participants.map((participant) => (
                                            <TableRow key={participant.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">
                                                            {participant.id.slice(0, 8)}...
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {participant.nickname}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {participant.language === 'ja' ? '日本語' : '英語'}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">
                                                            {participant.completedBlocks}/8 ブロック
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {participant.totalTrials}/480 試行
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">
                                                            RT: {participant.avgReactionTime}ms
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            正答率: {participant.accuracy}%
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {participant.lastUpdate.toLocaleDateString('ja-JP')}<br />
                                                    {participant.lastUpdate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getBadgeVariant(participant.status)}>
                                                        {getStatusText(participant.status)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* リフレッシュボタン */}
                <div className="mt-6 text-center">
                    <Button onClick={loadParticipants} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        データを更新
                    </Button>
                </div>
            </div>
        </div>
    );
}
