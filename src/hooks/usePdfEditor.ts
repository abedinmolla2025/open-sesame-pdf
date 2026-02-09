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
  bold: boolean;
  italic: boolean;
  pageIndex: number;
  isEditing: boolean;
  isOriginal: boolean;
  isModified: boolean;
}

export interface WhiteoutBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
}

export interface ImageBlock {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
}

export type ShapeType = "rectangle" | "circle" | "line" | "arrow";

export interface ShapeBlock {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  pageIndex: number;
}

export interface PdfPage {
  pageIndex: number;
  width: number;
  height: number;
  imageUrl: string;
}

export type EditorTool = "select" | "text" | "whiteout" | "image" | "rectangle" | "circle" | "line" | "arrow";
type EditorStatus = "idle" | "loading" | "ready" | "saving" | "error";

export const usePdfEditor = () => {
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [whiteouts, setWhiteouts] = useState<WhiteoutBlock[]>([]);
  const [images, setImages] = useState<ImageBlock[]>([]);
  const [shapes, setShapes] = useState<ShapeBlock[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const pdfDocRef = useRef<any>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);

  const renderPages = useCallback(async (pdfDoc: any, renderScale: number) => {
    const loadedPages: PdfPage[] = [];
    const extractedTextBlocks: TextBlock[] = [];

    for (let i = 0; i < pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i + 1);
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      loadedPages.push({
        pageIndex: i,
        width: viewport.width,
        height: viewport.height,
        imageUrl: canvas.toDataURL("image/png"),
      });

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
            x, y,
            width: item.width * renderScale,
            height: (item.height || 12) * renderScale,
            fontSize: Math.round((item.height || 12) * renderScale),
            fontFamily: item.fontName || "Helvetica",
            color: "#000000",
            bold: false,
            italic: false,
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
    setWhiteouts([]);
    setImages([]);
    setShapes([]);
    setCurrentPage(0);
    setActiveTool("select");

    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfBytesRef.current = new Uint8Array(arrayBuffer);

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      const pdfDoc = await (pdfjsLib.getDocument({ data: arrayBuffer })).promise;
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
      const modifiedBlocks = textBlocks.filter(b => b.isModified || !b.isOriginal);
      const scaleRatio = newScale / scale;
      const scaledModifiedBlocks = modifiedBlocks.map(block => ({
        ...block,
        x: block.x * scaleRatio, y: block.y * scaleRatio,
        width: block.width * scaleRatio, height: block.height * scaleRatio,
        fontSize: block.fontSize * scaleRatio,
      }));
      const mergedBlocks = extractedTextBlocks.map(extracted => {
        const modified = scaledModifiedBlocks.find(m => m.id === extracted.id);
        return modified ? { ...extracted, text: modified.text, isModified: true, bold: modified.bold, italic: modified.italic, color: modified.color } : extracted;
      });
      const newBlocks = scaledModifiedBlocks.filter(b => !b.isOriginal);

      // Scale other elements
      setWhiteouts(prev => prev.map(w => ({ ...w, x: w.x * scaleRatio, y: w.y * scaleRatio, width: w.width * scaleRatio, height: w.height * scaleRatio })));
      setImages(prev => prev.map(img => ({ ...img, x: img.x * scaleRatio, y: img.y * scaleRatio, width: img.width * scaleRatio, height: img.height * scaleRatio })));
      setShapes(prev => prev.map(s => ({ ...s, x: s.x * scaleRatio, y: s.y * scaleRatio, width: s.width * scaleRatio, height: s.height * scaleRatio, strokeWidth: s.strokeWidth * scaleRatio })));

      setPages(loadedPages);
      setTextBlocks([...mergedBlocks, ...newBlocks]);
    } catch (err) {
      console.error("Scale change error:", err);
    }
  }, [pdfDocRef, status, scale, textBlocks, renderPages]);

  const updateTextBlock = useCallback((id: string, updates: Partial<TextBlock>) => {
    setTextBlocks(prev => prev.map(block => {
      if (block.id !== id) return block;
      const newBlock = { ...block, ...updates };
      if (updates.text !== undefined && updates.text !== block.originalText) newBlock.isModified = true;
      if (updates.bold !== undefined || updates.italic !== undefined || updates.color !== undefined || updates.fontSize !== undefined) newBlock.isModified = true;
      return newBlock;
    }));
  }, []);

  const addTextBlock = useCallback((pageIndex: number, x: number, y: number) => {
    const newBlock: TextBlock = {
      id: `text-new-${Date.now()}`,
      text: "New text", originalText: "",
      x, y, width: 150, height: 24,
      fontSize: 18, fontFamily: "Helvetica",
      color: "#000000", bold: false, italic: false,
      pageIndex, isEditing: true, isOriginal: false, isModified: true,
    };
    setTextBlocks(prev => [...prev, newBlock]);
    return newBlock.id;
  }, []);

  const deleteTextBlock = useCallback((id: string) => {
    setTextBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  // Whiteout
  const addWhiteout = useCallback((pageIndex: number, x: number, y: number, width: number, height: number) => {
    const wo: WhiteoutBlock = { id: `wo-${Date.now()}`, x, y, width, height, pageIndex };
    setWhiteouts(prev => [...prev, wo]);
    return wo.id;
  }, []);

  const deleteWhiteout = useCallback((id: string) => {
    setWhiteouts(prev => prev.filter(w => w.id !== id));
  }, []);

  // Images
  const addImage = useCallback((pageIndex: number, src: string, x: number, y: number, width: number, height: number) => {
    const img: ImageBlock = { id: `img-${Date.now()}`, src, x, y, width, height, pageIndex };
    setImages(prev => [...prev, img]);
    return img.id;
  }, []);

  const updateImage = useCallback((id: string, updates: Partial<ImageBlock>) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  }, []);

  const deleteImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  // Shapes
  const addShape = useCallback((pageIndex: number, type: ShapeType, x: number, y: number, width: number, height: number) => {
    const shape: ShapeBlock = {
      id: `shape-${Date.now()}`, type, x, y, width, height,
      strokeColor: "#000000", fillColor: "transparent", strokeWidth: 2, pageIndex,
    };
    setShapes(prev => [...prev, shape]);
    return shape.id;
  }, []);

  const updateShape = useCallback((id: string, updates: Partial<ShapeBlock>) => {
    setShapes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteShape = useCallback((id: string) => {
    setShapes(prev => prev.filter(s => s.id !== id));
  }, []);

  const savePdf = useCallback(async (fileName: string) => {
    if (!pdfBytesRef.current) return;
    setStatus("saving");
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytesRef.current);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      const pagesArr = pdfDoc.getPages();

      const parseColor = (hex: string) => {
        const h = hex.replace("#", "");
        return rgb(parseInt(h.substring(0, 2), 16) / 255, parseInt(h.substring(2, 4), 16) / 255, parseInt(h.substring(4, 6), 16) / 255);
      };

      // Draw whiteouts first
      for (const wo of whiteouts) {
        const page = pagesArr[wo.pageIndex];
        if (!page) continue;
        const { height } = page.getSize();
        page.drawRectangle({
          x: wo.x / scale, y: height - (wo.y / scale) - (wo.height / scale),
          width: wo.width / scale, height: wo.height / scale,
          color: rgb(1, 1, 1),
        });
      }

      // Draw shapes
      for (const shape of shapes) {
        const page = pagesArr[shape.pageIndex];
        if (!page) continue;
        const { height } = page.getSize();
        const sx = shape.x / scale;
        const sy = height - (shape.y / scale) - (shape.height / scale);
        const sw = shape.width / scale;
        const sh = shape.height / scale;
        const strokeColor = parseColor(shape.strokeColor);
        const hasFill = shape.fillColor !== "transparent";
        const fillColor = hasFill ? parseColor(shape.fillColor) : undefined;

        if (shape.type === "rectangle") {
          page.drawRectangle({ x: sx, y: sy, width: sw, height: sh, borderColor: strokeColor, borderWidth: shape.strokeWidth / scale, color: fillColor });
        } else if (shape.type === "circle") {
          page.drawEllipse({ x: sx + sw / 2, y: sy + sh / 2, xScale: sw / 2, yScale: sh / 2, borderColor: strokeColor, borderWidth: shape.strokeWidth / scale, color: fillColor });
        } else if (shape.type === "line" || shape.type === "arrow") {
          page.drawLine({ start: { x: sx, y: sy + sh }, end: { x: sx + sw, y: sy }, thickness: shape.strokeWidth / scale, color: strokeColor });
        }
      }

      // Draw text blocks
      const blocksToProcess = textBlocks.filter(b => b.isModified || !b.isOriginal);
      for (const block of blocksToProcess) {
        const page = pagesArr[block.pageIndex];
        if (!page) continue;
        const { height } = page.getSize();
        const fontSize = block.fontSize / scale;
        const x = block.x / scale;
        const y = height - (block.y / scale) - fontSize;

        let font = helveticaFont;
        if (block.bold && block.italic) font = helveticaBoldOblique;
        else if (block.bold) font = helveticaBold;
        else if (block.italic) font = helveticaOblique;

        if (block.isOriginal && block.isModified) {
          const textWidth = font.widthOfTextAtSize(block.originalText, fontSize);
          page.drawRectangle({ x: x - 2, y: y - 2, width: textWidth + 4, height: fontSize + 4, color: rgb(1, 1, 1) });
        }

        page.drawText(block.text, { x, y, size: fontSize, font, color: parseColor(block.color) });
      }

      // Embed images
      for (const imgBlock of images) {
        const page = pagesArr[imgBlock.pageIndex];
        if (!page) continue;
        const { height } = page.getSize();
        try {
          const imgBytes = await fetch(imgBlock.src).then(r => r.arrayBuffer());
          let embeddedImg;
          if (imgBlock.src.includes("image/png")) {
            embeddedImg = await pdfDoc.embedPng(imgBytes);
          } else {
            embeddedImg = await pdfDoc.embedJpg(imgBytes);
          }
          page.drawImage(embeddedImg, {
            x: imgBlock.x / scale,
            y: height - (imgBlock.y / scale) - (imgBlock.height / scale),
            width: imgBlock.width / scale,
            height: imgBlock.height / scale,
          });
        } catch (e) {
          console.error("Image embed error:", e);
        }
      }

      const modifiedPdfBytes = await pdfDoc.save();
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
  }, [textBlocks, whiteouts, images, shapes, scale]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setPages([]);
    setTextBlocks([]);
    setWhiteouts([]);
    setImages([]);
    setShapes([]);
    setCurrentPage(0);
    setActiveTool("select");
    pdfDocRef.current = null;
    pdfBytesRef.current = null;
  }, []);

  return {
    status, error, pages, textBlocks, whiteouts, images, shapes,
    currentPage, scale, activeTool,
    setCurrentPage, setScale: changeScale, setActiveTool,
    loadPdf, updateTextBlock, addTextBlock, deleteTextBlock,
    addWhiteout, deleteWhiteout,
    addImage, updateImage, deleteImage,
    addShape, updateShape, deleteShape,
    savePdf, reset,
  };
};
