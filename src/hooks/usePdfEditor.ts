import { useState, useCallback, useRef } from "react";

// Detect script from text and return appropriate Noto Sans font family
const resolveMultilingualFont = (text: string, pdfFontName: string): string => {
  // Check for specific Unicode script ranges
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    // Bengali (বাংলা)
    if (code >= 0x0980 && code <= 0x09FF) return "'Noto Sans Bengali', 'Noto Sans', sans-serif";
    // Arabic (العربية) + Urdu, Persian
    if (code >= 0x0600 && code <= 0x06FF || code >= 0xFB50 && code <= 0xFDFF || code >= 0xFE70 && code <= 0xFEFF)
      return "'Noto Sans Arabic', 'Noto Sans', sans-serif";
    // Devanagari (हिन्दी, मराठी, संस्कृत)
    if (code >= 0x0900 && code <= 0x097F) return "'Noto Sans Devanagari', 'Noto Sans', sans-serif";
    // Japanese (Hiragana, Katakana, CJK)
    if ((code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF) || (code >= 0x4E00 && code <= 0x9FFF))
      return "'Noto Sans JP', 'Noto Sans', sans-serif";
    // Korean (Hangul)
    if ((code >= 0xAC00 && code <= 0xD7AF) || (code >= 0x1100 && code <= 0x11FF))
      return "'Noto Sans KR', 'Noto Sans', sans-serif";
    // Chinese Simplified (beyond CJK already caught by JP)
    if (code >= 0x4E00 && code <= 0x9FFF) return "'Noto Sans SC', 'Noto Sans', sans-serif";
    // Thai
    if (code >= 0x0E00 && code <= 0x0E7F) return "'Noto Sans Thai', 'Noto Sans', sans-serif";
    // Tamil
    if (code >= 0x0B80 && code <= 0x0BFF) return "'Noto Sans', sans-serif";
    // Telugu
    if (code >= 0x0C00 && code <= 0x0C7F) return "'Noto Sans', sans-serif";
    // Gujarati
    if (code >= 0x0A80 && code <= 0x0AFF) return "'Noto Sans', sans-serif";
    // Gurmukhi (Punjabi)
    if (code >= 0x0A00 && code <= 0x0A7F) return "'Noto Sans', sans-serif";
  }
  // Latin/default — use the PDF's original font with Noto Sans fallback
  return `${pdfFontName}, 'Noto Sans', sans-serif`;
};

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

export interface AnnotationBlock {
  id: string;
  type: "highlight" | "underline" | "strikethrough";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  pageIndex: number;
}

export interface PdfPage {
  pageIndex: number;
  width: number;
  height: number;
  imageUrl: string;
  rotation: number;
  isDeleted: boolean;
}

export interface FreehandPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  pageIndex: number;
}

export type EditorTool = "select" | "text" | "whiteout" | "image" | "rectangle" | "circle" | "line" | "arrow" | "highlight" | "underline" | "strikethrough" | "pen";
type EditorStatus = "idle" | "loading" | "ready" | "saving" | "error";

interface EditorSnapshot {
  textBlocks: TextBlock[];
  deletedOriginals: TextBlock[];
  whiteouts: WhiteoutBlock[];
  images: ImageBlock[];
  shapes: ShapeBlock[];
  annotations: AnnotationBlock[];
  freehandPaths: FreehandPath[];
  pages: PdfPage[];
}

