import { LoadingSignal } from "@/components/loading-signal";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/page.tsx + news-card.tsx anatomy so content fills in place.
function HomeCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111a2e]">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="p-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-2 h-5 w-full" />
        <Skeleton className="mt-1.5 h-5 w-4/5" />
        <Skeleton className="mt-1.5 h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-3/5" />
        <div className="mt-3 flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-2.5 h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(50%_60%_at_15%_0%,rgba(124,58,237,0.16),transparent),radial-gradient(40%_50%_at_90%_0%,rgba(217,119,6,0.08),transparent)]"
      />
      <section aria-label="Loading stories" className="relative mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          AI-estimated sentiment & framing
        </p>
        <div className="mt-1 flex items-end justify-between gap-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Latest stories
          </h1>
        </div>
        <LoadingSignal caption="Tuning the signal" className="py-10" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="mt-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <HomeCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
