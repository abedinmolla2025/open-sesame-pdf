import { useState, useCallback, useRef } from "react";

export interface TextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  pageIndex: number;
  isEditing: boolean;
  isOriginal: boolean;
}

export interface PdfPage {
  pageIndex: number;
  width: number;
  height: number;
  imageUrl: string;
}

type EditorStatus = "idle" | "loading" | "ready" | "saving" | "error";

export const usePdfEditor = () => {
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [scale, setScale] = useState(1.5);
  const pdfDocRef = useRef<any>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);

  const loadPdf = useCallback(async (file: File) => {
    setStatus("loading");
    setError(null);
    setPages([]);
    setTextBlocks([]);
    setCurrentPage(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfBytesRef.current = new Uint8Array(arrayBuffer);

      // Dynamic import for pdfjs-dist
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      pdfDocRef.current = pdfDoc;

      const loadedPages: PdfPage[] = [];
      const extractedTextBlocks: TextBlock[] = [];

      for (let i = 0; i < pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i + 1);
        const viewport = page.getViewport({ scale });

        // Render page to canvas
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        loadedPages.push({
          pageIndex: i,
          width: viewport.width,
          height: viewport.height,
          imageUrl: canvas.toDataURL("image/png"),
        });

        // Extract text content
        const textContent = await page.getTextContent();
        textContent.items.forEach((item: any, index: number) => {
          if (item.str && item.str.trim()) {
            const tx = item.transform;
            // Transform coordinates to canvas space
            const x = tx[4] * scale;
            const y = viewport.height - (tx[5] * scale) - (item.height * scale);
            
            extractedTextBlocks.push({
              id: `text-${i}-${index}`,
              text: item.str,
              x: x,
              y: y,
              width: item.width * scale,
              height: (item.height || 12) * scale,
              fontSize: Math.round((item.height || 12) * scale),
              fontFamily: item.fontName || "Helvetica",
              color: "#000000",
              pageIndex: i,
              isEditing: false,
              isOriginal: true,
            });
          }
        });
      }

      setPages(loadedPages);
      setTextBlocks(extractedTextBlocks);
      setStatus("ready");
    } catch (err) {
      console.error("PDF load error:", err);
      setError("Failed to load PDF. Please try another file.");
      setStatus("error");
    }
  }, [scale]);

  const updateTextBlock = useCallback((id: string, updates: Partial<TextBlock>) => {
    setTextBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, ...updates } : block
      )
    );
  }, []);

  const addTextBlock = useCallback((pageIndex: number, x: number, y: number) => {
    const newBlock: TextBlock = {
      id: `text-new-${Date.now()}`,
      text: "New text",
      x,
      y,
      width: 150,
      height: 20,
      fontSize: 14,
      fontFamily: "Helvetica",
      color: "#000000",
      pageIndex,
      isEditing: true,
      isOriginal: false,
    };
    setTextBlocks((prev) => [...prev, newBlock]);
    return newBlock.id;
  }, []);

  const deleteTextBlock = useCallback((id: string) => {
    setTextBlocks((prev) => prev.filter((block) => block.id !== id));
  }, []);

  const savePdf = useCallback(async (fileName: string) => {
    if (!pdfBytesRef.current) return;

    setStatus("saving");
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      
      const pdfDoc = await PDFDocument.load(pdfBytesRef.current);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const pagesArr = pdfDoc.getPages();

      // Group text blocks by page
      const blocksByPage = textBlocks.reduce((acc, block) => {
        if (!acc[block.pageIndex]) acc[block.pageIndex] = [];
        acc[block.pageIndex].push(block);
        return acc;
      }, {} as Record<number, TextBlock[]>);

      // Apply modified text blocks (only non-original or edited ones)
      for (const [pageIndexStr, blocks] of Object.entries(blocksByPage)) {
        const pageIndex = parseInt(pageIndexStr);
        const page = pagesArr[pageIndex];
        if (!page) continue;

        const { height } = page.getSize();

        for (const block of blocks) {
          // Only add new text blocks (not original ones) to avoid duplication
          if (!block.isOriginal) {
            const fontSize = block.fontSize / scale;
            const x = block.x / scale;
            const y = height - (block.y / scale) - fontSize;

            // Parse color
            const hexColor = block.color.replace("#", "");
            const r = parseInt(hexColor.substring(0, 2), 16) / 255;
            const g = parseInt(hexColor.substring(2, 4), 16) / 255;
            const b = parseInt(hexColor.substring(4, 6), 16) / 255;

            page.drawText(block.text, {
              x,
              y,
              size: fontSize,
              font: helveticaFont,
              color: rgb(r, g, b),
            });
          }
        }
      }

      const modifiedPdfBytes = await pdfDoc.save();
      
      // Download
      const blob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName.replace(".pdf", "") + "_edited.pdf";
      link.click();
      URL.revokeObjectURL(url);

      setStatus("ready");
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save PDF.");
      setStatus("error");
    }
  }, [textBlocks, scale]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setPages([]);
    setTextBlocks([]);
    setCurrentPage(0);
    pdfDocRef.current = null;
    pdfBytesRef.current = null;
  }, []);

  return {
    status,
    error,
    pages,
    textBlocks,
    currentPage,
    scale,
    setCurrentPage,
    setScale,
    loadPdf,
    updateTextBlock,
    addTextBlock,
    deleteTextBlock,
    savePdf,
    reset,
  };
};
