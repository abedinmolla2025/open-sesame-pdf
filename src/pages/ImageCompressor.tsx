import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Download,
  X,
  Upload,
  Loader2,
  CheckCircle2,
  Minimize2,
  Package,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePageHead } from "@/hooks/usePageHead";

type OutputFormat = "auto" | "jpeg" | "webp" | "png";

interface QueuedImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface CompressedItem {
  id: string;
  originalName: string;
  outputName: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  blob: Blob;
  savedPct: number;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const mimeFor = (fmt: Exclude<OutputFormat, "auto">): string =>
  fmt === "jpeg" ? "image/jpeg" : fmt === "webp" ? "image/webp" : "image/png";

const extFor = (mime: string): string =>
  mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";

const resolveOutputMime = (
  original: string,
  fmt: OutputFormat
): "image/jpeg" | "image/webp" | "image/png" => {
  if (fmt !== "auto") return mimeFor(fmt) as "image/jpeg" | "image/webp" | "image/png";
  // Auto: keep PNG as PNG (preserves transparency), otherwise use JPEG for best compression.
  if (original === "image/png") return "image/png";
  return "image/jpeg";
};

const decodeImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not decode ${file.name}`));
    };
    img.src = url;
  });
};

const ImageCompressor = () => {
  usePageHead({
    title: "Image Compressor — Shrink JPG, PNG, WebP Online | Free My PDF",
    description:
      "Compress JPG, PNG, and WebP images directly in your browser. Adjust quality and dimensions — fast, private, and 100% client-side.",
    canonical: "https://free-my-pdf.lovable.app/image-compress",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Free My PDF — Image Compressor",
      applicationCategory: "Utility",
      operatingSystem: "Any",
      url: "https://free-my-pdf.lovable.app/image-compress",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });

  const [images, setImages] = useState<QueuedImage[]>([]);
  const [quality, setQuality] = useState(75);
  const [maxDimension, setMaxDimension] = useState<number | "">("");
  const [format, setFormat] = useState<OutputFormat>("auto");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [results, setResults] = useState<CompressedItem[] | null>(null);
  const [justPasted, setJustPasted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
          ACCEPTED_TYPES.includes(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name);
        if (!typeOk) {
          invalid.push(`"${f.name}" is not a supported image.`);
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
      setResults(null);
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
    setResults(null);
  }, []);

  const clearAll = useCallback(() => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
    setResults(null);
    setProgress(0);
  }, [images]);

  const compress = useCallback(async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setResults(null);
    setProgress(0);
    setStatusText("");

    const output: CompressedItem[] = [];

    try {
      for (let i = 0; i < images.length; i++) {
        const entry = images[i];
        setStatusText(`Compressing ${i + 1}/${images.length} — ${entry.file.name}`);

        const img = await decodeImage(entry.file);
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;

        // Compute target dimensions.
        let targetW = naturalW;
        let targetH = naturalH;
        const cap = typeof maxDimension === "number" ? maxDimension : 0;
        if (cap > 0 && Math.max(naturalW, naturalH) > cap) {
          const scale = cap / Math.max(naturalW, naturalH);
          targetW = Math.max(1, Math.round(naturalW * scale));
          targetH = Math.max(1, Math.round(naturalH * scale));
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");

        const outMime = resolveOutputMime(entry.file.type, format);

        // Flatten transparency to white when going to JPEG.
        if (outMime === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, targetW, targetH);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // PNG ignores the quality argument; JPEG/WebP use it.
        const q = quality / 100;
        const blob: Blob = await new Promise((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
            outMime,
            outMime === "image/png" ? undefined : q
          )
        );

        const baseName = entry.file.name.replace(/\.[^.]+$/, "");
        const outputName = `${baseName}_compressed.${extFor(outMime)}`;
        const savedPct = Math.max(
          0,
          Math.round(((entry.file.size - blob.size) / entry.file.size) * 100)
        );

        output.push({
          id: entry.id,
          originalName: entry.file.name,
          outputName,
          originalSize: entry.file.size,
          compressedSize: blob.size,
          width: targetW,
          height: targetH,
          blob,
          savedPct,
        });

        setProgress(Math.round(((i + 1) / images.length) * 100));
      }

      setResults(output);
      const totalOrig = output.reduce((a, b) => a + b.originalSize, 0);
      const totalNew = output.reduce((a, b) => a + b.compressedSize, 0);
      const overall = Math.max(
        0,
        Math.round(((totalOrig - totalNew) / totalOrig) * 100)
      );
      toast({
        title: "Compression complete",
        description: `${output.length} image${output.length === 1 ? "" : "s"} — saved ${overall}% overall.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Compression failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  }, [images, quality, maxDimension, format, toast]);

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

  const downloadAllZip = useCallback(async () => {
    if (!results || results.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    results.forEach((r) => zip.file(r.outputName, r.blob));
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, "compressed_images.zip");
  }, [results, downloadBlob]);

  const totalOriginal = images.reduce((a, b) => a + b.file.size, 0);
  const totalCompressed = results?.reduce((a, b) => a + b.compressedSize, 0) ?? 0;
  const overallSaved =
    results && totalOriginal > 0
      ? Math.max(
          0,
          Math.round(
            ((results.reduce((a, b) => a + b.originalSize, 0) - totalCompressed) /
              results.reduce((a, b) => a + b.originalSize, 0)) *
              100
          )
        )
      : 0;

  return (
    <Layout>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Minimize2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Compress & Optimize</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display mb-6">
              Compress Your <span className="gradient-text">Images</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Shrink JPG, PNG, and WebP images without leaving your browser. Adjust quality and dimensions to match any size target.
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
                        ({formatBytes(totalOriginal)})
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
                      {images.map((entry) => {
                        const res = results?.find((r) => r.id === entry.id);
                        return (
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
                            <div className="p-2 space-y-0.5">
                              <p className="text-xs font-medium truncate">
                                {entry.file.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatBytes(entry.file.size)}
                                {res && (
                                  <>
                                    {" → "}
                                    <span className="text-primary font-semibold">
                                      {formatBytes(res.compressedSize)}
                                    </span>
                                  </>
                                )}
                              </p>
                              {res && (
                                <p className="text-[10px] text-primary font-semibold">
                                  −{res.savedPct}% · {res.width}×{res.height}
                                </p>
                              )}
                            </div>
                            {res && (
                              <button
                                type="button"
                                onClick={() => downloadBlob(res.blob, res.outputName)}
                                aria-label="Download"
                                className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center shadow"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(entry.id)}
                              disabled={isProcessing}
                              aria-label="Remove"
                              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-background/90 hover:bg-destructive hover:text-destructive-foreground border border-border disabled:opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                </div>
              )}

              {/* Options */}
              {images.length > 0 && (
                <div className="space-y-5 p-4 rounded-xl border border-border bg-card/40">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Quality</Label>
                      <span className="text-muted-foreground tabular-nums">
                        {quality}%
                      </span>
                    </div>
                    <Slider
                      value={[quality]}
                      min={20}
                      max={100}
                      step={5}
                      onValueChange={(v) => setQuality(v[0])}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Only applies to JPEG and WebP. PNG stays lossless.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="maxdim" className="text-xs">
                        Max width / height (px)
                      </Label>
                      <Input
                        id="maxdim"
                        type="number"
                        inputMode="numeric"
                        min={64}
                        step={50}
                        placeholder="Original size"
                        value={maxDimension}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMaxDimension(v === "" ? "" : Math.max(0, Number(v)));
                        }}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Output format</Label>
                      <Select
                        value={format}
                        onValueChange={(v) => setFormat(v as OutputFormat)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto (recommended)</SelectItem>
                          <SelectItem value="jpeg">JPEG</SelectItem>
                          <SelectItem value="webp">WebP</SelectItem>
                          <SelectItem value="png">PNG (lossless)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                      {statusText || "Compressing…"}
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
              {images.length > 0 && (
                <Button
                  onClick={compress}
                  disabled={isProcessing}
                  className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl glow-effect"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Minimize2 className="w-5 h-5 mr-2" />
                  )}
                  {isProcessing
                    ? "Compressing…"
                    : results
                    ? "Re-compress with these settings"
                    : `Compress ${images.length} image${images.length === 1 ? "" : "s"}`}
                </Button>
              )}

              {/* Results summary */}
              {results && results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/40 bg-primary/10">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {results.length} image{results.length === 1 ? "" : "s"} ready
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(
                          results.reduce((a, b) => a + b.originalSize, 0)
                        )}{" "}
                        → {formatBytes(totalCompressed)} · saved {overallSaved}%
                      </p>
                    </div>
                  </div>
                  {results.length > 1 && (
                    <Button
                      onClick={downloadAllZip}
                      className="w-full h-12 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                    >
                      <Package className="w-5 h-5 mr-2" />
                      Download all as ZIP
                    </Button>
                  )}
                  {results.length === 1 && (
                    <Button
                      onClick={() =>
                        downloadBlob(results[0].blob, results[0].outputName)
                      }
                      className="w-full h-12 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download {results[0].outputName}
                    </Button>
                  )}
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
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">JPG · PNG · WebP</h3>
              <p className="text-sm text-muted-foreground">
                Convert between formats or keep the original.
              </p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
                <Minimize2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Precise control</h3>
              <p className="text-sm text-muted-foreground">
                Tune quality and cap dimensions to hit your size target.
              </p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">100% client-side</h3>
              <p className="text-sm text-muted-foreground">
                Your images never leave your device. Nothing is uploaded.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default ImageCompressor;
