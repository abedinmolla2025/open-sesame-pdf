import { useState, useCallback, useRef } from "react";

export interface TextBlock {
  id: string;
  text: string;
  originalText: string;
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
  isModified: boolean;
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
  const [scale, setScale] = useState(1);
  const pdfDocRef = useRef<any>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);
  const fileRef = useRef<File | null>(null);

  const renderPages = useCallback(async (pdfDoc: any, renderScale: number) => {
    const loadedPages: PdfPage[] = [];
    const extractedTextBlocks: TextBlock[] = [];

    for (let i = 0; i < pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i + 1);
      const viewport = page.getViewport({ scale: renderScale });

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
          const x = tx[4] * renderScale;
          const y = viewport.height - (tx[5] * renderScale) - ((item.height || 12) * renderScale);
          
          extractedTextBlocks.push({
            id: `text-${i}-${index}`,
            text: item.str,
            originalText: item.str,
            x: x,
            y: y,
            width: item.width * renderScale,
            height: (item.height || 12) * renderScale,
            fontSize: Math.round((item.height || 12) * renderScale),
            fontFamily: item.fontName || "Helvetica",
            color: "#000000",
            pageIndex: i,
            isEditing: false,
            isOriginal: true,
            isModified: false,
          });
        }
      });
    }

    return { loadedPages, extractedTextBlocks };
  }, []);

  const loadPdf = useCallback(async (file: File) => {
    setStatus("loading");
    setError(null);
    setPages([]);
    setTextBlocks([]);
    setCurrentPage(0);
    fileRef.current = file;

    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfBytesRef.current = new Uint8Array(arrayBuffer);

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      pdfDocRef.current = pdfDoc;

      const { loadedPages, extractedTextBlocks } = await renderPages(pdfDoc, scale);

      setPages(loadedPages);
      setTextBlocks(extractedTextBlocks);
      setStatus("ready");
    } catch (err) {
      console.error("PDF load error:", err);
      setError("Failed to load PDF. Please try another file.");
      setStatus("error");
    }
  }, [scale, renderPages]);

  const changeScale = useCallback(async (newScale: number) => {
    if (!pdfDocRef.current || status !== "ready") return;
    
    setScale(newScale);
    
    try {
      const { loadedPages, extractedTextBlocks } = await renderPages(pdfDocRef.current, newScale);
      
      // Preserve modifications from current textBlocks
      const modifiedBlocks = textBlocks.filter(b => b.isModified || !b.isOriginal);
      const scaleRatio = newScale / scale;
      
      // Scale modified blocks
      const scaledModifiedBlocks = modifiedBlocks.map(block => ({
        ...block,
        x: block.x * scaleRatio,
        y: block.y * scaleRatio,
        width: block.width * scaleRatio,
        height: block.height * scaleRatio,
        fontSize: block.fontSize * scaleRatio,
      }));
      
      // Merge: use extracted for unmodified originals, keep scaled modified ones
      const mergedBlocks = extractedTextBlocks.map(extracted => {
        const modified = scaledModifiedBlocks.find(m => m.id === extracted.id);
        if (modified) {
          return { ...extracted, text: modified.text, isModified: true };
        }
        return extracted;
      });
      
      // Add new (non-original) blocks
      const newBlocks = scaledModifiedBlocks.filter(b => !b.isOriginal);
      
      setPages(loadedPages);
      setTextBlocks([...mergedBlocks, ...newBlocks]);
    } catch (err) {
      console.error("Scale change error:", err);
    }
  }, [pdfDocRef, status, scale, textBlocks, renderPages]);

  const updateTextBlock = useCallback((id: string, updates: Partial<TextBlock>) => {
    setTextBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id) return block;
        const newBlock = { ...block, ...updates };
        // Mark as modified if text changed
        if (updates.text !== undefined && updates.text !== block.originalText) {
          newBlock.isModified = true;
        }
        return newBlock;
      })
    );
  }, []);

  const addTextBlock = useCallback((pageIndex: number, x: number, y: number) => {
    const newBlock: TextBlock = {
      id: `text-new-${Date.now()}`,
      text: "New text",
      originalText: "",
      x,
      y,
      width: 150,
      height: 24,
      fontSize: 18,
      fontFamily: "Helvetica",
      color: "#000000",
      pageIndex,
      isEditing: true,
      isOriginal: false,
      isModified: true,
    };
    setTextBlocks((prev) => [...prev, newBlock]);
    return newBlock.id;
  }, []);

  const deleteTextBlock = useCallback((id: string) => {
    setTextBlocks((prev) => prev.filter((block) => block.id !== id));
  }, []);

  const savePdf = useCallback(async (fileName: string) => {
    if (!pdfBytesRef.current) {
      console.error("No PDF bytes available");
      return;
    }

    setStatus("saving");
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      
      const pdfDoc = await PDFDocument.load(pdfBytesRef.current);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const pagesArr = pdfDoc.getPages();

      // Get modified and new blocks
      const blocksToProcess = textBlocks.filter(b => b.isModified || !b.isOriginal);

      for (const block of blocksToProcess) {
        const page = pagesArr[block.pageIndex];
        if (!page) continue;

        const { height, width } = page.getSize();
        const fontSize = block.fontSize / scale;
        const x = block.x / scale;
        const y = height - (block.y / scale) - fontSize;

        // Parse color
        const hexColor = block.color.replace("#", "");
        const r = parseInt(hexColor.substring(0, 2), 16) / 255;
        const g = parseInt(hexColor.substring(2, 4), 16) / 255;
        const b = parseInt(hexColor.substring(4, 6), 16) / 255;

        // For modified original text, draw white rectangle to cover old text first
        if (block.isOriginal && block.isModified) {
          const textWidth = helveticaFont.widthOfTextAtSize(block.originalText, fontSize);
          page.drawRectangle({
            x: x - 2,
            y: y - 2,
            width: textWidth + 4,
            height: fontSize + 4,
            color: rgb(1, 1, 1), // White
          });
        }

        page.drawText(block.text, {
          x,
          y,
          size: fontSize,
          font: helveticaFont,
          color: rgb(r, g, b),
        });
      }

      const modifiedPdfBytes = await pdfDoc.save();
      
      // Download
      const blob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName.replace(".pdf", "") + "_edited.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus("ready");
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save PDF. " + (err as Error).message);
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
    fileRef.current = null;
  }, []);

  return {
    status,
    error,
    pages,
    textBlocks,
    currentPage,
    scale,
    setCurrentPage,
    setScale: changeScale,
    loadPdf,
    updateTextBlock,
    addTextBlock,
    deleteTextBlock,
    savePdf,
    reset,
  };
};
