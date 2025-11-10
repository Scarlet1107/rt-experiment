# RT実験アプリ本番実装仕様書

## 1. 概要

### 1.1 目的
Stroop課題ベースのReaction Time（RT）実験をWeb上で実施し、StaticフィードバックとPersonalizedフィードバックの効果を比較研究する。

### 1.2 実験設計
- **被験者内計画**: 各参加者がStatic条件とPersonalized条件の両方を実施
- **実施間隔**: 最低１日の間隔を空けて実施（24時間開ける必要はない）
- **匿名性**: 参加者の個人情報は完全匿名化
- **データ利用**: 卒業論文および学術発表のみに利用

### 1.3 多言語対応
- **対応言語**: 日本語・英語の2言語
- **言語選択**: 実験開始前（同意書より前）に選択
- **刺激固定**: Stroop刺激（"red", "blue", "green", 無意味語）は常に英語で統一
- **UI/フィードバック**: 選択された言語に応じて動的に切り替え

## 2. 刺激設計

### 2.1 ブロック構成
- **総試行数**: 480試行（60試行 × 8ブロック）
- **ブロック間の統制**: 各ブロックで同じ刺激セットを使用（提示順序のみランダム化）

### 2.2 60試行の内訳（各ブロック共通）

#### 2.2.1 回答カテゴリ別分布
```
レッド回答: 15試行
ブルー回答: 15試行  
グリーン回答: 15試行
アザー回答: 15試行
合計: 60試行
```

#### 2.2.2 各回答カテゴリ内の色分布
**レッド回答の15試行**:
- 赤色文字: 5試行（"red"を赤色で表示）
- 青色文字: 5試行（"red"を青色で表示）
- 緑色文字: 5試行（"red"を緑色で表示）

**ブルー回答の15試行**:
- 赤色文字: 5試行（"blue"を赤色で表示）
- 青色文字: 5試行（"blue"を青色で表示）
- 緑色文字: 5試行（"blue"を緑色で表示）

**グリーン回答の15試行**:
- 赤色文字: 5試行（"green"を赤色で表示）
- 青色文字: 5試行（"green"を青色で表示）
- 緑色文字: 5試行（"green"を緑色で表示）

**アザー回答の15試行**:
- 赤色文字: 5試行（無意味語を赤色で表示）
- 青色文字: 5試行（無意味語を青色で表示）
- 緑色文字: 5試行（無意味語を緑色で表示）

#### 2.2.3 使用する無意味語（15語固定）
```
"bath", "bike", "ghost", "glass", "row", "rat", "cat", "dog", 
"table", "egg", "door", "tree", "fish", "water", "chair"
```

### 2.3 刺激生成ロジック
```typescript
type StroopStimulus = {
  word: string;           // 表示する単語（常に英語）
  inkColor: 'RED' | 'BLUE' | 'GREEN';  // 文字色
  correctAnswer: 'RED' | 'BLUE' | 'GREEN' | 'OTHER';  // 正解
  isCongruent: boolean;   // 一致試行かどうか
  category: 'COLOR_WORD' | 'NONSENSE';  // 刺激タイプ
};

function generateBlockStimuli(): StroopStimulus[] {
  const nonsenseWords = [
    "bath", "bike", "ghost", "glass", "row", "rat", "cat", "dog", 
    "table", "egg", "door", "tree", "fish", "water", "chair"
  ];
  
  const stimuli: StroopStimulus[] = [];
  const colors: ('RED' | 'BLUE' | 'GREEN')[] = ['RED', 'BLUE', 'GREEN'];
  
  // 色単語刺激（45試行：各色15試行ずつ）
  // 注意: 単語は常に英語 ("red", "blue", "green")
  colors.forEach(colorWord => {
    colors.forEach(inkColor => {
      // 各色の組み合わせで5試行ずつ
      for (let i = 0; i < 5; i++) {
        stimuli.push({
          word: colorWord.toLowerCase(), // 常に英語
          inkColor: inkColor,
          correctAnswer: inkColor,
          isCongruent: colorWord === inkColor,
          category: 'COLOR_WORD'
        });
      }
    });
  });
  
  // 無意味語刺激（15試行）
  // 注意: 無意味語も常に英語
  nonsenseWords.forEach((word, index) => {
    const inkColor = colors[index % 3]; // 5つずつ各色に割り当て
    stimuli.push({
      word: word, // 常に英語
      inkColor: inkColor,
      correctAnswer: 'OTHER',
      isCongruent: false,
      category: 'NONSENSE'
    });
  });
  
  // ランダムに並び替え（ブロックごとに異なる順序）
  return shuffleArray(stimuli);
}
```

