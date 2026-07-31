import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, FileWarning } from "lucide-react";

interface UnlockedPreviewProps {
  /** Bytes of the unlocked (unencrypted) PDF */
  pdfBytes: Uint8Array;
  maxPages?: number;
}

/** Renders thumbnails of the unlocked PDF so users can verify the result before downloading. */
export const UnlockedPreview = ({ pdfBytes, maxPages = 4 }: UnlockedPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setThumbs([]);

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

        const bytes = pdfBytes.slice(0);
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        setTotal(doc.numPages);

        const out: string[] = [];
        const count = Math.min(maxPages, doc.numPages);
        for (let i = 1; i <= count; i++) {
          const page = await doc.getPage(i);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(1, 220 / base.width) });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({
            canvas,
            canvasContext: ctx,
            viewport,
          } as Parameters<typeof page.render>[0]).promise;
          out.push(canvas.toDataURL("image/png"));
          if (!cancelled) setThumbs([...out]);
        }
        await doc.destroy();
      } catch {
        if (!cancelled) setError("The unlocked file was created, but a preview could not be rendered.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBytes, maxPages]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-3 rounded-xl border border-border bg-background/60 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Preview of unlocked PDF</p>
        {total > 0 && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {total} page{total === 1 ? "" : "s"}
            {total > thumbs.length ? ` · showing first ${thumbs.length}` : ""}
          </p>
        )}
      </div>

      {error ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileWarning className="w-4 h-4 shrink-0" />
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {thumbs.map((src, i) => (
            <figure key={i} className="space-y-1">
              <img
                src={src}
                alt={`Unlocked PDF page ${i + 1} preview`}
                loading="lazy"
                className="w-full h-auto rounded-lg border border-border bg-card"
              />
              <figcaption className="text-[11px] text-muted-foreground text-center tabular-nums">
                Page {i + 1}
              </figcaption>
            </figure>
          ))}
          {loading && (
            <div className="flex items-center justify-center h-28 rounded-lg border border-dashed border-border text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
