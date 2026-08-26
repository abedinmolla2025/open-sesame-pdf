import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  CreditCard,
  Download,
  FileImage,
  FileText,
  FlipHorizontal2,
  ImagePlus,
  LockKeyhole,
  Printer,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument, rgb } from "pdf-lib";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { PremiumIconFrame } from "@/components/PremiumIcon";
import { usePageHead } from "@/hooks/usePageHead";
import { useToast } from "@/hooks/use-toast";

const CARD_WIDTH = 1011;
const CARD_HEIGHT = 638;
const CARD_RATIO = `${CARD_WIDTH}/${CARD_HEIGHT}`;

type CardKind = "pan" | "aadhaar" | "ration" | "ayushman" | "custom";
type Face = "front" | "back";

const cardTemplates: Array<{
  id: CardKind;
  label: string;
  description: string;
  tone: "gold" | "blue" | "mint" | "violet" | "slate";
}> = [
  { id: "pan", label: "PAN Card", description: "Income Tax / PAN card", tone: "gold" },
  { id: "aadhaar", label: "Aadhaar", description: "UIDAI identity card", tone: "blue" },
  { id: "ration", label: "Ration Card", description: "Family ration card", tone: "mint" },
  { id: "ayushman", label: "Ayushman Card", description: "Health benefit card", tone: "violet" },
  { id: "custom", label: "Custom ID", description: "Any PVC identity card", tone: "slate" },
];

const cardNames: Record<CardKind, string> = {
  pan: "pan-card",
  aadhaar: "aadhaar-card",
  ration: "ration-card",
  ayushman: "ayushman-card",
  custom: "custom-id-card",
};

interface FaceState {
  file: File | null;
  src: string | null;
}

const initialFace: FaceState = { file: null, src: null };

const readPdfFirstPage = async (file: File): Promise<string> => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the PDF preview.");
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/png");
};

const readFace = async (file: File): Promise<string> => {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return readPdfFirstPage(file);
  }
  return URL.createObjectURL(file);
};

