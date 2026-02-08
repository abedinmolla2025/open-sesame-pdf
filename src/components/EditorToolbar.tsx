import { motion } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  Type,
  Save,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  isAddingText: boolean;
  isSaving: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleAddText: () => void;
  onSave: () => void;
  onReset: () => void;
}

export const EditorToolbar = ({
  currentPage,
  totalPages,
  scale,
  isAddingText,
  isSaving,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onToggleAddText,
  onSave,
  onReset,
}: EditorToolbarProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-20 z-40 bg-card border border-border rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3"
    >
      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevPage}
          disabled={currentPage === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium min-w-[80px] text-center">
          Page {currentPage + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={onNextPage}
          disabled={currentPage === totalPages - 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="outline" size="icon" onClick={onZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Tools */}
      <div className="flex items-center gap-2">
        <Button
          variant={isAddingText ? "default" : "outline"}
          size="sm"
          onClick={onToggleAddText}
          className={cn("gap-2", isAddingText && "bg-primary text-primary-foreground")}
        >
          <Type className="w-4 h-4" />
          <span className="hidden sm:inline">Add Text</span>
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save PDF"}</span>
        </Button>
      </div>
    </motion.div>
  );
};
