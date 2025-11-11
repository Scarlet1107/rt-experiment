import { experimentConfig } from '@/lib/config/experiment';

// 反応時間の外れ値を除去する関数
export function removeOutliers(reactionTimes: number[]): number[] {
  if (reactionTimes.length === 0) return [];

  const sorted = [...reactionTimes].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return reactionTimes.filter(rt => rt >= lowerBound && rt <= upperBound);
}

// 静的フィードバックを生成する関数（機械的な数値情報のみ）
export function generateStaticFeedback(
  blockIndex: number,
  accuracy: number,
  averageRT: number,
  language: 'ja' | 'en' = 'ja'
): string {
  const blockNumber = blockIndex + 1;

  if (language === 'en') {
    return `Block ${blockNumber} summary

Accuracy: ${accuracy.toFixed(1)}%
Average reaction time: ${averageRT}ms
Blocks completed: ${blockNumber}/${experimentConfig.totalBlocks}`;
  }

  return `ブロック ${blockNumber} 結果

正答率: ${accuracy.toFixed(1)}%
平均反応時間: ${averageRT}ms
完了ブロック: ${blockNumber}/${experimentConfig.totalBlocks}`;
}

// カラーキーマッピング
export const COLOR_KEY_MAP = {
  'RED': 'f',
  'GREEN': 'j',
  'BLUE': 'k',
  'OTHER': 'd'
} as const;

// 色を16進数に変換
export const COLOR_TO_HEX = {
  'RED': '#dc2626',    // red-600
  'GREEN': '#16a34a',  // green-600  
  'BLUE': '#2563eb',   // blue-600
} as const;

// パフォーマンス統計を計算
export function calculatePerformanceStats(trials: { isCorrect: boolean; reactionTime: number | null }[]) {
  const correctTrials = trials.filter(t => t.isCorrect);
  const accuracy = trials.length > 0 ? (correctTrials.length / trials.length) * 100 : 0;

  const validRTs = correctTrials
    .map(t => t.reactionTime)
    .filter((rt): rt is number => rt !== null && rt > 0);

  const cleanedRTs = removeOutliers(validRTs);
  const averageRT = cleanedRTs.length > 0
    ? cleanedRTs.reduce((sum, rt) => sum + rt, 0) / cleanedRTs.length
    : 0;

  return {
    accuracy,
    averageRT: Math.round(averageRT),
    totalTrials: trials.length,
    correctTrials: correctTrials.length
  };
}
