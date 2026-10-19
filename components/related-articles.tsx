import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Article } from "@/lib/types";

export function RelatedArticles({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 id="related-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Related articles
      </h2>
      <ul className="mt-3 space-y-3">
        {articles.map((a) => (
          <li key={a.id}>
            <Link href={`/news/${a.id}`} className="group flex gap-3 rounded-xl p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                <Image src={a.image_url} alt="" fill unoptimized sizes="80px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
              </span>
              <span>
                <span className="line-clamp-2 block text-sm font-semibold leading-snug text-slate-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                  {a.title}
                </span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  {a.source.name} · {formatDate(a.published_at)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
