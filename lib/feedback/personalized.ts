import { selectFeedback } from '../../app/api/generate-feedback/route';

export interface ParticipantInfo {
  nickname: string;
  preferredPraise: string;
  avoidExpressions: string[];
  language: 'ja' | 'en';
}

export interface FeedbackPattern {
  rtImproved: string[];
  rtDeclined: string[];
  accuracyHigh: string[];
  accuracyLow: string[];
  perfectScore: string[];
  consistent: string[];
  encouragement: string[];
}

export interface BlockPerformance {
  blockNumber: number;
  accuracy: number;
  averageRT: number;
}

// フィードバックパターンをキャッシュするためのストレージ
const FEEDBACK_CACHE_KEY = 'rt_experiment_feedback_patterns';

/**
 * 参加者のフィードバックパターンを生成・取得
 */
export async function getOrGenerateFeedbackPatterns(
  participantInfo: ParticipantInfo
): Promise<FeedbackPattern> {
  // キャッシュから取得を試みる
  const cached = getFeedbackPatternsFromCache(participantInfo.nickname);
  if (cached) {
    console.log('Using cached feedback patterns for:', participantInfo.nickname);
    return cached;
  }

  // API経由で生成
  try {
    console.log('Generating new feedback patterns for:', participantInfo.nickname);

    const response = await fetch('/api/generate-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participantInfo,
        blockData: {
          blockNumber: 1,
          accuracy: 85,
          averageRT: 650
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.feedbackPatterns) {
      throw new Error('Invalid API response format');
    }

    // キャッシュに保存
    saveFeedbackPatternsToCache(participantInfo.nickname, data.feedbackPatterns);

    return data.feedbackPatterns;

  } catch (error) {
    console.error('Failed to generate feedback patterns:', error);

    // フォールバック: デフォルトパターンを返す
    return getDefaultFeedbackPatterns(participantInfo.language);
  }
}

/**
 * ブロック結果に基づいてフィードバックを選択
 */
export function generatePersonalizedBlockFeedback(
  currentBlock: BlockPerformance,
  previousBlock: BlockPerformance | null,
  feedbackPatterns: FeedbackPattern
): string {
  return selectFeedback(
    { accuracy: currentBlock.accuracy, averageRT: currentBlock.averageRT },
    previousBlock ? { accuracy: previousBlock.accuracy, averageRT: previousBlock.averageRT } : null,
    feedbackPatterns
  );
}

/**
 * キャッシュからフィードバックパターンを取得
 */
function getFeedbackPatternsFromCache(nickname: string): FeedbackPattern | null {
  try {
    const cached = localStorage.getItem(`${FEEDBACK_CACHE_KEY}_${nickname}`);
    if (cached) {
      const data = JSON.parse(cached);
      // 24時間でキャッシュ期限切れ
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return data.patterns;
      }
    }
  } catch (error) {
    console.error('Error reading feedback patterns cache:', error);
  }
  return null;
}

/**
 * フィードバックパターンをキャッシュに保存
 */
function saveFeedbackPatternsToCache(nickname: string, patterns: FeedbackPattern): void {
  try {
    const data = {
      patterns,
      timestamp: Date.now()
    };
    localStorage.setItem(`${FEEDBACK_CACHE_KEY}_${nickname}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving feedback patterns to cache:', error);
  }
}

/**
 * デフォルトフィードバックパターン（API失敗時のフォールバック）
 */
function getDefaultFeedbackPatterns(language: 'ja' | 'en'): FeedbackPattern {
  if (language === 'ja') {
    return {
      rtImproved: [
        "前より速くなってるね！",
        "反応が良くなってる！",
        "スピードアップしてる！",
        "テンポ良くなったね！",
        "反応時間が改善してる！"
      ],
      rtDeclined: [
        "落ち着いて取り組もう",
        "正確性を重視して",
        "焦らずにいこう",
        "丁寧にやってみて",
        "一つずつ確実に"
      ],
      accuracyHigh: [
        "すごく正確だね！",
        "ほとんど正解してる！",
        "集中できてるみたい！",
        "とても良い正答率！",
        "正確性が素晴らしい！"
      ],
      accuracyLow: [
        "次はもう少し慎重に",
        "落ち着いて判断しよう",
        "集中して取り組もう",
        "正確性を意識して",
        "ゆっくりでも確実に"
      ],
      perfectScore: [
        "パーフェクト！素晴らしい！",
        "全問正解！すごい！",
        "完璧な成績だね！",
        "100点！お見事！",
        "全て正解！最高！"
      ],
      consistent: [
        "安定したペースだね",
        "一定のリズムで進んでる",
        "ブレずに続けられてる",
        "安定感があるね",
        "コンスタントに頑張ってる"
      ],
      encouragement: [
        "この調子で頑張って！",
        "よく集中できてるね",
        "順調に進んでる！",
        "いい感じだよ！",
        "継続して頑張ろう！"
      ]
    };
  } else {
    return {
      rtImproved: [
        "You're getting faster!",
        "Great reaction time improvement!",
        "Speed is picking up!",
        "Nice tempo improvement!",
        "Response time is getting better!"
      ],
      rtDeclined: [
        "Take your time and stay calm",
        "Focus on accuracy",
        "No rush, stay steady",
        "Careful and precise",
        "One step at a time"
      ],
      accuracyHigh: [
        "Excellent accuracy!",
        "Almost all correct!",
        "Great focus!",
        "Very good accuracy rate!",
        "Impressive precision!"
      ],
      accuracyLow: [
        "A bit more careful next time",
        "Take time to think",
        "Stay focused",
        "Accuracy over speed",
        "Slow and steady wins"
      ],
      perfectScore: [
        "Perfect! Amazing!",
        "All correct! Fantastic!",
        "Flawless performance!",
        "100%! Excellent!",
        "Perfect score! Outstanding!"
      ],
      consistent: [
        "Steady pace, well done",
        "Consistent rhythm",
        "Stable performance",
        "Good consistency",
        "Maintaining good pace"
      ],
      encouragement: [
        "Keep up the good work!",
        "Great concentration!",
        "Going well!",
        "Nice job!",
        "Stay focused and continue!"
      ]
    };
  }
}
