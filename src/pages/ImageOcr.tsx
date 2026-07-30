import { useCallback, useState } from "react";
import { Copy, Download, Loader2, ScanText, Trash2 } from "lucide-react";
import { ToolPage } from "@/components/ToolPage";
import { ImageDropZone } from "@/components/ImageDropZone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { downloadBlob, formatBytes, replaceExtension } from "@/lib/imageUtils";

const LANGUAGES = [
  { code: "eng", label: "English" },
  { code: "spa", label: "Spanish" },
  { code: "fra", label: "French" },
  { code: "deu", label: "German" },
  { code: "por", label: "Portuguese" },
  { code: "ita", label: "Italian" },
  { code: "nld", label: "Dutch" },
  { code: "rus", label: "Russian" },
  { code: "hin", label: "Hindi" },
  { code: "ara", label: "Arabic" },
  { code: "chi_sim", label: "Chinese (Simplified)" },
  { code: "jpn", label: "Japanese" },
  { code: "kor", label: "Korean" },
];

const ImageOcr = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lang, setLang] = useState("eng");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);

  const onFiles = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setText("");
    setConfidence(null);
    setProgress(0);
  }, []);

  const run = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setProgress(1);
    setStatus("Loading the recognition engine…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(lang, 1, {
        logger: (m: { status: string; progress: number }) => {
          setStatus(m.status.replace(/^\w/, (c) => c.toUpperCase()));
          setProgress(Math.max(1, Math.round(m.progress * 100)));
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setText(data.text.trim());
      setConfidence(Math.round(data.confidence));
      setProgress(100);
      setStatus("Done");
      toast({
        title: "Text extracted",
        description: `${data.text.trim().length} characters · ${Math.round(data.confidence)}% confidence.`,
      });
    } catch (err) {
      toast({
        title: "OCR failed",
        description: err instanceof Error ? err.message : "Could not read this image.",
        variant: "destructive",
      });
      setStatus("Failed");
    } finally {
      setBusy(false);
    }
  }, [file, lang, toast]);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "The extracted text is on your clipboard." });
  };

  return (
    <ToolPage
      slug="image-to-text"
      title="Image to Text (OCR) — Extract Text from Photos Free"
      metaDescription="Extract text from JPG, PNG and WebP images with browser-based OCR in 13 languages. Copy the result or download it as a .txt file. No upload, no signup."
      intro="Optical character recognition that runs entirely on your device. Drop a screenshot, scan or photo, pick the language, and get editable text you can copy or download."
      howTo={[
        "Drop a JPG, PNG or WebP image containing text, or paste one from the clipboard.",
        "Choose the language that matches the text in the image.",
        "Press Extract text and watch the recognition progress.",
        "Copy the result or download it as a .txt file.",
      ]}
      features={[
        "13 recognition languages including Chinese, Japanese, Arabic and Hindi",
        "Drag & drop, browse and clipboard paste input",
        "Live progress with the current recognition stage",
        "Confidence score for the recognised text",
        "Editable output box before copying",
        "One-click copy and .txt download",
      ]}
      benefits={[
        "Private by design — images and text never leave your browser.",
        "Turn screenshots, receipts and scans into searchable, editable text.",
        "Works on mobile, and offline once the language data is cached.",
      ]}
      faqs={[
        { q: "How accurate is the OCR?", a: "Clean, high-contrast text at 300 DPI or better usually recognises above 95%. Blurry photos, handwriting and stylised fonts are much harder." },
        { q: "Why does the first run take longer?", a: "The engine downloads the language training data once, then caches it for future scans in the same browser." },
        { q: "Can it read handwriting?", a: "The engine is trained on printed text. Neat block capitals sometimes work, but cursive handwriting generally does not." },
        { q: "Which languages are supported?", a: "English, Spanish, French, German, Portuguese, Italian, Dutch, Russian, Hindi, Arabic, Simplified Chinese, Japanese and Korean." },
        { q: "Can I extract text from a PDF?", a: "Convert the page to an image first, or use the PDF editor to work with the text layer directly." },
      ]}
    >
      <div className="space-y-4">
        <ImageDropZone onFiles={onFiles} hint="JPG, PNG or WebP screenshots, scans and photos" />

        {file && (
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label htmlFor="lang" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Language
                </label>
                <Select value={lang} onValueChange={setLang}>
                  <SelectTrigger id="lang" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={run} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanText className="w-4 h-4 mr-2" />}
                {busy ? "Reading…" : "Extract text"}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                  setText("");
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Clear
              </Button>
            </div>

            {busy && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{status}</span>
                  <span className="tabular-nums">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              {previewUrl && (
                <div>
                  <img
                    src={previewUrl}
                    alt="Image being processed for text extraction"
                    loading="lazy"
                    className="w-full h-auto rounded-lg border border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {file.name} · {formatBytes(file.size)}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Extracted text will appear here…"
                  aria-label="Extracted text"
                  className="min-h-[16rem] font-mono text-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={copy} disabled={!text}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy text
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!text}
                    onClick={() =>
                      downloadBlob(new Blob([text], { type: "text/plain" }), replaceExtension(file.name, "txt"))
                    }
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Download .txt
                  </Button>
                  {confidence !== null && (
                    <span className="text-xs text-muted-foreground">Confidence {confidence}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
};

export default ImageOcr;
