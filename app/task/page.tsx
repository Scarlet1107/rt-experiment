"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Color = "RED" | "BLUE" | "GREEN";
type WordType = Color | "NONSENSE";
type KeyCode = "F" | "J" | "K" | "D";

type Trial = {
  id: number;
  word: Color | string; // 色名または無意味語
  wordType: WordType;
  ink: Color;
  congruent: boolean;
};

type Result = {
  trialId: number;
  word: Color | string;
  wordType: WordType;
  ink: Color;
  congruent: boolean;
  key: KeyCode;
  chosenAnswer: Color | "OTHER";
  correct: boolean;
  rt: number;
};

const COLORS: Color[] = ["RED", "BLUE", "GREEN"];

// 3-5文字の無意味語リスト（red, blue, green と同様の文字数）
const NONSENSE_WORDS = ["cat", "dog", "book", "desk", "chair", "lamp", "box", "pen", "cup", "hat"];

const KEY_TO_ANSWER: Record<KeyCode, Color | "OTHER"> = {
  F: "RED",
  J: "GREEN",
  K: "BLUE",
  D: "OTHER",
};

const COLOR_TO_HEX: Record<Color, string> = {
  RED: "#e53935",
  BLUE: "#1e88e5",
  GREEN: "#43a047",
};

const COLOR_LABELS: Record<Color, string> = {
  RED: "red",
  BLUE: "blue",
  GREEN: "green",
};

type ScreenState = "intro" | "running" | "done";

const TOTAL_TRIALS = 10;

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomColor(exclude?: Color): Color {
  const filtered = exclude ? COLORS.filter((color) => color !== exclude) : COLORS;
  const index = Math.floor(Math.random() * filtered.length);
  return filtered[index];
}

function randomNonsenseWord(): string {
  const index = Math.floor(Math.random() * NONSENSE_WORDS.length);
  return NONSENSE_WORDS[index];
}

function generateTrials(): Trial[] {
  const congruentFlags = shuffle(
    Array.from({ length: TOTAL_TRIALS }, (_, idx) => idx < TOTAL_TRIALS / 2)
  );

  return congruentFlags.map((congruent, index) => {
    // 70%の確率で色単語、30%の確率で無意味語
    const useColorWord = Math.random() < 0.7;

    if (useColorWord) {
      const word = randomColor();
      const ink = congruent ? word : randomColor(word);

      return {
        id: index + 1,
        word,
        wordType: word as WordType,
        ink,
        congruent,
      };
    } else {
      // 無意味語の場合は常にランダムな色のインク
      const word = randomNonsenseWord();
      const ink = randomColor();

      return {
        id: index + 1,
        word,
        wordType: "NONSENSE" as WordType,
        ink,
        congruent: false, // 無意味語は常に不一致
      };
    }
  });
}

