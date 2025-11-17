'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  determineScenarioKey,
} from '@/lib/feedback/select';
import {
  generatePersonalizedBlockFeedback,
  type BlockPerformance,
  type FeedbackPattern,
  type ParticipantInfo,
} from '@/lib/feedback/personalized';
import type { FeedbackScenarioKey } from '@/types';

type ParticipantFormState = Omit<ParticipantInfo, 'id'>;

interface BlockFormState {
  blockNumber: number;
  accuracy: number;
  averageRT: number;
}

type PreviousBlockState = {
  accuracy: number;
  averageRT: number;
};

interface FeedbackRequestPayload {
  participantInfo: ParticipantInfo;
  blockData: {
    blockNumber: number;
    accuracy: number;
    averageRT: number;
    previousBlock?: {
      accuracy: number;
      averageRT: number;
    };
  };
  force?: boolean;
}

const PRAISE_OPTIONS = {
  ja: [
    { id: 'casual-friendly', label: 'フレンドリーに「いい感じ！」と言われたい' },
    { id: 'gentle-soft', label: 'やさしく「大丈夫だよ」と声をかけてほしい' },
    { id: 'formal-solid', label: '落ち着いた丁寧な言葉で評価してほしい' },
    { id: 'growth-focus', label: '前回より成長した点を具体的に褒めてほしい' },
    { id: 'social-focus', label: '平均より頑張れている点を伝えてほしい' },
    { id: 'positive-focus', label: '良かった部分だけをシンプルに褒めてほしい' },
  ],
  en: [
    { id: 'casual-friendly', label: 'Casual “Nice job!” praise feels best' },
    { id: 'gentle-soft', label: 'I like gentle reminders like “You’re doing fine”' },
    { id: 'formal-solid', label: 'Prefer calm, polite acknowledgement' },
    { id: 'growth-focus', label: 'Please highlight how I improved from before' },
    { id: 'social-focus', label: 'Tell me when I’m doing better than average' },
    { id: 'positive-focus', label: 'Just point out the good moments simply' },
  ]
} as const;

const DEFAULT_PRAISE_IDS = ['casual-friendly', 'growth-focus'] as const;
const DEFAULT_PRAISE_LABELS = DEFAULT_PRAISE_IDS.map(
  id => PRAISE_OPTIONS.ja.find(option => option.id === id)?.label
).filter(Boolean);

const toneOptions = [
  { value: 'casual', label: 'カジュアル / Friendly' },
  { value: 'gentle', label: 'ていねい / Gentle' },
  { value: 'formal', label: 'フォーマル / Formal' },
] as const;

const motivationOptions = [
  { value: 'empathetic', label: 'Empathy / 共感' },
  { value: 'cheerleader', label: 'Cheerleader / 応援' },
  { value: 'advisor', label: 'Advisor / アドバイス' },
] as const;

const evaluationOptions = [
  { value: 'self-progress', label: '自己比較' },
  { value: 'social-comparison', label: '相対評価' },
  { value: 'positive-focus', label: '良い点のみ' },
] as const;

const scenarioLabels: Record<FeedbackScenarioKey, string> = {
  rt_short_acc_up_synergy: '爆伸び (反応↑ / 正確↑↑)',
  rt_slow_acc_down_fatigue: '疲労 (反応↓↓ / 正確↓↓)',
  rt_short_acc_same: '反応↑ / 正確→',
  rt_short_acc_down: '反応↑ / 正確↓',
  rt_short_acc_up: '反応↑ / 正確↑',
  rt_slow_acc_up: '反応↓ / 正確↑',
  rt_slow_acc_same: '反応↓ / 正確→',
  rt_slow_acc_down: '反応↓ / 正確↓',
  rt_same_acc_up: '反応→ / 正確↑',
  rt_same_acc_down: '反応→ / 正確↓',
  rt_same_acc_same: '反応→ / 正確→',
};

const selectInputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export default function PersonalizedFeedbackDebugPage() {
  const [participantForm, setParticipantForm] = useState<ParticipantFormState>({
    nickname: 'Shogo',
    preferredPraise: DEFAULT_PRAISE_LABELS.join(', '),
    tonePreference: 'gentle',
    motivationStyle: 'empathetic',
    evaluationFocus: 'self-progress',
    language: 'ja',
  });
  const [selectedPraiseIds, setSelectedPraiseIds] = useState<string[]>([...DEFAULT_PRAISE_IDS]);
  const [participantId, setParticipantId] = useState('');
  const [currentBlock, setCurrentBlock] = useState<BlockFormState>({
    blockNumber: 1,
    accuracy: 86,
    averageRT: 640,
  });
  const [previousBlock, setPreviousBlock] = useState<PreviousBlockState>({
    accuracy: 80,
    averageRT: 710,
  });
  const [usePreviousBlock, setUsePreviousBlock] = useState(true);
  const [bypassCache, setBypassCache] = useState(true);
  const praiseOptions = useMemo(() => {
    const lang = participantForm.language;
    return PRAISE_OPTIONS[lang as 'ja' | 'en'] || PRAISE_OPTIONS.ja;
  }, [participantForm.language]);

  useEffect(() => {
    const langOptions = PRAISE_OPTIONS[participantForm.language as 'ja' | 'en'] || PRAISE_OPTIONS.ja;
    const labels = selectedPraiseIds
      .map(id => langOptions.find(option => option.id === id)?.label)
      .filter(Boolean);
    const joined = labels.join(', ');
    setParticipantForm(prev => (
      prev.preferredPraise === joined ? prev : { ...prev, preferredPraise: joined }
    ));
  }, [participantForm.language, selectedPraiseIds]);

  const selectedPraiseLabels = useMemo(() => (
    selectedPraiseIds
      .map(id => praiseOptions.find(option => option.id === id)?.label)
      .filter(Boolean)
  ), [praiseOptions, selectedPraiseIds]);

  const togglePraiseOption = (id: string) => {
    setSelectedPraiseIds(prev => (
      prev.includes(id)
        ? prev.filter(existing => existing !== id)
        : [...prev, id]
    ));
  };

  const [feedbackPatterns, setFeedbackPatterns] = useState<FeedbackPattern | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<FeedbackScenarioKey>('rt_same_acc_same');
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [responseMeta, setResponseMeta] = useState<{
    fallback?: boolean;
    cached?: boolean;
    participantId?: string;
  } | null>(null);
  const [rawResponse, setRawResponse] = useState<object | null>(null);

  const computedScenario = useMemo(() => {
    const previous = usePreviousBlock ? previousBlock : null;
    return determineScenarioKey(
      { accuracy: currentBlock.accuracy, averageRT: currentBlock.averageRT },
      previous ? { accuracy: previous.accuracy, averageRT: previous.averageRT } : null
    );
  }, [currentBlock, previousBlock, usePreviousBlock]);

  useEffect(() => {
    if (feedbackPatterns) {
      setSelectedScenario(computedScenario);
    }
  }, [computedScenario, feedbackPatterns]);

  const previewMessage = useMemo(() => {
    if (!feedbackPatterns) return null;
    const current: BlockPerformance = {
      blockNumber: currentBlock.blockNumber,
      accuracy: currentBlock.accuracy,
      averageRT: currentBlock.averageRT,
    };
    const previous: BlockPerformance | null = usePreviousBlock
      ? {
        blockNumber: Math.max(1, currentBlock.blockNumber - 1),
        accuracy: previousBlock.accuracy,
        averageRT: previousBlock.averageRT,
      }
      : null;
    return generatePersonalizedBlockFeedback(current, previous, feedbackPatterns);
  }, [currentBlock, feedbackPatterns, previousBlock, usePreviousBlock]);

  const selectedScenarioMessages = useMemo(() => {
    if (!feedbackPatterns) return [];
    return feedbackPatterns[selectedScenario] ?? [];
  }, [feedbackPatterns, selectedScenario]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setRequestError(null);

    const payload: FeedbackRequestPayload = {
      participantInfo: {
        ...participantForm,
        id: participantId.trim() ? participantId.trim() : undefined,
      },
      blockData: {
        blockNumber: currentBlock.blockNumber,
        accuracy: currentBlock.accuracy,
        averageRT: currentBlock.averageRT,
        ...(usePreviousBlock
          ? {
            previousBlock: {
              accuracy: previousBlock.accuracy,
              averageRT: previousBlock.averageRT,
            },
          }
          : {}),
      },
      force: bypassCache || undefined,
    };

    try {
      const response = await fetch('/api/generate-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.details || result?.error || 'API request failed');
      }

      setFeedbackPatterns(result.feedbackPatterns);
      setResponseMeta({
        fallback: result.fallback,
        cached: result.cached,
        participantId: result.participantId,
      });
      setRawResponse(result);
    } catch (error) {
      console.error('Debug feedback generation failed:', error);
      setRequestError(error instanceof Error ? error.message : 'Unknown error');
      setFeedbackPatterns(null);
      setRawResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4">
          <Button variant="ghost" className="w-fit" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              管理ページに戻る
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              パーソナライズドフィードバック・デバッグ
            </h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>参加者プロファイル</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="participant-id">参加者ID (任意)</Label>
                  <Input
                    id="participant-id"
                    placeholder="既存IDを使用する場合"
                    value={participantId}
                    onChange={event => setParticipantId(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">ニックネーム</Label>
                  <Input
                    id="nickname"
                    value={participantForm.nickname}
                    onChange={event => setParticipantForm(prev => ({
                      ...prev,
                      nickname: event.target.value,
                    }))}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label>好きな褒め方</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {praiseOptions.map(option => {
                    const isSelected = selectedPraiseIds.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => togglePraiseOption(option.id)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-input hover:border-primary/40'
                          }`}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Badge variant="secondary">選択中</Badge>}
                      </button>
                    );
                  })}
                </div>
                {selectedPraiseLabels.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {selectedPraiseLabels.map(label => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tone-preference">口調</Label>
                  <select
                    id="tone-preference"
                    className={selectInputClass}
                    value={participantForm.tonePreference}
                    onChange={event => setParticipantForm(prev => ({
                      ...prev,
                      tonePreference: event.target.value as ParticipantFormState['tonePreference'],
                    }))}
                  >
                    {toneOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motivation-style">励ましスタイル</Label>
                  <select
                    id="motivation-style"
                    className={selectInputClass}
                    value={participantForm.motivationStyle}
                    onChange={event => setParticipantForm(prev => ({
                      ...prev,
                      motivationStyle: event.target.value as ParticipantFormState['motivationStyle'],
                    }))}
                  >
                    {motivationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evaluation-focus">評価の軸</Label>
                  <select
                    id="evaluation-focus"
                    className={selectInputClass}
                    value={participantForm.evaluationFocus}
                    onChange={event => setParticipantForm(prev => ({
                      ...prev,
                      evaluationFocus: event.target.value as ParticipantFormState['evaluationFocus'],
                    }))}
                  >
                    {evaluationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">言語</Label>
                <select
                  id="language"
                  className={selectInputClass}
                  value={participantForm.language}
                  onChange={event => setParticipantForm(prev => ({
                    ...prev,
                    language: event.target.value as ParticipantFormState['language'],
                  }))}
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ブロック統計とシナリオ判定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="block-number">ブロック番号</Label>
                  <Input
                    id="block-number"
                    type="number"
                    min={1}
                    value={currentBlock.blockNumber}
                    onChange={event => setCurrentBlock(prev => ({
                      ...prev,
                      blockNumber: Number(event.target.value) || 1,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accuracy">正答率 (%)</Label>
                  <Input
                    id="accuracy"
                    type="number"
                    min={0}
                    max={100}
                    value={currentBlock.accuracy}
                    onChange={event => setCurrentBlock(prev => ({
                      ...prev,
                      accuracy: Number(event.target.value) || 0,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="average-rt">平均RT (ms)</Label>
                  <Input
                    id="average-rt"
                    type="number"
                    min={0}
                    value={currentBlock.averageRT}
                    onChange={event => setCurrentBlock(prev => ({
                      ...prev,
                      averageRT: Number(event.target.value) || 0,
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="use-previous"
                  type="checkbox"
                  checked={usePreviousBlock}
                  onChange={event => setUsePreviousBlock(event.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                <Label htmlFor="use-previous" className="text-sm font-medium">
                  1つ前のブロック差分も比較
                </Label>
              </div>

              {usePreviousBlock && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="prev-accuracy">前ブロック正答率 (%)</Label>
                    <Input
                      id="prev-accuracy"
                      type="number"
                      min={0}
                      max={100}
                      value={previousBlock.accuracy}
                      onChange={event => setPreviousBlock(prev => ({
                        ...prev,
                        accuracy: Number(event.target.value) || 0,
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prev-rt">前ブロック平均RT (ms)</Label>
                    <Input
                      id="prev-rt"
                      type="number"
                      min={0}
                      value={previousBlock.averageRT}
                      onChange={event => setPreviousBlock(prev => ({
                        ...prev,
                        averageRT: Number(event.target.value) || 0,
                      }))}
                    />
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  現在のシナリオ
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <Badge>{scenarioLabels[computedScenario]}</Badge>
                  <span className="text-sm font-mono text-muted-foreground">{computedScenario}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API実行</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">キャッシュを強制無視</p>
                <p className="text-sm text-muted-foreground">
                  force=true を付与し、DBに保存済みのパターンを上書きします
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="bypass-cache"
                  type="checkbox"
                  checked={bypassCache}
                  onChange={event => setBypassCache(event.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                <Label htmlFor="bypass-cache" className="text-sm font-medium">
                  キャッシュ無効化
                </Label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    AIで生成
                  </>
                )}
              </Button>
              {feedbackPatterns && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFeedbackPatterns(null);
                    setRawResponse(null);
                    setResponseMeta(null);
                  }}
                >
                  <ChevronRight className="mr-2 h-4 w-4" />
                  結果をリセット
                </Button>
              )}
            </div>

            {requestError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{requestError}</AlertDescription>
              </Alert>
            )}

            {responseMeta && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">participant_id</p>
                  <p className="font-mono text-sm">{responseMeta.participantId || '-'}</p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">cached response</p>
                  <p className="font-semibold">{responseMeta.cached ? 'Yes' : 'No'}</p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">fallback (default)</p>
                  <p className="font-semibold">{responseMeta.fallback ? 'Used' : 'Not used'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {feedbackPatterns && (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>シナリオ別プレビュー</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">現在の差分から算出したサンプル</p>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Badge variant="secondary">{scenarioLabels[computedScenario]}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {computedScenario}
                      </span>
                    </div>
                    {previewMessage ? (
                      <p className="mt-3 text-base font-medium leading-relaxed">
                        {previewMessage}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        フィードバックパターンが取得できませんでした
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scenario-picker">任意のシナリオ</Label>
                    <select
                      id="scenario-picker"
                      className={selectInputClass}
                      value={selectedScenario}
                      onChange={event =>
                        setSelectedScenario(event.target.value as FeedbackScenarioKey)
                      }
                    >
                      {Object.entries(scenarioLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label} ({key})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">生成済みメッセージ (3件)</p>
                    <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                      {selectedScenarioMessages.map((message, index) => (
                        <li key={`${selectedScenario}-${index}`}>{message}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>レスポンス(JSON)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[360px] rounded-md border">
                    <pre className="whitespace-pre-wrap break-words p-4 text-xs font-mono leading-relaxed">
                      {JSON.stringify(rawResponse, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>フィードバックパターン一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[520px] rounded-md border">
                  <div className="divide-y">
                    {(Object.keys(scenarioLabels) as FeedbackScenarioKey[]).map(key => (
                      <div key={key} className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">
                              {scenarioLabels[key]}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">{key}</span>
                          </div>
                          {selectedScenario === key && <Badge variant="secondary">Preview中</Badge>}
                        </div>
                        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                          {feedbackPatterns[key].map((message, index) => (
                            <li key={`${key}-${index}`} className="text-foreground">
                              {message}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