export const usePdfEditor = () => {
  const [status, setStatus] = useState<EditorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [deletedOriginals, setDeletedOriginals] = useState<TextBlock[]>([]);
  const [whiteouts, setWhiteouts] = useState<WhiteoutBlock[]>([]);
  const [images, setImages] = useState<ImageBlock[]>([]);
  const [shapes, setShapes] = useState<ShapeBlock[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationBlock[]>([]);
  const [freehandPaths, setFreehandPaths] = useState<FreehandPath[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const pdfDocRef = useRef<any>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);

  // Undo/Redo
  const historyRef = useRef<EditorSnapshot[]>([]);
  const historyPointerRef = useRef(-1);
  const isRestoringRef = useRef(false);

  const takeSnapshot = useCallback((): EditorSnapshot => ({
    textBlocks: structuredClone(textBlocks),
    deletedOriginals: structuredClone(deletedOriginals),
    whiteouts: structuredClone(whiteouts),
    images: structuredClone(images),
    shapes: structuredClone(shapes),
    annotations: structuredClone(annotations),
    freehandPaths: structuredClone(freehandPaths),
    pages: structuredClone(pages),
  }), [textBlocks, deletedOriginals, whiteouts, images, shapes, annotations, freehandPaths, pages]);

  const pushHistory = useCallback(() => {
    if (isRestoringRef.current) return;
    const snap = takeSnapshot();
    const arr = historyRef.current.slice(0, historyPointerRef.current + 1);
    arr.push(snap);
    if (arr.length > 50) arr.shift();
    historyRef.current = arr;
    historyPointerRef.current = arr.length - 1;
  }, [takeSnapshot]);

  const restoreSnapshot = useCallback((snap: EditorSnapshot) => {
    isRestoringRef.current = true;
    setTextBlocks(snap.textBlocks);
    setDeletedOriginals(snap.deletedOriginals);
    setWhiteouts(snap.whiteouts);
    setImages(snap.images);
    setShapes(snap.shapes);
    setAnnotations(snap.annotations);
    setFreehandPaths(snap.freehandPaths);
    setPages(snap.pages);
    setTimeout(() => { isRestoringRef.current = false; }, 0);
  }, []);

  const undo = useCallback(() => {
    if (historyPointerRef.current <= 0) return;
    // Save current state if at the end
    if (historyPointerRef.current === historyRef.current.length - 1) {
      const snap = takeSnapshot();
      historyRef.current[historyPointerRef.current] = snap;
    }
    historyPointerRef.current -= 1;
    restoreSnapshot(historyRef.current[historyPointerRef.current]);
  }, [takeSnapshot, restoreSnapshot]);

  const redo = useCallback(() => {
    if (historyPointerRef.current >= historyRef.current.length - 1) return;
    historyPointerRef.current += 1;
    restoreSnapshot(historyRef.current[historyPointerRef.current]);
  }, [restoreSnapshot]);

  const canUndo = historyPointerRef.current > 0;
  const canRedo = historyPointerRef.current < historyRef.current.length - 1;

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
        rotation: 0,
        isDeleted: false,
      });

      const textContent = await page.getTextContent();
      textContent.items.forEach((item: any, index: number) => {
        if (item.str && item.str.trim()) {
          const tx = item.transform;
          const x = tx[4] * renderScale;
          const y = viewport.height - (tx[5] * renderScale) - ((item.height || 12) * renderScale);

          // Detect bold/italic from font name
          const fontName = (item.fontName || "").toLowerCase();
          const isBold = fontName.includes("bold") || fontName.includes("black") || fontName.includes("heavy");
          const isItalic = fontName.includes("italic") || fontName.includes("oblique");

          // Extract color from the text style if available
          let textColor = "#000000";
          if (item.color) {
            const c = item.color;
            if (Array.isArray(c) && c.length >= 3) {
              const r = Math.round(c[0] * 255);
              const g = Math.round(c[1] * 255);
              const b = Math.round(c[2] * 255);
              textColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            }
          }

          // Detect script/language from text content for proper font fallback
          const resolvedFontFamily = resolveMultilingualFont(item.str, item.fontName || "Helvetica");

          extractedTextBlocks.push({
            id: `text-${i}-${index}`,
            text: item.str,
            originalText: item.str,
            x, y,
            width: item.width * renderScale,
            height: (item.height || 12) * renderScale,
            fontSize: Math.round((item.height || 12) * renderScale),
            fontFamily: resolvedFontFamily,
            color: textColor,
            bold: isBold,
            italic: isItalic,
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
    setDeletedOriginals([]);
    setWhiteouts([]);
    setImages([]);
    setShapes([]);
    setAnnotations([]);
    setFreehandPaths([]);
    setCurrentPage(0);
    setActiveTool("select");
    historyRef.current = [];
    historyPointerRef.current = -1;

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Store a copy of the bytes for pdf-lib (save), since pdfjs may transfer the buffer
      pdfBytesRef.current = new Uint8Array(arrayBuffer.slice(0));

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      const pdfDoc = await (pdfjsLib.getDocument({ data: arrayBuffer })).promise;
      pdfDocRef.current = pdfDoc;

      const { loadedPages, extractedTextBlocks } = await renderPages(pdfDoc, scale);
      setPages(loadedPages);
      setTextBlocks(extractedTextBlocks);
      setStatus("ready");

      // Initialize history
      setTimeout(() => {
        historyRef.current = [{
          textBlocks: structuredClone(extractedTextBlocks),
          deletedOriginals: [],
          whiteouts: [],
          images: [],
          shapes: [],
          annotations: [],
          freehandPaths: [],
          pages: structuredClone(loadedPages),
        }];
        historyPointerRef.current = 0;
      }, 100);
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

      // Preserve page state (rotation, deletion)
      const updatedPages = loadedPages.map(lp => {
        const existing = pages.find(p => p.pageIndex === lp.pageIndex);
        return existing ? { ...lp, rotation: existing.rotation, isDeleted: existing.isDeleted } : lp;
      });

      setWhiteouts(prev => prev.map(w => ({ ...w, x: w.x * scaleRatio, y: w.y * scaleRatio, width: w.width * scaleRatio, height: w.height * scaleRatio })));
      setImages(prev => prev.map(img => ({ ...img, x: img.x * scaleRatio, y: img.y * scaleRatio, width: img.width * scaleRatio, height: img.height * scaleRatio })));
      setShapes(prev => prev.map(s => ({ ...s, x: s.x * scaleRatio, y: s.y * scaleRatio, width: s.width * scaleRatio, height: s.height * scaleRatio, strokeWidth: s.strokeWidth * scaleRatio })));
      setAnnotations(prev => prev.map(a => ({ ...a, x: a.x * scaleRatio, y: a.y * scaleRatio, width: a.width * scaleRatio, height: a.height * scaleRatio })));

      setPages(updatedPages);
      setTextBlocks([...mergedBlocks, ...newBlocks]);
    } catch (err) {
      console.error("Scale change error:", err);
    }
  }, [pdfDocRef, status, scale, textBlocks, pages, renderPages]);

  const updateTextBlock = useCallback((id: string, updates: Partial<TextBlock>) => {
    pushHistory();
    setTextBlocks(prev => prev.map(block => {
      if (block.id !== id) return block;
      const newBlock = { ...block, ...updates };
      if (updates.text !== undefined && updates.text !== block.originalText) newBlock.isModified = true;
      if (updates.bold !== undefined || updates.italic !== undefined || updates.color !== undefined || updates.fontSize !== undefined) newBlock.isModified = true;
      return newBlock;
    }));
  }, [pushHistory]);

  const addTextBlock = useCallback((pageIndex: number, x: number, y: number) => {
    pushHistory();
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
  }, [pushHistory]);

  const deleteTextBlock = useCallback((id: string) => {
    pushHistory();
    setTextBlocks(prev => {
      const block = prev.find(b => b.id === id);
      if (block && block.isOriginal) {
        setDeletedOriginals(old => [...old, block]);
      }
      return prev.filter(b => b.id !== id);
    });
  }, [pushHistory]);

  // Whiteout
  const addWhiteout = useCallback((pageIndex: number, x: number, y: number, width: number, height: number) => {
    pushHistory();
    const wo: WhiteoutBlock = { id: `wo-${Date.now()}`, x, y, width, height, pageIndex };
    setWhiteouts(prev => [...prev, wo]);
    return wo.id;
  }, [pushHistory]);

  const deleteWhiteout = useCallback((id: string) => {
    pushHistory();
    setWhiteouts(prev => prev.filter(w => w.id !== id));
  }, [pushHistory]);

  // Images
  const addImage = useCallback((pageIndex: number, src: string, x: number, y: number, width: number, height: number) => {
    pushHistory();
    const img: ImageBlock = { id: `img-${Date.now()}`, src, x, y, width, height, pageIndex };
    setImages(prev => [...prev, img]);
    return img.id;
  }, [pushHistory]);

  const updateImage = useCallback((id: string, updates: Partial<ImageBlock>) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  }, []);

  const deleteImage = useCallback((id: string) => {
    pushHistory();
    setImages(prev => prev.filter(img => img.id !== id));
  }, [pushHistory]);

  // Shapes
  const addShape = useCallback((pageIndex: number, type: ShapeType, x: number, y: number, width: number, height: number) => {
    pushHistory();
    const shape: ShapeBlock = {
      id: `shape-${Date.now()}`, type, x, y, width, height,
      strokeColor: "#000000", fillColor: "transparent", strokeWidth: 2, pageIndex,
    };
    setShapes(prev => [...prev, shape]);
    return shape.id;
  }, [pushHistory]);

  const updateShape = useCallback((id: string, updates: Partial<ShapeBlock>) => {
    setShapes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteShape = useCallback((id: string) => {
    pushHistory();
    setShapes(prev => prev.filter(s => s.id !== id));
  }, [pushHistory]);

  // Annotations (highlight, underline, strikethrough)
  const addAnnotation = useCallback((pageIndex: number, type: "highlight" | "underline" | "strikethrough", x: number, y: number, width: number, height: number) => {
    pushHistory();
    const annotation: AnnotationBlock = {
      id: `annot-${Date.now()}`, type, x, y, width, height,
      color: type === "highlight" ? "#FFEB3B" : type === "strikethrough" ? "#F44336" : "#2196F3",
      opacity: type === "highlight" ? 0.35 : 0.8,
      pageIndex,
    };
    setAnnotations(prev => [...prev, annotation]);
    return annotation.id;
  }, [pushHistory]);

  const updateAnnotation = useCallback((id: string, updates: Partial<AnnotationBlock>) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    pushHistory();
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, [pushHistory]);

  // Freehand drawing
  const addFreehandPath = useCallback((pageIndex: number, points: { x: number; y: number }[], color: string = "#000000", strokeWidth: number = 2) => {
    pushHistory();
    const path: FreehandPath = {
      id: `fh-${Date.now()}`, points, color, strokeWidth, pageIndex,
    };
    setFreehandPaths(prev => [...prev, path]);
    return path.id;
  }, [pushHistory]);

  const updateFreehandPath = useCallback((id: string, updates: Partial<FreehandPath>) => {
    setFreehandPaths(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deleteFreehandPath = useCallback((id: string) => {
    pushHistory();
    setFreehandPaths(prev => prev.filter(p => p.id !== id));
  }, [pushHistory]);

  // Page management
  const deletePage = useCallback((pageIndex: number) => {
    pushHistory();
    setPages(prev => prev.map(p => p.pageIndex === pageIndex ? { ...p, isDeleted: true } : p));
    // Move to next available page
    const availablePages = pages.filter(p => !p.isDeleted && p.pageIndex !== pageIndex);
    if (availablePages.length > 0) {
      const nextPage = availablePages.find(p => p.pageIndex > pageIndex) || availablePages[0];
      setCurrentPage(pages.indexOf(nextPage));
    }
  }, [pushHistory, pages]);

  const restorePage = useCallback((pageIndex: number) => {
    pushHistory();
    setPages(prev => prev.map(p => p.pageIndex === pageIndex ? { ...p, isDeleted: false } : p));
  }, [pushHistory]);

  const rotatePage = useCallback((pageIndex: number, degrees: number) => {
    pushHistory();
    setPages(prev => prev.map(p => p.pageIndex === pageIndex ? { ...p, rotation: (p.rotation + degrees) % 360 } : p));
  }, [pushHistory]);

  const movePage = useCallback((fromIndex: number, toIndex: number) => {
    pushHistory();
    setPages(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr.map((p, i) => ({ ...p, pageIndex: i }));
    });
  }, [pushHistory]);

  const savePdf = useCallback(async (fileName: string) => {
    if (!pdfBytesRef.current) return;
    setStatus("saving");
    try {
      const { PDFDocument, rgb, StandardFonts, degrees } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytesRef.current, { ignoreEncryption: true, updateMetadata: false });
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      const pagesArr = pdfDoc.getPages();

      const parseColor = (hex: string) => {
        const h = hex.replace("#", "");
        return rgb(parseInt(h.substring(0, 2), 16) / 255, parseInt(h.substring(2, 4), 16) / 255, parseInt(h.substring(4, 6), 16) / 255);
      };

      // Handle page rotations
      for (const pg of pages) {
        if (pg.rotation !== 0 && pagesArr[pg.pageIndex]) {
          pagesArr[pg.pageIndex].setRotation(degrees(pg.rotation));
        }
      }

      // Remove deleted pages (in reverse to preserve indices)
      const deletedIndices = pages.filter(p => p.isDeleted).map(p => p.pageIndex).sort((a, b) => b - a);
      for (const idx of deletedIndices) {
        if (idx < pdfDoc.getPageCount()) {
          pdfDoc.removePage(idx);
        }
      }

      // Re-get pages after removal
      const finalPages = pdfDoc.getPages();
      // Map original page index to new index after deletions
      const activePages = pages.filter(p => !p.isDeleted);
      const pageIndexMap = new Map<number, number>();
      activePages.forEach((p, i) => pageIndexMap.set(p.pageIndex, i));

      // Whiteout deleted original text blocks
      for (const deleted of deletedOriginals) {
        const newIdx = pageIndexMap.get(deleted.pageIndex);
        if (newIdx === undefined) continue;
        const page = finalPages[newIdx];
        if (!page) continue;
        const { height } = page.getSize();
        const fontSize = deleted.fontSize / scale;
        page.drawRectangle({
          x: (deleted.x / scale) - 2,
          y: height - (deleted.y / scale) - fontSize - 2,
          width: (deleted.width / scale) + 4,
          height: fontSize + 4,
          color: rgb(1, 1, 1),
        });
      }

      // Draw whiteouts
      for (const wo of whiteouts) {
        const newIdx = pageIndexMap.get(wo.pageIndex);
        if (newIdx === undefined) continue;
        const page = finalPages[newIdx];
        if (!page) continue;
        const { height } = page.getSize();
        page.drawRectangle({
          x: wo.x / scale, y: height - (wo.y / scale) - (wo.height / scale),
          width: wo.width / scale, height: wo.height / scale,
          color: rgb(1, 1, 1),
        });
      }

      // Draw annotations
      for (const annot of annotations) {
        const newIdx = pageIndexMap.get(annot.pageIndex);
        if (newIdx === undefined) continue;
        const page = finalPages[newIdx];
        if (!page) continue;
        const { height } = page.getSize();
        const ax = annot.x / scale;
        const ay = height - (annot.y / scale) - (annot.height / scale);
        const aw = annot.width / scale;
        const ah = annot.height / scale;
        const color = parseColor(annot.color);

        if (annot.type === "highlight") {
          page.drawRectangle({ x: ax, y: ay, width: aw, height: ah, color, opacity: annot.opacity });
        } else if (annot.type === "underline") {
          page.drawLine({ start: { x: ax, y: ay }, end: { x: ax + aw, y: ay }, thickness: 2 / scale, color, opacity: annot.opacity });
        } else if (annot.type === "strikethrough") {
          page.drawLine({ start: { x: ax, y: ay + ah / 2 }, end: { x: ax + aw, y: ay + ah / 2 }, thickness: 2 / scale, color, opacity: annot.opacity });
        }
      }

      // Draw freehand paths
      for (const path of freehandPaths) {
        const newIdx = pageIndexMap.get(path.pageIndex);
        if (newIdx === undefined) continue;
        const page = finalPages[newIdx];
        if (!page) continue;
        const { height } = page.getSize();
        const color = parseColor(path.color);
        const pts = path.points;
        for (let i = 0; i < pts.length - 1; i++) {
          page.drawLine({
            start: { x: pts[i].x / scale, y: height - pts[i].y / scale },
            end: { x: pts[i + 1].x / scale, y: height - pts[i + 1].y / scale },
            thickness: path.strokeWidth / scale,
            color,
          });
        }
      }

      // Draw shapes
      for (const shape of shapes) {
        const newIdx = pageIndexMap.get(shape.pageIndex);
        if (newIdx === undefined) continue;
        const page = finalPages[newIdx];
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
        const newIdx = pageIndexMap.get(block.pageIndex);
        if (newIdx === undefined) continue;
        const page = finalPages[newIdx];
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
        const newIdx = pageIndexMap.get(imgBlock.pageIndex);
        if (newIdx === undefined) continue;
        const page = finalPages[newIdx];
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
  }, [textBlocks, deletedOriginals, whiteouts, images, shapes, annotations, freehandPaths, pages, scale]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setPages([]);
    setTextBlocks([]);
    setDeletedOriginals([]);
    setWhiteouts([]);
    setImages([]);
    setShapes([]);
    setAnnotations([]);
    setFreehandPaths([]);
    setCurrentPage(0);
    setActiveTool("select");
    pdfDocRef.current = null;
    pdfBytesRef.current = null;
    historyRef.current = [];
    historyPointerRef.current = -1;
  }, []);

  return {
    status, error, pages, textBlocks, whiteouts, images, shapes, annotations, freehandPaths,
    currentPage, scale, activeTool,
    setCurrentPage, setScale: changeScale, setActiveTool,
    loadPdf, updateTextBlock, addTextBlock, deleteTextBlock,
    addWhiteout, deleteWhiteout,
    addImage, updateImage, deleteImage,
    addShape, updateShape, deleteShape,
    addAnnotation, updateAnnotation, deleteAnnotation,
    addFreehandPath, updateFreehandPath, deleteFreehandPath,
    deletePage, restorePage, rotatePage, movePage,
    undo, redo, canUndo, canRedo,
    savePdf, reset,
  };
};
