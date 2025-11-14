import { selectFeedback } from '@/lib/feedback/select';
import type {
  TonePreference,
  MotivationStyle,
  EvaluationFocus,
  FeedbackPattern
} from '@/types';

export type { FeedbackPattern };

export const FEEDBACK_NICKNAME_PLACEHOLDER = '__NICKNAME__';

export function applyNicknamePlaceholder(patterns: FeedbackPattern, nickname: string): FeedbackPattern {
  const safeNickname = nickname ?? '';
  const replaceToken = (message: string) =>
    message.replaceAll(FEEDBACK_NICKNAME_PLACEHOLDER, safeNickname);

  return Object.fromEntries(
    Object.entries(patterns).map(([key, messages]) => [
      key,
      messages.map(replaceToken),
    ])
  ) as FeedbackPattern;
}

export interface ParticipantInfo {
  id?: string;
  nickname: string;
  preferredPraise: string;
  tonePreference: TonePreference;
  motivationStyle: MotivationStyle;
  evaluationFocus: EvaluationFocus;
  language: 'ja' | 'en';
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
    return applyNicknamePlaceholder(cached, participantInfo.nickname);
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

    const resolvedPatterns = applyNicknamePlaceholder(data.feedbackPatterns, participantInfo.nickname);
    // キャッシュに保存
    saveFeedbackPatternsToCache(participantInfo.nickname, resolvedPatterns);

