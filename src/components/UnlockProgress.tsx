import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export type UnlockPhase = "reading" | "decrypting" | "rebuilding" | "saving";

interface ProgressInfo {
  currentPage: number;
  totalPages: number;
  percentage: number;
  phase: UnlockPhase;
}

interface UnlockProgressProps {
  progress: ProgressInfo;
}

const PHASE_LABEL: Record<UnlockPhase, string> = {
  reading: "Reading your file",
  decrypting: "Unlocking with your password",
  rebuilding: "Rebuilding pages",
  saving: "Finalising the unlocked PDF",
};

export const UnlockProgress = ({ progress }: UnlockProgressProps) => {
  const { phase, currentPage, totalPages, percentage } = progress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-sm gap-2">
        <span className="text-muted-foreground truncate">
          {phase === "rebuilding" && totalPages > 0
            ? `Rebuilding page ${currentPage} of ${totalPages}`
            : PHASE_LABEL[phase]}
        </span>
        <span className="font-medium text-primary tabular-nums">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-muted-foreground text-center">
        Everything runs in your browser — nothing is uploaded.
      </p>
    </motion.div>
  );
};
