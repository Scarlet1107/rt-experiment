import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center px-6 py-12">
      <section className="max-w-2xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold">拡張ストループ課題 PoC</h1>
          <p className="text-base leading-relaxed">
            これからストループ課題（10試行）を行います。色単語（red, green, blue）が表示された場合はフォントの色を、
            無意味語が表示された場合は「その他」を、キーボードで素早く回答してください。結果画面では各試行の履歴と平均値が表示されます。
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-left space-y-3">
          <p className="font-medium text-sm uppercase text-zinc-500 tracking-wide">
            キー割り当て
          </p>
          <ul className="grid gap-2 sm:grid-cols-4 text-sm">
            <li className="flex flex-col items-center gap-1">
              <span className="font-mono text-lg">D</span>
              <span className="font-semibold text-gray-400">その他</span>
            </li>
            <li className="flex flex-col items-center gap-1">
              <span className="font-mono text-lg">F</span>
              <span className="font-semibold text-gray-400">red</span>
            </li>
            <li className="flex flex-col items-center gap-1">
              <span className="font-mono text-lg">J</span>
              <span className="font-semibold text-gray-400">green</span>
            </li>
            <li className="flex flex-col items-center gap-1">
              <span className="font-mono text-lg">K</span>
              <span className="font-semibold text-gray-400">blue</span>
            </li>
          </ul>
          <p className="text-sm text-zinc-600">
            「スタート」を押すと課題がすぐに始まります。途中で終了する場合は
            ESCキーでこの画面に戻れます。
          </p>
        </div>

        <div className="flex justify-center">
          <Link
            href="/task"
            className="inline-flex items-center justify-center rounded-full bg-[#1e88e5] px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#1565c0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e88e5]"
          >
            スタート
          </Link>
        </div>
      </section>
    </main>
  );
}
