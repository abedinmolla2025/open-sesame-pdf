import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ZoomIn, ZoomOut, Type, Save, ChevronLeft, ChevronRight, RotateCcw,
  MousePointer2, Eraser, Image, Square, Circle, Minus, ArrowRight,
  Highlighter, Underline, Strikethrough, Undo2, Redo2, RotateCw,
  Trash2, Pencil, ChevronDown,
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
  { tool: "select", icon: MousePointer2, label: "Select", group: "basic" },
  { tool: "text", icon: Type, label: "Text", group: "basic" },
  { tool: "whiteout", icon: Eraser, label: "Whiteout", group: "basic" },
  { tool: "image", icon: Image, label: "Image", group: "basic" },
  { tool: "pen", icon: Pencil, label: "Pen", group: "basic" },
  { tool: "highlight", icon: Highlighter, label: "Highlight", group: "annotate" },
  { tool: "underline", icon: Underline, label: "Underline", group: "annotate" },
  { tool: "strikethrough", icon: Strikethrough, label: "Strike", group: "annotate" },
  { tool: "rectangle", icon: Square, label: "Rect", group: "shape" },
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
  const [toolsOpen, setToolsOpen] = useState(false);

  const activeToolData = toolGroups.find(t => t.tool === activeTool);
  const ActiveIcon = activeToolData?.icon ?? MousePointer2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-20 z-40 mb-4"
    >
      {/* Single compact row */}
      <div className="bg-card border border-border rounded-xl p-1.5 flex items-center gap-1">
        {/* Undo/Redo */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
          <Redo2 className="w-3.5 h-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5" />

        {/* Page nav */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrevPage} disabled={currentPage === 0} aria-label="Previous page">
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="text-[11px] font-medium min-w-[40px] text-center" aria-label={`Page ${currentPage + 1} of ${totalPages}`}>{currentPage + 1}/{totalPages}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNextPage} disabled={currentPage === totalPages - 1} aria-label="Next page">
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5" />

        {/* Zoom */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomOut} aria-label="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></Button>
        <span className="text-[11px] font-medium min-w-[32px] text-center" aria-label={`Zoom ${Math.round(scale * 100)} percent`}>{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomIn} aria-label="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></Button>

        <Separator orientation="vertical" className="h-5" />

        {/* Active tool + dropdown toggle */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={() => setToolsOpen(!toolsOpen)}
        >
          <ActiveIcon className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">{activeToolData?.label ?? "Select"}</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", toolsOpen && "rotate-180")} />
        </Button>

        <div className="flex-1" />

        {/* Page actions */}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRotatePage} aria-label="Rotate page">
          <RotateCw className="w-3.5 h-3.5" />
        </Button>
        {totalPages > 1 && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDeletePage} aria-label="Delete page">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}

        <Separator orientation="vertical" className="h-5" />

        <Button variant="outline" size="sm" onClick={onReset} className="h-7 px-2 text-[11px]">
          <RotateCcw className="w-3 h-3" />
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving} className="h-7 px-2.5 text-[11px] bg-primary hover:bg-primary/90 gap-1">
          <Save className="w-3 h-3" />
          {isSaving ? "..." : "Save PDF"}
        </Button>
      </div>

      {/* Dropdown tools panel */}
      <AnimatePresence>
        {toolsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border border-t-0 rounded-b-xl p-1.5 flex flex-wrap items-center gap-0.5">
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
                          size="sm"
                          className={cn(
                            "h-7 gap-1 px-2 text-[11px]",
                            activeTool === tool && "bg-primary text-primary-foreground"
                          )}
                          onClick={() => { onSetTool(tool); setToolsOpen(false); }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{label}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{label}</TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
