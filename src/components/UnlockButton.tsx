import { motion } from "framer-motion";
import { Unlock, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnlockButtonProps {
  status: "idle" | "unlocking" | "success" | "error";
  onUnlock: () => void;
  onDownload: () => void;
  disabled: boolean;
}

export const UnlockButton = ({ status, onUnlock, onDownload, disabled }: UnlockButtonProps) => {
  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full"
      >
      <Button
          onClick={onDownload}
          className="w-full h-14 text-lg font-semibold bg-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,30%)] text-white border-0 rounded-xl"
        >
          <Download className="w-5 h-5 mr-2" />
          Download Unlocked PDF
        </Button>
      </motion.div>
    );
  }

  return (
    <Button
      onClick={onUnlock}
      disabled={disabled || status === "unlocking"}
      className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-xl glow-effect disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
    >
      {status === "unlocking" ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Unlocking...
        </>
      ) : (
        <>
          <Unlock className="w-5 h-5 mr-2" />
          Unlock PDF
        </>
      )}
    </Button>
  );
};
