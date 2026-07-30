import { cn } from "@/lib/utils";

interface AdSlotProps {
  /** Slot label, e.g. "leaderboard" */
  label?: string;
  className?: string;
  format?: "leaderboard" | "rectangle" | "inline";
}

/**
 * AdSense-ready placeholder. Drop the <ins class="adsbygoogle"> markup in here
 * once a publisher ID is available — layout and reserved height stay identical,
 * so no cumulative layout shift on activation.
 */
export const AdSlot = ({ label = "Advertisement", className, format = "leaderboard" }: AdSlotProps) => (
  <aside
    aria-label={label}
    className={cn(
      "rounded-xl border border-dashed border-border bg-muted/20 flex items-center justify-center text-[11px] uppercase tracking-widest text-muted-foreground",
      format === "leaderboard" && "h-24",
      format === "rectangle" && "h-64",
      format === "inline" && "h-20",
      className
    )}
  >
    {label}
  </aside>
);
