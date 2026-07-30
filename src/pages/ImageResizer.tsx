import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Link2, Link2Off } from "lucide-react";
import { ToolPage } from "@/components/ToolPage";
import { ImageDropZone } from "@/components/ImageDropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  canvasToBlob,
  downloadBlob,
  formatBytes,
  loadImageElement,
  replaceExtension,
} from "@/lib/imageUtils";

interface Preset {
  group: string;
  label: string;
  w: number;
  h: number;
}

const PRESETS: Preset[] = [
  { group: "Instagram", label: "Square post", w: 1080, h: 1080 },
  { group: "Instagram", label: "Portrait post", w: 1080, h: 1350 },
  { group: "Instagram", label: "Story / Reel", w: 1080, h: 1920 },
  { group: "Facebook", label: "Feed post", w: 1200, h: 630 },
  { group: "Facebook", label: "Cover", w: 851, h: 315 },
  { group: "WhatsApp", label: "Status", w: 1080, h: 1920 },
  { group: "WhatsApp", label: "Profile photo", w: 640, h: 640 },
  { group: "YouTube", label: "Thumbnail", w: 1280, h: 720 },
  { group: "YouTube", label: "Channel art", w: 2560, h: 1440 },
  { group: "Twitter/X", label: "Post image", w: 1600, h: 900 },
  { group: "Twitter/X", label: "Header", w: 1500, h: 500 },
];

const ImageResizer = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [lock, setLock] = useState(true);
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [busy, setBusy] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const ratio = natural ? natural.w / natural.h : 1;

  const onFiles = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    const img = await loadImageElement(f);
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    setWidth(img.naturalWidth);
    setHeight(img.naturalHeight);
    setActivePreset(null);
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const changeWidth = (value: number) => {
    const w = Math.max(1, Math.min(10000, value || 1));
    setWidth(w);
    if (lock && natural) setHeight(Math.max(1, Math.round(w / ratio)));
    setActivePreset(null);
  };

  const changeHeight = (value: number) => {
    const h = Math.max(1, Math.min(10000, value || 1));
    setHeight(h);
    if (lock && natural) setWidth(Math.max(1, Math.round(h * ratio)));
    setActivePreset(null);
  };

  const applyPreset = (p: Preset) => {
    setLock(false);
    setWidth(p.w);
    setHeight(p.h);
    setActivePreset(`${p.group}-${p.label}`);
  };

  const resize = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    try {
      const img = await loadImageElement(file);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const srcRatio = img.naturalWidth / img.naturalHeight;
      const dstRatio = width / height;
      if (fit === "cover") {
        let sw = img.naturalWidth;
        let sh = img.naturalHeight;
        if (srcRatio > dstRatio) sw = img.naturalHeight * dstRatio;
        else sh = img.naturalWidth / dstRatio;
        ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, width, height);
      } else {
        let dw = width;
        let dh = height;
        if (srcRatio > dstRatio) dh = width / srcRatio;
        else dw = height * srcRatio;
        ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
      }

      const type = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await canvasToBlob(canvas, type, 0.92);
      downloadBlob(blob, replaceExtension(file.name, `${width}x${height}.${type === "image/png" ? "png" : "jpg"}`));
      toast({ title: "Resized", description: `${width} × ${height} px · ${formatBytes(blob.size)}` });
    } catch (err) {
      toast({
        title: "Resize failed",
        description: err instanceof Error ? err.message : "Please try another image.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [file, width, height, fit, toast]);

  return (
    <ToolPage
      slug="image-resize"
      title="Resize Image Online — Social Presets & Custom Pixel Sizes"
      metaDescription="Resize photos to exact pixel dimensions or one-click Instagram, Facebook, WhatsApp, YouTube and X presets. Aspect-ratio lock, crop or fit, instant download."
      intro="Set an exact width and height, keep the aspect ratio locked, or pick a platform preset. Resizing happens on a local canvas, so large images stay sharp and stay private."
      howTo={[
        "Drop an image or paste one from your clipboard.",
        "Enter a custom width and height, or choose a social media preset.",
        "Keep the aspect-ratio lock on to avoid distortion, or turn it off for exact preset sizes.",
        "Choose crop-to-fill or fit-inside, then download the resized image.",
      ]}
      features={[
        "Custom width and height in pixels",
        "Aspect-ratio lock that updates the other dimension automatically",
        "Presets for Instagram, Facebook, WhatsApp, YouTube and Twitter/X",
        "Crop-to-fill or fit-inside scaling modes",
        "High-quality smoothing for downscaled photos",
        "PNG inputs keep transparency on export",
      ]}
      benefits={[
        "Hit each platform's recommended size without guessing the numbers.",
        "No uploads means large photos resize instantly, even on slow connections.",
        "Free and unlimited — resize as many images as you need.",
      ]}
      faqs={[
        { q: "Will resizing reduce the quality?", a: "Downscaling uses high-quality smoothing and looks clean. Upscaling beyond the original pixel count is better handled by the AI Image Upscaler." },
        { q: "What is the difference between crop and fit?", a: "Crop-to-fill covers the whole target size and trims the overflow. Fit-inside scales the entire image to fit, leaving transparent or empty edges." },
        { q: "Does it keep transparency?", a: "Yes — PNG inputs are exported as PNG so alpha channels survive. JPG inputs export as JPG at 92% quality." },
        { q: "Is there a file size limit?", a: "Files up to 30 MB are accepted. The practical limit is your device's memory, since everything runs locally." },
        { q: "Can I resize several images at once?", a: "This tool works one image at a time for precise control. For batches, use the image compressor, which also has a max-dimension setting." },
      ]}
    >
      <div className="space-y-4">
        <ImageDropZone onFiles={onFiles} hint="JPG, PNG, WebP or AVIF · drag, browse or paste" />

        {file && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 space-y-4">
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="w">Width (px)</Label>
                  <Input id="w" type="number" min={1} value={width} onChange={(e) => changeWidth(Number(e.target.value))} />
                </div>
                <Button
                  variant={lock ? "default" : "outline"}
                  size="icon"
                  aria-label={lock ? "Unlock aspect ratio" : "Lock aspect ratio"}
                  aria-pressed={lock}
                  onClick={() => setLock((v) => !v)}
                >
                  {lock ? <Link2 className="w-4 h-4" /> : <Link2Off className="w-4 h-4" />}
                </Button>
                <div className="space-y-1">
                  <Label htmlFor="h">Height (px)</Label>
                  <Input id="h" type="number" min={1} value={height} onChange={(e) => changeHeight(Number(e.target.value))} />
                </div>
              </div>

              <div className="flex gap-2">
                {(["cover", "contain"] as const).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={fit === m ? "default" : "outline"}
                    onClick={() => setFit(m)}
                  >
                    {m === "cover" ? "Crop to fill" : "Fit inside"}
                  </Button>
                ))}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Presets</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => {
                    const id = `${p.group}-${p.label}`;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => applyPreset(p)}
                        aria-pressed={activePreset === id}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs border transition-colors",
                          activePreset === id
                            ? "bg-primary/15 text-primary border-primary/40"
                            : "border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {p.group} · {p.label}{" "}
                        <span className="tabular-nums opacity-70">
                          {p.w}×{p.h}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={resize} disabled={busy} className="w-full sm:w-auto">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Resize & download
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Preview of the image being resized"
                  loading="lazy"
                  className="w-full h-auto rounded-lg"
                />
              )}
              <p className="text-xs text-muted-foreground mt-3">
                {file.name} · {formatBytes(file.size)}
                {natural && ` · original ${natural.w}×${natural.h} px`}
              </p>
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
};

export default ImageResizer;
