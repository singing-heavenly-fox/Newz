import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalysisPanel } from "@/components/analysis-panel";
import { ArticleActions } from "@/components/article-actions";
import { ArticleBody } from "@/components/article-body";
import { MethodologyCard, ProvenanceCard } from "@/components/provenance-card";
import { Separator } from "@/components/ui/separator";
import { ShareRow } from "@/components/share-row";
import { formatDate } from "@/lib/utils";
import { getArticleById, getArticleIds, getArticles, getRelatedArticles } from "@/lib/data/articles";

export async function generateStaticParams() {
  const ids = await getArticleIds();
  return ids.map((id) => ({ id }));
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default async function NewsDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();
  const a = article.analysis;
  if (!a) notFound();
  const related = await getRelatedArticles(article.id, 5);

  // Prev = newer, Next = older by published date.
  const all = await getArticles();
  const idx = all.findIndex((x) => x.id === article.id);
  const prev = idx > 0 ? { id: all[idx - 1].id, title: all[idx - 1].title } : null;
  const next = idx >= 0 && idx < all.length - 1 ? { id: all[idx + 1].id, title: all[idx + 1].title } : null;

  return (
    <main className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(50%_60%_at_15%_0%,rgba(124,58,237,0.16),transparent),radial-gradient(40%_50%_at_90%_0%,rgba(217,119,6,0.08),transparent)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center justify-between pt-6 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded font-semibold text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <span aria-hidden>←</span> Back to Stories
          </Link>
          <span className="hidden text-xs text-slate-500 sm:block">
            {article.source.name} · {formatDate(article.published_at)} · {article.read_minutes} min
          </span>
        </nav>

        <p className="mt-6 text-sm text-slate-500">Article</p>
        <h1 className="mt-1 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
          {article.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-slate-400">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-extrabold text-white" aria-hidden>
            {article.source.name.charAt(0).toUpperCase()}
          </span>
          <span className="font-bold uppercase tracking-wider">{article.source.name}</span>
          <span aria-hidden>·</span>
          <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
          <span aria-hidden>·</span>
          <span>{article.read_minutes} min</span>
          <span className="ml-auto">
            <ArticleActions canonicalUrl={article.canonical_url} articleId={article.id} />
          </span>
        </div>

        <figure className="mt-5">
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-800">
            <Image
              src={article.image_url}
              alt={article.title}
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-2 text-xs leading-5 text-slate-500">
            Image stored with this article · via {hostOf(article.original_url)} · {article.source.name}
          </figcaption>
        </figure>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main column: scrollable story pane + share/nav just below it */}
          <div className="min-w-0 space-y-6">
          <article
            aria-label="Story"
            role="region"
            tabIndex={0}
            className="story-pane min-w-0 space-y-6 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:px-1 lg:py-1 lg:pr-3"
          >
            <section aria-labelledby="summary-heading" className="rounded-2xl border border-indigo-900 bg-indigo-950/40 p-5">
              <h2 id="summary-heading" className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                Neutral summary
              </h2>
              <p className="mt-2 text-[15px] leading-7 text-slate-100">{a.summary}</p>
            </section>

            <section aria-labelledby="body-heading" className="rounded-2xl border border-slate-800 bg-[#111a2e] p-5 sm:p-8">
              <h2 id="body-heading" className="sr-only">
                Full story
              </h2>
              <div className="space-y-4">
                <ArticleBody rawText={article.raw_text} summary={a.summary} framingNotes={a.framing_notes} />
              </div>
            </section>

            <section aria-labelledby="notes-heading" className="rounded-2xl border border-slate-800 bg-[#111a2e] p-5">
              <h2 id="notes-heading" className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Why this framing?
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-slate-200">
                {a.framing_notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <Separator className="my-4" />
              <h3 className="text-sm font-bold text-white">Loaded terms flagged</h3>
              {a.loaded_terms.length === 0 ? (
                <p className="mt-1 text-sm text-slate-400">None — language reads neutral.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {a.loaded_terms.map((t) => (
                    <li
                      key={t}
                      className="rounded-full border border-amber-900 bg-amber-950 px-2.5 py-1 text-xs font-semibold text-amber-200"
                    >
                      “{t}”
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <ProvenanceCard article={article} />
            <MethodologyCard model={a.model} disclaimer={a.disclaimer} />
          </article>
          <ShareRow canonicalUrl={article.canonical_url} sourceName={article.source.name} prev={prev} next={next} />
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <AnalysisPanel analysis={a} related={related} />
          </aside>
        </div>
      </div>
    </main>
  );
}
