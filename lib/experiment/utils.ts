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
    let feedback = `Block ${blockNumber} summary

Accuracy: ${accuracy.toFixed(1)}%
Average reaction time: ${averageRT}ms`;
    feedback += `
Blocks completed: ${blockNumber}/${experimentConfig.totalBlocks}`;
    return feedback;
  }

  let feedback = `ブロック ${blockNumber} 結果

正答率: ${accuracy.toFixed(1)}%
平均反応時間: ${averageRT}ms`;
  feedback += `
完了ブロック: ${blockNumber}/${experimentConfig.totalBlocks}`;
  return feedback;
}

// カラーキーマッピング
export const COLOR_KEY_MAP = {
  'RED': 's',
  'GREEN': 'k',
  'BLUE': 'l',
  'OTHER': 'a'
} as const;

// 色を16進数に変換
export const COLOR_TO_HEX = {
  'RED': '#dc2626',    // red-600
  'GREEN': '#16a34a',  // green-600  
  'BLUE': '#2563eb',   // blue-600
} as const;

// パフォーマンス統計を計算
export function calculatePerformanceStats(
  trials: { isCorrect: boolean | null; reactionTime: number | null; responseKey?: string | null }[]
) {
  const totalTrials = trials.length;
  const correctTrials = trials.filter(t => t.isCorrect === true);
  const incorrectTrials = trials.filter(t => t.isCorrect === false);
  const timeoutTrials = trials.filter(t => t.isCorrect === null);

  // 応答した試行のみで正答率を計算（タイムアウトは除外）
  const respondedTrials = trials.filter(t => t.isCorrect !== null);
  const accuracy = respondedTrials.length > 0 ? (correctTrials.length / respondedTrials.length) * 100 : 0;

  // タイムアウト率も計算
  const timeoutRate = totalTrials > 0 ? (timeoutTrials.length / totalTrials) * 100 : 0;

  const answeredTrials = trials.filter(
    t =>
      t.isCorrect !== null &&
      typeof t.responseKey === 'string' &&
      typeof t.reactionTime === 'number' &&
      (t.reactionTime ?? 0) > 0
  );

  const allRTs = answeredTrials
    .map(t => t.reactionTime)
    .filter((rt): rt is number => typeof rt === 'number' && rt > 0);
  const correctRTs = answeredTrials
    .filter(t => t.isCorrect === true)
    .map(t => t.reactionTime)
    .filter((rt): rt is number => typeof rt === 'number' && rt > 0);

  const cleanedAllRTs = removeOutliers(allRTs);
  const cleanedCorrectRTs = removeOutliers(correctRTs);

  const averageAll = cleanedAllRTs.length > 0
    ? cleanedAllRTs.reduce((sum, rt) => sum + rt, 0) / cleanedAllRTs.length
    : 0;

  const averageCorrectOnly = cleanedCorrectRTs.length > 0
    ? cleanedCorrectRTs.reduce((sum, rt) => sum + rt, 0) / cleanedCorrectRTs.length
    : 0;

  return {
    accuracy, // 応答した試行のみでの正答率
    timeoutRate, // タイムアウト率
    averageRT: Math.round(averageAll),
    averageRTCorrectOnly: Math.round(averageCorrectOnly),
    totalTrials,
    correctTrials: correctTrials.length,
    incorrectTrials: incorrectTrials.length,
    timeoutTrials: timeoutTrials.length,
    respondedTrials: respondedTrials.length
  };
}
