import { cn } from "@/lib/utils";

export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Newz logo"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="newz-logo-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#newz-logo-g)" />
      <rect x="1" y="1" width="30" height="30" rx="9" fill="white" fillOpacity="0.06" />
      {/* signal bars forming an N pulse */}
      <rect x="8" y="15" width="3.6" height="8" rx="1.8" fill="white" opacity="0.85" />
      <rect x="14.2" y="9" width="3.6" height="14" rx="1.8" fill="white" />
      <rect x="20.4" y="12.5" width="3.6" height="10.5" rx="1.8" fill="white" opacity="0.85" />
      <circle cx="23.4" cy="8.6" r="2" fill="#fde68a" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={compact ? 26 : 30} />
      <span className="text-[19px] font-extrabold tracking-tight text-slate-900 dark:text-white">
        Newz
      </span>
      {!compact && (
        <span className="hidden rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-indigo-600 sm:inline dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
          AI-estimated
        </span>
      )}
    </span>
  );
}
