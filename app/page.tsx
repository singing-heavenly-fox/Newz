export const dynamic = 'force-dynamic';

import { NewsGrid } from "@/components/news-grid";
import { getArticles } from "@/lib/data/articles";

export default async function Home() {
  const articles = await getArticles();

  return (
    <main className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(50%_60%_at_15%_0%,rgba(124,58,237,0.16),transparent),radial-gradient(40%_50%_at_90%_0%,rgba(217,119,6,0.08),transparent)]"
      />
      <section aria-label="Latest stories" className="relative mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          AI-estimated sentiment & framing
        </p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Latest stories
          </h1>
          <p className="hidden text-sm text-slate-500 sm:block" aria-live="polite">
            {articles.length} stories
          </p>
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
          Every story shows AI-estimated sentiment and political framing — an estimate,
          not objective truth.
        </p>
        <div className="mt-5">
          <NewsGrid articles={articles} />
        </div>

        <div id="how-it-works" className="mt-12 scroll-mt-20 rounded-2xl border border-slate-800 bg-[#111a2e] p-6">
          <h2 className="text-lg font-extrabold text-white">How it works</h2>
          <ol className="mt-3 grid gap-4 text-sm leading-6 text-slate-300 sm:grid-cols-3">
            <li><strong className="text-white">1. Collect.</strong> Active sources are scraped hourly and stored append-only with dedupe.</li>
            <li><strong className="text-white">2. Analyze.</strong> AI writes a neutral summary plus sentiment and framing percentages.</li>
            <li><strong className="text-white">3. Explore.</strong> Filter by sentiment and framing, then open any card for the full breakdown.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
