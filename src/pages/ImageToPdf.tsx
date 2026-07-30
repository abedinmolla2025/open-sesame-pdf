import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Download,
  X,
  ArrowUp,
  ArrowDown,
  Upload,
  Loader2,
  CheckCircle2,
  FileImage,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePageHead } from "@/hooks/usePageHead";

interface QueuedImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface ImgResult {
  blob: Blob;
  filename: string;
  size: number;
  pageCount: number;
}

type PageSize = "auto" | "a4" | "letter";
type Orientation = "portrait" | "landscape" | "auto";

// Points at 72 dpi.
const PAGE_SIZES: Record<Exclude<PageSize, "auto">, { w: number; h: number }> = {
  a4: { w: 595.28, h: 841.89 },
  letter: { w: 612, h: 792 },
};

const MARGIN = 24; // points around each image when using fixed page size
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

// Ensure the bytes we hand to pdf-lib are JPG or PNG. WebP or anything else
// is re-encoded to PNG in a canvas so pdf-lib can embed it.
const toEmbeddable = async (
  file: File
): Promise<{ bytes: Uint8Array; kind: "jpg" | "png" }> => {
  const isJpg = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
  const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
  if (isJpg) {
    return { bytes: new Uint8Array(await file.arrayBuffer()), kind: "jpg" };
  }
  if (isPng) {
    return { bytes: new Uint8Array(await file.arrayBuffer()), kind: "png" };
  }
  // Re-encode via canvas.
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Could not decode ${file.name}`));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))),
        "image/png"
      )
    );
    return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: "png" };
  } finally {
    URL.revokeObjectURL(url);
  }
};

const CRUMBS = [
  { name: "Home", to: "/" },
  { name: "Image to PDF" },
];

const CRUMB_LD = [
  { name: "Home", url: "https://free-my-pdf.lovable.app/" },
  { name: "Image to PDF", url: "https://free-my-pdf.lovable.app/image-to-pdf" },
];

const ImageToPdf = () => {
  usePageHead({
    title: "Image to PDF Converter — JPG/PNG/WebP to PDF Online | Free My PDF",
    description:
      "Convert JPG, PNG, and WebP images into a single PDF directly in your browser. Fast, private, and 100% client-side — no uploads.",
    canonical: "https://free-my-pdf.lovable.app/image-to-pdf",
    type: "website",
    breadcrumbs: CRUMB_LD,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Free My PDF — Image to PDF",
      applicationCategory: "Utility",
      operatingSystem: "Any",
      url: "https://free-my-pdf.lovable.app/image-to-pdf",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });

  const [images, setImages] = useState<QueuedImage[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("auto");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<ImgResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Revoke preview URLs on unmount / when list changes.
  useEffect(() => {
    return () => {
      images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      const invalid: string[] = [];
      const valid: File[] = [];
      for (const f of list) {
        const typeOk =
          ACCEPTED_TYPES.includes(f.type) ||
          /\.(jpe?g|png|webp)$/i.test(f.name);
        if (!typeOk) {
          invalid.push(`"${f.name}" is not a supported image (JPG, PNG, WebP).`);
          continue;
        }
        if (f.size === 0) {
          invalid.push(`"${f.name}" is empty.`);
          continue;
        }
        if (f.size > MAX_FILE_BYTES) {
          invalid.push(
            `"${f.name}" is too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB).`
          );
          continue;
        }
        valid.push(f);
      }

      if (invalid.length > 0) {
        toast({
          title:
            invalid.length === 1 ? "1 file rejected" : `${invalid.length} files rejected`,
          description: invalid.slice(0, 3).join(" "),
          variant: "destructive",
        });
      }
      if (valid.length === 0) return;

      setImages((prev) => [
        ...prev,
        ...valid.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          file,
          previewUrl: URL.createObjectURL(file),
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
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setResult(null);
  }, []);

  const moveImage = useCallback((index: number, direction: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  }, []);

  const clearAll = useCallback(() => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
    setResult(null);
    setProgress(0);
  }, [images]);

  const convert = useCallback(async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setResult(null);
    setProgress(0);
    setStatusText("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const outPdf = await PDFDocument.create();

      for (let i = 0; i < images.length; i++) {
        const entry = images[i];
        setStatusText(`Adding ${i + 1}/${images.length} — ${entry.file.name}`);

        const { bytes, kind } = await toEmbeddable(entry.file);
        const embedded =
          kind === "jpg"
            ? await outPdf.embedJpg(bytes)
            : await outPdf.embedPng(bytes);

        const imgW = embedded.width;
        const imgH = embedded.height;

        if (pageSize === "auto") {
          // Page matches image dimensions exactly.
          const page = outPdf.addPage([imgW, imgH]);
          page.drawImage(embedded, { x: 0, y: 0, width: imgW, height: imgH });
        } else {
          const base = PAGE_SIZES[pageSize];
          const isLandscape =
            orientation === "landscape" ||
            (orientation === "auto" && imgW > imgH);
          const pageW = isLandscape ? base.h : base.w;
          const pageH = isLandscape ? base.w : base.h;
          const page = outPdf.addPage([pageW, pageH]);

          const maxW = pageW - MARGIN * 2;
          const maxH = pageH - MARGIN * 2;
          const scale = Math.min(maxW / imgW, maxH / imgH);
          const drawW = imgW * scale;
          const drawH = imgH * scale;
          page.drawImage(embedded, {
            x: (pageW - drawW) / 2,
            y: (pageH - drawH) / 2,
            width: drawW,
            height: drawH,
          });
        }

        setProgress(Math.round(((i + 1) / images.length) * 100));
      }

      setStatusText("Saving PDF…");
      const outBytes = await outPdf.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(outBytes)], { type: "application/pdf" });
      const filename = `images_${images.length}.pdf`;

      setResult({
        blob,
        filename,
        size: blob.size,
        pageCount: images.length,
      });

      toast({
        title: "PDF ready",
        description: `${images.length} image${images.length === 1 ? "" : "s"} → ${formatBytes(blob.size)}`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Conversion failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  }, [images, pageSize, orientation, toast]);

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

  const totalSize = images.reduce((acc, i) => acc + i.file.size, 0);

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
              <FileImage className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Convert & Combine</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display mb-6">
              Images to <span className="gradient-text">PDF</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Combine JPG, PNG, and WebP images into a single PDF. Reorder them however you like — everything runs in your browser.
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
                className={`
                  relative cursor-pointer block w-full p-8 rounded-2xl border-2 border-dashed transition-all duration-300
                  ${
                    isDragging
                      ? "border-primary bg-primary/10 scale-[1.02]"
                      : "border-border hover:border-primary/50 bg-card/50 hover:bg-card/80"
                  }
                `}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
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
                        ? "Drop your images here"
                        : images.length > 0
                        ? "Add more images"
                        : "Drag & drop images here"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, WebP — you can select multiple files
                    </p>
                  </div>
                </div>
              </label>

              {/* Queue */}
              {images.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {images.length} image{images.length === 1 ? "" : "s"}
                      <span className="ml-2 text-muted-foreground font-normal">
                        ({formatBytes(totalSize)})
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

                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <AnimatePresence initial={false}>
                      {images.map((entry, index) => (
                        <motion.li
                          key={entry.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative rounded-lg border border-border bg-card/60 overflow-hidden group"
                        >
                          <div className="aspect-square bg-muted/40 overflow-hidden">
                            <img
                              src={entry.previewUrl}
                              alt={entry.file.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">
                              {entry.file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatBytes(entry.file.size)}
                            </p>
                          </div>
                          <span className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow">
                            {index + 1}
                          </span>
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => moveImage(index, -1)}
                              disabled={index === 0 || isProcessing}
                              aria-label="Move earlier"
                              className="w-7 h-7 rounded-md bg-background/90 hover:bg-background border border-border disabled:opacity-30 flex items-center justify-center"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImage(index, 1)}
                              disabled={index === images.length - 1 || isProcessing}
                              aria-label="Move later"
                              className="w-7 h-7 rounded-md bg-background/90 hover:bg-background border border-border disabled:opacity-30 flex items-center justify-center"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(entry.id)}
                              disabled={isProcessing}
                              aria-label="Remove"
                              className="w-7 h-7 rounded-md bg-background/90 hover:bg-destructive hover:text-destructive-foreground border border-border disabled:opacity-30 flex items-center justify-center"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )}

              {/* Options */}
              {images.length > 0 && !result && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Page size</Label>
                    <Select
                      value={pageSize}
                      onValueChange={(v) => setPageSize(v as PageSize)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Fit to image</SelectItem>
                        <SelectItem value="a4">A4</SelectItem>
                        <SelectItem value="letter">US Letter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Orientation</Label>
                    <Select
                      value={orientation}
                      onValueChange={(v) => setOrientation(v as Orientation)}
                      disabled={pageSize === "auto"}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                    <p className="text-sm font-medium flex-1 truncate">
                      {statusText || "Building PDF…"}
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
              {images.length > 0 && !result && (
                <Button
                  onClick={convert}
                  disabled={isProcessing}
                  className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl glow-effect"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5 mr-2" />
                  )}
                  {isProcessing
                    ? "Building…"
                    : `Create PDF from ${images.length} image${images.length === 1 ? "" : "s"}`}
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
                      <p className="text-sm font-semibold">Your PDF is ready</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.filename} — {result.pageCount} page
                        {result.pageCount === 1 ? "" : "s"} · {formatBytes(result.size)}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={download}
                    className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl glow-effect"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                    className="w-full"
                  >
                    Adjust and rebuild
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

export default ImageToPdf;