### 2.4 言語固定の理由
- **実験統制**: 言語による認知負荷の違いを排除
- **国際比較**: 他の研究との比較可能性を保持
- **データ品質**: 言語による刺激処理時間の差を統制

### 2.5 ブロック間の統制
- **刺激内容**: 全ブロックで完全に同一の刺激セット
- **提示順序**: ブロックごとにランダムシャッフル
- **一致/不一致比率**: 各ブロックで一致試行15回、不一致試行45回で固定

## 3. 言語対応システム

### 3.1 言語選択フロー
```
アクセス
    ↓
言語選択ページ（日本語 | English）
    ↓
同意書ページ（選択言語）
    ↓
以降のフロー
```

### 3.2 多言語対応範囲

#### 3.2.1 言語固定要素（常に英語）
- **Stroop刺激**: "red", "blue", "green"
- **無意味語**: "bath", "bike", "ghost", etc.
- **キー割り当て表示**: F, J, K, D

#### 3.2.2 多言語要素（日本語/English）
- **UI全般**: ボタン、説明文、ナビゲーション
- **同意書**: 研究参加同意に関する文言
- **注意事項**: 実験に関する説明・注意点
- **フィードバック**: Static/Personalizedフィードバック文
- **完了画面**: 実験終了時のメッセージ
- **エラーメッセージ**: システムエラー・入力エラー

#### 3.2.3 キー説明の多言語対応
**日本語版**:
```
F → 赤色
J → 緑色  
K → 青色
D → その他
```

**English版**:
```
F → Red
J → Green
K → Blue  
D → Other
```

### 3.3 言語設定の実装

#### 3.3.1 言語データ構造
```typescript
type Language = 'ja' | 'en';

interface LocalizedContent {
  consent: {
    title: string;
    content: string;
    agreeButton: string;
    disagreeButton: string;
  };
  
  instructions: {
    title: string;
    description: string;
    keyMapping: {
      red: string;
      green: string;
      blue: string;
      other: string;
    };
    startButton: string;
  };
  
  feedback: {
    staticTemplate: {
      blockResult: string;
      averageRT: string;
      accuracy: string;
      comparison: string;
    };
    
    personalizedPrompt: string; // OpenAI用プロンプト
  };
  
  completion: {
    title: string;
    message: string;
    nextSessionInfo: string;
  };
}
```

#### 3.3.2 言語切り替え実装
```typescript
// Context for language management
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}>({
  language: 'ja',
  setLanguage: () => {},
  t: () => '',
});

// Language selection component
function LanguageSelector() {
  const { setLanguage } = useContext(LanguageContext);
  
  return (
    <div className="language-selector">
      <button onClick={() => setLanguage('ja')}>
        日本語
      </button>
      <button onClick={() => setLanguage('en')}>
        English
      </button>
    </div>
  );
}
```

### 3.4 OpenAI API多言語対応

#### 3.4.1 言語別プロンプト
```typescript
const FEEDBACK_PROMPTS = {
  ja: `
参加者情報:
- 呼び名: {nickname}
- 好きな褒め方: {preferredPraise}
- 望む口調タイプ: {tonePreference}
- 励まし方のスタイル: {motivationStyle}
- 評価で重視したいポイント: {evaluationFocus}

以下の状況に対応したフィードバックを各5パターン生成してください：
[日本語プロンプト内容]
`,
  
  en: `
Participant Information:
- Preferred name: {nickname}
- Preferred praise style: {preferredPraise}
- Preferred tone: {tonePreference}
- Motivation style: {motivationStyle}
- Evaluation focus: {evaluationFocus}

