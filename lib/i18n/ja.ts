export const ja = {
    languageSelector: {
        title: "言語を選択してください",
        subtitle: "実験で使用する言語を選択してください",
        japanese: "日本語",
        english: "English",
        continue: "続ける"
    },

    consent: {
        title: "研究参加同意書",
        content: `この研究は、Stroop課題におけるフィードバックの効果を調べることを目的としています。

あなたの参加は完全に任意であり、いつでも中断・撤回することができます。

収集されたデータは：
• 完全に匿名化されます
• 学術研究のみに使用されます
• 個人を特定することはできません
• AI（OpenAI API）を使用してフィードバックを生成しますが、データは学習に使用されません

実験時間：約15分（練習含む）
実験内容：画面に表示される文字の色を判断するタスクを行います`,
        agree: "同意して参加する",
        disagree: "参加しない"
    },

    survey: {
        title: "事前アンケート",
        subtitle: "パーソナライズされたフィードバックのために、いくつか質問にお答えください",
        nickname: "呼び名（ニックネーム）",
        nicknamePlaceholder: "例：さくらさん、Alex、etc.",
        preferredPraise: "好きな褒められ方・励まし方",
        preferredPraisePlaceholder: "例：頑張ってるね！、すごいじゃない！",
        avoidExpressions: "避けてほしい表現（カンマ区切り）",
        avoidExpressionsPlaceholder: "例：だめ、遅い、下手",
        continue: "次へ進む"
    },

    instructions: {
        title: "実験の説明",
        description: `これから、文字の色を判断するタスクを行います。

画面に表示される単語の意味ではなく、文字の色に注目してください。
表示される文字色に対応するキーをできるだけ早く正確に押してください。`,
        keyMapping: {
            title: "キー割り当て",
            red: "赤色",
            green: "緑色",
            blue: "青色",
            other: "その他"
        },
        startButton: "練習を開始"
    },

    practice: {
        title: "練習",
        description: "まずは練習から始めましょう。操作に慣れたら本番に進みます。",
        trial: "練習",
        correct: "正解",
        incorrect: "不正解",
        continueToMain: "本番を開始",
        continePractice: "練習を続ける"
    },

    experiment: {
        block: "ブロック",
        trial: "試行",
        correct: "正解",
        incorrect: "不正解",
        break: "休憩",
        breakMessage: "お疲れ様でした。少し休憩しましょう。準備ができたら次のブロックに進んでください。",
        continue: "次のブロックへ",
        escToExit: "ESCキーで実験を中断できます"
    },

    feedback: {
        static: {
            blockResult: "ブロック{block}の結果",
            averageRT: "平均反応時間: {rt}ms",
            accuracy: "正答率: {accuracy}%",
            comparison: "前ブロックとの比較",
            rtChange: "反応時間: {change}ms",
            accuracyChange: "正答率: {change}%"
        }
    },

    completion: {
        title: "実験完了",
        message: "お疲れ様でした！実験が完了しました。",
        nextSessionInfo: "次のセッションは別の日に実施してください。",
        dataStatus: "データを保存しています...",
        dataSaved: "データの保存が完了しました。",
        downloadBackup: "バックアップをダウンロード",
        goHome: "ホームに戻る"
    },

    admin: {
        title: "管理者画面",
        participants: "参加者管理",
        progress: "進捗確認",
        export: "データエクスポート",
        generateUUID: "新しい参加者UUIDを生成",
        staticURL: "Static条件URL",
        personalizedURL: "Personalized条件URL"
    },

    errors: {
        loadingFailed: "データの読み込みに失敗しました",
        savingFailed: "データの保存に失敗しました",
        networkError: "ネットワークエラーが発生しました",
        retry: "再試行",
        downloadData: "データをダウンロード"
    }
};

export type Translations = typeof ja;
