// Lightweight PDF validation. Checks extension/MIME AND the "%PDF-" magic bytes
// so a renamed .exe or corrupted file is rejected before any pdf-lib/pdfjs parsing.

const MAX_PDF_BYTES = 200 * 1024 * 1024; // 200 MB safety cap

export interface PdfValidationResult {
  ok: boolean;
  reason?: string;
}

export const validatePdfFile = async (file: File): Promise<PdfValidationResult> => {
  if (!file) {
    return { ok: false, reason: "No file provided." };
  }

  if (file.size === 0) {
    return { ok: false, reason: `"${file.name}" is empty (0 bytes).` };
  }

  if (file.size > MAX_PDF_BYTES) {
    return {
      ok: false,
      reason: `"${file.name}" is too large. Maximum size is ${MAX_PDF_BYTES / 1024 / 1024} MB.`,
    };
  }

  const hasPdfExt = /\.pdf$/i.test(file.name);
  const hasPdfMime = file.type === "application/pdf" || file.type === "";
  if (!hasPdfExt && !hasPdfMime) {
    return {
      ok: false,
      reason: `"${file.name}" is not a PDF file (type: ${file.type || "unknown"}).`,
    };
  }

  // Verify the PDF magic bytes: every valid PDF starts with "%PDF-".
  try {
    const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const signature = String.fromCharCode(...head);
    if (signature !== "%PDF-") {
      return {
        ok: false,
        reason: `"${file.name}" is not a valid PDF (missing PDF header).`,
      };
    }
  } catch {
    return { ok: false, reason: `Could not read "${file.name}".` };
  }

  return { ok: true };
};

export const partitionValidPdfs = async (
  files: File[]
): Promise<{ valid: File[]; invalid: Array<{ file: File; reason: string }> }> => {
  const results = await Promise.all(
    files.map(async (file) => ({ file, result: await validatePdfFile(file) }))
  );
  return {
    valid: results.filter((r) => r.result.ok).map((r) => r.file),
    invalid: results
      .filter((r) => !r.result.ok)
      .map((r) => ({ file: r.file, reason: r.result.reason ?? "Invalid PDF." })),
  };
};