Generate 5 feedback patterns for each of the following situations:
[English prompt content]
`
};
```

#### 3.4.2 フィードバック生成
```typescript
async function generatePersonalizedFeedback(
  participantInfo: ParticipantInfo,
  language: Language
): Promise<FeedbackPattern> {
  const prompt = FEEDBACK_PROMPTS[language]
    .replace('{nickname}', participantInfo.nickname)
    .replace('{preferredPraise}', participantInfo.preferredPraise)
    .replace('{tonePreference}', participantInfo.tonePreference)
    .replace('{motivationStyle}', participantInfo.motivationStyle)
    .replace('{evaluationFocus}', participantInfo.evaluationFocus);
    
  const response = await openai.chat.completions.create({
    model: "gpt-5-nano",
    messages: [{ role: "user", content: prompt }],
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

## 4. 実験フロー

### 4.1 事前準備（管理者）
1. 管理者画面でUUIDを発行
2. Static用URLとPersonalized用URLを生成
3. 参加者にメール等でURL配布

### 4.2 参加者の実験フロー

#### 4.2.1 セッション1（初回アクセス）
```
言語選択ページ
    ↓
同意書ページ（選択言語）
    ↓
事前ヒアリング（パーソナライゼーション用・選択言語）
    ↓
注意事項ページ（選択言語）
    ↓
練習パート（ユーザーが望むだけ・UI言語対応）
    ↓
本番実験（480試行 = 60試行 × 8ブロック・刺激は英語固定）
    ↓
ブロック終了後フィードバック（7回・選択言語）
    ↓
実験完了・データ保存（選択言語）
```

事前ヒアリングでは以下の設問を必須で取得する：
- 口調・距離感タイプ（3択）
- 励まし方のタイプ（3択）
- 自己評価タイプ（3択）
- 好きな褒められ方（複数選択可）

#### 4.2.2 セッション2（次の日以降）
```
言語確認（前回選択言語を表示・変更可能）
    ↓
同意確認（既存データ確認・選択言語）
    ↓
注意事項ページ（選択言語）
    ↓
練習パート（数試行・UI言語対応）
    ↓
本番実験（480試行 = 60試行 × 8ブロック・刺激は英語固定）
    ↓
ブロック終了後フィードバック（7回・選択言語）
    ↓
実験完了・データ保存（選択言語）
```

## 5. 画面構成

### 5.1 参加者向け画面
- **言語選択ページ** (`/language/[uuid]`)
- **同意書ページ** (`/consent/[uuid]`)
- **事前ヒアリング** (`/survey/[uuid]`)
- **注意事項** (`/instructions/[uuid]`)
- **練習** (`/practice/[uuid]`)
- **本番実験** (`/experiment/[uuid]`)
- **ブロック間フィードバック** (実験画面内)
- **完了画面** (`/complete/[uuid]`)

### 5.2 管理者向け画面
- **管理者ダッシュボード** (`/admin`)
- **参加者管理** (`/admin/participants`)
- **進捗確認** (`/admin/progress`)
- **データエクスポート** (`/admin/export`)

## 6. フィードバック仕様

### 6.1 Static条件

#### 6.1.1 日本語版
```
ブロック2の結果
平均反応時間: 645ms
正答率: 87%

前ブロックとの比較
反応時間: +23ms
正答率: -3%
```

#### 6.1.2 English版
```
Block 2 Results
Average Response Time: 645ms
Accuracy: 87%

Comparison with Previous Block
Response Time: +23ms
Accuracy: -3%
```

### 6.2 Personalized条件

#### 6.2.1 日本語版例
```
お疲れ様！〇〇さん、
前よりも速くなってるよ！
集中できてるみたい。
この調子で頑張って！
```

#### 6.2.2 English版例
```
Great job, [Name]!
You're getting faster!
You seem really focused.
Keep up the good work!
```

### 6.3 フィードバック生成ロジック

#### 6.3.1 事前生成パターン
```typescript
type FeedbackScenarioKey =
  | 'rt_short_acc_up_synergy'
  | 'rt_slow_acc_down_fatigue'
  | 'rt_short_acc_same'
  | 'rt_short_acc_down'
  | 'rt_short_acc_up'
  | 'rt_slow_acc_up'
  | 'rt_slow_acc_same'
  | 'rt_slow_acc_down'
  | 'rt_same_acc_up'
  | 'rt_same_acc_down'
  | 'rt_same_acc_same';

