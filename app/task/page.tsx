"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Color = "RED" | "BLUE" | "GREEN";
type KeyCode = "F" | "J" | "K";

type Trial = {
  id: number;
  word: Color;
  ink: Color;
  congruent: boolean;
};

type Result = {
  trialId: number;
  word: Color;
  ink: Color;
  congruent: boolean;
  key: KeyCode;
  chosenColor: Color;
  correct: boolean;
  rt: number;
};

const COLORS: Color[] = ["RED", "BLUE", "GREEN"];

const KEY_TO_COLOR: Record<KeyCode, Color> = {
  F: "RED",
  J: "GREEN",
  K: "BLUE",
};

const COLOR_TO_HEX: Record<Color, string> = {
  RED: "#e53935",
  BLUE: "#1e88e5",
  GREEN: "#43a047",
};

const COLOR_LABELS: Record<Color, string> = {
  RED: "赤",
  BLUE: "青",
  GREEN: "緑",
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

function generateTrials(): Trial[] {
  const congruentFlags = shuffle(
    Array.from({ length: TOTAL_TRIALS }, (_, idx) => idx < TOTAL_TRIALS / 2)
  );

  return congruentFlags.map((congruent, index) => {
    const word = randomColor();
    const ink = congruent ? word : randomColor(word);

    return {
      id: index + 1,
      word,
      ink,
      congruent,
    };
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
      if (event.key === "Escape") {
        router.push("/");
        return;
      }

      if (event.repeat) {
        return;
      }

      const key = event.key.toUpperCase() as KeyCode;
      if (!["F", "J", "K"].includes(key)) {
        return;
      }

      if (respondedRef.current || !currentTrial) {
        return;
      }

      const chosenColor = KEY_TO_COLOR[key];
      const rt = performance.now() - (trialStartRef.current ?? performance.now());
      const correct = chosenColor === currentTrial.ink;

      respondedRef.current = true;

      setResults((prev) => [
        ...prev,
        {
          trialId: currentTrial.id,
          word: currentTrial.word,
          ink: currentTrial.ink,
          congruent: currentTrial.congruent,
          key,
          chosenColor,
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
              10試行のストループ課題を実施します。単語の意味ではなくフォントの色に対して、
              対応するキーをできるだけ早く押してください。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="font-mono text-lg">F</p>
              <p className="text-[#e53935] font-semibold">赤</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="font-mono text-lg">J</p>
              <p className="text-[#43a047] font-semibold">緑</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="font-mono text-lg">K</p>
              <p className="text-[#1e88e5] font-semibold">青</p>
            </div>
          </div>

          <p className="text-sm text-zinc-600">
            スタート後はESCキーで離脱できます。キーを押しっぱなしにしても反応は1回だけ記録されます。
          </p>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center justify-center rounded-full bg-[#1e88e5] px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#1565c0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e88e5]"
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
              {COLOR_LABELS[currentTrial.word]}
            </p>
            {feedback && feedback.trialId === currentTrial.id && (
              <p
                className={`text-lg font-semibold ${
                  feedback.correct ? "text-[#43a047]" : "text-[#e53935]"
                }`}
              >
                {feedback.correct ? "正解" : "不正解"}
              </p>
            )}
            <div className="text-sm grid gap-2 sm:grid-cols-3">
              <div className="rounded border border-zinc-200 px-4 py-2">
                <p className="font-mono text-lg">F</p>
                <p className="text-[#e53935] font-semibold">赤</p>
              </div>
              <div className="rounded border border-zinc-200 px-4 py-2">
                <p className="font-mono text-lg">J</p>
                <p className="text-[#43a047] font-semibold">緑</p>
              </div>
              <div className="rounded border border-zinc-200 px-4 py-2">
                <p className="font-mono text-lg">K</p>
                <p className="text-[#1e88e5] font-semibold">青</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500">ESCで離脱できます</p>
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
                  <th className="px-3 py-2 text-left">選択色</th>
                  <th className="px-3 py-2 text-left">判定</th>
                  <th className="px-3 py-2 text-left">反応時間 (ms)</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.trialId} className="odd:bg-white even:bg-zinc-50">
                    <td className="px-3 py-2">{result.trialId}</td>
                    <td className="px-3 py-2">{COLOR_LABELS[result.word]}</td>
                    <td className="px-3 py-2">{COLOR_LABELS[result.ink]}</td>
                    <td className="px-3 py-2">{result.congruent ? "一致" : "不一致"}</td>
                    <td className="px-3 py-2">{result.key}</td>
                    <td className="px-3 py-2">{COLOR_LABELS[result.chosenColor]}</td>
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
              className="inline-flex items-center justify-center rounded-full bg-[#1e88e5] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1565c0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e88e5]"
            >
              もう一度実施
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            >
              説明に戻る
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
