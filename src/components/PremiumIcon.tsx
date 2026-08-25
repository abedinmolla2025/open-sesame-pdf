import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PremiumIconTone = "gold" | "blue" | "violet" | "mint" | "rose" | "slate";
export type PremiumIconSize = "sm" | "md" | "lg";

interface PremiumIconFrameProps {
  children: ReactNode;
  tone?: PremiumIconTone;
  size?: PremiumIconSize;
  className?: string;
  label?: string;
  "aria-hidden"?: boolean;
}

const toneClasses: Record<PremiumIconTone, string> = {
  gold: "from-amber-300 via-yellow-400 to-orange-500 text-amber-950 shadow-amber-500/20",
  blue: "from-sky-300 via-blue-500 to-indigo-600 text-white shadow-blue-500/20",
  violet: "from-violet-300 via-purple-500 to-fuchsia-600 text-white shadow-violet-500/20",
  mint: "from-emerald-300 via-teal-500 to-cyan-600 text-white shadow-teal-500/20",
  rose: "from-rose-300 via-pink-500 to-red-600 text-white shadow-rose-500/20",
  slate: "from-slate-200 via-slate-400 to-slate-700 text-slate-950 shadow-slate-500/20",
};

const sizeClasses: Record<PremiumIconSize, string> = {
  sm: "size-8 rounded-[11px] [&>span]:size-6 [&_svg]:size-3.5",
  md: "size-10 rounded-[13px] [&>span]:size-7 [&_svg]:size-4",
  lg: "size-12 rounded-[15px] [&>span]:size-9 [&_svg]:size-5",
};

/**
 * A premium icon frame for the app’s feature surfaces. The child remains a real
 * scalable SVG (Lucide or a custom glyph), while this frame supplies consistent
 * depth, highlight, and active-state treatment.
 */
export const PremiumIconFrame = ({
  children,
  tone = "gold",
  size = "md",
  className,
  label,
  "aria-hidden": ariaHidden,
}: PremiumIconFrameProps) => (
  <span
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={ariaHidden}
    className={cn(
      "relative inline-flex shrink-0 items-center justify-center bg-gradient-to-br shadow-lg ring-1 ring-white/60 transition-transform duration-200",
      "before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-white/55 before:to-transparent before:opacity-80",
      "after:pointer-events-none after:absolute after:inset-[3px] after:rounded-[inherit] after:border after:border-white/25",
      "hover:-translate-y-0.5 hover:shadow-xl",
      toneClasses[tone],
      sizeClasses[size],
      className,
    )}
  >
    <span className="relative z-10 inline-flex items-center justify-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]">
      {children}
    </span>
  </span>
);

export const PremiumLogoGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("size-5", className)}>
    <path d="M7.5 4.5h6.15a3.85 3.85 0 0 1 0 7.7H9.75v4.55a2.75 2.75 0 1 1-5.5 0V7.25A2.75 2.75 0 0 1 7.5 4.5Z" fill="currentColor" opacity=".96" />
    <path d="M10.15 8.05h3.5a1.3 1.3 0 1 1 0 2.6h-3.5a1.3 1.3 0 1 1 0-2.6Z" fill="white" opacity=".88" />
    <path d="m15.8 14.1 2.8-2.8 1.5 1.5-2.8 2.8-1.5-1.5Z" fill="white" opacity=".72" />
    <path d="m17.85 11.55 1.05-1.05 1.5 1.5-1.05 1.05-1.5-1.5Z" fill="currentColor" opacity=".95" />
  </svg>
);
