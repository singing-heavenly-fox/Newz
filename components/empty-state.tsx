export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-3xl" aria-hidden>📰</p>
      <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">No articles match your filters</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
        Try a different keyword, or clear sentiment and framing filters to see everything.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        Clear filters
      </button>
    </div>
  );
}
