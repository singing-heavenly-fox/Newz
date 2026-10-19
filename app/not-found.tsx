import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
      <p className="text-5xl" aria-hidden>🧭</p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Story not found
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        That article may have been removed or the link is wrong. Head back to the latest analysis.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        Back to latest
      </Link>
    </main>
  );
}
