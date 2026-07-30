import { Link, useLocation } from "react-router-dom";
import { FileKey, ShieldCheck, FileEdit, ChevronDown, Menu, FileArchive, Combine, Scissors, FileImage, ImageDown, IdCard, Sparkles, ShieldAlert, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/image-tools", label: "Image Tools", icon: LayoutGrid, description: "All image tools in one hub" },
  { path: "/", label: "PDF Unlocker", icon: FileKey, description: "Remove password protection" },

  { path: "/editor", label: "PDF Editor", icon: FileEdit, description: "Edit text in PDFs" },
  { path: "/compress", label: "PDF Compressor", icon: FileArchive, description: "Shrink PDF file size" },
  { path: "/merge", label: "PDF Merger", icon: Combine, description: "Combine multiple PDFs" },
  { path: "/split", label: "PDF Splitter", icon: Scissors, description: "Split PDFs by page or range" },
  { path: "/image-to-pdf", label: "Image to PDF", icon: FileImage, description: "Convert JPG/PNG/WebP to PDF" },
  { path: "/image-compress", label: "Image Compressor", icon: ImageDown, description: "Shrink JPG/PNG/WebP images" },
  { path: "/image-upscale", label: "Image Upscaler", icon: Sparkles, description: "Enlarge photos up to 8x" },
  { path: "/passport-photo", label: "Passport Photo", icon: IdCard, description: "Make passport & visa photos" },
  { path: "/signature", label: "Signature Tool", icon: ShieldCheck, description: "Verify & sign PDFs" },
  { path: "/pdf-security", label: "Security Scan", icon: ShieldAlert, description: "Scan & triage PDF risks" },
];

export const Header = () => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FileKey className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">PDF Tools</span>
        </Link>

        {/* Desktop Navigation — primary links only, rest live in the dropdown */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* All tools dropdown */}
        <div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Menu className="w-4 h-4" />
                <span>All Tools</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
                      <item.icon className="w-4 h-4" />
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
        </div>
      </div>
    </header>
  );
};
