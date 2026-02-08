import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { FileEdit, Upload, AlertCircle, Info } from "lucide-react";
import { Layout } from "@/components/Layout";
import { DropZone } from "@/components/DropZone";
import { PdfEditorCanvas } from "@/components/PdfEditorCanvas";
import { EditorToolbar } from "@/components/EditorToolbar";
import { usePdfEditor } from "@/hooks/usePdfEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Editor = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);

  const {
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
  } = usePdfEditor();

  const handleFileSelect = useCallback(
    (file: File) => {
      setSelectedFile(file);
      loadPdf(file);
    },
    [loadPdf]
  );

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setIsAddingText(false);
    reset();
  }, [reset]);

  const handleSave = useCallback(() => {
    if (selectedFile) {
      savePdf(selectedFile.name);
    }
  }, [selectedFile, savePdf]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 0));
  const handleNextPage = () =>
    setCurrentPage((p) => Math.min(p + 1, pages.length - 1));

  return (
    <Layout>
      <div className="relative overflow-hidden min-h-screen">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-12">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <FileEdit className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Edit & Modify
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display mb-6">
              <span className="gradient-text">PDF Editor</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Add, edit, and modify text in your PDF documents. 
              Click anywhere to add new text blocks.
            </p>
          </motion.header>

          {/* Main Editor */}
          {status === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-2xl mx-auto"
            >
              <div className="glass-card p-6 md:p-8">
                <DropZone
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  onClear={handleClear}
                />

                <Alert className="mt-6 border-primary/20 bg-primary/5">
                  <Info className="w-4 h-4 text-primary" />
                  <AlertDescription className="text-muted-foreground">
                    <strong className="text-foreground">Tips:</strong> Double-click on text to edit. 
                    Drag text blocks to reposition. Use "Add Text" to insert new text anywhere.
                  </AlertDescription>
                </Alert>
              </div>
            </motion.div>
          )}

          {status === "loading" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Loading PDF...</p>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto"
            >
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="text-center mt-4">
                <button
                  onClick={handleClear}
                  className="text-primary hover:underline"
                >
                  Try another file
                </button>
              </div>
            </motion.div>
          )}

          {(status === "ready" || status === "saving") && pages.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-6xl mx-auto"
            >
              <EditorToolbar
                currentPage={currentPage}
                totalPages={pages.length}
                scale={scale}
                isAddingText={isAddingText}
                isSaving={status === "saving"}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onToggleAddText={() => setIsAddingText(!isAddingText)}
                onSave={handleSave}
                onReset={handleClear}
              />

              {/* PDF Canvas */}
              <div className="overflow-auto pb-10">
                <PdfEditorCanvas
                  page={pages[currentPage]}
                  textBlocks={textBlocks}
                  onUpdateTextBlock={updateTextBlock}
                  onAddTextBlock={addTextBlock}
                  onDeleteTextBlock={deleteTextBlock}
                  isAddingText={isAddingText}
                />
              </div>

              {/* Page Thumbnails */}
              {pages.length > 1 && (
                <div className="flex gap-2 justify-center mt-6 overflow-x-auto pb-4">
                  {pages.map((page, index) => (
                    <button
                      key={page.pageIndex}
                      onClick={() => setCurrentPage(index)}
                      className={`flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all ${
                        currentPage === index
                          ? "border-primary shadow-lg"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={page.imageUrl}
                        alt={`Page ${index + 1}`}
                        className="h-20 w-auto"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Editor;
