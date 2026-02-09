import { motion } from "framer-motion";
import {
  ZoomIn, ZoomOut, Type, Save, ChevronLeft, ChevronRight, RotateCcw,
  MousePointer2, Eraser, Image, Square, Circle, Minus, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import type { EditorTool } from "@/hooks/usePdfEditor";

interface EditorToolbarProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  activeTool: EditorTool;
  isSaving: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetTool: (tool: EditorTool) => void;
  onSave: () => void;
  onReset: () => void;
}

const tools: { tool: EditorTool; icon: React.ElementType; label: string }[] = [
  { tool: "select", icon: MousePointer2, label: "Select" },
  { tool: "text", icon: Type, label: "Text" },
  { tool: "whiteout", icon: Eraser, label: "Whiteout" },
  { tool: "image", icon: Image, label: "Image" },
  { tool: "rectangle", icon: Square, label: "Rectangle" },
  { tool: "circle", icon: Circle, label: "Circle" },
  { tool: "line", icon: Minus, label: "Line" },
  { tool: "arrow", icon: ArrowRight, label: "Arrow" },
];

export const EditorToolbar = ({
  currentPage, totalPages, scale, activeTool, isSaving,
  onPrevPage, onNextPage, onZoomIn, onZoomOut, onSetTool, onSave, onReset,
}: EditorToolbarProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-20 z-40 bg-card border border-border rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3"
    >
      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onPrevPage} disabled={currentPage === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium min-w-[80px] text-center">
          Page {currentPage + 1} / {totalPages}
        </span>
        <Button variant="outline" size="icon" onClick={onNextPage} disabled={currentPage === totalPages - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onZoomOut}><ZoomOut className="w-4 h-4" /></Button>
        <span className="text-sm font-medium min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
        <Button variant="outline" size="icon" onClick={onZoomIn}><ZoomIn className="w-4 h-4" /></Button>
      </div>

      <Separator orientation="vertical" className="h-8 hidden md:block" />

      {/* Tools */}
      <div className="flex items-center gap-1 flex-wrap">
        {tools.map(({ tool, icon: Icon, label }) => (
          <Button
            key={tool}
            variant={activeTool === tool ? "default" : "ghost"}
            size="sm"
            onClick={() => onSetTool(tool)}
            className={cn("gap-1.5 h-8 px-2", activeTool === tool && "bg-primary text-primary-foreground")}
            title={label}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden lg:inline text-xs">{label}</span>
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-8 hidden md:block" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2 bg-primary hover:bg-primary/90">
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save PDF"}</span>
        </Button>
      </div>
    </motion.div>
  );
};
