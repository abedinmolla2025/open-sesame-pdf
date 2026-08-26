import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  CreditCard,
  Download,
  FileText,
  FlipHorizontal2,
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
import { CardTypeIcon } from "@/components/CardTypeIcon";
import { usePageHead } from "@/hooks/usePageHead";
import { useToast } from "@/hooks/use-toast";

const CARD_WIDTH = 1011;
const CARD_HEIGHT = 638;

type CardKind = "pan" | "aadhaar" | "ration" | "ayushman" | "custom";
type Face = "front" | "back";
type FitMode = "contain" | "fill";

interface CardPage {
  pageNumber: number;
  src: string;
}

interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const cardTemplates: Array<{
  id: CardKind;
  label: string;
  description: string;
  tone: "gold" | "blue" | "mint" | "violet" | "slate";
  fitMode: FitMode;
}> = [
  { id: "pan", label: "PAN Card", description: "Income Tax / PAN card", tone: "gold", fitMode: "fill" },
  { id: "aadhaar", label: "Aadhaar", description: "UIDAI identity card", tone: "blue", fitMode: "contain" },
  { id: "ration", label: "Ration Card", description: "Family ration card", tone: "mint", fitMode: "contain" },
  { id: "ayushman", label: "Ayushman Card", description: "Health benefit card", tone: "violet", fitMode: "fill" },
  { id: "custom", label: "Custom ID", description: "Any PVC identity card", tone: "slate", fitMode: "contain" },
];

const cardNames: Record<CardKind, string> = {
  pan: "pan-card",
  aadhaar: "aadhaar-card",
  ration: "ration-card",
  ayushman: "ayushman-card",
  custom: "custom-id-card",
};

