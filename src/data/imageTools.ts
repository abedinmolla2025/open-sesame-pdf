import {
  Eraser,
  ImageDown,
  Scaling,
  FileImage,
  Sparkles,
  ScanText,
  IdCard,
  FileArchive,
  type LucideIcon,
} from "lucide-react";

export const SITE_URL = "https://free-my-pdf.lovable.app";

export type ToolCategory = "Edit" | "Optimise" | "Convert" | "Enhance" | "Extract";

export interface ImageTool {
  slug: string;
  path: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  category: ToolCategory;
  keywords: string[];
  popular?: boolean;
}

export const IMAGE_TOOLS: ImageTool[] = [
  {
    slug: "background-remover",
    path: "/background-remover",
    name: "Background Remover",
    tagline: "Cut out any subject and download a transparent PNG.",
    description:
      "AI background removal that runs entirely in your browser. Drop a photo, compare before and after, then download a transparent PNG in full resolution.",
    icon: Eraser,
    category: "Edit",
    keywords: ["remove background", "transparent png", "cutout", "product photo"],
    popular: true,
  },
  {
    slug: "image-compress",
    path: "/image-compress",
    name: "Compress Image",
    tagline: "Shrink JPG, PNG and WebP without visible quality loss.",
    description:
      "Batch compress images with a quality slider and optional resizing. See the original size, the compressed size and the exact percentage saved before you download.",
    icon: ImageDown,
    category: "Optimise",
    keywords: ["compress jpg", "reduce image size", "optimise images", "webp compression"],
    popular: true,
  },
  {
    slug: "image-resize",
    path: "/image-resize",
    name: "Resize Image",
    tagline: "Exact pixel sizes plus one-click social presets.",
    description:
      "Resize photos by width and height with an aspect-ratio lock, or pick a ready-made preset for Instagram, Facebook, WhatsApp, YouTube or X.",
    icon: Scaling,
    category: "Edit",
    keywords: ["resize image", "instagram size", "youtube thumbnail size", "crop dimensions"],
    popular: true,
  },
  {
    slug: "webp-converter",
    path: "/webp-converter",
    name: "WebP Converter",
    tagline: "Convert between JPG, PNG, WebP and AVIF in batches.",
    description:
      "Convert whole folders of images between JPG, PNG, WebP and AVIF. Quality control, transparent-background handling and a single ZIP download.",
    icon: FileImage,
    category: "Convert",
    keywords: ["jpg to webp", "webp to png", "avif converter", "batch convert images"],
    popular: true,
  },
  {
    slug: "image-upscale",
    path: "/image-upscale",
    name: "AI Image Upscaler",
    tagline: "Enlarge photos 2x to 8x with sharpening and noise reduction.",
    description:
      "Step-doubling upscaler with unsharp masking and noise reduction, a live progress bar with ETA and saveable presets for repeat work.",
    icon: Sparkles,
    category: "Enhance",
    keywords: ["upscale image", "enlarge photo", "2x 4x upscaler", "enhance resolution"],
    popular: true,
  },
  {
    slug: "image-to-text",
    path: "/image-to-text",
    name: "Image to Text (OCR)",
    tagline: "Extract text from screenshots and scans in 10+ languages.",
    description:
      "On-device OCR for JPG, PNG and WebP. Choose a language, watch the recognition progress, then copy the text or download it as a .txt file.",
    icon: ScanText,
    category: "Extract",
    keywords: ["ocr online", "image to text", "extract text from photo", "scan to text"],
    popular: true,
  },
  {
    slug: "passport-photo",
    path: "/passport-photo",
    name: "Passport Photo Maker",
    tagline: "Compliant passport and visa photos with printable sheets.",
    description:
      "Face-aware cropping guides, background replacement and multi-page A4 or 4x6 print sheets for passport and visa photographs.",
    icon: IdCard,
    category: "Edit",
    keywords: ["passport photo", "visa photo", "id photo maker"],
  },
  {
    slug: "image-to-pdf",
    path: "/image-to-pdf",
    name: "Image to PDF",
    tagline: "Turn JPG, PNG and WebP images into a single PDF.",
    description:
      "Combine images into one PDF with page size, orientation and ordering controls — all processed locally in your browser.",
    icon: FileArchive,
    category: "Convert",
    keywords: ["jpg to pdf", "images to pdf", "photo to pdf"],
  },
];

export const TOOL_CATEGORIES: ToolCategory[] = ["Edit", "Optimise", "Convert", "Enhance", "Extract"];

export function getTool(slug: string): ImageTool | undefined {
  return IMAGE_TOOLS.find((t) => t.slug === slug);
}

export function relatedTools(slug: string, count = 3): ImageTool[] {
  const current = getTool(slug);
  const others = IMAGE_TOOLS.filter((t) => t.slug !== slug);
  const sameCategory = others.filter((t) => t.category === current?.category);
  const rest = others.filter((t) => t.category !== current?.category);
  return [...sameCategory, ...rest].slice(0, count);
}
