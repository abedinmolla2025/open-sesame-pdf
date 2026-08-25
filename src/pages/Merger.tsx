import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FilePlus2,
  Combine,
  Download,
  X,
  ArrowUp,
  ArrowDown,
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePageHead } from "@/hooks/usePageHead";
import { partitionValidPdfs } from "@/lib/pdfValidation";

interface QueuedFile {
  id: string;
  file: File;
}

interface MergeResult {
  blob: Blob;
  filename: string;
  size: number;
  pageCount: number;
  sourceCount: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const CRUMBS = [
  { name: "Home", to: "/" },
  { name: "PDF Merger" },
];

const CRUMB_LD = [
  { name: "Home", url: "https://free-my-pdf.lovable.app/" },
  { name: "PDF Merger", url: "https://free-my-pdf.lovable.app/merge" },
];

const Merger = () => {
  usePageHead({
    title: "PDF Merger — Combine PDF Files Online | Free My PDF",
    description:
      "Merge multiple PDF files into one document directly in your browser. Fast, private, and 100% client-side — no uploads.",
    canonical: "https://free-my-pdf.lovable.app/merge",
    type: "website",
    breadcrumbs: CRUMB_LD,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Free My PDF Merger",
      applicationCategory: "Utility",
      operatingSystem: "Any",
      url: "https://free-my-pdf.lovable.app/merge",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });

  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<MergeResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const { valid, invalid } = await partitionValidPdfs(Array.from(incoming));

      if (invalid.length > 0) {
        const preview = invalid.slice(0, 3).map((i) => `• ${i.reason}`).join("\n");
        const more =
          invalid.length > 3 ? `\n…and ${invalid.length - 3} more invalid file(s).` : "";
        toast({
          title:
            invalid.length === 1
              ? "1 file rejected"
              : `${invalid.length} files rejected`,
          description: `${preview}${more}`,
          variant: "destructive",
        });
      }

      if (valid.length === 0) return;

      setFiles((prev) => [
        ...prev,
        ...valid.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          file,
        })),
      ]);
      setResult(null);
    },
    [toast]
  );


  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      if (inputRef.current) inputRef.current.value = "";
    },
    [addFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setResult(null);
  }, []);

  const moveFile = useCallback((index: number, direction: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setResult(null);
    setProgress(0);
  }, []);

  const merge = useCallback(async () => {
    if (files.length < 2) {
      toast({
        title: "Add at least 2 PDFs",
        description: "Select two or more PDF files to merge.",
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setProgress(0);
    setStatusText("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const outPdf = await PDFDocument.create();
      let totalPages = 0;

      for (let i = 0; i < files.length; i++) {
        const entry = files[i];
        setStatusText(`Merging ${i + 1}/${files.length} — ${entry.file.name}`);
        const buffer = await entry.file.arrayBuffer();
        const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pageIndices = src.getPageIndices();
        const copied = await outPdf.copyPages(src, pageIndices);
        copied.forEach((p) => outPdf.addPage(p));
        totalPages += pageIndices.length;
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const bytes = await outPdf.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const filename = `merged_${files.length}_files.pdf`;

      setResult({
        blob,
        filename,
        size: blob.size,
        pageCount: totalPages,
        sourceCount: files.length,
      });

      toast({
        title: "Merge complete",
        description: `${files.length} files → ${totalPages} pages (${formatBytes(blob.size)})`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Merge failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  }, [files, toast]);

  const download = useCallback(() => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result]);

  const totalInputSize = files.reduce((acc, f) => acc + f.file.size, 0);

  return (
    <Layout>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">

          <Breadcrumbs items={CRUMBS} className="mb-6" />
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Combine className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Merge & Combine</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display mb-6">
              Merge Your <span className="gradient-text">PDF Files</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Combine multiple PDFs into a single document. Reorder them however you like — everything runs in your browser.
            </p>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto"
          >
            <div className="glass-card p-6 md:p-8 space-y-6">
              {/* Drop zone */}
              <label
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`premium-dropzone relative cursor-pointer block w-full p-8 sm:p-10 ${isDragging ? "scale-[1.02]" : ""}`}
                data-dragging={isDragging}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={handleInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-3">
                  <div
                    className={`
                      w-14 h-14 rounded-2xl flex items-center justify-center transition-colors
                      ${isDragging ? "bg-primary/30" : "bg-secondary"}
                    `}
                  >
                    <Upload
                      className={`w-7 h-7 ${
                        isDragging ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-medium text-foreground mb-1">
                      {isDragging
                        ? "Drop your PDFs here"
                        : files.length > 0
                        ? "Add more PDFs"
                        : "Drag & drop PDFs here"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse — you can select multiple files
                    </p>
                  </div>
                </div>
              </label>

              {/* File queue */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {files.length} file{files.length === 1 ? "" : "s"} queued
                      <span className="ml-2 text-muted-foreground font-normal">
                        ({formatBytes(totalInputSize)})
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  </div>

                  <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                      {files.map((entry, index) => (
                        <motion.li
                          key={entry.id}
                          layout
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/60"
                        >
                          <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{entry.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(entry.file.size)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveFile(index, -1)}
                              disabled={index === 0 || isProcessing}
                              aria-label="Move up"
                              className="w-8 h-8 rounded-md hover:bg-muted disabled:opacity-30 flex items-center justify-center transition-colors"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveFile(index, 1)}
                              disabled={index === files.length - 1 || isProcessing}
                              aria-label="Move down"
                              className="w-8 h-8 rounded-md hover:bg-muted disabled:opacity-30 flex items-center justify-center transition-colors"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFile(entry.id)}
                              disabled={isProcessing}
                              aria-label="Remove file"
                              className="w-8 h-8 rounded-md hover:bg-destructive/15 hover:text-destructive disabled:opacity-30 flex items-center justify-center transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )}

              {/* Progress */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="status"
                  aria-live="polite"
                  className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                    <p className="text-sm font-medium text-foreground flex-1 truncate">
                      {statusText || "Merging your PDFs…"}
                    </p>
                    <span className="text-sm font-semibold text-primary tabular-nums">
                      {progress}%
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full bg-muted overflow-hidden"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <motion.div
                      className="h-full bg-primary"
                      initial={false}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please keep this tab open — everything is processed locally in your browser.
                  </p>
                </motion.div>
              )}

              {/* Actions */}
              {files.length > 0 && !result && (
                <Button
                  onClick={merge}
                  disabled={isProcessing || files.length < 2}
                  className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl glow-effect"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Combine className="w-5 h-5 mr-2" />
                  )}
                  {isProcessing
                    ? "Merging…"
                    : files.length < 2
                    ? "Add at least 2 PDFs"
                    : `Merge ${files.length} PDFs`}
                </Button>
              )}

              {/* Result */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                  role="status"
                  aria-live="polite"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-3 p-4 rounded-xl border border-primary/40 bg-primary/10"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Your merged PDF is ready
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.filename} — {formatBytes(result.size)}
                      </p>
                    </div>
                  </motion.div>

                  <div className="p-5 rounded-xl border border-primary/30 bg-primary/5">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Files</p>
                        <p className="font-semibold">{result.sourceCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pages</p>
                        <p className="font-semibold text-primary">{result.pageCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Size</p>
                        <p className="font-semibold text-primary">
                          {formatBytes(result.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={download}
                    className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl glow-effect"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download merged PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                    className="w-full"
                  >
                    Adjust order and merge again
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>

          <h2 className="sr-only">Features</h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
                <FilePlus2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Any number of PDFs</h3>
              <p className="text-sm text-muted-foreground">
                Drop in as many files as you need. Reorder before merging.
              </p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
                <Combine className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Preserves quality</h3>
              <p className="text-sm text-muted-foreground">
                Pages are copied as-is — no re-encoding, no quality loss.
              </p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">100% client-side</h3>
              <p className="text-sm text-muted-foreground">
                Your files never leave your device. Nothing is uploaded.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Merger;
