import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Loader2, FileWarning } from "lucide-react";
import type { FindingLocation } from "@/lib/pdfSecurityScan";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

interface PdfFindingPreviewProps {
  file: File;
  /** All locations of the active finding (markers) */
  locations: FindingLocation[];
  /** Index of the currently selected location */
  activeIndex: number;
  onSelect: (index: number) => void;
  label: string;
}

export const PdfFindingPreview = ({
  file,
  locations,
  activeIndex,
  onSelect,
  label,
}: PdfFindingPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const active = locations[activeIndex];
  const page = active?.page ?? 1;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
        if (cancelled) return;
        docRef.current = doc;
        setPageCount(doc.numPages);
      } catch {
        if (!cancelled) setError("This PDF could not be rendered (it may be encrypted or damaged).");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      docRef.current?.destroy();
      docRef.current = null;
    };
  }, [file]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const doc = docRef.current;
      const canvas = canvasRef.current;
      if (!doc || !canvas) return;
      const target = Math.min(Math.max(1, page), doc.numPages);
      try {
        const pdfPage = await doc.getPage(target);
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const scale = Math.min(1.6, 520 / base.width);
        const viewport = pdfPage.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await pdfPage.render({
          canvas,
          canvasContext: ctx,
          viewport,
        } as Parameters<typeof pdfPage.render>[0]).promise;
      } catch {
        if (!cancelled) setError("Could not render this page.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, loading]);

  const onPage = locations
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => (l.page ?? 1) === page);

  return (
    <div className="rounded-xl border border-border bg-background/60 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate">
          {label} · page {page}
          {pageCount ? ` of ${pageCount}` : ""}
          {active?.page === undefined && " (document-level object)"}
        </p>
        {onPage.length > 1 && (
          <div className="flex gap-1">
            {onPage.map(({ i }) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Show location ${i + 1}`}
                className={cn(
                  "w-5 h-5 rounded text-[10px] tabular-nums border transition-colors",
                  i === activeIndex
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative mx-auto w-fit rounded-lg overflow-hidden border border-border bg-muted/30">
        {loading && (
          <div className="flex items-center justify-center h-64 w-[320px] text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center gap-2 h-64 w-[320px] px-6 text-center text-xs text-muted-foreground">
            <FileWarning className="w-5 h-5" />
            {error}
          </div>
        )}
        <canvas ref={canvasRef} className={cn("block", (loading || error) && "hidden")} />

        {!loading && !error &&
          onPage.map(({ l, i }) => {
            const top = `${((l.pagePosition ?? 0.04) * 88 + 4).toFixed(2)}%`;
            const isActive = i === activeIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Highlight byte ${l.offset}`}
                style={{ top }}
                className={cn(
                  "absolute left-0 right-0 -translate-y-1/2 h-7 flex items-center transition-all",
                  isActive
                    ? "bg-destructive/25 ring-1 ring-destructive"
                    : "bg-amber-400/15 hover:bg-amber-400/30"
                )}
              >
                <span
                  className={cn(
                    "ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums",
                    isActive
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-amber-500/80 text-background"
                  )}
                >
                  @{l.offset.toLocaleString()}
                </span>
              </button>
            );
          })}
      </div>

      {active?.context && (
        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all rounded-lg border border-border bg-card/60 p-3 max-h-40 overflow-y-auto">
          {active.context.slice(0, active.contextMatchStart ?? 0)}
          <mark className="bg-destructive/30 text-foreground rounded px-0.5">
            {active.context.slice(
              active.contextMatchStart ?? 0,
              (active.contextMatchStart ?? 0) + (active.matchLength ?? 0)
            )}
          </mark>
          {active.context.slice((active.contextMatchStart ?? 0) + (active.matchLength ?? 0))}
        </pre>
      )}

      <p className="text-[11px] text-muted-foreground">
        Highlight position is an approximation derived from the byte offset inside the page object.
      </p>
    </div>
  );
};
