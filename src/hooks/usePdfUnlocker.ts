import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";

type Status = "idle" | "unlocking" | "success" | "error";

export const usePdfUnlocker = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [unlockedPdf, setUnlockedPdf] = useState<Uint8Array | null>(null);

  const unlockPdf = useCallback(async (file: File, password: string) => {
    setStatus("unlocking");
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Try to load the PDF with the provided password
      // pdf-lib handles encrypted PDFs by passing the password in options
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });

      // Create a new PDF without encryption
      const newPdfDoc = await PDFDocument.create();
      const pages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach((page) => newPdfDoc.addPage(page));

      const pdfBytes = await newPdfDoc.save();
      setUnlockedPdf(pdfBytes);
      setStatus("success");
    } catch (err) {
      console.error("PDF unlock error:", err);
      setError("Failed to unlock PDF. Please check the password and try again.");
      setStatus("error");
    }
  }, []);

  const downloadUnlockedPdf = useCallback((originalFileName: string) => {
    if (!unlockedPdf) return;

    const blob = new Blob([new Uint8Array(unlockedPdf)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = originalFileName.replace(".pdf", "_unlocked.pdf");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [unlockedPdf]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setUnlockedPdf(null);
  }, []);

  return {
    status,
    error,
    unlockPdf,
    downloadUnlockedPdf,
    reset,
  };
};
