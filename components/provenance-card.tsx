import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Article } from "@/lib/types";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function ProvenanceCard({ article }: { article: Article }) {
  return (
    <section aria-labelledby="source-heading" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 id="source-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Source & provenance
      </h2>
      <dl className="mt-3 space-y-2.5 text-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
          <dt className="text-slate-500 dark:text-slate-400">Outlet</dt>
          <dd className="font-semibold text-slate-900 dark:text-white">
            {article.source.name}
            <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{hostOf(article.source.listing_url)}</span>
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
          <dt className="text-slate-500 dark:text-slate-400">Published</dt>
          <dd className="font-semibold text-slate-900 dark:text-white">
            <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
            <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{article.read_minutes} min read</span>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-slate-500 dark:text-slate-400">Original URL</dt>
          <dd className="truncate font-mono text-xs text-indigo-600 dark:text-indigo-400" title={article.original_url}>
            <a href={article.original_url} target="_blank" rel="noreferrer" className="rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              {article.original_url}
            </a>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-slate-500 dark:text-slate-400">Canonical URL</dt>
          <dd className="truncate font-mono text-xs text-slate-500 dark:text-slate-400" title={article.canonical_url}>
            {article.canonical_url}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-5 text-slate-400 dark:text-slate-500">
        Image: editorial stock photo for illustration. Stored with the article record; required before saving (§13).
      </p>
    </section>
  );
}

export function MethodologyCard({ model, disclaimer }: { model: string; disclaimer: string }) {
  return (
    <section aria-labelledby="method-heading" className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/40">
      <h2 id="method-heading" className="text-sm font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
        How we analyzed this
      </h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-200">
        <li>Loaded the stored article text only — never the source name — into the analysis model.</li>
        <li>Asked for a neutral summary, sentiment (−1…1), framing percentages (L/C/R sum 100), confidence, notes, and loaded terms.</li>
        <li>Validated the output before saving; bias score derived as (R − L) / 100.</li>
      </ol>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Model: <span className="font-mono">{model}</span> · <Link href="/#how-it-works" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">How the pipeline works</Link>
      </p>
      <p role="note" className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{disclaimer}</p>
    </section>
  );
}