type FeedbackPattern = Record<FeedbackScenarioKey, string[]>; // 各キーにつき3文
```

11のシナリオは以下の通り（各3パターン生成）:
1. RT短縮 & Accuracy大幅上昇（good synergy）
2. RT遅延 & Accuracy大幅下降（fatigue sign）
3. RT短縮 & Accuracy変化なし
4. RT短縮 & Accuracy下降
5. RT短縮 & Accuracy上昇（通常）
6. RT遅延 & Accuracy上昇
7. RT遅延 & Accuracy変化なし
8. RT遅延 & Accuracy下降
9. RT変化なし & Accuracy上昇
10. RT変化なし & Accuracy下降
11. RT変化なし & Accuracy変化なし（安定）

#### 6.3.2 選択ロジック
```typescript
const RT_CHANGE_THRESHOLD = 30;
const RT_STRONG_THRESHOLD = 80;
const ACC_CHANGE_THRESHOLD = 2;
const ACC_STRONG_THRESHOLD = 5;

function determineScenario(
  current: BlockResult,
  previous: BlockResult | null
): FeedbackScenarioKey {
  if (!previous) return 'rt_same_acc_same';

  const rtDiff = current.averageRT - previous.averageRT;
  const accDiff = current.accuracy - previous.accuracy;

  const rtImproved = rtDiff <= -RT_CHANGE_THRESHOLD;
  const rtStrongImproved = rtDiff <= -RT_STRONG_THRESHOLD;
  const rtDeclined = rtDiff >= RT_CHANGE_THRESHOLD;
  const rtStrongDeclined = rtDiff >= RT_STRONG_THRESHOLD;
  const accUp = accDiff >= ACC_CHANGE_THRESHOLD;
  const accStrongUp = accDiff >= ACC_STRONG_THRESHOLD;
  const accDown = accDiff <= -ACC_CHANGE_THRESHOLD;
  const accStrongDown = accDiff <= -ACC_STRONG_THRESHOLD;

  if (rtStrongImproved && accStrongUp) return 'rt_short_acc_up_synergy';
  if (rtStrongDeclined && accStrongDown) return 'rt_slow_acc_down_fatigue';

  if (rtImproved) {
    if (accUp) return 'rt_short_acc_up';
    if (accDown) return 'rt_short_acc_down';
    return 'rt_short_acc_same';
  }

  if (rtDeclined) {
    if (accUp) return 'rt_slow_acc_up';
    if (accDown) return 'rt_slow_acc_down';
    return 'rt_slow_acc_same';
  }

  if (accUp) return 'rt_same_acc_up';
  if (accDown) return 'rt_same_acc_down';
  return 'rt_same_acc_same';
}

function selectFeedback(
  current: BlockResult,
  previous: BlockResult | null,
  patterns: FeedbackPattern
): string {
  const key = determineScenario(current, previous);
  return randomSelect(patterns[key]);
}
```

## 7. データ保存戦略

### 7.1 冗長化方針
```
IndexedDB (ブラウザ) → Supabase (クラウド) → 管理者ダウンロード (バックアップ)
```

### 7.2 保存タイミング
1. **リアルタイム**: 各試行完了時にIndexedDBに保存
2. **ブロック完了時**: IndexedDBからSupabaseへ送信
3. **実験完了時**: 全データの整合性確認と再送信

### 7.3 失敗時対応
```typescript
interface DataRecovery {
  autoRetry: {
    maxAttempts: number;
    backoffStrategy: 'exponential' | 'linear';
    retryIntervals: number[];
  };
  
  manualRecovery: {
    jsonDownload: boolean;
    uploadUrl: string;
    manualResend: boolean;
  };
  
