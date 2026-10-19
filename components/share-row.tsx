"use client";

import Link from "next/link";
import { useState } from "react";

export function ShareRow({
  canonicalUrl,
  sourceName,
  prev,
  next,
}: {
  canonicalUrl: string;
  sourceName: string;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
    } catch {
      // clipboard unavailable (permissions/iframe) — still show feedback
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <span aria-hidden>{copied ? "✓" : "⧉"}</span>
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a
          href={canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Read original at {sourceName} <span aria-hidden>↗</span>
        </a>
        <span aria-live="polite" className="sr-only">{copied ? "Link copied" : ""}</span>
      </div>
      {(prev ?? next) && (
        <nav aria-label="More stories" className="grid gap-2 sm:grid-cols-2">
          {prev ? (
            <Link href={`/news/${prev.id}`} className="group rounded-2xl border border-slate-200 bg-white p-3.5 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">← Newer story</span>
              <span className="line-clamp-2 mt-1 block text-sm font-semibold text-slate-800 group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-300">
                {prev.title}
              </span>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/news/${next.id}`} className="group rounded-2xl border border-slate-200 bg-white p-3.5 text-right hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Older story →</span>
              <span className="line-clamp-2 mt-1 block text-sm font-semibold text-slate-800 group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-300">
                {next.title}
              </span>
            </Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
