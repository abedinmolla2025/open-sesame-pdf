import { Link } from "react-router-dom";
import { FileKey } from "lucide-react";
import { IMAGE_TOOLS } from "@/data/imageTools";

const legal = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Use" },
  { to: "/disclaimer", label: "Disclaimer" },
  { to: "/#blog", label: "Blog" },
  { to: "/sitemap.xml", label: "Sitemap" },
];

const pdfTools = [
  { to: "/unlock-pdf", label: "PDF Unlocker" },
  { to: "/editor", label: "PDF Editor" },
  { to: "/compress", label: "PDF Compressor" },
  { to: "/merge", label: "PDF Merger" },
  { to: "/split", label: "PDF Splitter" },
  { to: "/pdf-security", label: "PDF Security Scan" },
];

export const Footer = () => (
  <footer className="mt-20 border-t border-border bg-card/30">
    <div className="container px-4 md:px-8 py-10 md:py-12 grid gap-8 sm:grid-cols-2 md:gap-10 md:grid-cols-4">
      <div>
        <Link to="/" className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FileKey className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold">Open Sesame PDF</span>
        </Link>
        <p className="text-sm text-muted-foreground">
          Open Sesame PDF is a free browser-based toolkit to merge, split, compress, edit and unlock
          PDFs, and to remove backgrounds, resize, convert and upscale images. Every tool runs
          locally with WebAssembly — no uploads, no accounts, no watermarks.
        </p>
      </div>

      <nav aria-label="Image tools">
        <h2 className="font-medium mb-3 text-sm">Image tools</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {IMAGE_TOOLS.slice(0, 6).map((t) => (
            <li key={t.slug}>
              <Link to={t.path} className="hover:text-foreground transition-colors">
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="PDF tools">
        <h2 className="font-medium mb-3 text-sm">PDF tools</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {pdfTools.map((t) => (
            <li key={t.to}>
              <Link to={t.to} className="hover:text-foreground transition-colors">
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Company">
        <h2 className="font-medium mb-3 text-sm">Company</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {legal.map((t) =>
            t.to.endsWith(".xml") ? (
              <li key={t.to}>
                <a href={t.to} className="hover:text-foreground transition-colors">
                  {t.label}
                </a>
              </li>
            ) : (
              <li key={t.to}>
                <Link to={t.to} className="hover:text-foreground transition-colors">
                  {t.label}
                </Link>
              </li>
            )
          )}
        </ul>
      </nav>
    </div>
    <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} Open Sesame PDF. All processing happens locally in your browser.
    </div>
  </footer>
);
