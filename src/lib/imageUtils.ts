export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/bmp",
];

export const MAX_IMAGE_BYTES = 30 * 1024 * 1024;

export interface ImageValidation {
  ok: boolean;
  reason?: string;
}

export function validateImageFile(file: File, accept: string[] = IMAGE_MIME_TYPES): ImageValidation {
  if (file.size === 0) return { ok: false, reason: `${file.name} is empty.` };
  if (file.size > MAX_IMAGE_BYTES)
    return { ok: false, reason: `${file.name} is larger than 30 MB.` };
  if (!file.type.startsWith("image/"))
    return { ok: false, reason: `${file.name} is not an image file.` };
  if (!accept.includes(file.type))
    return { ok: false, reason: `${file.name} uses an unsupported format (${file.type}).` };
  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function loadImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode this image."));
    };
    img.src = url;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed."))),
      type,
      quality
    );
  });
}

export async function supportsType(type: string): Promise<boolean> {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  try {
    const blob = await canvasToBlob(canvas, type, 0.8);
    return blob.type === type;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function replaceExtension(name: string, ext: string): string {
  return `${name.replace(/\.[^.]+$/, "")}.${ext}`;
}
