import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FileKey,
  ShieldCheck,
  FileEdit,
  ChevronDown,
  Menu,
  FileArchive,
  Combine,
  Scissors,
  FileImage,
  ImageDown,
  IdCard,
  Sparkles,
  CreditCard,
  ShieldAlert,
  LayoutGrid,
  Sun,
  Moon,
  ScanText,
  Eraser,
  Scaling,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { PremiumIconFrame, PremiumLogoGlyph } from "@/components/PremiumIcon";

const navItems = [
  { path: "/image-tools", label: "Image Tools", icon: LayoutGrid, description: "All image tools in one hub" },
  { path: "/background-remover", label: "Background Remover", icon: Eraser, description: "Transparent PNG cutouts" },
  { path: "/image-compress", label: "Compress Image", icon: ImageDown, description: "Shrink JPG/PNG/WebP images" },
  { path: "/image-resize", label: "Resize Image", icon: Scaling, description: "Exact sizes & social presets" },
  { path: "/webp-converter", label: "WebP Converter", icon: FileImage, description: "Convert to and from WebP" },
  { path: "/image-upscale", label: "AI Upscaler", icon: Sparkles, description: "Enlarge photos up to 8x" },
  { path: "/image-to-text", label: "OCR Image to Text", icon: ScanText, description: "Extract text from images" },
  { path: "/passport-photo", label: "Passport Photo", icon: IdCard, description: "Make passport & visa photos" },
  { path: "/unlock-pdf", label: "PDF Unlocker", icon: FileKey, description: "Remove password protection" },
  { path: "/editor", label: "PDF Editor", icon: FileEdit, description: "Edit text in PDFs" },
  { path: "/ai-pdf-assistant", label: "AI PDF Assistant", icon: Sparkles, description: "Summarize, ask and protect PDFs" },
  { path: "/card-print-studio", label: "PVC Card Maker", icon: CreditCard, description: "PAN, Aadhaar & ID card layouts" },
  { path: "/compress", label: "PDF Compressor", icon: FileArchive, description: "Shrink PDF file size" },
  { path: "/merge", label: "PDF Merger", icon: Combine, description: "Combine multiple PDFs" },
  { path: "/split", label: "PDF Splitter", icon: Scissors, description: "Split PDFs by page or range" },
  { path: "/image-to-pdf", label: "Image to PDF", icon: FileImage, description: "Convert JPG/PNG/WebP to PDF" },
  { path: "/signature", label: "Signature Tool", icon: ShieldCheck, description: "Inspect PDF signature fields" },
  { path: "/pdf-security", label: "Security Scan", icon: ShieldAlert, description: "Scan & triage PDF risks" },
];

const primaryNav = [
  { to: "/", label: "Home" },
  { to: "/image-tools", label: "Image Tools" },
  { to: "/compress", label: "PDF Tools" },
  { to: "/image-upscale", label: "AI Tools" },
  { to: "/#blog", label: "Blog" },
  { to: "/#pricing", label: "Pricing" },
];

export const Header = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-2 px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <PremiumIconFrame tone="gold" size="sm" label="Open Sesame PDF logo">
            <PremiumLogoGlyph />
          </PremiumIconFrame>
          <span className="font-display font-bold text-base sm:text-lg truncate">Open Sesame PDF</span>
        </Link>


        <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
          {primaryNav.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                <Menu className="w-4 h-4" />
                <span className="hidden sm:inline">All Tools</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-[70vh] overflow-y-auto">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 w-full cursor-pointer",
                        isActive && "bg-primary/10 text-primary"
                      )}
                    >
                      <PremiumIconFrame tone={isActive ? "gold" : "blue"} size="sm" aria-hidden="true">
                        <item.icon className="w-4 h-4" />
                      </PremiumIconFrame>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex rounded-xl">
            <Link to="/contact">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex rounded-xl">
            <Link to="/image-tools">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
