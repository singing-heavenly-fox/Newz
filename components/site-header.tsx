"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const links = [
  { href: "/", label: "Latest" },
  { href: "/#how-it-works", label: "How it works" },
];

export function SiteHeader({ analyzedCount }: { analyzedCount: number | null }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-200",
        scrolled
          ? "border-slate-200 bg-white/90 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-950/90"
          : "border-transparent bg-white/70 dark:bg-slate-950/70",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Newz home"
          onClick={() => setOpen(false)}
          className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Logo />
        </Link>

        <nav aria-label="Primary" className="ml-3 hidden items-center gap-1 text-sm font-semibold md:flex">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : false;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  active
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 lg:inline-flex dark:border-slate-700 dark:text-slate-400">
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {analyzedCount === null
              ? "Analysis offline"
              : `${analyzedCount} ${analyzedCount === 1 ? "story" : "stories"} analyzed`}
          </span>
          {hasClerkKey ? (
            <>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    Sign in
                  </button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </>
          ) : (
            <span
              title="Add Clerk keys to enable sign-in"
              className="cursor-not-allowed rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500"
            >
              Sign in
            </span>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:hidden dark:border-slate-700 dark:text-slate-200"
          >
            <span aria-hidden className="relative block h-4 w-5">
              <span className={cn("absolute left-0 top-0 h-0.5 w-5 rounded bg-current transition-transform", open && "top-1.5 rotate-45")} />
              <span className={cn("absolute left-0 top-1.5 h-0.5 w-5 rounded bg-current transition-opacity", open && "opacity-0")} />
              <span className={cn("absolute bottom-0 left-0 h-0.5 w-5 rounded bg-current transition-transform", open && "bottom-2 -rotate-45")} />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-slate-200 bg-white/95 px-4 pb-4 pt-2 backdrop-blur-xl md:hidden dark:border-slate-800 dark:bg-slate-950/95"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-[15px] font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
