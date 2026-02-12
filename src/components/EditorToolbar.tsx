import { motion } from "framer-motion";
import {
  ZoomIn, ZoomOut, Type, Save, ChevronLeft, ChevronRight, RotateCcw,
  MousePointer2, Eraser, Image, Square, Circle, Minus, ArrowRight,
  Highlighter, Underline, Strikethrough, Undo2, Redo2, RotateCw,
  Trash2, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EditorTool } from "@/hooks/usePdfEditor";

interface EditorToolbarProps {
  currentPage: number;
  totalPages: number;
  scale: number;
  activeTool: EditorTool;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetTool: (tool: EditorTool) => void;
  onSave: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRotatePage: () => void;
  onDeletePage: () => void;
}

const toolGroups: { tool: EditorTool; icon: React.ElementType; label: string; group: string }[] = [
  { tool: "select", icon: MousePointer2, label: "Select (V)", group: "basic" },
  { tool: "text", icon: Type, label: "Add Text (T)", group: "basic" },
  { tool: "whiteout", icon: Eraser, label: "Whiteout (W)", group: "basic" },
  { tool: "image", icon: Image, label: "Insert Image (I)", group: "basic" },
  { tool: "pen", icon: Pencil, label: "Freehand Pen (P)", group: "basic" },
  { tool: "highlight", icon: Highlighter, label: "Highlight", group: "annotate" },
  { tool: "underline", icon: Underline, label: "Underline", group: "annotate" },
  { tool: "strikethrough", icon: Strikethrough, label: "Strikethrough", group: "annotate" },
  { tool: "rectangle", icon: Square, label: "Rectangle", group: "shape" },
  { tool: "circle", icon: Circle, label: "Circle", group: "shape" },
  { tool: "line", icon: Minus, label: "Line", group: "shape" },
  { tool: "arrow", icon: ArrowRight, label: "Arrow", group: "shape" },
];

export const EditorToolbar = ({
  currentPage, totalPages, scale, activeTool, isSaving,
  canUndo, canRedo,
  onPrevPage, onNextPage, onZoomIn, onZoomOut, onSetTool, onSave, onReset,
  onUndo, onRedo, onRotatePage, onDeletePage,
}: EditorToolbarProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-20 z-40 bg-card border border-border rounded-xl p-2 mb-6 flex flex-wrap items-center gap-1.5"
    >
      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUndo} disabled={!canUndo}>
              <Undo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRedo} disabled={!canRedo}>
              <Redo2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-7" />

      {/* Page Navigation */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrevPage} disabled={currentPage === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs font-medium min-w-[60px] text-center">
          {currentPage + 1} / {totalPages}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNextPage} disabled={currentPage === totalPages - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-7" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut}><ZoomOut className="w-4 h-4" /></Button>
        <span className="text-xs font-medium min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn}><ZoomIn className="w-4 h-4" /></Button>
      </div>

      <Separator orientation="vertical" className="h-7" />

      {/* Tools */}
      <div className="flex items-center gap-0.5 flex-wrap">
        {toolGroups.map(({ tool, icon: Icon, label, group }, i) => {
          const prevGroup = i > 0 ? toolGroups[i - 1].group : null;
          const showSep = prevGroup && prevGroup !== group;
          return (
            <div key={tool} className="flex items-center">
              {showSep && <Separator orientation="vertical" className="h-5 mx-0.5" />}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeTool === tool ? "default" : "ghost"}
                    size="icon"
                    className={cn("h-8 w-8", activeTool === tool && "bg-primary text-primary-foreground")}
                    onClick={() => onSetTool(tool)}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>

      <Separator orientation="vertical" className="h-7" />

      {/* Page management */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRotatePage}>
              <RotateCw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rotate Page</TooltipContent>
        </Tooltip>
        {totalPages > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDeletePage}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Page</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5 h-8">
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Reset</span>
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-1.5 h-8 bg-primary hover:bg-primary/90">
          <Save className="w-3.5 h-3.5" />
          <span className="text-xs">{isSaving ? "Saving..." : "Save PDF"}</span>
        </Button>
      </div>
    </motion.div>
  );
};