const canvasFromImage = (src: string, fit: "contain" | "cover" = "contain"): Promise<HTMLCanvasElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Could not prepare the export canvas."));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
      const scale = fit === "cover"
        ? Math.max(CARD_WIDTH / image.width, CARD_HEIGHT / image.height)
        : Math.min(CARD_WIDTH / image.width, CARD_HEIGHT / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (CARD_WIDTH - width) / 2, (CARD_HEIGHT - height) / 2, width, height);
      resolve(canvas);
    };
    image.onerror = () => reject(new Error("The selected file could not be rendered."));
    image.src = src;
  });

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const CardPrintStudio = () => {
  const { toast } = useToast();
  const [cardKind, setCardKind] = useState<CardKind>("pan");
  const [activeFace, setActiveFace] = useState<Face>("front");
  const [front, setFront] = useState<FaceState>(initialFace);
  const [back, setBack] = useState<FaceState>(initialFace);
  const [isDragging, setIsDragging] = useState<Face | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const frontInput = useRef<HTMLInputElement>(null);
  const backInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);

  usePageHead({
    title: "PVC Card Maker — PAN, Aadhaar & ID Card Print Studio",
    description: "Create print-ready PVC card layouts from PAN, Aadhaar, ration, Ayushman and custom ID card images in your browser.",
    canonical: "https://free-my-pdf.lovable.app/card-print-studio",
    type: "website",
  });

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const selectedTemplate = useMemo(
    () => cardTemplates.find((template) => template.id === cardKind) ?? cardTemplates[0],
    [cardKind]
  );

  const setFaceFile = useCallback(async (face: Face, file: File) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Unsupported file", description: "Choose a JPG, PNG, WebP image or a PDF file.", variant: "destructive" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File is too large", description: "Please choose a file up to 25 MB.", variant: "destructive" });
      return;
    }
    try {
      const src = await readFace(file);
      if (src.startsWith("blob:")) objectUrls.current.push(src);
      const next = { file, src };
      if (face === "front") setFront(next);
      else setBack(next);
      setActiveFace(face);
    } catch (error) {
      toast({ title: "Preview failed", description: error instanceof Error ? error.message : "Could not render this file.", variant: "destructive" });
    }
  }, [toast]);

  const clearFace = (face: Face) => {
    if (face === "front") setFront(initialFace);
    else setBack(initialFace);
  };

  const handleFileInput = (face: Face, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void setFaceFile(face, file);
    event.target.value = "";
  };

  const handleDrop = (face: Face, event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(null);
    const file = event.dataTransfer.files?.[0];
    if (file) void setFaceFile(face, file);
  };

  const exportFacePng = async (face: Face) => {
    const state = face === "front" ? front : back;
    if (!state.src) return;
    setIsProcessing(true);
    try {
      const canvas = await canvasFromImage(state.src);
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${cardNames[cardKind]}-${face}.png`);
        setIsProcessing(false);
      }, "image/png");
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "Export failed", description: error instanceof Error ? error.message : "Could not export the card.", variant: "destructive" });
    }
  };

  const exportPdf = async () => {
    if (!front.src && !back.src) {
      toast({ title: "Upload at least one side", description: "Add a front or back card file before exporting.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const pdf = await PDFDocument.create();
      const pageWidth = 242.65;
      const pageHeight = 153.07;
      for (const [face, src] of [["front", front.src], ["back", back.src]] as const) {
        if (!src) continue;
        const canvas = await canvasFromImage(src);
        const png = await pdf.embedPng(canvas.toDataURL("image/png"));
        const page = pdf.addPage([pageWidth, pageHeight]);
        page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(1, 1, 1) });
        page.drawImage(png, { x: 0, y: 0, width: pageWidth, height: pageHeight });
        page.drawText(`${selectedTemplate.label} • ${face === "front" ? "Front" : "Back"}`, { x: 8, y: 4, size: 4, color: rgb(0.45, 0.45, 0.45), opacity: 0.7 });
      }
      const bytes = await pdf.save();
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `${cardNames[cardKind]}-pvc-print.pdf`);
    } catch (error) {
      toast({ title: "PDF export failed", description: error instanceof Error ? error.message : "Could not create the print PDF.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderUpload = (face: Face, state: FaceState, inputRef: React.RefObject<HTMLInputElement | null>) => {
    const isActive = isDragging === face;
    return state.src ? (
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-3 shadow-sm">
        <img src={state.src} alt={`${face} card preview`} className="aspect-[1011/638] w-full rounded-xl object-contain bg-muted/30" />
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{state.file?.name}</p>
            <p className="text-xs text-muted-foreground">Ready for PVC layout</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => clearFace(face)} aria-label={`Remove ${face} file`}>
            <X className="mr-1.5 h-4 w-4" /> Remove
          </Button>
        </div>
      </div>
    ) : (
      <motion.label
        whileHover={{ y: -2 }}
        onClick={() => setActiveFace(face)}
        onDragEnter={(event) => { event.preventDefault(); setIsDragging(face); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(null)}
        onDrop={(event) => handleDrop(face, event)}
        className={`premium-dropzone relative block cursor-pointer p-6 sm:p-8 ${isActive ? "scale-[1.015]" : ""}`}
        data-dragging={isActive}
      >
        <input ref={inputRef} type="file" accept="image/*,.pdf,application/pdf" className="sr-only" onChange={(event) => handleFileInput(face, event)} />
        <div className="relative z-10 flex flex-col items-center text-center">
          <PremiumIconFrame tone={face === "front" ? "blue" : "violet"} size="lg" aria-hidden="true">
            {face === "front" ? <ImagePlus /> : <FlipHorizontal2 />}
          </PremiumIconFrame>
          <p className="mt-4 text-base font-semibold text-foreground">Upload {face} side</p>
          <p className="mt-1 text-sm text-muted-foreground">Drag & drop or click to browse</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="rounded-full border border-border bg-background/70 px-2.5 py-1">JPG / PNG / WebP</span>
            <span className="rounded-full border border-border bg-background/70 px-2.5 py-1">PDF supported</span>
            <span className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-primary">Private in browser</span>
          </div>
        </div>
      </motion.label>
    );
  };

  return (
    <Layout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-500/5 blur-3xl" />
        </div>
        <div className="container relative z-10 mx-auto px-4 py-10 md:py-16">
          <Breadcrumbs items={[{ name: "Home", to: "/" }, { name: "PVC Card Maker" }]} className="mb-7" />
          <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-10 max-w-4xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <CreditCard className="h-4 w-4" /> PVC Card Print Studio
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl">Make your <span className="gradient-text">PVC card</span> print-ready</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">Upload the front and back of your card, preview the physical PVC ratio, and export a clean print-ready PDF without sending your documents anywhere.</p>
          </motion.header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="glass-card min-w-0 p-5 sm:p-7" aria-labelledby="card-upload-title">
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Step 1</p>
                  <h2 id="card-upload-title" className="mt-1 text-2xl font-bold">Choose card type & upload sides</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary/80 px-3 py-2 text-xs font-medium text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5 text-primary" /> Files stay on this device</div>
              </div>

              <div className="mb-7 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {cardTemplates.map((template) => (
                  <button key={template.id} type="button" onClick={() => setCardKind(template.id)} className={`group rounded-2xl border p-3 text-left transition-all ${cardKind === template.id ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-card/40 hover:border-primary/35 hover:bg-card"}`} aria-pressed={cardKind === template.id}>
                    <PremiumIconFrame tone={template.tone} size="sm" aria-hidden="true"><CreditCard /></PremiumIconFrame>
                    <span className="mt-2 block text-xs font-bold leading-tight">{template.label}</span>
                    <span className="mt-1 hidden text-[10px] leading-tight text-muted-foreground sm:block">{template.description}</span>
                    {cardKind === template.id && <Check className="mt-2 h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {renderUpload("front", front, frontInput)}
                {renderUpload("back", back, backInput)}
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/50 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Standard PVC ratio: 85.60 × 53.98 mm</span>
                <span>Up to 25 MB per side</span>
              </div>
            </section>

            <aside className="glass-card min-w-0 p-5 sm:p-7" aria-labelledby="preview-title">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Step 2</p>
                  <h2 id="preview-title" className="mt-1 text-2xl font-bold">PVC preview</h2>
                </div>
                <button type="button" onClick={() => setActiveFace(activeFace === "front" ? "back" : "front")} className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-muted" aria-label="Flip preview side"><FlipHorizontal2 className="h-4 w-4" /></button>
              </div>

              <div className="rounded-[1.6rem] border border-border/70 bg-gradient-to-br from-muted/70 via-background to-primary/[0.06] p-3 shadow-inner sm:p-5">
                <div className="relative aspect-[1011/638] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_20px_50px_rgba(25,35,75,0.16)]">
                  {((activeFace === "front" ? front : back).src) ? (
                    <img src={(activeFace === "front" ? front : back).src ?? undefined} alt={`${selectedTemplate.label} ${activeFace} preview`} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-white to-violet-500/10 p-6 text-center">
                      <PremiumIconFrame tone={selectedTemplate.tone} size="lg" aria-hidden="true"><CreditCard /></PremiumIconFrame>
                      <p className="mt-4 text-sm font-bold text-foreground">{selectedTemplate.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Upload a {activeFace} side to preview</p>
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">{activeFace}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setActiveFace("front")} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${activeFace === "front" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Front side</button>
                <button type="button" onClick={() => setActiveFace("back")} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${activeFace === "back" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Back side</button>
              </div>

              <div className="mt-6 space-y-2">
                <Button type="button" onClick={exportPdf} disabled={isProcessing || (!front.src && !back.src)} className="h-11 w-full rounded-xl bg-primary font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90"><Printer className="mr-2 h-4 w-4" /> {isProcessing ? "Preparing print PDF…" : "Export print-ready PDF"}</Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => void exportFacePng("front")} disabled={isProcessing || !front.src} className="h-10 rounded-xl text-xs"><Download className="mr-1.5 h-3.5 w-3.5" /> Front PNG</Button>
                  <Button type="button" variant="outline" onClick={() => void exportFacePng("back")} disabled={isProcessing || !back.src} className="h-10 rounded-xl text-xs"><Download className="mr-1.5 h-3.5 w-3.5" /> Back PNG</Button>
                </div>
              </div>
            </aside>
          </div>

          <section className="mx-auto mt-8 grid max-w-5xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-card/65 p-4"><FileText className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-bold">PDF or image input</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Use downloaded e-card PDFs or clear front/back images.</p></div>
            <div className="rounded-2xl border border-border/70 bg-card/65 p-4"><Printer className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-bold">Physical PVC ratio</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Exports the standard bank-card proportion for printing.</p></div>
            <div className="rounded-2xl border border-border/70 bg-card/65 p-4"><RefreshCw className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-bold">Front + back workflow</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Generate separate front/back PNGs or one print PDF.</p></div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default CardPrintStudio;
