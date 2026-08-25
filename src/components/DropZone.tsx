import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X } from "lucide-react";
import { validatePdfFile } from "@/lib/pdfValidation";
import { useToast } from "@/hooks/use-toast";
import { PremiumIconFrame } from "@/components/PremiumIcon";

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export const DropZone = ({ onFileSelect, selectedFile, onClear }: DropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const acceptFile = useCallback(
    async (file: File) => {
      const result = await validatePdfFile(file);
      if (!result.ok) {
        toast({
          title: "Invalid PDF file",
          description: result.reason ?? "This file is not a valid PDF.",
          variant: "destructive",
        });
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect, toast]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        void acceptFile(e.dataTransfer.files[0]);
      }
    },
    [acceptFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void acceptFile(e.target.files[0]);
      }
      // Allow re-selecting the same file after a rejection.
      e.target.value = "";
    },
    [acceptFile]
  );

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {selectedFile ? (
          <motion.div
            key="file-selected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <PremiumIconFrame tone="gold" size="md" aria-hidden="true"><FileText /></PremiumIconFrame>
              <div>
                <p className="font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={onClear}
              aria-label="Remove selected file"
              className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </motion.div>
        ) : (
          <motion.label
            key="drop-zone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              group relative cursor-pointer block w-full overflow-hidden rounded-3xl border-2 border-dashed p-8 sm:p-12 transition-all duration-300
              bg-gradient-to-br from-card/90 via-card/60 to-primary/[0.04] backdrop-blur
              before:pointer-events-none before:absolute before:-right-16 before:-top-16 before:h-44 before:w-44 before:rounded-full before:bg-primary/10 before:blur-2xl
              after:pointer-events-none after:absolute after:inset-3 after:rounded-2xl after:border after:border-white/20
              ${isDragging
                ? "scale-[1.01] border-primary bg-primary/10 shadow-[0_0_50px_hsl(var(--primary)/0.18)]"
                : "border-primary/25 shadow-[0_16px_45px_hsl(var(--primary)/0.06)] hover:border-primary/60 hover:shadow-[0_0_40px_hsl(var(--primary)/0.12)]"
              }
            `}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="relative z-10 flex flex-col items-center gap-4 text-center">
              <motion.div animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
                <PremiumIconFrame tone={isDragging ? "gold" : "blue"} size="lg" aria-hidden="true"><Upload /></PremiumIconFrame>
              </motion.div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  {isDragging ? "Release to upload your PDF" : "Drag & drop your PDF here"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">or <span className="font-medium text-primary">click to browse</span> from your device</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-medium text-muted-foreground">
                  <span className="rounded-full border border-border bg-background/70 px-2.5 py-1">PDF only</span>
                  <span className="rounded-full border border-border bg-background/70 px-2.5 py-1">Up to 30 MB</span>
                  <span className="rounded-full border border-border bg-background/70 px-2.5 py-1">100% private</span>
                </div>
              </div>
            </div>
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
};
