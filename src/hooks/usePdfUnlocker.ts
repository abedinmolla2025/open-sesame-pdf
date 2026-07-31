import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import type { UnlockPhase } from "@/components/UnlockProgress";

type Status = "idle" | "unlocking" | "success" | "error";

interface ProgressInfo {
  currentPage: number;
  totalPages: number;
  percentage: number;
  phase: UnlockPhase;
}

export interface UnlockError {
  title: string;
  detail: string;
  hint?: string;
}

export const usePdfUnlocker = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<UnlockError | null>(null);
  const [unlockedPdf, setUnlockedPdf] = useState<Uint8Array | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);

  const unlockPdf = useCallback(async (file: File, password: string) => {
    setStatus("unlocking");
    setError(null);
    setUnlockedPdf(null);
    setProgress({ currentPage: 0, totalPages: 0, percentage: 2, phase: "reading" });

    try {
      if (file.size === 0) {
        throw new Error("EMPTY_FILE");
      }

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const header = new TextDecoder().decode(uint8Array.slice(0, 1024));
      if (!header.includes("%PDF-")) {
        throw new Error("NOT_A_PDF");
      }

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

      setProgress({ currentPage: 0, totalPages: 0, percentage: 8, phase: "decrypting" });

      const loadingTask = pdfjsLib.getDocument({ data: uint8Array, password });
      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;

      setProgress({ currentPage: 0, totalPages, percentage: 12, phase: "rebuilding" });

      const newPdfDoc = await PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        setProgress({
          currentPage: i,
          totalPages,
          percentage: 12 + Math.round((i / totalPages) * 83),
          phase: "rebuilding",
        });

        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("NO_CANVAS");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        } as Parameters<typeof page.render>[0]).promise;

        const pngDataUrl = canvas.toDataURL("image/png");
        const pngBytes = await fetch(pngDataUrl).then((res) => res.arrayBuffer());

        const pngImage = await newPdfDoc.embedPng(pngBytes);
        const pdfPage = newPdfDoc.addPage([viewport.width / 2, viewport.height / 2]);

        pdfPage.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: viewport.width / 2,
          height: viewport.height / 2,
        });
      }

      setProgress({ currentPage: totalPages, totalPages, percentage: 97, phase: "saving" });

      const pdfBytes = await newPdfDoc.save();
      setUnlockedPdf(pdfBytes);
      setStatus("success");
      setProgress(null);
    } catch (err: unknown) {
      setProgress(null);
      setError(describeError(err));
      setStatus("error");
    }
  }, []);

  const downloadUnlockedPdf = useCallback((originalFileName: string) => {
    if (!unlockedPdf) return;

    const blob = new Blob([new Uint8Array(unlockedPdf)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = originalFileName.replace(/\.pdf$/i, "") + "_unlocked.pdf";
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
    unlockedPdf,
    unlockPdf,
    downloadUnlockedPdf,
    reset,
  };
};

function describeError(err: unknown): UnlockError {
  const name = (err as { name?: string })?.name ?? "";
  const message = err instanceof Error ? err.message : String(err);

  if (message === "EMPTY_FILE") {
    return {
      title: "That file is empty",
      detail: "The selected file contains no data.",
      hint: "Pick the PDF again — it may still have been copying or syncing.",
    };
  }

  if (message === "NOT_A_PDF") {
    return {
      title: "This isn’t a PDF",
      detail: "The file doesn’t start with a valid PDF header.",
      hint: "Make sure you selected a .pdf file and not a renamed image or archive.",
    };
  }

  if (message === "NO_CANVAS") {
    return {
      title: "Your browser blocked rendering",
      detail: "A drawing canvas could not be created, so pages can’t be rebuilt.",
      hint: "Try a different browser, or disable strict privacy/canvas-blocking extensions.",
    };
  }

  if (name === "PasswordException" || /incorrect password/i.test(message)) {
    return {
      title: "Incorrect password",
      detail: "The password you entered doesn’t open this PDF.",
      hint: "Passwords are case-sensitive. Check for stray spaces or a different keyboard layout.",
    };
  }

  if (/no password given|password.*required/i.test(message)) {
    return {
      title: "A password is required",
      detail: "This PDF is encrypted and needs its open password.",
      hint: "Enter the password used when the file was protected.",
    };
  }

  if (name === "InvalidPDFException" || /invalid pdf/i.test(message)) {
    return {
      title: "This PDF is damaged",
      detail: "The file structure couldn’t be parsed.",
      hint: "Try re-downloading or re-exporting the original document.",
    };
  }

  if (/encrypt/i.test(message)) {
    return {
      title: "Unsupported encryption",
      detail: "This PDF uses a protection scheme this tool can’t remove.",
      hint: "Certificate-protected and DRM-protected files aren’t supported.",
    };
  }

  if (name === "RangeError" || /out of memory|allocation/i.test(message)) {
    return {
      title: "The file is too large for your browser",
      detail: "Rebuilding this document ran out of memory.",
      hint: "Split the PDF into smaller parts and unlock them one at a time.",
    };
  }

  if (/fetch|network|worker/i.test(message)) {
    return {
      title: "Couldn’t load the PDF engine",
      detail: "A required script failed to load.",
      hint: "Check your connection or ad blocker, then try again.",
    };
  }

  return {
    title: "Unlocking failed",
    detail: message ? `Unexpected error: ${message}` : "An unexpected error occurred.",
    hint: "Double-check the password and try again.",
  };
}
