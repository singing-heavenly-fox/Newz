import { LoadingSignal } from "@/components/loading-signal";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/news/[id]/page.tsx anatomy so content fills in place.
export default function NewsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mt-5 flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="ml-auto h-4 w-16" />
      </div>
      <figure className="mt-5">
        <div className="relative flex aspect-[21/9] w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-800">
          <LoadingSignal caption="Reading the full story" tileSize={48} />
        </div>
      </figure>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-[#111a2e] p-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-1.5 h-4 w-full" />
            <Skeleton className="mt-1.5 h-4 w-4/5" />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#111a2e] p-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="mt-3 h-3 w-full rounded-full" />
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#111a2e] p-6">
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-[#111a2e] p-6">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-1.5 h-4 w-3/4" />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#111a2e] p-6">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-3 h-16 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
