import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Download,
  X,
  Upload,
  Loader2,
  CheckCircle2,
  Wand2,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePageHead } from "@/hooks/usePageHead";

type OutputFormat = "png" | "jpeg" | "webp";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_PIXELS = 40_000_000;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const decodeImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode this image."));
    };
    img.src = url;
  });

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/** Unsharp-mask style detail enhancement applied to an upscaled canvas. */
const sharpen = (canvas: HTMLCanvasElement, amount: number) => {
  if (amount <= 0) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const s = src.data;
  const d = out.data;
  // 3x3 laplacian-based sharpen kernel weighted by amount
  const a = amount;
  const kernel = [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.min(w - 1, Math.max(0, x + kx));
            const py = Math.min(h - 1, Math.max(0, y + ky));
            sum += s[(py * w + px) * 4 + c] * kernel[k];
            k++;
          }
        }
        d[i + c] = sum < 0 ? 0 : sum > 255 ? 255 : sum;
      }
      d[i + 3] = s[i + 3];
    }
  }
  ctx.putImageData(out, 0, 0);
};

/** Progressive (step-wise) high quality upscale — far cleaner than a single stretch. */
const upscaleImage = async (
  img: HTMLImageElement,
  scale: number,
  detail: number,
  onStep: (msg: string) => void
): Promise<HTMLCanvasElement> => {
  const targetW = Math.round(img.naturalWidth * scale);
  const targetH = Math.round(img.naturalHeight * scale);

  let current = makeCanvas(img.naturalWidth, img.naturalHeight);
  const ctx = current.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  let step = 0;
  while (current.width < targetW) {
    step++;
    const nextW = Math.min(targetW, current.width * 2);
    const nextH = Math.min(targetH, current.height * 2);
    onStep(`Upscaling pass ${step} — ${nextW} x ${nextH}px`);
    await new Promise((r) => setTimeout(r, 0));
    const next = makeCanvas(nextW, nextH);
    const nctx = next.getContext("2d")!;
    nctx.imageSmoothingEnabled = true;
    nctx.imageSmoothingQuality = "high";
    nctx.drawImage(current, 0, 0, nextW, nextH);
    current = next;
  }

  if (current.width !== targetW || current.height !== targetH) {
    const final = makeCanvas(targetW, targetH);
    const fctx = final.getContext("2d")!;
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = "high";
    fctx.drawImage(current, 0, 0, targetW, targetH);
    current = final;
  }

  if (detail > 0) {
    onStep("Enhancing edges and detail…");
    await new Promise((r) => setTimeout(r, 0));
    sharpen(current, detail);
  }

  return current;
};

