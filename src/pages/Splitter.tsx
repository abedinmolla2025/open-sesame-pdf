import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Scissors,
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  Package,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DropZone } from "@/components/DropZone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { usePageHead } from "@/hooks/usePageHead";

type SplitMode = "each" | "ranges";

interface OutputFile {
  name: string;
  blob: Blob;
  size: number;
  pageCount: number;
  label: string;
}

interface SplitResult {
  files: OutputFile[];
  zipBlob: Blob;
  zipName: string;
  zipSize: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

// Parse "1-3, 5, 7-9" into an array of page-index arrays (0-based).
// Each comma-separated token becomes one output PDF.
const parseRanges = (
  input: string,
  totalPages: number
): { groups: number[][]; errors: string[] } => {
  const errors: string[] = [];
  const groups: number[][] = [];
  const trimmed = input.trim();
  if (!trimmed) {
    errors.push("Enter at least one page or range.");
    return { groups, errors };
  }
  const tokens = trimmed.split(",").map((t) => t.trim()).filter(Boolean);
  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = token.match(/^(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
        errors.push(`"${token}" is out of range (1–${totalPages}).`);
        continue;
      }
      if (start > end) {
        errors.push(`"${token}" is reversed — use ${end}-${start}.`);
        continue;
      }
      const pages: number[] = [];
      for (let i = start; i <= end; i++) pages.push(i - 1);
      groups.push(pages);
    } else if (singleMatch) {
      const page = Number(singleMatch[1]);
      if (page < 1 || page > totalPages) {
        errors.push(`Page ${page} is out of range (1–${totalPages}).`);
        continue;
      }
      groups.push([page - 1]);
    } else {
      errors.push(`"${token}" is not a valid page or range.`);
    }
  }
  return { groups, errors };
};

const CRUMBS = [
  { name: "Home", to: "/" },
  { name: "PDF Splitter" },
];

const CRUMB_LD = [
  { name: "Home", url: "https://free-my-pdf.lovable.app/" },
  { name: "PDF Splitter", url: "https://free-my-pdf.lovable.app/split" },
];

