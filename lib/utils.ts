import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Guard: L/C/R must sum to ~100 for bars. Returns normalized triple. */
export function normalizeFraming(
  left: number,
  center: number,
  right: number,
): [number, number, number] {
  const total = left + center + right;
  if (total <= 0) return [0, 0, 0];
  const l = Math.round((left / total) * 100);
  const c = Math.round((center / total) * 100);
  const r = 100 - l - c;
  return [l, c, r];
}
