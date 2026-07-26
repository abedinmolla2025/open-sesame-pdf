import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Download, X, IdCard, ZoomIn, RotateCcw, Crosshair, Eye, EyeOff } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePageHead } from "@/hooks/usePageHead";
import { cn } from "@/lib/utils";
import { detectFace } from "@/lib/faceDetect";


interface Preset {
  id: string;
  label: string;
  wMm: number;
  hMm: number;
  note: string;
  /** Fractions of the photo height, measured from the top edge */
  crown: number;
  chin: number;
  eye: number;
  spec: string;
}

const PRESETS: Preset[] = [
  { id: "us", label: 'US / 2" x 2"', wMm: 51, hMm: 51, note: "USA passport & visa", crown: 0.12, chin: 0.72, eye: 0.375, spec: "Head 1–1⅜ in (50–69%), eyes 1⅛–1⅜ in from bottom" },
  { id: "in", label: "35 x 45 mm", wMm: 35, hMm: 45, note: "India, EU, UK, AU", crown: 0.08, chin: 0.835, eye: 0.42, spec: "Head 32–36 mm (ICAO), 3–5 mm above the crown" },
  { id: "cn", label: "33 x 48 mm", wMm: 33, hMm: 48, note: "China visa", crown: 0.10, chin: 0.746, eye: 0.39, spec: "Head 28–33 mm, 3–5 mm above the crown" },
  { id: "ca", label: "50 x 70 mm", wMm: 50, hMm: 70, note: "Canada passport", crown: 0.15, chin: 0.63, eye: 0.366, spec: "Head 31–36 mm crown to chin" },
  { id: "stamp", label: "20 x 25 mm", wMm: 20, hMm: 25, note: "Stamp size", crown: 0.08, chin: 0.835, eye: 0.42, spec: "Head ~80% of height, ICAO framing" },
];


const BG_COLORS = [
  { id: "white", label: "White", value: "#ffffff" },
  { id: "offwhite", label: "Off white", value: "#f2f2f2" },
  { id: "lightblue", label: "Light blue", value: "#cfe0f5" },
  { id: "grey", label: "Grey", value: "#d9d9d9" },
];

const MM_PER_INCH = 25.4;
const SHEET_W_MM = 152.4; // 6 inch
const SHEET_H_MM = 101.6; // 4 inch