const ImageUpscaler = () => {
  usePageHead({
    title: "AI Image Upscaler — Enlarge Photos 2x, 4x Free | Free My PDF",
    description:
      "Upscale and enhance images up to 8x in your browser. Progressive high-quality resampling with detail enhancement — private, free, nothing uploaded.",
    canonical: "https://free-my-pdf.lovable.app/image-upscale",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Free My PDF — AI Image Upscaler",
      applicationCategory: "Utility",
      operatingSystem: "Any",
      url: "https://free-my-pdf.lovable.app/image-upscale",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });

  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(2);
  const [detail, setDetail] = useState(35);
  const [format, setFormat] = useState<OutputFormat>("png");
  const [quality, setQuality] = useState(92);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<{
    url: string;
    blob: Blob;
    width: number;
    height: number;
    name: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (result) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAll = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result) URL.revokeObjectURL(result.url);
    setFile(null);
    setImage(null);
    setPreviewUrl(null);
    setResult(null);
    setStatusText("");
  }, [previewUrl, result]);

  const acceptFile = useCallback(
    async (f: File) => {
      const typeOk =
        ACCEPTED_TYPES.includes(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name);
      if (!typeOk) {
        toast({
          title: "Unsupported file",
          description: `"${f.name}" is not a JPG, PNG, or WebP image.`,
          variant: "destructive",
        });
        return;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast({
          title: "File too large",
          description: `"${f.name}" is larger than 25 MB.`,
          variant: "destructive",
        });
        return;
      }
      try {
        const img = await decodeImage(f);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        if (result) URL.revokeObjectURL(result.url);
        setResult(null);
        setStatusText("");
        setFile(f);
        setImage(img);
        setPreviewUrl(URL.createObjectURL(f));
      } catch {
        toast({
          title: "Could not read image",
          description: "This file appears to be corrupted.",
          variant: "destructive",
        });
      }
    },
    [previewUrl, result, toast]
  );

  // Paste from clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            void acceptFile(f);
            e.preventDefault();
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [acceptFile]);

  const outW = image ? Math.round(image.naturalWidth * scale) : 0;
  const outH = image ? Math.round(image.naturalHeight * scale) : 0;
  const tooBig = outW * outH > MAX_OUTPUT_PIXELS;

  const handleUpscale = useCallback(async () => {
    if (!image || !file) return;
    if (tooBig) {
      toast({
        title: "Output too large",
        description: "Pick a smaller scale — the result exceeds 40 megapixels.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const canvas = await upscaleImage(image, scale, detail / 100, setStatusText);
      setStatusText("Encoding image…");
      const mime =
        format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, format === "png" ? undefined : quality / 100)
      );
      if (!blob) throw new Error("Encoding failed");
      const ext = format === "jpeg" ? "jpg" : format;
      const base = file.name.replace(/\.[^.]+$/, "");
      setResult({
        url: URL.createObjectURL(blob),
        blob,
        width: canvas.width,
        height: canvas.height,
        name: `${base}-${scale}x.${ext}`,
      });
      setStatusText("");
    } catch (err) {
      toast({
        title: "Upscale failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
      setStatusText("");
    } finally {
      setBusy(false);
    }
  }, [image, file, scale, detail, format, quality, tooBig, toast]);

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.name;
    a.click();
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-12">
        <div className="text-center mb-10">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/15 items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-4xl font-bold mb-3">AI Image Upscaler</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Enlarge photos up to 8x with progressive high-quality resampling and edge
            enhancement. Everything runs in your browser — nothing is uploaded.
          </p>
        </div>

        {!file ? (
          <label
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.[0]) void acceptFile(e.dataTransfer.files[0]);
            }}
            className={`premium-dropzone relative cursor-pointer block w-full p-10 sm:p-12 ${isDragging ? "scale-[1.01]" : ""}`}
            data-dragging={isDragging}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                if (e.target.files?.[0]) void acceptFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium mb-1">
                  Drag &amp; drop, paste, or click to upload
                </p>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG, or WebP — up to 25 MB
                </p>
              </div>
            </div>
          </label>
        ) : (
          <div className="space-y-6">
            <div className="glass-card p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt={`Preview of ${file.name}`}
                    className="w-16 h-16 rounded-lg object-cover bg-secondary"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {image?.naturalWidth} x {image?.naturalHeight}px ·{" "}
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={clearAll}
                aria-label="Remove selected image"
                className="w-10 h-10 shrink-0 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="glass-card p-6 space-y-6">
              <div>
                <Label className="mb-3 block">Upscale factor</Label>
                <div className="flex flex-wrap gap-2">
                  {[2, 3, 4, 6, 8].map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant={scale === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => setScale(s)}
                    >
                      {s}x
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Output: {outW} x {outH}px
                  {tooBig && (
                    <span className="text-destructive"> — too large, pick a lower factor</span>
                  )}
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>Detail enhancement</Label>
                  <span className="text-sm text-muted-foreground">{detail}%</span>
                </div>
                <Slider
                  value={[detail]}
                  onValueChange={(v) => setDetail(v[0])}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block">Output format</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as OutputFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG (lossless)</SelectItem>
                      <SelectItem value="jpeg">JPEG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {format !== "png" && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label>Quality</Label>
                      <span className="text-sm text-muted-foreground">{quality}%</span>
                    </div>
                    <Slider
                      value={[quality]}
                      onValueChange={(v) => setQuality(v[0])}
                      min={40}
                      max={100}
                      step={1}
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpscale}
                disabled={busy || tooBig}
                className="w-full"
                size="lg"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Upscaling…
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" /> Upscale image
                  </>
                )}
              </Button>

              {busy && statusText && (
                <p className="text-sm text-muted-foreground text-center">{statusText}</p>
              )}
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="glass-card p-6 space-y-4"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Your upscaled image is ready</span>
                  </div>
                  <img
                    src={result.url}
                    alt={`Upscaled result of ${file.name}`}
                    className="w-full rounded-xl bg-secondary"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {result.width} x {result.height}px · {formatBytes(result.blob.size)}
                    </p>
                    <Button onClick={download}>
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ImageUpscaler;
