import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X } from "lucide-react";
import { validatePdfFile } from "@/lib/pdfValidation";
import { useToast } from "@/hooks/use-toast";

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
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
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
              relative cursor-pointer block w-full p-12 rounded-2xl border-2 border-dashed transition-all duration-300
              ${isDragging 
                ? "border-primary bg-primary/10 scale-[1.02]" 
                : "border-border hover:border-primary/50 bg-card/50 hover:bg-card/80"
              }
            `}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
                  ${isDragging ? "bg-primary/30" : "bg-secondary"}
                `}
              >
                <Upload className={`w-8 h-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground mb-1">
                  {isDragging ? "Drop your PDF here" : "Drag & drop your PDF here"}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse files
                </p>
              </div>
            </div>
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
};
