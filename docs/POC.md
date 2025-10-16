# プロンプト：3色ストループ課題の最小PoC（Next.js 15 App Router + TypeScript）

あなたはNext.js 15のエキスパートエンジニアです。**App Router**を使用して、最小限のPoC版ストループ課題アプリを作成してください。できるだけシンプルに。データベースは不要で、全データはメモリ上のみ（リロードで消えてOK）。

## 目的

* 参加者が **開始ボタン** を押すと、3色（赤・青・緑）のストループ課題を **10試行** 実施する。
* 各試行では、単語（例：「RED」「BLUE」「GREEN」）を、それとは別のフォントカラー（赤・青・緑）で表示する。
* 被験者はキーボードで色を回答する。
* 終了後、結果画面で全試行のデータ（単語・色・一致/不一致・反応時間・正誤）と平均反応時間・正答率を表示する。

## 技術条件

* **Next.js 15（App Router使用）**
* **TypeScript**
* UIは単一の **Client Component** で構成。
* 反応時間は `performance.now()` で測定。
* 外部ライブラリ、APIルート、DB、Cookie、LocalStorageすべて不要。
* リロードで全データが消える仕様。
* スタイリングはシンプルでOK（Tailwind使用可）。

## ファイル構成

* `app/page.tsx` — 説明と「スタート」ボタンを持つトップページ。`/task` へ遷移。
* `app/task/page.tsx` — 実際のストループ課題画面（Client Component）。
* （任意）`app/globals.css` — シンプルなスタイルを記述。

## キー割り当て

* 回答は「フォントの色」を選択：

  * `F` → 赤（RED）
  * `J` → 緑（GREEN）
  * `K` → 青（BLUE）
* この対応表を画面上に常時表示。

## 試行データ生成

* 色の候補：`"RED" | "BLUE" | "GREEN"`
* フォントカラーも同じセット。
* **10試行** を生成。
* 約50%を一致（congruent）に設定。
* 実行ごとにランダム化。

```ts
type Trial = {
  id: number;
  word: "RED" | "BLUE" | "GREEN";
  ink:  "RED" | "BLUE" | "GREEN";
  congruent: boolean;
};
```

## フロー

1. `/task` にアクセスすると、キー割り当て表と「開始」ボタンが表示される。
2. 「開始」を押すと10試行の課題を開始。
3. 各試行：

   * 画面中央に単語をフォント色付きで大きく表示。
   * 表示直後に `t0 = performance.now()`。
   * 有効キー（F/J/K）を押したら `t1` を取得し、反応時間＝`t1 - t0` を算出。
   * 押したキーから選択色を判定し、正誤を記録。
   * 次の試行へ進む。
4. 全10試行終了後に結果画面を表示。

```ts
type Result = {
  trialId: number;
  word: "RED" | "BLUE" | "GREEN";
  ink:  "RED" | "BLUE" | "GREEN";
  congruent: boolean;
  key: "F" | "J" | "K";
  chosenColor: "RED" | "BLUE" | "GREEN";
  correct: boolean;
  rt: number; // ミリ秒
};
```

## 結果画面

* **概要**：

  * 正答率（正解数 ÷ 10）× 100
  * 平均反応時間（正解試行のみ）
* **詳細表**：各試行の `# / Word / Ink / Congruent / Key / Chosen / Correct / RT(ms)` を一覧表示。
* **再スタートボタン**：クリックで初期状態に戻る。

## 補足仕様

* `ESC` で途中離脱 → 説明画面に戻る。
* 同じキーを連打したときは無視。
* その他のキー入力は無視。
* 背景白、文字色は視認性重視（`#e53935`、`#1e88e5`、`#43a047`など）。

## 完成条件

* `/` でスタート画面 → `/task` に遷移可能。
* `/task` でキー操作付き10試行が動作。
* 全試行終了後に集計結果を表示。
* リロードでデータリセット。
* APIルート・DBなし。

## 実装ヒント

* `app/task/page.tsx` に `"use client"` を指定。
* `useEffect` で `keydown` リスナーを管理（登録・解除）。
* ステートは `"intro" | "running" | "done"` の3段階。
* 反応時間は `performance.now()` 使用。
* TypeScript型はファイル内に定義。

## 含めないもの

* パーソナライズ／AIメッセージ
* ブロックごとのフィードバック
* 永続化やストレージ

## スタイル（任意）

* Flexboxで中央揃え。
* フォントサイズは刺激文字に `6rem` 程度。
* ヘルパーテキストを小さく表示。

---

## 出力ファイル

* `app/page.tsx`
* `app/task/page.tsx`

## 実行手順（README用）

1. `pnpm create next-app@latest` （または npm / yarn）で新規作成。
2. 上記2ファイルを追加または置き換え。
3. `pnpm dev` → [http://localhost:3000](http://localhost:3000) を開く。

---

## 前提・デフォルト設定

* 刺激語は英語（RED / BLUE / GREEN）。
* 試行間インターバルなし。
* 一致率50%。
* モバイル対応不要。

## オプション（必要なら）

* 進捗バー：`Trial 3 / 10` を表示。
* 正誤を一瞬（150ms程度）表示して次へ進む。