const cropCanvasToDataUrl = (source: HTMLCanvasElement, rect: CanvasRect): string => {
  const crop = document.createElement("canvas");
  crop.width = Math.max(1, Math.round(rect.width));
  crop.height = Math.max(1, Math.round(rect.height));
  const context = crop.getContext("2d");
  if (!context) throw new Error("Could not prepare the card crop.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, crop.width, crop.height);
  return crop.toDataURL("image/png");
};

const detectPanCardRects = (canvas: HTMLCanvasElement): CanvasRect[] | null => {
  const { width, height } = canvas;
  if (width < 500 || height < 700) return null;

  const context = canvas.getContext("2d");
  if (!context) return null;
  const pixels = context.getImageData(0, 0, width, height).data;
  const isCardArea = (offset: number) => {
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    return Math.min(red, green, blue) < 243 || blue - red > 8 || (blue - red > 4 && green - red > 4);
  };
  const isCardBlue = (offset: number) => {
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    return blue - red > 8 || (blue - red > 4 && green - red > 4);
  };

  const scanStart = Math.floor(height * 0.72);
  const rowCoverage = new Float32Array(height);
  for (let y = scanStart; y < Math.floor(height * 0.97); y += 1) {
    let cardPixels = 0;
    for (let x = 0; x < width; x += 1) if (isCardBlue((y * width + x) * 4)) cardPixels += 1;
    rowCoverage[y] = cardPixels / width;
  }

  let bandTop = -1;
  for (let y = scanStart; y < Math.floor(height * 0.94); y += 1) {
    const sustainedCoverage = rowCoverage.slice(y, y + 8).reduce((sum, value) => sum + value, 0) / 8;
    if (rowCoverage[y] > 0.45 && sustainedCoverage > 0.42) {
      bandTop = y;
      break;
    }
  }
  if (bandTop < 0) return null;

  // Some PAN templates have a blue page border above the cards. Skip that border
  // when it is substantially wider than the actual card band.
  const initialCoverage = rowCoverage[bandTop];
  const hasWideTopGuide = initialCoverage > 0.84 || bandTop < height * 0.75;
  if (initialCoverage > 0.84) {
    for (let y = bandTop + 8; y < Math.min(height, bandTop + 90); y += 1) {
      if (rowCoverage[y] < initialCoverage - 0.15) {
        bandTop = y;
        break;
      }
    }
  }

  let bandBottom = Math.floor(height * 0.97);
  for (let y = bandTop + 24; y < Math.floor(height * 0.99) - 8; y += 1) {
    const sustainedCoverage = rowCoverage.slice(y, y + 8).reduce((sum, value) => sum + value, 0) / 8;
    if (sustainedCoverage < 0.2) {
      bandBottom = y;
      break;
    }
  }

  const separatorTrim = hasWideTopGuide ? 24 : 0;
  const top = Math.min(height - 1, Math.max(0, bandTop - 2 + separatorTrim));
  const bottom = Math.min(height, Math.max(top + 1, bandBottom + 2 - separatorTrim));
  const columnCoverage = new Float32Array(width);
  for (let x = 0; x < width; x += 1) {
    let cardPixels = 0;
    for (let y = top; y < bottom; y += 1) if (isCardArea((y * width + x) * 4)) cardPixels += 1;
    columnCoverage[x] = cardPixels / (bottom - top);
  }

  const minimumPanelWidth = width * 0.15;
  const spans: Array<{ start: number; end: number }> = [];
  let spanStart = -1;
  for (let x = 0; x <= width; x += 1) {
    const inside = x < width && columnCoverage[x] > 0.2;
    if (inside && spanStart < 0) spanStart = x;
    if ((!inside || x === width) && spanStart >= 0) {
      const end = x - 1;
      if (end - spanStart + 1 >= minimumPanelWidth) spans.push({ start: spanStart, end });
      spanStart = -1;
    }
  }

  let panels = spans.sort((left, right) => right.end - right.start - (left.end - left.start)).slice(0, 2).sort((left, right) => left.start - right.start);
  if (panels.length === 1) {
    const whole = panels[0];
    let split = whole.start + Math.floor((whole.end - whole.start) / 2);
    for (let x = Math.floor(width * 0.35); x <= Math.floor(width * 0.65); x += 1) {
      if (columnCoverage[x] < columnCoverage[split]) split = x;
    }

    // The wide PAN template has a white gutter between the two cards. Move the
    // split to the first solid card column after that gutter instead of keeping
    // a sliver of the opposite card/white paper in the Back crop.
    let leftEnd = split;
    while (leftEnd > whole.start + 1 && columnCoverage[leftEnd] < 0.65) leftEnd -= 1;
    let rightStart = split + 1;
    while (rightStart < whole.end - 1 && columnCoverage[rightStart] < 0.65) rightStart += 1;
    // This wide template keeps roughly 4% of the neighboring card’s blue
    // gutter after the midpoint. Move the Back crop past that gutter so no
    // white paper or Front-card sliver remains on its left edge.
    if (hasWideTopGuide) rightStart = Math.min(whole.end - 1, rightStart + Math.round(width * 0.04));
    panels = [{ start: whole.start, end: leftEnd }, { start: rightStart, end: whole.end }];
  }
  if (panels.length !== 2) return null;

  // Keep the complete detected panel width. A source-level horizontal nudge
  // changes the effective scale and makes the PAN artwork look over-zoomed;
  // the tight panel bounds above already remove the outside paper/gutter.
  return panels.map((panel) => ({
    x: Math.max(0, panel.start),
    y: top,
    width: Math.max(1, Math.min(width - panel.start, panel.end - panel.start + 1)),
    height: bottom - top,
  }));
};

const renderPdfPages = async (file: File, cardKind: CardKind): Promise<CardPage[]> => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: CardPage[] = [];
  const pageCount = Math.min(pdfDocument.numPages, 2);

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the PDF preview.");
    await page.render({ canvasContext: context, viewport }).promise;
    if (cardKind === "pan" && pdfDocument.numPages === 1) {
      const panRects = detectPanCardRects(canvas);
      if (panRects) return panRects.map((rect, index) => ({ pageNumber: index + 1, src: cropCanvasToDataUrl(canvas, rect) }));
    }
    pages.push({ pageNumber, src: canvas.toDataURL("image/png") });
  }

  return pages;
};

