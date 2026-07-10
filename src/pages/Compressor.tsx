import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Minimize2, Shield, Zap, FileArchive, Download } from "lucide-react";
import { Layout } from "@/components/Layout";
import { DropZone } from "@/components/DropZone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { usePageHead } from "@/hooks/usePageHead";

type CompressLevel = "low" | "medium" | "high" | "custom";

interface CompressResult {
  originalSize: number;
  compressedSize: number;
  blob: Blob;
  filename: string;
}

const LEVELS: Record<Exclude<CompressLevel, "custom">, { scale: number; quality: number; label: string }> = {
  low: { scale: 1.5, quality: 0.85, label: "Low (best quality)" },
  medium: { scale: 1.25, quality: 0.7, label: "Medium (recommended)" },
  high: { scale: 1.0, quality: 0.5, label: "High (smallest file)" },
};

const Compressor = () => {
  usePageHead({
    title: "PDF Compressor — Reduce PDF File Size Online | Free My PDF",
    description: "Compress and reduce PDF file size directly in your browser. Fast, private, and 100% client-side — no uploads.",
    canonical: "https://free-my-pdf.lovable.app/compress",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Free My PDF Compressor",
      applicationCategory: "Utility",
      operatingSystem: "Any",
      url: "https://free-my-pdf.lovable.app/compress",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [level, setLevel] = useState<CompressLevel>("medium");
  const [customQuality, setCustomQuality] = useState(70);
  const [customScale, setCustomScale] = useState(125);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CompressResult | null>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setResult(null);
    setProgress(0);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    setProgress(0);
  }, []);

  const compress = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setResult(null);
    setProgress(0);

    try {
      const settings =
        level === "custom"
          ? { scale: customScale / 100, quality: customQuality / 100 }
          : { scale: LEVELS[level].scale, quality: LEVELS[level].quality };

      const originalBuffer = await selectedFile.arrayBuffer();

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

      const { PDFDocument } = await import("pdf-lib");

      const loadingTask = pdfjsLib.getDocument({ data: originalBuffer.slice(0) });
      const srcPdf = await loadingTask.promise;
      const totalPages = srcPdf.numPages;

      const outPdf = await PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        const page = await srcPdf.getPage(i);
        const viewport = page.getViewport({ scale: settings.scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");

        // white background so JPEG (no alpha) looks correct
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]).promise;

        const jpegBlob: Blob = await new Promise((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
            "image/jpeg",
            settings.quality
          )
        );
        const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
        const embedded = await outPdf.embedJpg(jpegBytes);

        // Preserve original page size in PDF points
        const origViewport = page.getViewport({ scale: 1 });
        const outPage = outPdf.addPage([origViewport.width, origViewport.height]);
        outPage.drawImage(embedded, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height,
        });

        setProgress(Math.round((i / totalPages) * 100));
      }

      const outBytes = await outPdf.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(outBytes)], { type: "application/pdf" });

      const filename = selectedFile.name.replace(/\.pdf$/i, "") + "_compressed.pdf";

      setResult({
        originalSize: selectedFile.size,
        compressedSize: blob.size,
        blob,
        filename,
      });

      toast({
        title: "Compression complete",
        description: `Reduced ${formatBytes(selectedFile.size)} → ${formatBytes(blob.size)}`,
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
    }
  }, [selectedFile, level, customQuality, customScale, toast]);

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

  const savings = result
    ? Math.max(0, Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100))
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
              <FileArchive className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Compress & Optimize</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-display mb-6">
              Compress Your{" "}
              <span className="gradient-text">PDF Files</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Reduce PDF file size instantly. Everything runs in your browser—your files never leave your device.
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

              {selectedFile && !result && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Compression level</Label>
                    <RadioGroup
                      value={level}
                      onValueChange={(v) => setLevel(v as CompressLevel)}
                      className="space-y-2"
                    >
                      {(Object.keys(LEVELS) as Array<keyof typeof LEVELS>).map((key) => (
                        <label
                          key={key}
                          htmlFor={`level-${key}`}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer"
                        >
                          <RadioGroupItem id={`level-${key}`} value={key} />
                          <span className="text-sm">{LEVELS[key].label}</span>
                        </label>
                      ))}
                      <label
                        htmlFor="level-custom"
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 cursor-pointer"
                      >
                        <RadioGroupItem id="level-custom" value="custom" />
                        <span className="text-sm">Custom</span>
                      </label>
                    </RadioGroup>
                  </div>

                  {level === "custom" && (
                    <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <Label>Image quality</Label>
                          <span className="text-muted-foreground">{customQuality}%</span>
                        </div>
                        <Slider
                          value={[customQuality]}
                          min={20}
                          max={100}
                          step={5}
                          onValueChange={(v) => setCustomQuality(v[0])}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <Label>Resolution</Label>
                          <span className="text-muted-foreground">{customScale}%</span>
                        </div>
                        <Slider
                          value={[customScale]}
                          min={50}
                          max={200}
                          step={5}
                          onValueChange={(v) => setCustomScale(v[0])}
                        />
                      </div>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Compressing…</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={compress}
                    disabled={isProcessing}
                    className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl glow-effect"
                  >
                    <Minimize2 className="w-5 h-5 mr-2" />
                    {isProcessing ? "Compressing…" : "Compress PDF"}
                  </Button>
                </motion.div>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="p-5 rounded-xl border border-primary/30 bg-primary/5">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Original</p>
                        <p className="font-semibold">{formatBytes(result.originalSize)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Compressed</p>
                        <p className="font-semibold text-primary">{formatBytes(result.compressedSize)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Saved</p>
                        <p className="font-semibold text-primary">{savings}%</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={download}
                    className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl glow-effect"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download compressed PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResult(null);
                      setProgress(0);
                    }}
                    className="w-full"
                  >
                    Compress with different settings
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
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="100% Private"
              description="All compression happens locally in your browser. Nothing is uploaded."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Fast & Adjustable"
              description="Pick a preset or fine-tune quality and resolution to hit your target size."
            />
            <FeatureCard
              icon={<FileArchive className="w-6 h-6" />}
              title="Big Savings"
              description="Typical scanned or image-heavy PDFs shrink by 50–90% with negligible visual loss."
            />
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="text-center p-6">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
      {icon}
    </div>
    <h3 className="font-semibold text-lg mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);

export default Compressor;