export default function StroopTaskPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<ScreenState>("intro");
  const [trials, setTrials] = useState<Trial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [feedback, setFeedback] = useState<{ trialId: number; correct: boolean } | null>(null);

  const trialStartRef = useRef<number | null>(null);
  const respondedRef = useRef(false);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTrial = trials[currentIndex] ?? null;

  useEffect(() => {
    if (screen !== "running" || !currentTrial) {
      return;
    }

    trialStartRef.current = performance.now();
    respondedRef.current = false;
  }, [screen, currentTrial]);

  useEffect(() => {
    if (screen !== "running") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      const key = event.key.toUpperCase() as KeyCode;
      if (!["F", "J", "K", "D"].includes(key)) {
        return;
      }

      if (respondedRef.current || !currentTrial) {
        return;
      }

      const chosenAnswer = KEY_TO_ANSWER[key];
      const rt = performance.now() - (trialStartRef.current ?? performance.now());

      // 正答判定: 色単語なら色が一致、無意味語ならOTHERが選択されている
      let correct = false;
      if (currentTrial.wordType === "NONSENSE") {
        correct = chosenAnswer === "OTHER";
      } else {
        correct = chosenAnswer === currentTrial.ink;
      }

      respondedRef.current = true;

      setResults((prev) => [
        ...prev,
        {
          trialId: currentTrial.id,
          word: currentTrial.word,
          wordType: currentTrial.wordType,
          ink: currentTrial.ink,
          congruent: currentTrial.congruent,
          key,
          chosenAnswer,
          correct,
          rt,
        },
      ]);

      setFeedback({
        trialId: currentTrial.id,
        correct,
      });

      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }

      advanceTimeoutRef.current = setTimeout(() => {
        advanceTimeoutRef.current = null;
        setFeedback(null);
        setCurrentIndex((prev) => {
          const nextIndex = prev + 1;
          if (nextIndex >= trials.length) {
            setScreen("done");
            return prev;
          }
          return nextIndex;
        });
      }, 500);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [screen, currentTrial, router, trials.length]);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
    };
  }, []);

  const accuracy = useMemo(() => {
    if (!results.length) {
      return 0;
    }
    const correctCount = results.filter((result) => result.correct).length;
    return Math.round((correctCount / TOTAL_TRIALS) * 100);
  }, [results]);

  const averageRt = useMemo(() => {
    const correctTrials = results.filter((result) => result.correct);
    if (correctTrials.length === 0) {
      return 0;
    }
    const total = correctTrials.reduce((sum, result) => sum + result.rt, 0);
    return Math.round(total / correctTrials.length);
  }, [results]);

  const handleStart = () => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    setFeedback(null);
    setTrials(generateTrials());
    setResults([]);
    setCurrentIndex(0);
    setScreen("running");
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-6 py-12">
      {screen === "intro" && (
        <section className="max-w-2xl w-full space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold">課題を開始する前に</h1>
            <p className="text-base leading-relaxed">
              10試行のストループ課題を実施します。色単語（red, green, blue）が表示された場合はフォントの色に対応するキーを、
              無意味語が表示された場合は「その他」キーをできるだけ早く押してください。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 text-sm">
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="font-mono text-lg">D</p>
              <p className="font-semibold text-gray-400">その他</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="font-mono text-lg">F</p>
              <p className="font-semibold text-gray-400">red</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="font-mono text-lg">J</p>
              <p className="font-semibold text-gray-400">green</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="font-mono text-lg">K</p>
              <p className="font-semibold text-gray-400">blue</p>
            </div>
          </div>

          <p className="text-sm text-zinc-600">
            キーを押しっぱなしにしても反応は1回だけ記録されます。
          </p>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center justify-center rounded-full bg-[#1e88e5] px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#1565c0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e88e5]"
            >
              課題を開始
            </button>
          </div>
        </section>
      )}

      {screen === "running" && currentTrial && (
        <section className="flex flex-col items-center gap-8 text-center">
          <p className="text-sm text-zinc-600">試行 {currentTrial.id} / {TOTAL_TRIALS}</p>
          <div className="flex flex-col items-center gap-6">
            <p
              className="text-6xl font-bold tracking-widest"
              style={{ color: COLOR_TO_HEX[currentTrial.ink] }}
            >
              {currentTrial.wordType === "NONSENSE"
                ? currentTrial.word
                : COLOR_LABELS[currentTrial.word as Color]
              }
            </p>
            {feedback && feedback.trialId === currentTrial.id && (
              <p
                className={`text-lg font-semibold ${feedback.correct ? "text-[#43a047]" : "text-[#e53935]"
                  }`}
              >
                {feedback.correct ? "正解" : "不正解"}
              </p>
            )}
            <div className="text-sm grid gap-2 sm:grid-cols-4">
              <div className="rounded border border-zinc-200 px-4 py-2">
                <p className="font-mono text-lg">D</p>
                <p className="font-semibold text-gray-400">その他</p>
              </div>
              <div className="rounded border border-zinc-200 px-4 py-2">
                <p className="font-mono text-lg">F</p>
                <p className="font-semibold text-gray-400">red</p>
              </div>
              <div className="rounded border border-zinc-200 px-4 py-2">
                <p className="font-mono text-lg">J</p>
                <p className="font-semibold text-gray-400">green</p>
              </div>
              <div className="rounded border border-zinc-200 px-4 py-2">
                <p className="font-mono text-lg">K</p>
                <p className="font-semibold text-gray-400">blue</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500">各キー入力は1回のみ判定されます</p>
          </div>
        </section>
      )}

      {screen === "done" && (
        <section className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">結果</h2>
            <p className="text-sm text-zinc-600">
              正答率 {accuracy}% ・ 平均反応時間 {averageRt} ms（正解試行）
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-zinc-50 text-zinc-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">単語</th>
                  <th className="px-3 py-2 text-left">インク色</th>
                  <th className="px-3 py-2 text-left">一致</th>
                  <th className="px-3 py-2 text-left">キー</th>
                  <th className="px-3 py-2 text-left">選択回答</th>
                  <th className="px-3 py-2 text-left">判定</th>
                  <th className="px-3 py-2 text-left">反応時間 (ms)</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.trialId} className="odd:bg-white even:bg-zinc-50">
                    <td className="px-3 py-2">{result.trialId}</td>
                    <td className="px-3 py-2">
                      {result.wordType === "NONSENSE"
                        ? result.word
                        : COLOR_LABELS[result.word as Color]
                      }
                    </td>
                    <td className="px-3 py-2">{COLOR_LABELS[result.ink]}</td>
                    <td className="px-3 py-2">{result.congruent ? "一致" : "不一致"}</td>
                    <td className="px-3 py-2">{result.key}</td>
                    <td className="px-3 py-2">
                      {result.chosenAnswer === "OTHER"
                        ? "その他"
                        : COLOR_LABELS[result.chosenAnswer as Color]
                      }
                    </td>
                    <td className="px-3 py-2">{result.correct ? "正解" : "不正解"}</td>
                    <td className="px-3 py-2">{Math.round(result.rt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center justify-center rounded-full bg-[#1e88e5] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1565c0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e88e5]"
            >
              もう一度実施
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            >
              説明に戻る
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
