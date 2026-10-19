import Link from "next/link";
import { LogoMark } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMark size={26} />
          <p className="text-sm">
            <span className="font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Newz</span>
            <span className="text-slate-500 dark:text-slate-400"> — reader-friendly sentiment & framing insights.</span>
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
          <nav aria-label="Footer" className="flex items-center gap-4">
            <Link href="/" className="rounded hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-slate-200">
              Latest
            </Link>
            <Link href="/#how-it-works" className="rounded hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-slate-200">
              How it works
            </Link>
          </nav>
          <p>Framing labels are AI-estimated, not objective truth.</p>
        </div>
      </div>
    </footer>
  );
}
