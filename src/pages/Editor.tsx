import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { FileEdit, AlertCircle, Info } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DropZone } from "@/components/DropZone";
import { PdfEditorCanvas } from "@/components/PdfEditorCanvas";
import { EditorToolbar } from "@/components/EditorToolbar";
import { usePdfEditor } from "@/hooks/usePdfEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePageHead } from "@/hooks/usePageHead";

const CRUMBS = [
  { name: "Home", to: "/" },
  { name: "PDF Editor" },
];

const CRUMB_LD = [
  { name: "Home", url: "https://free-my-pdf.lovable.app/" },
  { name: "PDF Editor", url: "https://free-my-pdf.lovable.app/editor" },
];

const Editor = () => {
  usePageHead({
    title: "PDF Editor — Edit Text & Annotate PDFs | Free My PDF",
    description: "Edit PDF text, add whiteouts, shapes, images, and annotations right in your browser. No uploads, 100% private.",
    canonical: "https://free-my-pdf.lovable.app/editor",
    type: "website",
    breadcrumbs: CRUMB_LD,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Free My PDF Editor",
      applicationCategory: "Utility",
      operatingSystem: "Any",
      url: "https://free-my-pdf.lovable.app/editor",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    status, error, pages, textBlocks, whiteouts, images, shapes, annotations, freehandPaths,
    currentPage, scale, activeTool,
    setCurrentPage, setScale, setActiveTool,
    loadPdf, updateTextBlock, addTextBlock, deleteTextBlock,
    addWhiteout, deleteWhiteout,
    addImage, updateImage, deleteImage,
    addShape, updateShape, deleteShape,
    addAnnotation, updateAnnotation, deleteAnnotation,
    addFreehandPath, updateFreehandPath, deleteFreehandPath,
    deletePage, rotatePage,
    undo, redo, canUndo, canRedo,
    savePdf, reset,
  } = usePdfEditor();

  const handleFileSelect = useCallback((file: File) => { setSelectedFile(file); loadPdf(file); }, [loadPdf]);
  const handleClear = useCallback(() => { setSelectedFile(null); reset(); }, [reset]);
  const handleSave = useCallback(() => { if (selectedFile) savePdf(selectedFile.name); }, [selectedFile, savePdf]);
  const handleZoomIn = () => setScale(Math.min(scale + 0.25, 3));
  const handleZoomOut = () => setScale(Math.max(scale - 0.25, 0.5));

  const activePages = pages.filter(p => !p.isDeleted);
  const handlePrevPage = () => {
    const idx = activePages.findIndex(p => p === pages[currentPage]);
    if (idx > 0) setCurrentPage(pages.indexOf(activePages[idx - 1]));
  };
  const handleNextPage = () => {
    const idx = activePages.findIndex(p => p === pages[currentPage]);
    if (idx < activePages.length - 1) setCurrentPage(pages.indexOf(activePages[idx + 1]));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, handleSave]);

  const currentPageData = pages[currentPage];
  const isPageDeleted = currentPageData?.isDeleted;

  return (
    <Layout>
      <div className="relative min-h-screen">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">

          <Breadcrumbs items={CRUMBS} className="mb-6" />
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <FileEdit className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Edit & Modify</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4">
              <span className="gradient-text">PDF Editor</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              Edit text, add images, draw shapes, highlight, and whiteout content in your PDF.
            </p>
          </motion.header>

          {status === "idle" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="max-w-2xl mx-auto">
              <div className="glass-card p-6 md:p-8">
                <DropZone onFileSelect={handleFileSelect} selectedFile={selectedFile} onClear={handleClear} />
                <Alert className="mt-6 border-primary/20 bg-primary/5">
                  <Info className="w-4 h-4 text-primary" />
                  <AlertDescription className="text-muted-foreground text-sm">
                    <strong className="text-foreground">Tips:</strong> Click text to select, double-click to edit. Use Ctrl+Z/Y for undo/redo. Tools: whiteout, shapes, highlight, images.
                  </AlertDescription>
                </Alert>
              </div>
            </motion.div>
          )}

          {status === "loading" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Loading PDF...</p>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="text-center mt-4">
                <button onClick={handleClear} className="text-primary hover:underline">Try another file</button>
              </div>
            </motion.div>
          )}

          {(status === "ready" || status === "saving") && pages.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
              <EditorToolbar
                currentPage={activePages.findIndex(p => p === pages[currentPage])}
                totalPages={activePages.length}
                scale={scale}
                activeTool={activeTool}
                isSaving={status === "saving"}
                canUndo={canUndo}
                canRedo={canRedo}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onSetTool={setActiveTool}
                onSave={handleSave}
                onReset={handleClear}
                onUndo={undo}
                onRedo={redo}
                onRotatePage={() => rotatePage(pages[currentPage].pageIndex, 90)}
                onDeletePage={() => deletePage(pages[currentPage].pageIndex)}
              />

              {isPageDeleted ? (
                <div className="text-center py-20 text-muted-foreground">
                  <p className="text-lg mb-2">This page has been deleted.</p>
                  <button onClick={() => { /* restorePage handled via undo */ undo(); }} className="text-primary hover:underline text-sm">Undo to restore</button>
                </div>
              ) : currentPageData && (
                <div className="bg-muted/30 rounded-xl border border-border p-4 overflow-auto max-h-[70vh]">
                  <div className="min-w-fit" style={{ transform: currentPageData.rotation ? `rotate(${currentPageData.rotation}deg)` : undefined }}>
                    <PdfEditorCanvas
                      page={currentPageData}
                      textBlocks={textBlocks}
                      whiteouts={whiteouts}
                      images={images}
                      shapes={shapes}
                      annotations={annotations}
                      freehandPaths={freehandPaths}
                      activeTool={activeTool}
                      onUpdateTextBlock={updateTextBlock}
                      onAddTextBlock={addTextBlock}
                      onDeleteTextBlock={deleteTextBlock}
                      onAddWhiteout={addWhiteout}
                      onDeleteWhiteout={deleteWhiteout}
                      onAddImage={addImage}
                      onUpdateImage={updateImage}
                      onDeleteImage={deleteImage}
                      onAddShape={addShape}
                      onUpdateShape={updateShape}
                      onDeleteShape={deleteShape}
                      onAddAnnotation={addAnnotation}
                      onUpdateAnnotation={updateAnnotation}
                      onDeleteAnnotation={deleteAnnotation}
                      onAddFreehandPath={addFreehandPath}
                      onUpdateFreehandPath={updateFreehandPath}
                      onDeleteFreehandPath={deleteFreehandPath}
                    />
                  </div>
                </div>
              )}

              {/* Page thumbnails */}
              {pages.length > 1 && (
                <div className="flex gap-2 justify-center mt-6 overflow-x-auto pb-4">
                  {pages.map((page, index) => (
                    <button
                      key={`thumb-${index}`}
                      onClick={() => !page.isDeleted && setCurrentPage(index)}
                      className={`flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all relative ${
                        page.isDeleted ? "opacity-30 grayscale" :
                        currentPage === index ? "border-primary shadow-lg" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img src={page.imageUrl} alt={`Page ${index + 1}`} className="h-16 w-auto" style={{ transform: page.rotation ? `rotate(${page.rotation}deg)` : undefined }} />
                      {page.isDeleted && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                          <span className="text-[10px] font-bold text-destructive">DELETED</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {(textBlocks.some(b => b.isModified) || whiteouts.length > 0 || images.length > 0 || shapes.length > 0 || annotations.length > 0 || freehandPaths.length > 0 || pages.some(p => p.isDeleted || p.rotation !== 0)) && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full mr-2" />
                  You have unsaved changes
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Editor;