  nextSessionCheck: {
    detectUnsent: boolean;
    promptForResend: boolean;
  };
}
```

## 8. データベース設計

### 8.1 Supabaseテーブル構造

#### 8.1.1 participants テーブル
```sql
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  handedness TEXT CHECK (handedness IN ('right','left','other')) NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT CHECK (gender IN ('male','female','other')) NOT NULL,
  nickname TEXT NOT NULL,
  preferred_praise TEXT NOT NULL,
  tone_preference TEXT CHECK (tone_preference IN ('casual','gentle','formal')) NOT NULL,
  motivation_style TEXT CHECK (motivation_style IN ('empathetic','cheerleader','advisor')) NOT NULL,
  evaluation_focus TEXT CHECK (evaluation_focus IN ('self-progress','social-comparison','positive-focus')) NOT NULL,
  language TEXT CHECK (language IN ('ja', 'en')) DEFAULT 'ja',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 8.3.2 experiments テーブル（RLSなし）
```sql
CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  condition_type TEXT CHECK (condition_type IN ('static', 'personalized')),
  session_number INTEGER CHECK (session_number IN (1, 2)),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_trials INTEGER DEFAULT 480,
  overall_accuracy DECIMAL(5,2),
  overall_avg_rt DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 8.3.3 blocks テーブル（RLSなし）
```sql
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id),
  block_number INTEGER CHECK (block_number BETWEEN 1 AND 8),
  trial_count INTEGER DEFAULT 60,
  accuracy DECIMAL(5,2),
  average_rt DECIMAL(8,2),
  feedback_shown TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 8.3.4 trials テーブル（RLSなし・詳細ログ）
```sql
CREATE TABLE trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID REFERENCES blocks(id),
  trial_number INTEGER,
  word TEXT NOT NULL,
  word_type TEXT CHECK (word_type IN ('RED', 'BLUE', 'GREEN', 'NONSENSE')),
  ink_color TEXT CHECK (ink_color IN ('RED', 'BLUE', 'GREEN')),
  is_congruent BOOLEAN,
  response_key TEXT,
  chosen_answer TEXT,
  is_correct BOOLEAN,
  reaction_time DECIMAL(8,2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 8.4 セキュリティ方針の簡略化
- **認証**: 管理者画面のみBasic Auth
- **データアクセス**: UUIDベースの単純な制御
- **RLS**: 使用しない（シンプルな権限管理）
- **参加者認証**: なし（UUIDのみでアクセス）

### 8.2 認証・セキュリティ設計

#### 8.2.1 管理者認証（Basic Auth）
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // 管理者パス(/admin)のみBasic認証
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const basicAuth = request.headers.get('authorization');
    
    if (!basicAuth) {
      return new NextResponse('Auth required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
        },
      });
    }
    
    const [username, password] = Buffer
      .from(basicAuth.split(' ')[1], 'base64')
      .toString()
      .split(':');
      
    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return new NextResponse('Invalid credentials', { status: 401 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
```

#### 8.2.2 データアクセス制御
```typescript
// シンプルなアクセス制御（RLSなし）
// 参加者データは公開テーブルだが、UUIDでのアクセスのみ
// 管理者画面からは全データにアクセス可能

// utils/supabase/client.ts
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// utils/supabase/admin.ts  
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### 8.3 簡略化されたテーブル設計

#### 8.3.1 participants テーブル（RLSなし）
```sql
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  handedness TEXT CHECK (handedness IN ('right','left','other')) NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT CHECK (gender IN ('male','female','other')) NOT NULL,
  nickname TEXT NOT NULL,
  preferred_praise TEXT NOT NULL,
  tone_preference TEXT CHECK (tone_preference IN ('casual','gentle','formal')) NOT NULL,
  motivation_style TEXT CHECK (motivation_style IN ('empathetic','cheerleader','advisor')) NOT NULL,
  evaluation_focus TEXT CHECK (evaluation_focus IN ('self-progress','social-comparison','positive-focus')) NOT NULL,
  language TEXT CHECK (language IN ('ja', 'en')) DEFAULT 'ja',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 9. OpenAI API統合

### 9.1 フィードバック生成プロンプト
```typescript
const FEEDBACK_GENERATION_PROMPT = `
参加者情報:
- 呼び名: {nickname}
- 好きな褒め方: {preferredPraise}
- 望む口調タイプ: {tonePreferenceDescription}
- 励まし方のスタイル: {motivationStyleDescription}
- 評価で重視したいポイント: {evaluationFocusDescription}