const PassportPhoto = () => {
  const { toast } = useToast();
  usePageHead({
    title: "Passport Size Photo Maker — Free Online Photo Tool",
    description:
      "Create passport, visa and ID photos online. Crop to 2x2 inch, 35x45mm and more, pick a background, and download a single photo or a printable 4x6 sheet.",
    canonical: "https://free-my-pdf.lovable.app/passport-photo",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Passport Size Photo Maker",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("photo");
  const [presetId, setPresetId] = useState("us");
  const [bg, setBg] = useState("#ffffff");
  const [dpi, setDpi] = useState(300);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  // Head markers, as fractions of the crop height
  const [crownF, setCrownF] = useState(0.12);
  const [chinF, setChinF] = useState(0.72);
  const [detecting, setDetecting] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);


  const previewRef = useRef<HTMLCanvasElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const dragState = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const markerDrag = useRef<{ which: "crown" | "chin"; startY: number; startF: number } | null>(null);
  /** Head position in image pixel coordinates, captured on the last snap */
  const anchorRef = useRef<{ u: number; crownV: number; chinV: number } | null>(null);

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const aspect = preset.wMm / preset.hMm;

  const PREVIEW_W = 320;
  const PREVIEW_H = Math.round(PREVIEW_W / aspect);


  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Unsupported file", description: "Please choose a JPG, PNG or WebP image.", variant: "destructive" });
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setFileName(file.name.replace(/\.[^.]+$/, "") || "photo");
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        anchorRef.current = null;
        setCrownF(preset.crown);
        setChinF(preset.chin);
        URL.revokeObjectURL(url);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast({ title: "Could not read image", variant: "destructive" });
      };
      img.src = url;
    },
    [toast, preset.crown, preset.chin]
  );

  // Draw a photo of given pixel size onto a canvas context
  const drawPhoto = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dx = 0, dy = 0) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, dy, w, h);
      ctx.clip();
      ctx.fillStyle = bg;
      ctx.fillRect(dx, dy, w, h);
      if (image) {
        const baseScale = Math.max(w / image.width, h / image.height);
        const scale = baseScale * zoom;
        const iw = image.width * scale;
        const ih = image.height * scale;
        const x = dx + (w - iw) / 2 + offset.x * w;
        const y = dy + (h - ih) / 2 + offset.y * h;
        ctx.drawImage(image, x, y, iw, ih);
      }
      ctx.restore();
    },
    [image, bg, zoom, offset]
  );

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = PREVIEW_W * ratio;
    canvas.height = PREVIEW_H * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
    drawPhoto(ctx, PREVIEW_W, PREVIEW_H);
  }, [drawPhoto, PREVIEW_W, PREVIEW_H]);

  // ---- Alignment guide overlay ----
  useEffect(() => {
    const canvas = guideRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = PREVIEW_W * ratio;
    canvas.height = PREVIEW_H * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
    if (!showGuides) return;

    const w = PREVIEW_W;
    const h = PREVIEW_H;
    const crownY = preset.crown * h;
    const chinY = preset.chin * h;
    const eyeY = preset.eye * h;
    const headW = (chinY - crownY) * 0.72;

    // Dim everything outside the safe area
    const marginX = w * 0.08;
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, 0, marginX, h);
    ctx.fillRect(w - marginX, 0, marginX, h);

    // Head oval
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(w / 2, (crownY + chinY) / 2, headW / 2, (chinY - crownY) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();

    const line = (y: number, label: string, colour: string) => {
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colour;
      ctx.font = "10px system-ui, sans-serif";
      ctx.textBaseline = y < 14 ? "top" : "bottom";
      ctx.fillText(label, 6, y < 14 ? y + 3 : y - 3);
    };

    line(crownY, "TOP OF HEAD", "rgba(255,255,255,0.9)");
    line(eyeY, "EYE LINE", "rgba(255,205,90,0.95)");
    line(chinY, "CHIN", "rgba(255,255,255,0.9)");

    // Centre line
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [showGuides, preset, PREVIEW_W, PREVIEW_H, image]);

  // ---- Snapping ----
  const applyAnchor = useCallback(
    (anchor: { u: number; crownV: number; chinV: number }, p: Preset, img?: HTMLImageElement) => {
      const src = img ?? image;
      if (!src) return;
      const w = PREVIEW_W;
      const h = Math.round(PREVIEW_W / (p.wMm / p.hMm));
      const baseScale = Math.max(w / src.width, h / src.height);
      const headV = anchor.chinV - anchor.crownV;
      if (headV <= 0) return;
      const scale = ((p.chin - p.crown) * h) / headV;
      const y0 = p.crown * h - anchor.crownV * scale;
      const x0 = w / 2 - anchor.u * scale;
      setZoom(scale / baseScale);
      setOffset({
        x: (x0 - (w - src.width * scale) / 2) / w,
        y: (y0 - (h - src.height * scale) / 2) / h,
      });
      setCrownF(p.crown);
      setChinF(p.chin);
    },
    [image, PREVIEW_W]
  );


  const runFaceDetection = useCallback(
    async (img: HTMLImageElement, silent = false) => {
      setDetecting(true);
      try {
        const face = await detectFace(img);
        if (!face) {
          setAutoDetected(false);
          if (!silent) {
            toast({
              title: "No face detected",
              description: "Drag the Head / Chin bars onto your face, then snap.",
              variant: "destructive",
            });
          }
          return false;
        }
        const anchor = { u: face.u, crownV: face.crownV, chinV: face.chinV };
        anchorRef.current = anchor;
        applyAnchor(anchor, preset, img);
        setAutoDetected(true);
        if (!silent) toast({ title: "Face detected", description: "Guide pre-positioned — snap or fine-tune." });
        return true;
      } finally {
        setDetecting(false);
      }
    },
    [applyAnchor, preset, toast]
  );

  // Auto-detect as soon as a photo is loaded
  useEffect(() => {
    if (image) void runFaceDetection(image, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  const snapToGuide = () => {
    if (!image) return;
    const w = PREVIEW_W;
    const h = PREVIEW_H;
    const baseScale = Math.max(w / image.width, h / image.height);
    const scale = baseScale * zoom;
    const x0 = (w - image.width * scale) / 2 + offset.x * w;
    const y0 = (h - image.height * scale) / 2 + offset.y * h;
    const anchor = {
      u: (w / 2 - x0) / scale,
      crownV: (crownF * h - y0) / scale,
      chinV: (chinF * h - y0) / scale,
    };
    if (anchor.chinV - anchor.crownV <= 0) {
      toast({ title: "Adjust the markers", description: "Place the chin marker below the head marker.", variant: "destructive" });
      return;
    }
    anchorRef.current = anchor;
    applyAnchor(anchor, preset);
    toast({ title: "Cropped to guide", description: `Head sized for ${preset.label}.` });
  };


  // Re-snap whenever the preset changes, once the head has been marked
  useEffect(() => {
    if (anchorRef.current) applyAnchor(anchorRef.current, preset);
    else {
      setCrownF(preset.crown);
      setChinF(preset.chin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  const onMarkerDown = (which: "crown" | "chin") => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    markerDrag.current = { which, startY: e.clientY, startF: which === "crown" ? crownF : chinF };
  };
  const onMarkerMove = (e: React.PointerEvent) => {
    const m = markerDrag.current;
    if (!m) return;
    e.stopPropagation();
    const next = Math.min(1, Math.max(0, m.startF + (e.clientY - m.startY) / PREVIEW_H));
    if (m.which === "crown") setCrownF(Math.min(next, chinF - 0.05));
    else setChinF(Math.max(next, crownF + 0.05));
  };
  const onMarkerUp = () => {
    markerDrag.current = null;
  };



  const onPointerDown = (e: React.PointerEvent) => {
    if (!image) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const d = dragState.current;
    setOffset({
      x: d.ox + (e.clientX - d.x) / PREVIEW_W,
      y: d.oy + (e.clientY - d.y) / PREVIEW_H,
    });
  };
  const endDrag = () => {
    dragState.current = null;
    setIsDragging(false);
  };

  const mmToPx = (mm: number) => Math.round((mm / MM_PER_INCH) * dpi);

  const download = (canvas: HTMLCanvasElement, suffix: string) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}-${suffix}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Download ready", description: `${a.download} saved.` });
    }, "image/jpeg", 0.95);
  };

  const downloadSingle = () => {
    if (!image) return;
    const w = mmToPx(preset.wMm);
    const h = mmToPx(preset.hMm);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawPhoto(ctx, w, h);
    download(canvas, `${preset.wMm}x${preset.hMm}mm`);
  };

  const downloadSheet = () => {
    if (!image) return;
    const sheetW = mmToPx(SHEET_W_MM);
    const sheetH = mmToPx(SHEET_H_MM);
    const pw = mmToPx(preset.wMm);
    const ph = mmToPx(preset.hMm);
    const gap = mmToPx(3);
    const margin = mmToPx(4);

    const cols = Math.max(1, Math.floor((sheetW - margin * 2 + gap) / (pw + gap)));
    const rows = Math.max(1, Math.floor((sheetH - margin * 2 + gap) / (ph + gap)));

    const canvas = document.createElement("canvas");
    canvas.width = sheetW;
    canvas.height = sheetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sheetW, sheetH);

    const totalW = cols * pw + (cols - 1) * gap;
    const totalH = rows * ph + (rows - 1) * gap;
    const startX = (sheetW - totalW) / 2;
    const startY = (sheetH - totalH) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (pw + gap);
        const y = startY + r * (ph + gap);
        drawPhoto(ctx, pw, ph, x, y);
        ctx.strokeStyle = "#c9c9c9";
        ctx.lineWidth = Math.max(1, Math.round(dpi / 300));
        ctx.strokeRect(x, y, pw, ph);
      }
    }
    download(canvas, `sheet-4x6-${cols * rows}up`);
  };

  const sheetCount = (() => {
    const pw = mmToPx(preset.wMm);
    const ph = mmToPx(preset.hMm);
    const gap = mmToPx(3);
    const margin = mmToPx(4);
    const sheetW = mmToPx(SHEET_W_MM);
    const sheetH = mmToPx(SHEET_H_MM);
    const cols = Math.max(1, Math.floor((sheetW - margin * 2 + gap) / (pw + gap)));
    const rows = Math.max(1, Math.floor((sheetH - margin * 2 + gap) / (ph + gap)));
    return cols * rows;
  })();

  return (
    <Layout>
      <div className="container max-w-5xl py-10 md:py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-4">
            <IdCard className="w-4 h-4" />
            <span>100% in your browser</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">Passport Size Photo Maker</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Crop any photo to official passport and visa dimensions, choose a background, and download a single
            photo or a printable 4x6 inch sheet. Nothing is uploaded.
          </p>
        </div>

        {!image ? (
          <motion.label
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onDragOver={(e) => {
              e.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDropActive(false);
              const f = e.dataTransfer.files?.[0];
              if (f) loadFile(f);
            }}
            className={cn(
              "relative cursor-pointer block w-full p-12 rounded-2xl border-2 border-dashed transition-all duration-300",
              dropActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 bg-card/50"
            )}
          >
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadFile(f);
                e.target.value = "";
              }}
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium mb-1">Drag & drop your photo here</p>
                <p className="text-sm text-muted-foreground">or click to browse — JPG, PNG, WebP</p>
              </div>
            </div>
          </motion.label>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[auto,1fr] items-start">
            {/* Preview */}
            <div className="glass-card p-6 flex flex-col items-center gap-4 mx-auto">
              <div className="relative" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
                <canvas
                  ref={previewRef}
                  style={{ width: PREVIEW_W, height: PREVIEW_H }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className={cn(
                    "rounded-lg border border-border touch-none select-none",
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                  )}
                />
                <canvas
                  ref={guideRef}
                  style={{ width: PREVIEW_W, height: PREVIEW_H }}
                  className="absolute inset-0 rounded-lg pointer-events-none"
                />
                {/* Draggable head markers */}
                {(["crown", "chin"] as const).map((which) => {
                  const f = which === "crown" ? crownF : chinF;
                  return (
                    <div
                      key={which}
                      onPointerDown={onMarkerDown(which)}
                      onPointerMove={onMarkerMove}
                      onPointerUp={onMarkerUp}
                      onPointerCancel={onMarkerUp}
                      style={{ top: f * PREVIEW_H }}
                      className="absolute left-0 right-0 -translate-y-1/2 h-5 flex items-center cursor-ns-resize touch-none group"
                    >
                      <div className="flex-1 h-[2px] bg-primary/80" />
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium">
                        {which === "crown" ? "Head" : "Chin"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Drag the photo to reposition • drag the Head / Chin bars onto your face, then snap
                <br />
                {preset.wMm} x {preset.hMm} mm @ {dpi} DPI — {preset.spec}
              </p>
              <Button onClick={snapToGuide} className="w-full gap-2">
                <Crosshair className="w-4 h-4" /> Snap crop to guide
              </Button>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowGuides((s) => !s)}>
                {showGuides ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showGuides ? "Hide guides" : "Show guides"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImage(null);
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="gap-2"
              >
                <X className="w-4 h-4" /> Choose another photo
              </Button>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-4">
                <Label className="text-sm font-medium">Photo size</Label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPresetId(p.id)}
                      className={cn(
                        "text-left px-4 py-3 rounded-xl border transition-colors",
                        presetId === p.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <span className="block text-sm font-medium">{p.label}</span>
                      <span className="block text-xs text-muted-foreground">{p.note}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ZoomIn className="w-4 h-4" /> Zoom
                    </Label>
                    <span className="text-sm text-muted-foreground">{zoom.toFixed(2)}x</span>
                  </div>
                  <Slider value={[zoom]} min={0.3} max={4} step={0.01} onValueChange={(v) => setZoom(v[0])} />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Background</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {BG_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setBg(c.value)}
                        aria-label={`Background ${c.label}`}
                        style={{ backgroundColor: c.value }}
                        className={cn(
                          "w-9 h-9 rounded-lg border-2 transition-transform",
                          bg === c.value ? "border-primary scale-110" : "border-border"
                        )}
                      />
                    ))}
                    <Input
                      type="color"
                      value={bg}
                      onChange={(e) => setBg(e.target.value)}
                      aria-label="Custom background colour"
                      className="w-14 h-9 p-1 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Background shows around the photo — zoom out or reposition to reveal it.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Print quality</Label>
                    <span className="text-sm text-muted-foreground">{dpi} DPI</span>
                  </div>
                  <div className="flex gap-2">
                    {[200, 300, 600].map((d) => (
                      <Button
                        key={d}
                        variant={dpi === d ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDpi(d)}
                      >
                        {d} DPI
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                    anchorRef.current = null;
                    setCrownF(preset.crown);
                    setChinF(preset.chin);
                  }}
                >
                  <RotateCcw className="w-4 h-4" /> Reset framing
                </Button>
              </div>

              <div className="glass-card p-6 space-y-3">
                <Button onClick={downloadSingle} className="w-full gap-2">
                  <Download className="w-4 h-4" /> Download single photo
                </Button>
                <Button onClick={downloadSheet} variant="outline" className="w-full gap-2">
                  <Download className="w-4 h-4" /> Download 4x6" sheet ({sheetCount} photos)
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PassportPhoto;
