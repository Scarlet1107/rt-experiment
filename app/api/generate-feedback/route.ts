import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { getDefaultFeedbackPatterns, FEEDBACK_NICKNAME_PLACEHOLDER, applyNicknamePlaceholder } from '@/lib/feedback/personalized';
import { selectFeedback as selectFeedbackFromLib } from '@/lib/feedback/select';
import type {
  TonePreference,
  MotivationStyle,
  EvaluationFocus,
  FeedbackPattern,
  FeedbackScenarioKey
} from '@/types';

// OpenAIクライアントの初期化を関数内で行う
function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase credentials are not configured');
  }

  return createServerClient(url, serviceKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // no-op for API routes
      },
    },
  });
}

function extractJson(content: string): string {
  let cleaned = content.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

interface FeedbackRequest {
  participantInfo: {
    id?: string;
    nickname: string;
    preferredPraise: string;
    tonePreference: TonePreference;
    motivationStyle: MotivationStyle;
    evaluationFocus: EvaluationFocus;
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
  force?: boolean;
}

const toneDescriptionMap: Record<'ja' | 'en', Record<TonePreference, string>> = {
  ja: {
    casual: '友達のようにカジュアルで軽快なトーン',
    gentle: '少し丁寧でやさしく落ち着いたトーン',
    formal: '落ち着いた丁寧さでしっかり伝えるトーン'
  },
  en: {
    casual: 'a friendly, casual, upbeat tone',
    gentle: 'a polite, soft, reassuring tone',
    formal: 'a formal, respectful, composed tone'
  }
};

const motivationDescriptionMap: Record<'ja' | 'en', Record<MotivationStyle, string>> = {
  ja: {
    empathetic: 'やさしく共感して支える励まし方',
    cheerleader: '熱量高く背中を押す応援スタイル',
    advisor: '冷静なアドバイスで導く声かけ'
  },
  en: {
    empathetic: 'gentle empathy that reassures the participant',
    cheerleader: 'energetic hype and cheering to push forward',
    advisor: 'calm coaching with actionable suggestions'
  }
};

const evaluationDescriptionMap: Record<'ja' | 'en', Record<EvaluationFocus, string>> = {
  ja: {
    'self-progress': '過去の自分との比較で成長を伝える評価軸',
    'social-comparison': '平均や他者との比較で優位性を示す評価軸(事実に基づかない誇張も認める)',
    'positive-focus': '良かった部分だけをシンプルに褒める評価軸'
  },
  en: {
    'self-progress': 'focusing on progress versus the participant’s past performance',
    'social-comparison': 'referencing averages or peers to show how they compare',
    'positive-focus': 'spotlighting only the good moments in a simple way'
  }
};

function describeTonePreference(value: TonePreference, language: 'ja' | 'en') {
  return toneDescriptionMap[language][value];
}

function describeMotivationStyle(value: MotivationStyle, language: 'ja' | 'en') {
  return motivationDescriptionMap[language][value];
}

function describeEvaluationFocus(value: EvaluationFocus, language: 'ja' | 'en') {
  return evaluationDescriptionMap[language][value];
}

const NICKNAME_PLACEHOLDER = FEEDBACK_NICKNAME_PLACEHOLDER;


// 日本語用プロンプト
const JAPANESE_PROMPT = `
参加者情報:
- 呼び名: {nickname}
- 好きな褒め方: {preferredPraise}
- 望む口調タイプ: {tonePreferenceDescription}
- 励まし方のスタイル: {motivationStyleDescription}
- 評価で重視したいポイント: {evaluationFocusDescription}
- 呼び名を文中で使うときは {nicknameToken}さん というプレースホルダーをそのまま挿入し、後で置換できるようにする（絶対に別表記にしない）

このフィードバックは、実験の途中で参加者のやる気を保つための「メッセージ」です。
かたくて論文のような日本語ではなく、自然な会話に近い日本語にしてください。

### 書き方のスタイル

- 「〜といえます」「〜を示しています」のような堅い表現は使わない
- 「あなた」は使わない。主語は省略するか、必要なときだけ {nicknameToken} を主語にする
- 難しい漢字や専門用語は避け、日常会話でよく使う言葉で書く
- 絵文字や顔文字は使わない

### 褒め方の方針

- 事実に基づく冷静な分析よりも、参加者を前向きな気持ちにすることを優先する
- 反応が速くなったこと、正解が増えたことなど、良くなった点をまず褒める
- 成績が伸び悩んでいる場合でも「下がった」「悪化した」などの言葉は使わず、
  「ここからまた上げていこう」など前向きな表現に言い換える
- {evaluationFocusDescription} に合う視点を意識して褒める
  - self-progress: 「前より」「この前より」など、過去の自分との比較を意識した言い方
  - social-comparison: 「平均より速そう」「上位に近づいてきた感じ」など、まわりと比べて良さそうに聞こえる言い方
  - positive-focus: 結果の細かい分析はせず、とにかく良いところだけ短く褒める

### メッセージの長さ

- 各メッセージは「全角50〜70文字」を目安に書く
- 1つのメッセージは1〜2文までにしてよい
- 40文字未満の短すぎるメッセージは書かない
- 文末は「!」をつけてもよい

### 出力するパターン

以下の11パターンごとに、50文字程度のフィードバック文を3種類ずつ生成してください(キー名は必ずそのまま使用):

1. "rt_short_acc_up_synergy": 反応がかなり速くなり、正解も大きく増えた
2. "rt_slow_acc_down_fatigue": 反応がかなり遅くなり、正解も減っている（疲れや集中切れの状態）
3. "rt_short_acc_same": 反応は速くなったが、正解は変わらない
4. "rt_short_acc_down": 反応は速くなったが、正解が少し減っている
5. "rt_short_acc_up": 反応は速くなり、正解も少し増えている（標準的な改善）
6. "rt_slow_acc_up": 反応は遅くなったが、正解が増えている
7. "rt_slow_acc_same": 反応は遅くなったが、正解は変わらない
8. "rt_slow_acc_down": 反応も遅く、正解も減っている
9. "rt_same_acc_up": 反応は同じくらいだが、正解が増えている
10. "rt_same_acc_down": 反応は同じくらいだが、正解が減っている
11. "rt_same_acc_same": 反応も正解もほぼ変わらない

### 制約（必ず守ること）

- 具体的な数値は含めない
- 参加者の呼び名を、だいたい半分くらいのメッセージで使う
- 呼び名は必ず {nicknameToken}さん をそのまま記載し、カタカナ化や漢字化は絶対にしない
- {tonePreferenceDescription} の口調で書き、{motivationStyleDescription} のノリで励ます
- 「Accuracy」「RT」などの英語は使わず、自然な日本語だけでまとめる
- ネガティブな表現は避け、常に前向きな言い換えを工夫する
- 各キーの配列は必ず3件にする

JSON形式で以下の構造を返してください（各配列は必ず3件）:
{
  "rt_short_acc_up_synergy": ["...", "...", "..."],
  "rt_slow_acc_down_fatigue": ["...", "...", "..."],
  "rt_short_acc_same": ["...", "...", "..."],
  "rt_short_acc_down": ["...", "...", "..."],
  "rt_short_acc_up": ["...", "...", "..."],
  "rt_slow_acc_up": ["...", "...", "..."],
  "rt_slow_acc_same": ["...", "...", "..."],
  "rt_slow_acc_down": ["...", "...", "..."],
  "rt_same_acc_up": ["...", "...", "..."],
  "rt_same_acc_down": ["...", "...", "..."],
  "rt_same_acc_same": ["...", "...", "..."]
}
`;

// 英語用プロンプト
const ENGLISH_PROMPT = `
Participant Information:
- Preferred name: {nickname}
- Preferred praise style: {preferredPraise}
- Preferred tone: {tonePreferenceDescription}
- Motivation style: {motivationStyleDescription}
- Evaluation focus: {evaluationFocusDescription}
- Even if performance is stagnant, do not mention it; keep the tone positive and forward-looking
- When referencing the preferred name, insert the literal token {nicknameToken}. Do not rewrite, translate, or add honorifics because the system will replace the token later.

These messages should explicitly aim to boost the participant's motivation within the ongoing experiment context. Unless the participant explicitly asked for otherwise, favor enthusiastic praise over sober, factual analysis. Highlight improvements in reaction speed and accuracy first whenever possible.
Generate three short (10-20 words) feedback messages for each of the following 11 scenarios (keep the JSON keys exactly as listed):

1. "rt_short_acc_up_synergy": RT much faster & accuracy much higher (good synergy)
2. "rt_slow_acc_down_fatigue": RT much slower & accuracy much lower (fatigue sign)
3. "rt_short_acc_same": RT faster, accuracy unchanged
4. "rt_short_acc_down": RT faster, accuracy lower
5. "rt_short_acc_up": RT faster, accuracy higher (standard improvement)
6. "rt_slow_acc_up": RT slower, accuracy higher
7. "rt_slow_acc_same": RT slower, accuracy unchanged
8. "rt_slow_acc_down": RT slower, accuracy lower
9. "rt_same_acc_up": RT unchanged, accuracy higher
10. "rt_same_acc_down": RT unchanged, accuracy lower
11. "rt_same_acc_same": Both RT and accuracy unchanged

Constraints:
- Do not include specific numbers
- Mention the participant’s name roughly half the time by using the token {nicknameToken}
- Write using {tonePreferenceDescription} and the energy of {motivationStyleDescription}
- Praise primarily through {evaluationFocusDescription}
- Keep it positive and encouraging; avoid negative wording
- Never rewrite the name: no casing changes, transliteration, or honorifics—only use {nicknameToken}

Output JSON with this structure (each array must contain exactly 3 messages):
{
  "rt_short_acc_up_synergy": ["...", "...", "..."],
  "rt_slow_acc_down_fatigue": ["...", "...", "..."],
  "rt_short_acc_same": ["...", "...", "..."],
  "rt_short_acc_down": ["...", "...", "..."],
  "rt_short_acc_up": ["...", "...", "..."],
  "rt_slow_acc_up": ["...", "...", "..."],
  "rt_slow_acc_same": ["...", "...", "..."],
  "rt_slow_acc_down": ["...", "...", "..."],
  "rt_same_acc_up": ["...", "...", "..."],
  "rt_same_acc_down": ["...", "...", "..."],
  "rt_same_acc_same": ["...", "...", "..."]
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
    const { participantInfo, force } = data;

    // プロンプト選択
    const prompt = participantInfo.language === 'ja' ? JAPANESE_PROMPT : ENGLISH_PROMPT;
    const toneDescription = describeTonePreference(participantInfo.tonePreference, participantInfo.language);
    const motivationDescription = describeMotivationStyle(participantInfo.motivationStyle, participantInfo.language);
    const evaluationDescription = describeEvaluationFocus(participantInfo.evaluationFocus, participantInfo.language);

    // プロンプトの置換
    const filledPrompt = prompt
      .replace('{nickname}', participantInfo.nickname)
      .replace('{preferredPraise}', participantInfo.preferredPraise)
      .replace(/{tonePreferenceDescription}/g, toneDescription)
      .replace(/{motivationStyleDescription}/g, motivationDescription)
      .replace(/{evaluationFocusDescription}/g, evaluationDescription)
      .replace(/{nicknameToken}/g, NICKNAME_PLACEHOLDER);

    console.log('Generating feedback patterns for:', participantInfo.nickname);

    const supabaseAdmin = createSupabaseAdminClient();
    const participantId = participantInfo.id || participantInfo.nickname;

    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('feedback_patterns')
      .select('patterns')
      .eq('participant_id', participantId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingRecord?.patterns && !force) {
      const resolvedPatterns = applyNicknamePlaceholder(
        existingRecord.patterns as FeedbackPattern,
        participantInfo.nickname
      );
      return NextResponse.json({
        success: true,
        feedbackPatterns: resolvedPatterns,
        participantId,
        cached: true,
      });
    }

    // OpenAIクライアントを作成
    const openai = createOpenAIClient();

    const feedbackSchemaProperties = Object.fromEntries(
      (
        [
          'rt_short_acc_up_synergy',
          'rt_slow_acc_down_fatigue',
          'rt_short_acc_same',
          'rt_short_acc_down',
          'rt_short_acc_up',
          'rt_slow_acc_up',
          'rt_slow_acc_same',
          'rt_slow_acc_down',
          'rt_same_acc_up',
          'rt_same_acc_down',
          'rt_same_acc_same'
        ] as FeedbackScenarioKey[]
      ).map(key => [key, {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: { type: 'string' }
      }])
    );

    let feedbackPatterns: FeedbackPattern;
    let usedFallback = false;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a JSON-only assistant. Always respond with valid JSON matching the provided schema.'
          },
          {
            role: 'user',
            content: filledPrompt
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'feedback_patterns_schema',
            schema: {
              type: 'object',
              properties: feedbackSchemaProperties,
              required: Object.keys(feedbackSchemaProperties),
              additionalProperties: false
            },
            strict: true
          }
        }
      });

      // トークン使用量をログ出力
      const usage = completion.usage;
      if (usage) {
        console.log('📊 OpenAI Token Usage:', {
          participant: participantInfo.nickname,
          language: participantInfo.language,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          model: 'gpt-4.1-mini'
        });
      }

      const feedbackContent = completion.choices[0]?.message?.content;

      if (!feedbackContent) {
        throw new Error('No feedback content generated');
      }

      const sanitized = extractJson(feedbackContent);
      feedbackPatterns = JSON.parse(sanitized);
    } catch (error) {
      console.error('OpenAI generation failed, falling back to defaults:', error);
      feedbackPatterns = getDefaultFeedbackPatterns(participantInfo.language);
      usedFallback = true;
    }

    const resolvedPatterns = applyNicknamePlaceholder(feedbackPatterns, participantInfo.nickname);

    const { error: upsertError } = await supabaseAdmin
      .from('feedback_patterns')
      .upsert({
        id: participantId,
        participant_id: participantId,
        language: participantInfo.language,
        patterns: resolvedPatterns,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'participant_id' });

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      feedbackPatterns: resolvedPatterns,
      participantId,
      fallback: usedFallback,
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
  return selectFeedbackFromLib(currentBlock, previousBlock, patterns);
}
