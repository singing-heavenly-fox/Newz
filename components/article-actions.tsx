"use client";

import { useState } from "react";

/** Compact Share + Bookmark buttons for the story header (mockup byline row). */
export function ArticleActions({
  canonicalUrl,
  articleId,
}: {
  canonicalUrl: string;
  articleId: string;
}) {
  const key = `newz:bookmark:${articleId}`;
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(() => {
    try {
      return window.localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });

  const share = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
    } catch {
      // clipboard unavailable — still show feedback
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const toggleSave = () => {
    const next = !saved;
    setSaved(next);
    try {
      if (next) window.localStorage.setItem(key, "1");
      else window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={share} className={btn}>
        <span aria-hidden>{copied ? "✓" : "⤴"}</span>
        {copied ? "Copied" : "Share"}
      </button>
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        title={saved ? "Saved" : "Bookmark this story"}
        className={btn}
      >
        <span aria-hidden>{saved ? "🔖" : "♡"}</span>
        Bookmark
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </span>
  );
}