const Splitter = () => {
  usePageHead({
    title: "PDF Splitter — Split PDF Into Multiple Files Online | Free My PDF",
    description:
      "Split a PDF into individual pages or custom page ranges directly in your browser. Fast, private, and 100% client-side — no uploads.",
    canonical: "https://free-my-pdf.lovable.app/split",
    type: "website",
    breadcrumbs: CRUMB_LD,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Free My PDF Splitter",
      applicationCategory: "Utility",
      operatingSystem: "Any",
      url: "https://free-my-pdf.lovable.app/split",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [mode, setMode] = useState<SplitMode>("each");
  const [rangeInput, setRangeInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<SplitResult | null>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setProgress(0);
    setPageCount(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      setPageCount(doc.getPageCount());
    } catch (err) {
      console.error(err);
      setPageCount(null);
    }
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    setProgress(0);
    setPageCount(null);
    setRangeInput("");
  }, []);

  const rangePreview = useMemo(() => {
    if (mode !== "ranges" || !pageCount) return null;
    return parseRanges(rangeInput, pageCount);
  }, [mode, rangeInput, pageCount]);

  const split = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setResult(null);
    setProgress(0);
    setStatusText("Reading PDF…");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const JSZip = (await import("jszip")).default;

      const buffer = await selectedFile.arrayBuffer();
      const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const total = src.getPageCount();
      const baseName = selectedFile.name.replace(/\.pdf$/i, "");

      let groups: number[][] = [];
      if (mode === "each") {
        groups = Array.from({ length: total }, (_, i) => [i]);
      } else {
        const parsed = parseRanges(rangeInput, total);
        if (parsed.errors.length > 0) {
          toast({
            title: "Invalid page range",
            description: parsed.errors.slice(0, 3).join(" "),
            variant: "destructive",
          });
          setIsProcessing(false);
          setStatusText("");
          return;
        }
        groups = parsed.groups;
      }

      if (groups.length === 0) {
        toast({
          title: "Nothing to split",
          description: "No pages were selected.",
          variant: "destructive",
        });
        setIsProcessing(false);
        setStatusText("");
        return;
      }

      const outputs: OutputFile[] = [];
      const zip = new JSZip();
      const pad = String(groups.length).length;

      for (let i = 0; i < groups.length; i++) {
        const pages = groups[i];
        const label =
          pages.length === 1
            ? `Page ${pages[0] + 1}`
            : `Pages ${pages[0] + 1}–${pages[pages.length - 1] + 1}`;
        setStatusText(`Building part ${i + 1}/${groups.length} — ${label}`);

        const outDoc = await PDFDocument.create();
        const copied = await outDoc.copyPages(src, pages);
        copied.forEach((p) => outDoc.addPage(p));
        const bytes = await outDoc.save({ useObjectStreams: true });
        const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });

        const suffix =
          pages.length === 1
            ? `page-${String(pages[0] + 1).padStart(pad, "0")}`
            : `pages-${pages[0] + 1}-${pages[pages.length - 1] + 1}`;
        const name = `${baseName}_${suffix}.pdf`;

        outputs.push({
          name,
          blob,
          size: blob.size,
          pageCount: pages.length,
          label,
        });
        zip.file(name, bytes);
        setProgress(Math.round(((i + 1) / groups.length) * 100));
      }

      setStatusText("Packaging ZIP…");
      const zipBlob = await zip.generateAsync({ type: "blob" });

      setResult({
        files: outputs,
        zipBlob,
        zipName: `${baseName}_split.zip`,
        zipSize: zipBlob.size,
      });

      toast({
        title: "Split complete",
        description: `${outputs.length} file${outputs.length === 1 ? "" : "s"} ready to download.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Split failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  }, [selectedFile, mode, rangeInput, toast]);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const canSplit =
    !!selectedFile &&
    !isProcessing &&
    (mode === "each"
      ? (pageCount ?? 0) > 1
      : (rangePreview?.groups.length ?? 0) > 0 && (rangePreview?.errors.length ?? 0) === 0);

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
              <Scissors className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Split & Extract</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display mb-6">
              Split Your <span className="gradient-text">PDF Files</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Break a PDF into individual pages or extract custom page ranges. Everything runs in your browser.
            </p>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto"
          >
            <div className="glass-card p-6 md:p-8 space-y-6">
              <DropZone
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClear={handleClear}
              />

              {selectedFile && pageCount !== null && (
                <p className="text-xs text-muted-foreground text-center">
                  Detected <span className="text-foreground font-semibold">{pageCount}</span> page
                  {pageCount === 1 ? "" : "s"} in this PDF.
                </p>
              )}

              {selectedFile && !result && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-6"
                >
                  {/* Mode tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted/40 border border-border">
                    <button
                      type="button"
                      onClick={() => setMode("each")}
                      className={`h-9 rounded-md text-sm font-medium transition-colors ${
                        mode === "each"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Every page
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("ranges")}
                      className={`h-9 rounded-md text-sm font-medium transition-colors ${
                        mode === "ranges"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      By page ranges
                    </button>
                  </div>

                  {mode === "ranges" ? (
                    <div className="space-y-3">
                      <Label htmlFor="ranges" className="text-base font-semibold">
                        Page ranges
                      </Label>
                      <Input
                        id="ranges"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        placeholder="e.g. 1-3, 5, 7-9"
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Each comma-separated group becomes one PDF. Use dashes for ranges.
                      </p>
                      {rangePreview && rangeInput.trim() !== "" && (
                        <div
                          className={`text-xs p-3 rounded-md border ${
                            rangePreview.errors.length > 0
                              ? "border-destructive/40 bg-destructive/10 text-destructive"
                              : "border-primary/30 bg-primary/5 text-foreground"
                          }`}
                        >
                          {rangePreview.errors.length > 0 ? (
                            <ul className="space-y-0.5">
                              {rangePreview.errors.map((e, i) => (
                                <li key={i}>• {e}</li>
                              ))}
                            </ul>
                          ) : (
                            <>
                              Will produce{" "}
                              <span className="font-semibold text-primary">
                                {rangePreview.groups.length}
                              </span>{" "}
                              file{rangePreview.groups.length === 1 ? "" : "s"}.
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Each page will be exported as its own PDF file, bundled into a ZIP.
                    </p>
                  )}
                </motion.div>
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
                    <p className="text-sm font-medium flex-1 truncate">
                      {statusText || "Splitting…"}
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
                </motion.div>
              )}

              {/* Action */}
              {selectedFile && !result && (
                <Button
                  onClick={split}
                  disabled={!canSplit}
                  className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl glow-effect"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Scissors className="w-5 h-5 mr-2" />
                  )}
                  {isProcessing ? "Splitting…" : "Split PDF"}
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
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/40 bg-primary/10">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {result.files.length} PDF{result.files.length === 1 ? "" : "s"} ready
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ZIP bundle: {formatBytes(result.zipSize)}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => downloadBlob(result.zipBlob, result.zipName)}
                    className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl glow-effect"
                  >
                    <Package className="w-5 h-5 mr-2" />
                    Download all as ZIP
                  </Button>

                  <div className="rounded-xl border border-border divide-y divide-border max-h-64 overflow-auto">
                    {result.files.map((f) => (
                      <div
                        key={f.name}
                        className="flex items-center gap-3 p-3 bg-card/40"
                      >
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {f.label} · {formatBytes(f.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadBlob(f.blob, f.name)}
                          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                    className="w-full"
                  >
                    Split with different settings
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Splitter;