以下の11シナリオごとに15〜30文字のフィードバック文を3種類ずつ生成（キー名は必ず以下を使用）:
1. "rt_short_acc_up_synergy": RT大幅短縮 & Accuracy大幅上昇
2. "rt_slow_acc_down_fatigue": RT大幅遅延 & Accuracy大幅下降
3. "rt_short_acc_same": RT短縮 & Accuracy変化なし
4. "rt_short_acc_down": RT短縮 & Accuracy下降
5. "rt_short_acc_up": RT短縮 & Accuracy上昇
6. "rt_slow_acc_up": RT遅延 & Accuracy上昇
7. "rt_slow_acc_same": RT遅延 & Accuracy変化なし
8. "rt_slow_acc_down": RT遅延 & Accuracy下降
9. "rt_same_acc_up": RT同じ & Accuracy上昇
10. "rt_same_acc_down": RT同じ & Accuracy下降
11. "rt_same_acc_same": RTもAccuracyも変化なし

制約:
- 数値は書かない
- 呼び名を適度に含める（約半分）
- {tonePreferenceDescription}・{motivationStyleDescription}・{evaluationFocusDescription} を反映
- ポジティブで励まし中心、ネガティブ表現は避ける

JSON形式で出力してください。
`;
```

### 9.2 API使用方針
- **使用タイミング**: 実験開始前に1回のみ
- **データ保護**: OpenAIのno-training指定
- **エラーハンドリング**: API失敗時はデフォルトテンプレート使用

## 10. 技術実装

### 10.1 使用技術スタック
- **フロントエンド**: Next.js 15 (App Router) + TypeScript
- **データベース**: Supabase (PostgreSQL)
- **認証**: Basic Auth（管理者画面のみ）
- **ストレージ**: Browser IndexedDB + Supabase
- **AI**: OpenAI GPT-4 API
- **スタイリング**: Tailwind CSS v4

### 10.2 必要な環境変数
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ADMIN_USERNAME=
ADMIN_PASSWORD=
NEXT_PUBLIC_FEEDBACK_TIMEOUT_SECONDS=
```

### 10.3 新規パッケージ
```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "idb": "^7.1.0",
    "uuid": "^9.0.0",
    "react-i18next": "^13.5.0",
    "i18next": "^23.7.0"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}
```

## 11. セキュリティ・プライバシー

### 11.1 データ保護
- UUIDによる匿名化
- 個人識別情報の非収集
- HTTPS通信の強制
- 管理者画面のBasic認証による保護

### 11.2 同意取得
- 明示的な同意確認
- 撤回権の保証
- データ利用目的の明確化
- AI利用に関する通知

## 12. 実装マイルストーン

### Phase 1: 基盤構築（1-2日）
- [ ] Supabaseデータベース設計・構築（RLSなし）
- [ ] Basic認証による管理者画面保護
- [ ] 多言語対応システム構築
- [ ] 基本的な画面レイアウト
- [ ] UUID生成・管理機能

### Phase 2: 実験フロー（2-3日）
- [ ] 言語選択画面
- [ ] 同意書・ヒアリング画面（多言語）
- [ ] 本番実験フロー改修（480試行・8ブロック）
- [ ] IndexedDB保存機能

### Phase 3: フィードバック機能（2-3日）
- [ ] OpenAI API統合（多言語プロンプト）
- [ ] Static/Personalizedフィードバック表示（多言語）
- [ ] テンプレート選択ロジック

### Phase 4: データ管理（1-2日）
- [ ] Supabase連携・自動保存
- [ ] エラーハンドリング・復旧機能
- [ ] 管理者画面

### Phase 5: テスト・最適化（1-2日）
- [ ] 多言語総合テスト
- [ ] パフォーマンス最適化
- [ ] ドキュメント整備

**総予想工数: 8-13日**

---

この仕様書に基づいて、段階的に実装を進めていくことをお勧めします。どのフェーズから始めたいか、または特定の部分について詳細な質問があれば、お知らせください。
