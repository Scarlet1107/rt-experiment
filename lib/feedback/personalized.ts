import { selectFeedback } from '../../app/api/generate-feedback/route';
import type {
  TonePreference,
  MotivationStyle,
  EvaluationFocus,
  FeedbackPattern
} from '@/types';

export type { FeedbackPattern };

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
export function getDefaultFeedbackPatterns(language: 'ja' | 'en'): FeedbackPattern {
  if (language === 'ja') {
    return {
      rt_short_acc_up_synergy: [
        "RTも正確さも大幅アップ！理想の波に乗ってるよ。",
        "速さとAccuracyが同時に跳ね上がって最高の状態！",
        "スピードと精度の両方が噛み合っていて素晴らしい！"
      ],
      rt_slow_acc_down_fatigue: [
        "少し疲れが出てるかも。深呼吸して気持ちを切り替えよう。",
        "RTもAccuracyも下がったので、短い休憩でリセットしよう。",
        "集中が途切れているサイン。姿勢を整えて整え直そう。"
      ],
      rt_short_acc_same: [
        "反応が速くなっているよ！このテンポで正確さも保とう。",
        "スピードは伸びているので、丁寧さを意識すれば完璧。",
        "テンポが良くなっているから、その調子で正答率もキープしよう。"
      ],
      rt_short_acc_down: [
        "速さは十分なので、落ち着いてミスを減らしてみよう。",
        "テンポが上がった分だけ慎重さをプラスしていこう。",
        "スピードは噛み合っているから、判断を丁寧に戻せば大丈夫。"
      ],
      rt_short_acc_up: [
        "速さも正確さも着実に伸びていて素晴らしい！",
        "テンポ良く正解できているので、この流れを続けよう。",
        "スピードもAccuracyもアップ中。とても良いコンディションだよ。"
      ],
      rt_slow_acc_up: [
        "慎重さがAccuracyの向上につながっているよ。",
        "丁寧に取り組んだ結果、正答率が改善しているね。",
        "ペースを落とした分だけミスが減っていて良い判断だよ。"
      ],
      rt_slow_acc_same: [
        "正確さは保てているから、次はスピードを少し戻してみよう。",
        "落ち着いたリズムで進められているので、テンポ調整だけ意識しよう。",
        "慎重モードで安定しているね。呼吸を整えてスピードも取り戻そう。"
      ],
      rt_slow_acc_down: [
        "ペースが落ちてミスも増えているので、軽くリフレッシュしよう。",
        "一度肩の力を抜いて、リズムと正確さを同時に整え直そう。",
        "集中が切れているサイン。短い休憩や姿勢の調整がおすすめ。"
      ],
      rt_same_acc_up: [
        "安定したリズムのまま正確さが上がっていて頼もしい！",
        "ペースはそのまま、ミスが減っていてとても良い流れ。",
        "リズムを崩さずにAccuracyが向上しているよ。"
      ],
      rt_same_acc_down: [
        "テンポは安定しているから、視線と判断を丁寧に戻そう。",
        "リズムはいいので、答える前に1拍置いてミスを減らそう。",
        "スピードは保てているので、集中だけもう一度整えよう。"
      ],
      rt_same_acc_same: [
        "安定したパフォーマンスが続いているよ。",
        "大きな変動なく続けられているので、この土台を活かそう。",
        "落ち着いた状態をキープできているね。リズムを信じていこう。"
      ]
    };
  }

  return {
    rt_short_acc_up_synergy: [
      "Huge boost in both speed and accuracy—perfect synergy!",
      "RT and accuracy jumped together, this is the sweet spot!",
      "Fast and precise at the same time. Stellar performance!"
    ],
    rt_slow_acc_down_fatigue: [
      "Looks like fatigue. Take a breath and reset your focus.",
      "Both speed and accuracy dipped, so consider a quick pause.",
      "Signs of tiredness—reset your posture and regroup."
    ],
    rt_short_acc_same: [
      "You’re reacting faster! Keep that pace while holding accuracy.",
      "Speed improved, so just keep the same calm precision.",
      "Tempo is up, now maintain the same steady accuracy."
    ],
    rt_short_acc_down: [
      "Speed is great, now slow the mind slightly to reduce slips.",
      "Quick reactions achieved—add a touch of calm for accuracy.",
      "You’ve got the tempo, just tighten decisions for fewer errors."
    ],
    rt_short_acc_up: [
      "Speed and accuracy are both trending up—fantastic run!",
      "Quick and precise responses—stay with this rhythm.",
      "RT and accuracy improving together. Keep pushing!"
    ],
    rt_slow_acc_up: [
      "Taking your time paid off with cleaner answers.",
      "Accuracy improved as you slowed down; now ease the pace back up.",
      "Being deliberate raised your precision. Great adjustment."
    ],
    rt_slow_acc_same: [
      "Accuracy held steady; gently nudge the pace up again.",
      "Calm rhythm maintained—now reintroduce a bit more speed.",
      "Careful approach is stable. Add a touch of tempo when ready."
    ],
    rt_slow_acc_down: [
      "Slower and less accurate—shake it off with a short reset.",
      "Both metrics dipped, so reset your focus and posture.",
      "Energy dropped; take a quick break to realign speed and precision."
    ],
    rt_same_acc_up: [
      "Steady pace with rising accuracy—awesome consistency!",
      "Same rhythm, fewer errors. That’s reliable progress.",
      "Accuracy climbed without changing tempo—keep that groove."
    ],
    rt_same_acc_down: [
      "Pace is steady, so double-check before responding to reduce slips.",
      "Hold the rhythm but add a breath before answering.",
      "Speed is there; channel more focus into each decision."
    ],
    rt_same_acc_same: [
      "Stable run. Keep trusting this baseline.",
      "No big swings—use this calm state as a launchpad.",
      "Consistency maintained. When you’re ready, push gently forward."
    ]
  };
}
