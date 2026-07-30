import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, FileArchive, Trash2 } from "lucide-react";
import JSZip from "jszip";
import { ToolPage } from "@/components/ToolPage";
import { ImageDropZone } from "@/components/ImageDropZone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  canvasToBlob,
  downloadBlob,
  formatBytes,
  loadImageElement,
  replaceExtension,
  supportsType,
} from "@/lib/imageUtils";

const TARGETS = [
  { type: "image/webp", ext: "webp", label: "WebP" },
  { type: "image/jpeg", ext: "jpg", label: "JPG" },
  { type: "image/png", ext: "png", label: "PNG" },
  { type: "image/avif", ext: "avif", label: "AVIF" },
] as const;

type TargetType = (typeof TARGETS)[number]["type"];

interface Converted {
  name: string;
  blob: Blob;
  url: string;
  originalSize: number;
}

const WebpConverter = () => {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [target, setTarget] = useState<TargetType>("image/webp");
  const [quality, setQuality] = useState(82);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Converted[]>([]);
  const [avifSupported, setAvifSupported] = useState(true);

  useEffect(() => {
    void supportsType("image/avif").then(setAvifSupported);
  }, []);

  useEffect(() => () => results.forEach((r) => URL.revokeObjectURL(r.url)), [results]);

  const onFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => [...prev, ...incoming]);
    setResults([]);
  }, []);

  const convert = useCallback(async () => {
    if (!files.length) return;
    setBusy(true);
    setProgress(0);
    const out: Converted[] = [];
    const ext = TARGETS.find((t) => t.type === target)!.ext;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const img = await loadImageElement(file);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        if (target === "image/jpeg") {
          // JPG has no alpha — flatten onto white so transparency doesn't turn black.
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        const blob = await canvasToBlob(canvas, target, target === "image/png" ? undefined : quality / 100);
        out.push({
          name: replaceExtension(file.name, ext),
          blob,
          url: URL.createObjectURL(blob),
          originalSize: file.size,
        });
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setResults(out);
      toast({ title: "Conversion complete", description: `${out.length} image(s) converted to ${ext.toUpperCase()}.` });
    } catch (err) {
      toast({
        title: "Conversion failed",
        description: err instanceof Error ? err.message : "One of the images could not be decoded.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [files, target, quality, toast]);

  const downloadZip = useCallback(async () => {
    const zip = new JSZip();
    results.forEach((r) => zip.file(r.name, r.blob));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "converted-images.zip");
  }, [results]);

  return (
    <ToolPage
      slug="webp-converter"
      title="WebP Converter — JPG, PNG, WebP & AVIF Batch Conversion"
      metaDescription="Convert JPG and PNG to WebP, WebP back to JPG or PNG, and export AVIF. Batch conversion with a quality slider and one ZIP download. Runs in your browser."
      intro="Convert between JPG, PNG, WebP and AVIF in bulk. Add as many images as you like, pick a target format and quality, then download them individually or as a single ZIP."
      howTo={[
        "Drop one or many images, or paste them from your clipboard.",
        "Pick the output format: WebP, JPG, PNG or AVIF.",
        "Adjust the quality slider (PNG is always lossless).",
        "Convert, then download each file or grab everything as a ZIP.",
      ]}
      features={[
        "JPG → WebP, PNG → WebP, WebP → JPG and WebP → PNG",
        "AVIF export where the browser supports it",
        "Batch conversion with a live progress bar",
        "Quality slider from 10% to 100%",
        "Transparency flattened to white for JPG output",
        "Single-click ZIP download of the whole batch",
      ]}
      benefits={[
        "WebP and AVIF typically cut page weight by 25–50% versus JPG.",
        "Batch work stays local, so hundreds of images cost nothing and leak nothing.",
        "Smaller images mean faster pages and better Core Web Vitals.",
      ]}
      faqs={[
        { q: "Which format should I choose?", a: "WebP is the safest modern default with near-universal support. AVIF compresses even better but encodes slower and is not supported by every browser." },
        { q: "Does WebP support transparency?", a: "Yes, WebP and AVIF both keep alpha channels. Converting to JPG flattens transparency onto a white background." },
        { q: "Why is AVIF greyed out?", a: "AVIF export depends on the browser's encoder. If your browser cannot encode AVIF, the option is disabled and WebP is the best alternative." },
        { q: "Is there a limit on how many images I can convert?", a: "No fixed limit. Very large batches are only bounded by your device's memory." },
        { q: "Do you keep my images?", a: "No. Conversion happens entirely on your device and nothing is uploaded." },
      ]}
    >
      <div className="space-y-4">
        <ImageDropZone onFiles={onFiles} multiple hint="Add JPG, PNG, WebP or AVIF images · drag, browse or paste" />

        {files.length > 0 && (
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground mr-1">Convert to</span>
              {TARGETS.map((t) => {
                const disabled = t.type === "image/avif" && !avifSupported;
                return (
                  <button
                    key={t.type}
                    type="button"
                    disabled={disabled}
                    aria-pressed={target === t.type}
                    onClick={() => setTarget(t.type)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      target === t.type
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "border-border text-muted-foreground hover:text-foreground",
                      disabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {t.label}
                    {disabled && " (unsupported)"}
                  </button>
                );
              })}
            </div>

            {target !== "image/png" && (
              <div className="space-y-1">
                <label htmlFor="q" className="text-sm text-muted-foreground">
                  Quality: <span className="tabular-nums text-foreground">{quality}%</span>
                </label>
                <Slider id="q" min={10} max={100} step={1} value={[quality]} onValueChange={([v]) => setQuality(v)} />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={convert} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Convert {files.length} image{files.length === 1 ? "" : "s"}
              </Button>
              {results.length > 1 && (
                <Button variant="outline" onClick={downloadZip}>
                  <FileArchive className="w-4 h-4 mr-2" /> Download ZIP
                </Button>
              )}
              <Button variant="ghost" onClick={() => { setFiles([]); setResults([]); }} disabled={busy}>
                <Trash2 className="w-4 h-4 mr-2" /> Clear all
              </Button>
            </div>

            {busy && <Progress value={progress} />}
          </div>
        )}

        {results.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => {
              const saved = Math.round(((r.originalSize - r.blob.size) / r.originalSize) * 100);
              return (
                <div key={r.name} className="rounded-xl border border-border bg-card/60 backdrop-blur p-3">
                  <img src={r.url} alt={r.name} loading="lazy" className="w-full h-32 object-contain rounded-lg bg-muted/30" />
                  <p className="text-sm font-medium truncate mt-2">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(r.originalSize)} → {formatBytes(r.blob.size)}{" "}
                    <span className={saved >= 0 ? "text-primary" : "text-destructive"}>
                      ({saved >= 0 ? "-" : "+"}
                      {Math.abs(saved)}%)
                    </span>
                  </p>
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => downloadBlob(r.blob, r.name)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ToolPage>
  );
};

export default WebpConverter;
