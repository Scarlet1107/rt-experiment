import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FeedbackRequest {
  participantInfo: {
    nickname: string;
    preferredPraise: string;
    avoidExpressions: string[];
    language: 'ja' | 'en';
  };
  blockData: {
    blockNumber: number;
    accuracy: number;
    averageRT: number;
    previousBlock?: {
      accuracy: number;
      averageRT: number;
    };
  };
}

interface FeedbackPattern {
  rtImproved: string[];
  rtDeclined: string[];
  accuracyHigh: string[];
  accuracyLow: string[];
  perfectScore: string[];
  consistent: string[];
  encouragement: string[];
}

// 日本語用プロンプト
const JAPANESE_PROMPT = `
参加者情報:
- 呼び名: {nickname}
- 好きな褒め方: {preferredPraise}
- 避けてほしい表現: {avoidExpressions}

以下の状況に対応したフィードバックを各5パターン生成してください：

1. 反応時間が向上した場合（前回より速くなった）
2. 反応時間が低下した場合（前回より遅くなった）
3. 正答率が高い場合（85%以上）
4. 正答率が低い場合（70%未満）
5. 全問正解の場合（100%）
6. 安定したパフォーマンスの場合（前回と大きな変化なし）
7. 一般的な励ましの場合

制約:
- 具体的な数値は含めない
- 15文字から30文字程度
- 参加者の呼び名を適度に含める（半分程度）
- ポジティブで励ましの内容
- ネガティブな表現は避ける
- 参加者の避けたい表現は使用しない
- カジュアルで親しみやすいトーン

JSON形式で以下の構造で出力してください：
{
  "rtImproved": ["...", "...", "...", "...", "..."],
  "rtDeclined": ["...", "...", "...", "...", "..."],
  "accuracyHigh": ["...", "...", "...", "...", "..."],
  "accuracyLow": ["...", "...", "...", "...", "..."],
  "perfectScore": ["...", "...", "...", "...", "..."],
  "consistent": ["...", "...", "...", "...", "..."],
  "encouragement": ["...", "...", "...", "...", "..."]
}
`;

// 英語用プロンプト
const ENGLISH_PROMPT = `
Participant Information:
- Preferred name: {nickname}
- Preferred praise style: {preferredPraise}
- Expressions to avoid: {avoidExpressions}

Generate 5 feedback patterns for each of the following situations:

1. Reaction time improved (faster than previous)
2. Reaction time declined (slower than previous)
3. High accuracy (85% or above)
4. Low accuracy (below 70%)
5. Perfect score (100%)
6. Consistent performance (no major change from previous)
7. General encouragement

Constraints:
- Do not include specific numbers
- 10-25 words per feedback
- Include participant's name moderately (about half the time)
- Positive and encouraging content
- Avoid negative expressions
- Do not use expressions the participant wants to avoid
- Casual and friendly tone

Output in JSON format with the following structure:
{
  "rtImproved": ["...", "...", "...", "...", "..."],
  "rtDeclined": ["...", "...", "...", "...", "..."],
  "accuracyHigh": ["...", "...", "...", "...", "..."],
  "accuracyLow": ["...", "...", "...", "...", "..."],
  "perfectScore": ["...", "...", "...", "...", "..."],
  "consistent": ["...", "...", "...", "...", "..."],
  "encouragement": ["...", "...", "...", "...", "..."]
}
`;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const data: FeedbackRequest = await request.json();
    const { participantInfo } = data;

    // プロンプト選択
    const prompt = participantInfo.language === 'ja' ? JAPANESE_PROMPT : ENGLISH_PROMPT;

    // プロンプトの置換
    const filledPrompt = prompt
      .replace('{nickname}', participantInfo.nickname)
      .replace('{preferredPraise}', participantInfo.preferredPraise)
      .replace('{avoidExpressions}', participantInfo.avoidExpressions.join(', '));

    console.log('Generating feedback patterns for:', participantInfo.nickname);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // GPT-5-nanoが利用可能になるまでの代替
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates encouraging feedback for psychology experiments."
        },
        {
          role: "user",
          content: filledPrompt
        }
      ],
      temperature: 0.8, // 多様性のために少し高めに設定
      max_tokens: 1500,
    });

    const feedbackContent = response.choices[0]?.message?.content;

    if (!feedbackContent) {
      throw new Error('No feedback content generated');
    }

    // JSONパース
    let feedbackPatterns: FeedbackPattern;
    try {
      feedbackPatterns = JSON.parse(feedbackContent);
    } catch {
      console.error('Failed to parse feedback JSON:', feedbackContent);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // データ保存（参加者情報とフィードバックパターンを関連付け）
    // TODO: Supabaseに保存する場合はここに実装

    return NextResponse.json({
      success: true,
      feedbackPatterns,
      participantId: participantInfo.nickname, // 識別用
    });

  } catch (error) {
    console.error('Error generating feedback:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// フィードバック選択ロジック
export function selectFeedback(
  currentBlock: { accuracy: number; averageRT: number },
  previousBlock: { accuracy: number; averageRT: number } | null,
  patterns: FeedbackPattern
): string {
  // パーフェクトスコア
  if (currentBlock.accuracy === 100) {
    return randomSelect(patterns.perfectScore);
  }

  // 前ブロックとの比較がある場合
  if (previousBlock) {
    const rtDiff = currentBlock.averageRT - previousBlock.averageRT;
    const accuracyDiff = currentBlock.accuracy - previousBlock.accuracy;

    // 反応時間が改善された場合（RTが短くなった = 良い）
    if (rtDiff < -50) { // 50ms以上改善
      return randomSelect(patterns.rtImproved);
    }

    // 反応時間が悪化した場合
    if (rtDiff > 100) { // 100ms以上悪化
      return randomSelect(patterns.rtDeclined);
    }

    // 安定したパフォーマンス
    if (Math.abs(rtDiff) < 50 && Math.abs(accuracyDiff) < 5) {
      return randomSelect(patterns.consistent);
    }
  }

  // 正答率ベース
  if (currentBlock.accuracy >= 85) {
    return randomSelect(patterns.accuracyHigh);
  }

  if (currentBlock.accuracy < 70) {
    return randomSelect(patterns.accuracyLow);
  }

  // デフォルト
  return randomSelect(patterns.encouragement);
}

function randomSelect<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
