import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";

type Status = "idle" | "unlocking" | "success" | "error";

interface ProgressInfo {
  currentPage: number;
  totalPages: number;
  percentage: number;
}

export const usePdfUnlocker = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [unlockedPdf, setUnlockedPdf] = useState<Uint8Array | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);

  const unlockPdf = useCallback(async (file: File, password: string) => {
    setStatus("unlocking");
    setError(null);
    setProgress({ currentPage: 0, totalPages: 0, percentage: 0 });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Dynamically import pdfjs-dist to avoid top-level await issues
      const pdfjsLib = await import("pdfjs-dist");
      
      // Set the worker source for PDF.js
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

      // Step 1: Use PDF.js to decrypt the password-protected PDF
      console.log("Loading PDF with password...");
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        password: password,
      });

      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;
      console.log(`PDF loaded successfully. Pages: ${totalPages}`);
      
      setProgress({ currentPage: 0, totalPages, percentage: 0 });

      // Step 2: Create a new unencrypted PDF using pdf-lib
      const newPdfDoc = await PDFDocument.create();

      // Step 3: Render each page to canvas and embed as image
      for (let i = 1; i <= totalPages; i++) {
        console.log(`Processing page ${i}/${totalPages}`);
        setProgress({ 
          currentPage: i, 
          totalPages, 
          percentage: Math.round((i / totalPages) * 100) 
        });
        
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2 }); // Higher scale for better quality

        // Create a canvas to render the page
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not get canvas context");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render the page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Convert canvas to PNG
        const pngDataUrl = canvas.toDataURL("image/png");
        const pngBytes = await fetch(pngDataUrl).then((res) => res.arrayBuffer());
        
        // Embed the image in the new PDF
        const pngImage = await newPdfDoc.embedPng(pngBytes);
        const pdfPage = newPdfDoc.addPage([viewport.width / 2, viewport.height / 2]);
        
        pdfPage.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: viewport.width / 2,
          height: viewport.height / 2,
        });
      }

      // Save the new PDF
      const pdfBytes = await newPdfDoc.save();
      setUnlockedPdf(pdfBytes);
      setStatus("success");
      setProgress(null);
      console.log("PDF unlocked successfully!");
    } catch (err: unknown) {
      console.error("PDF unlock error:", err);
      setProgress(null);
      
      // Check for specific PDF.js errors
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (errorMessage.includes("Incorrect Password") || errorMessage.includes("password")) {
        setError("Incorrect password. Please try again.");
      } else if (errorMessage.includes("Invalid PDF")) {
        setError("Invalid PDF file. Please select a valid PDF.");
      } else {
        setError("Failed to unlock PDF. Please check the password and try again.");
      }
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
    setProgress(null);
  }, []);

  return {
    status,
    error,
    progress,
    unlockPdf,
    downloadUnlockedPdf,
    reset,
  };
};
