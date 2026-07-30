import { useCallback, useRef, useState } from "react";
import { Loader2, Download, Eraser, RotateCcw } from "lucide-react";
import { ToolPage } from "@/components/ToolPage";
import { ImageDropZone } from "@/components/ImageDropZone";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { canvasToBlob, downloadBlob, formatBytes, loadImageElement, replaceExtension } from "@/lib/imageUtils";

const BackgroundRemover = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [split, setSplit] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setOriginalUrl(null);
    setResultBlob(null);
    setResultUrl(null);
    setProgress(0);
    setStatus("");
  }, []);

  const onFiles = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setResultBlob(null);
    setResultUrl(null);
    setProgress(0);
    setStatus("");
    setOriginalUrl(URL.createObjectURL(f));
  }, []);

  const run = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setProgress(2);
    setStatus("Loading the AI model (first run downloads ~40 MB)…");
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(file, {
        output: { format: "image/png", quality: 1 },
        progress: (key, current, total) => {
          const pct = total ? Math.round((current / total) * 100) : 0;
          setProgress(Math.max(5, Math.min(99, pct)));
          setStatus(key.startsWith("fetch") ? "Downloading model files…" : "Removing background…");
        },
      });
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus("Done");
      toast({ title: "Background removed", description: `Transparent PNG · ${formatBytes(blob.size)}` });
    } catch (err) {
      toast({
        title: "Could not remove the background",
        description: err instanceof Error ? err.message : "Please try another image.",
        variant: "destructive",
      });
      setStatus("Failed");
    } finally {
      setBusy(false);
    }
  }, [file, toast]);

  const downloadHd = useCallback(async () => {
    if (!resultBlob || !file) return;
    // Re-encode at native resolution on a transparent canvas for a clean HD PNG.
    const img = await loadImageElement(resultBlob);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, "image/png");
    downloadBlob(blob, replaceExtension(file.name, "hd.png"));
  }, [resultBlob, file]);

  return (
    <ToolPage
      slug="background-remover"
      title="Free AI Background Remover — Transparent PNG in Seconds"
      metaDescription="Remove image backgrounds with AI in your browser. Drag and drop a photo, compare before and after, and download a transparent HD PNG. No upload, no signup."
      intro="Drop a photo and the AI isolates the subject on-device, so nothing is uploaded. Compare the cut-out against the original with the split slider, then export a transparent PNG at full resolution."
      howTo={[
        "Drag and drop a JPG, PNG or WebP photo, or paste one from your clipboard.",
        "Press Remove background and wait for the model to finish — the first run downloads the model once.",
        "Drag the split handle to compare the cut-out against the original.",
        "Download the transparent PNG, or the HD version re-encoded at native resolution.",
      ]}
      features={[
        "AI subject detection running fully client-side",
        "Drag & drop, click-to-browse and clipboard paste",
        "Interactive before / after split preview",
        "Transparent PNG and HD PNG downloads",
        "Live processing loader with progress percentage",
        "Works offline once the model is cached",
      ]}
      benefits={[
        "Your photos never leave your device — nothing is uploaded to a server.",
        "No watermarks, no account, no per-image credits.",
        "Perfect for product shots, profile pictures and design mockups.",
      ]}
      faqs={[
        { q: "Is the background remover really free?", a: "Yes. The model runs in your browser, so there are no server costs to pass on and no usage limits." },
        { q: "Why is the first run slow?", a: "The AI model (around 40 MB) downloads once and is then cached by the browser. Subsequent images process in a few seconds." },
        { q: "What image formats are supported?", a: "JPG, PNG and WebP inputs. Output is always a transparent PNG so the removed background stays transparent." },
        { q: "Does it work on hair and fine detail?", a: "The segmentation model handles hair and semi-transparent edges well on well-lit photos. Busy backgrounds with low contrast are the hardest case." },
        { q: "Can I use the results commercially?", a: "Yes. You own your images, and the tool never stores or transmits them." },
      ]}
    >
      <div className="space-y-4">
        <ImageDropZone onFiles={onFiles} hint="JPG, PNG or WebP · up to 30 MB · or paste from clipboard" />

        {file && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={run} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eraser className="w-4 h-4 mr-2" />}
              {busy ? "Processing…" : "Remove background"}
            </Button>
            {resultBlob && (
              <>
                <Button
                  variant="outline"
                  onClick={() => downloadBlob(resultBlob, replaceExtension(file.name, "png"))}
                >
                  <Download className="w-4 h-4 mr-2" /> Transparent PNG
                </Button>
                <Button variant="outline" onClick={downloadHd}>
                  <Download className="w-4 h-4 mr-2" /> HD PNG
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={reset} disabled={busy}>
              <RotateCcw className="w-4 h-4 mr-2" /> Clear
            </Button>
          </div>
        )}

        {busy && (
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{status}</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {originalUrl && (
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 space-y-3">
            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-lg bg-[conic-gradient(#0002_90deg,transparent_90deg_180deg,#0002_180deg_270deg,transparent_270deg)] bg-[length:20px_20px]"
            >
              <img src={originalUrl} alt="Original upload" className="block w-full h-auto" />
              {resultUrl && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 0 0 ${split}%)` }}
                >
                  <img
                    src={resultUrl}
                    alt="Background removed result"
                    className="block w-full h-auto"
                  />
                </div>
              )}
              {resultUrl && (
                <div
                  className="absolute inset-y-0 w-px bg-primary"
                  style={{ left: `${split}%` }}
                  aria-hidden
                />
              )}
            </div>
            {resultUrl && (
              <div className="space-y-1">
                <label htmlFor="split" className="text-xs text-muted-foreground">
                  Before / after split
                </label>
                <Slider
                  id="split"
                  value={[split]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([v]) => setSplit(v)}
                  aria-label="Before and after comparison"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPage>
  );
};

export default BackgroundRemover;
