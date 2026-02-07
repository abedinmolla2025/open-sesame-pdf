import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface ProgressInfo {
  currentPage: number;
  totalPages: number;
  percentage: number;
}

interface UnlockProgressProps {
  progress: ProgressInfo;
}

export const UnlockProgress = ({ progress }: UnlockProgressProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-3"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Processing page {progress.currentPage} of {progress.totalPages}
        </span>
        <span className="font-medium text-primary">{progress.percentage}%</span>
      </div>
      <Progress value={progress.percentage} className="h-2" />
      <p className="text-xs text-muted-foreground text-center">
        Please wait while we unlock your PDF...
      </p>
    </motion.div>
  );
};