    return resolvedPatterns;

  } catch (error) {
    console.error('Failed to generate feedback patterns:', error);

    // フォールバック: デフォルトパターンを返す
    const fallback = getDefaultFeedbackPatterns(participantInfo.language);
    const resolvedFallback = applyNicknamePlaceholder(fallback, participantInfo.nickname);
    saveFeedbackPatternsToCache(participantInfo.nickname, resolvedFallback);
    return resolvedFallback;
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
export function getDefaultFeedbackPatterns(language: 'ja' | 'en'): FeedbackPattern {
  if (language === 'ja') {
    return {
      rt_short_acc_up_synergy: [
        "速さも正確さも噛み合っていて最高の波に乗っているよ。",
        "集中がきゅっとまとまって結果に表れている。今のリズムを大事にしよう。",
        `${FEEDBACK_NICKNAME_PLACEHOLDER}の判断が冴えていて、数字が一気に伸びているね。`
      ],
      rt_slow_acc_down_fatigue: [
        "少しペースを落として深呼吸しよう。軽く背伸びするだけでも感覚が戻るよ。",
        "画面の距離や姿勢を整えてリズムを立て直してみよう。焦らなくて大丈夫。",
        `${FEEDBACK_NICKNAME_PLACEHOLDER}の集中力を温存するためにも、こまめにリラックスしていこう。`
      ],
      rt_short_acc_same: [
        "テンポが良くなってきたので、その勢いで正確さもキープしていこう。",
        "判断が鋭くなっているよ。答える前に一拍置くだけでさらに安定するはず。",
        `${FEEDBACK_NICKNAME_PLACEHOLDER}の指先がしっかり動いている。あとは丁寧さを添えるだけ。`
      ],
      rt_short_acc_down: [
        "スピードは十分なので、画面に視線を固定してからキーを押してみよう。",
        "勢いがついたぶん、深呼吸を挟んで慎重さをプラスすると安定するよ。",
        `${FEEDBACK_NICKNAME_PLACEHOLDER}の反射は鋭いから、答える直前に色をもう一度確認しよう。`
      ],
      rt_short_acc_up: [
        "速さと正確さの両方が上向きでとても良いリズムだよ。",
        `${FEEDBACK_NICKNAME_PLACEHOLDER}の判断が冴えている。今のペースを信じて進もう。`,
        "迷いが減ってきているから、この流れをシンプルに維持しよう。"
      ],
      rt_slow_acc_up: [
        "丁寧に色を確かめたぶん、正答率がぐっと上がっているよ。",
        "落ち着いたテンポがうまくハマっている。この慎重さは武器になる。",
        `${FEEDBACK_NICKNAME_PLACEHOLDER}の観察力が活きている。今の安定感を大切にしよう。`
      ],
      rt_slow_acc_same: [
        "丁寧さは保てているから、指先のスピードだけ少し戻してみよう。",
        "呼吸を整えて肩の力を抜けば、もう少しテンポを上げられそうだよ。",
        `${FEEDBACK_NICKNAME_PLACEHOLDER}の安定感はそのままに、視線移動を素早くしてみよう。`
      ],
      rt_slow_acc_down: [
        "集中し直すために、画面から目を離して軽くストレッチしよう。",
        "リズムが崩れた時ほど、タイマーを意識せず落ち着くのが近道だよ。",
        `${FEEDBACK_NICKNAME_PLACEHOLDER}の感覚を取り戻すために、水分補給や姿勢リセットを試してみよう。`
      ],
      rt_same_acc_up: [
        "ペースはそのまま、判断の確かさがぐっと伸びているよ。",
        `${FEEDBACK_NICKNAME_PLACEHOLDER}の集中がじわじわ効いて、ミスが減ってきている。`,
        "安定したテンポで丁寧に見極められている。とても良い流れだね。"
      ],
      rt_same_acc_down: [
        "テンポは整っているので、色を読み上げるイメージで一度確認してみよう。",
        `${FEEDBACK_NICKNAME_PLACEHOLDER}のペースは良いから、視線移動だけ慎重に戻してみよう。`,
        "答える直前に深呼吸を入れると、判断の精度がまた戻るはず。"
      ],
      rt_same_acc_same: [
        "落ち着いたリズムを保てている。この安定感は大きな武器になるよ。",
        "波が少ない状態で進められているから、自信を持って次に行こう。",
        `${FEEDBACK_NICKNAME_PLACEHOLDER}のベースがしっかりしている。細かな工夫でさらに伸びるはず。`
      ]
    };
  }

  return {
    rt_short_acc_up_synergy: [
      `Huge boost in both speed and accuracy—perfect synergy, ${FEEDBACK_NICKNAME_PLACEHOLDER}!`,
      "Lightning-fast responses with solid accuracy. Keep the streak going!",
      "Speed and accuracy are rising together. Best-case scenario!"
    ],
    rt_slow_acc_down_fatigue: [
      "Energy seems low—pause, stretch, and reset before the next block.",
      `${FEEDBACK_NICKNAME_PLACEHOLDER}, roll your shoulders and reset those eyes before continuing.`,
      "This looks like fatigue. Short breaks or posture changes can help."
    ],
    rt_short_acc_same: [
      "Speed is improving! Just keep an eye on accuracy too.",
      "Nice tempo boost—now pair it with a quick double-check before each key.",
      `${FEEDBACK_NICKNAME_PLACEHOLDER}, you're moving faster. Stay deliberate to keep accuracy steady.`
    ],
    rt_short_acc_down: [
      "Quick reflexes, but accuracy dipped. Pause for a breath between trials.",
      "Speed is there—take a beat before answering to avoid slips.",
      `Great momentum, so re-center your focus right before each response, ${FEEDBACK_NICKNAME_PLACEHOLDER}.`
    ],
    rt_short_acc_up: [
      "Fast and accurate—fantastic groove!",
      "Tempo feels effortless and precise. Keep trusting it.",
      `Great combo of speed and accuracy. Stay in this zone, ${FEEDBACK_NICKNAME_PLACEHOLDER}!`
    ],
    rt_slow_acc_up: [
      "Taking your time paid off—the accuracy bump proves it.",
      "Deliberate pacing is helping. Trust the careful rhythm.",
      `${FEEDBACK_NICKNAME_PLACEHOLDER} slowed down just enough to remove mistakes. Smart adjustment!`
    ],
    rt_slow_acc_same: [
      "Accuracy is steady—now gradually nudge the pace back up.",
      "Calm rhythm works. Add a bit more snap to each key press.",
      `${FEEDBACK_NICKNAME_PLACEHOLDER}, stability is there. Try lifting your eyes a touch quicker.`
    ],
    rt_slow_acc_down: [
      "Both metrics slipped. Take a micro break and reset posture.",
      "Time to refresh—shake out tension and aim for a lighter touch.",
      `${FEEDBACK_NICKNAME_PLACEHOLDER}, grab some water and come back with a calmer focus.`
    ],
    rt_same_acc_up: [
      "Same tempo, better accuracy—love the consistency!",
      "You held the rhythm and sharpened judgment. Keep it rolling.",
      `Reliability plus improvement. That's a strong combo, ${FEEDBACK_NICKNAME_PLACEHOLDER}.`
    ],
    rt_same_acc_down: [
      "Tempo is fine, but accuracy dipped. Double-check the color before hitting the key.",
      "Hold the pace while giving yourself a deliberate look at each stimulus.",
      `${FEEDBACK_NICKNAME_PLACEHOLDER}, speed is steady—recenter focus on color to catch those slips.`
    ],
    rt_same_acc_same: [
      "Steady as she goes. This baseline is solid.",
      "No big swings—use this consistency as a launchpad.",
      `Calm execution, ${FEEDBACK_NICKNAME_PLACEHOLDER}. Stay confident and add tweaks when ready.`
    ]
  };
}