const canvasFromImage = (src: string, fitMode: FitMode = "contain"): Promise<HTMLCanvasElement> =>
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
      if (fitMode === "fill") {
        // Ayushman PDFs commonly use a wider source page than an ID-1 PVC card.
        // Scale the complete artwork edge-to-edge instead of cropping identity data.
        context.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
      } else {
        const scale = Math.min(CARD_WIDTH / image.width, CARD_HEIGHT / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (CARD_WIDTH - width) / 2, (CARD_HEIGHT - height) / 2, width, height);
      }
      resolve(canvas);
    };
    image.onerror = () => reject(new Error("The selected PDF page could not be rendered."));
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
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [pages, setPages] = useState<CardPage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  usePageHead({
    title: "PVC Card Maker — PAN, Aadhaar & ID Card Print Studio",
    description: "Upload one card PDF and automatically prepare its front and back pages for PVC printing.",
    canonical: "https://free-my-pdf.lovable.app/card-print-studio",
    type: "website",
  });

  const selectedTemplate = useMemo(
    () => cardTemplates.find((template) => template.id === cardKind) ?? cardTemplates[0],
    [cardKind]
  );

  const activePage = activeFace === "front" ? pages[0] : pages[1];
  const hasPdf = Boolean(cardFile && pages.length > 0);

  const acceptPdf = useCallback(async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "PDF required", description: "Upload one PDF containing your card pages.", variant: "destructive" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File is too large", description: "Please choose a PDF up to 25 MB.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const renderedPages = await renderPdfPages(file, cardKind);
      if (renderedPages.length === 0) throw new Error("This PDF does not contain a readable page.");
      setCardFile(file);
      setPages(renderedPages);
      setActiveFace("front");
      if (renderedPages.length === 1) {
        toast({ title: "Front page detected", description: "This one-page PDF is ready. Add a second page to include the back side." });
      } else if (renderedPages.length > 1) {
        toast({ title: "Front and back detected", description: cardKind === "pan" && renderedPages.length === 2 ? "The printable PAN pair was extracted automatically from the A4 sheet." : "Page 1 is Front and Page 2 is Back." });
      }
    } catch (error) {
      toast({ title: "PDF preview failed", description: error instanceof Error ? error.message : "Could not read this PDF.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void acceptPdf(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void acceptPdf(file);
  };

  const clearPdf = () => {
    setCardFile(null);
    setPages([]);
    setActiveFace("front");
  };

  const exportFacePng = async (face: Face) => {
    const page = face === "front" ? pages[0] : pages[1];
    if (!page) return;
    setIsProcessing(true);
    try {
      const canvas = await canvasFromImage(page.src, selectedTemplate.fitMode);
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${cardNames[cardKind]}-${face}.png`);
        setIsProcessing(false);
      }, "image/png");
    } catch (error) {
      setIsProcessing(false);
      toast({ title: "PNG export failed", description: error instanceof Error ? error.message : "Could not export this page.", variant: "destructive" });
    }
  };

  const exportPdf = async () => {
    if (!hasPdf) return;
    setIsProcessing(true);
    try {
      const pdf = await PDFDocument.create();
      const pageWidth = 242.65;
      const pageHeight = 153.07;
      for (const cardPage of pages) {
        const canvas = await canvasFromImage(cardPage.src, selectedTemplate.fitMode);
        const png = await pdf.embedPng(canvas.toDataURL("image/png"));
        const page = pdf.addPage([pageWidth, pageHeight]);
        page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(1, 1, 1) });
        page.drawImage(png, { x: 0, y: 0, width: pageWidth, height: pageHeight });
        page.drawText(`${selectedTemplate.label} • ${cardPage.pageNumber === 1 ? "Front" : "Back"}`, { x: 8, y: 4, size: 4, color: rgb(0.45, 0.45, 0.45), opacity: 0.7 });
      }
      const bytes = await pdf.save();
      downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `${cardNames[cardKind]}-pvc-print.pdf`);
    } catch (error) {
      toast({ title: "PDF export failed", description: error instanceof Error ? error.message : "Could not create the print PDF.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
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
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"><CreditCard className="h-4 w-4" /> PVC Card Print Studio</div>
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl">Make your <span className="gradient-text">PVC card</span> print-ready</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">Upload one card PDF. We automatically use page 1 as the front and page 2 as the back, then prepare a standard PVC print layout.</p>
          </motion.header>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="glass-card min-w-0 p-5 sm:p-7" aria-labelledby="card-upload-title">
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Step 1</p><h2 id="card-upload-title" className="mt-1 text-2xl font-bold">Choose card type & upload one PDF</h2></div>
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary/80 px-3 py-2 text-xs font-medium text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5 text-primary" /> Files stay on this device</div>
              </div>

              <div className="mb-7 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {cardTemplates.map((template) => (
                  <button key={template.id} type="button" disabled={Boolean(cardFile) || isProcessing} onClick={() => setCardKind(template.id)} className={`group rounded-2xl border p-3 text-left transition-all ${cardKind === template.id ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-card/40 hover:border-primary/35 hover:bg-card"}`} aria-pressed={cardKind === template.id}>
                    <div className="mb-3 w-full overflow-hidden rounded-xl border border-border/70 bg-white/90 p-1 shadow-sm transition-transform group-hover:scale-[1.02]" aria-hidden="true">
                      <CardTypeIcon kind={template.id} className="block h-auto w-full" />
                    </div>
                    <span className="block text-sm font-bold leading-tight">{template.label}</span>
                    <span className="mt-1 hidden text-[10px] leading-tight text-muted-foreground sm:block">{template.description}</span>
                    {cardKind === template.id && <Check className="mt-2 h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>

              {cardFile ? (
                <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card/80 to-primary/[0.05] p-5 shadow-sm sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4"><PremiumIconFrame tone="gold" size="md" aria-hidden="true"><FileText /></PremiumIconFrame><div className="min-w-0"><p className="truncate font-semibold">{cardFile.name}</p><p className="text-sm text-muted-foreground">{pages.length === 2 ? "2 pages detected — Front + Back ready" : "1 page detected — Front ready"}</p></div></div>
                    <Button type="button" variant="outline" size="sm" onClick={clearPdf}><X className="mr-1.5 h-4 w-4" /> Replace PDF</Button>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {pages.map((page, index) => <div key={page.pageNumber} className="rounded-2xl border border-border bg-background/60 p-3"><div className="flex items-center justify-between text-xs font-semibold text-muted-foreground"><span>Page {page.pageNumber}</span><span>{index === 0 ? "Front" : "Back"}</span></div><img src={page.src} alt={`Card page ${page.pageNumber}`} className={`mt-2 aspect-[1011/638] w-full rounded-xl bg-muted/30 ${selectedTemplate.fitMode === "fill" ? "object-fill" : "object-contain"}`} /></div>)}
                    {pages.length === 1 && <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 p-4 text-center text-xs text-muted-foreground">No second page found.<br />The exported PDF will contain the front only.</div>}
                  </div>
                </div>
              ) : (
                <motion.label whileHover={{ y: -2 }} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`premium-dropzone relative block cursor-pointer p-8 sm:p-12 ${isDragging ? "scale-[1.015]" : ""}`} data-dragging={isDragging}>
                  <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="sr-only" onChange={handleInput} />
                  <div className="relative z-10 flex flex-col items-center text-center"><PremiumIconFrame tone="blue" size="lg" aria-hidden="true"><Upload /></PremiumIconFrame><p className="mt-4 text-lg font-semibold">Drag & drop your card PDF here</p><p className="mt-1 text-sm text-muted-foreground">or click to browse — one PDF automatically becomes Front + Back</p><div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-medium text-muted-foreground"><span className="rounded-full border border-border bg-background/70 px-2.5 py-1">PDF only</span><span className="rounded-full border border-border bg-background/70 px-2.5 py-1">Up to 25 MB</span><span className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-primary">Private in browser</span></div></div>
                </motion.label>
              )}

              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/50 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Page 1 → Front · Page 2 → Back</span><span>{selectedTemplate.fitMode === "fill" ? "Full artwork preserved · fitted edge-to-edge" : "Standard PVC ratio: 85.60 × 53.98 mm"}</span></div>
            </section>

            <aside className="glass-card min-w-0 p-5 sm:p-7" aria-labelledby="preview-title">
              <div className="mb-6 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Step 2</p><h2 id="preview-title" className="mt-1 text-2xl font-bold">PVC preview</h2></div><button type="button" onClick={() => setActiveFace(activeFace === "front" ? "back" : "front")} className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-muted" aria-label="Flip preview side"><FlipHorizontal2 className="h-4 w-4" /></button></div>
              <div className="rounded-[1.6rem] border border-border/70 bg-gradient-to-br from-muted/70 via-background to-primary/[0.06] p-3 shadow-inner sm:p-5"><div className="relative aspect-[1011/638] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_20px_50px_rgba(25,35,75,0.16)]">{activePage ? <img src={activePage.src} alt={`${selectedTemplate.label} ${activeFace} preview`} className={`h-full w-full ${selectedTemplate.fitMode === "fill" ? "object-fill" : "object-contain"}`} /> : <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-white to-violet-500/10 p-6 text-center"><PremiumIconFrame tone={selectedTemplate.tone} size="lg" aria-hidden="true"><CardTypeIcon kind={selectedTemplate.id} className="h-12 w-[4.5rem]" /></PremiumIconFrame><p className="mt-4 text-sm font-bold">{selectedTemplate.label}</p><p className="mt-1 text-xs text-muted-foreground">Upload one card PDF to preview</p></div>}<span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">{activeFace}</span></div></div>
              <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setActiveFace("front")} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${activeFace === "front" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Front page</button><button type="button" onClick={() => setActiveFace("back")} disabled={!pages[1]} className={`rounded-xl border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${activeFace === "back" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>Back page</button></div>
              <div className="mt-6 space-y-2"><Button type="button" onClick={exportPdf} disabled={isProcessing || !hasPdf} className="h-11 w-full rounded-xl bg-primary font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90"><Printer className="mr-2 h-4 w-4" /> {isProcessing ? "Preparing print PDF…" : "Export print-ready PDF"}</Button><div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" onClick={() => void exportFacePng("front")} disabled={isProcessing || !pages[0]} className="h-10 rounded-xl text-xs"><Download className="mr-1.5 h-3.5 w-3.5" /> Front PNG</Button><Button type="button" variant="outline" onClick={() => void exportFacePng("back")} disabled={isProcessing || !pages[1]} className="h-10 rounded-xl text-xs"><Download className="mr-1.5 h-3.5 w-3.5" /> Back PNG</Button></div></div>
            </aside>
          </div>

          <section className="mx-auto mt-8 grid max-w-5xl gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-border/70 bg-card/65 p-4"><FileText className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-bold">One PDF input</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Upload the downloaded e-card PDF once; page mapping is automatic.</p></div><div className="rounded-2xl border border-border/70 bg-card/65 p-4"><Printer className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-bold">PVC ratio ready</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Exports the standard bank-card proportion for printing.</p></div><div className="rounded-2xl border border-border/70 bg-card/65 p-4"><RefreshCw className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-bold">Automatic mapping</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Page 1 becomes Front and page 2 becomes Back automatically.</p></div></section>
        </div>
      </div>
    </Layout>
  );
};

export default CardPrintStudio;
