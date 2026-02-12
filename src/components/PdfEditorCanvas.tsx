import { useState, useRef, useEffect, useCallback } from "react";
import { Trash2, Edit3, Check, Move } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PdfPage, TextBlock, WhiteoutBlock, ImageBlock, ShapeBlock, AnnotationBlock, FreehandPath, EditorTool } from "@/hooks/usePdfEditor";

interface PdfEditorCanvasProps {
  page: PdfPage;
  textBlocks: TextBlock[];
  whiteouts: WhiteoutBlock[];
  images: ImageBlock[];
  shapes: ShapeBlock[];
  annotations: AnnotationBlock[];
  freehandPaths: FreehandPath[];
  activeTool: EditorTool;
  onUpdateTextBlock: (id: string, updates: Partial<TextBlock>) => void;
  onAddTextBlock: (pageIndex: number, x: number, y: number) => string;
  onDeleteTextBlock: (id: string) => void;
  onAddWhiteout: (pageIndex: number, x: number, y: number, w: number, h: number) => string;
  onDeleteWhiteout: (id: string) => void;
  onAddImage: (pageIndex: number, src: string, x: number, y: number, w: number, h: number) => string;
  onUpdateImage: (id: string, updates: Partial<ImageBlock>) => void;
  onDeleteImage: (id: string) => void;
  onAddShape: (pageIndex: number, type: any, x: number, y: number, w: number, h: number) => string;
  onUpdateShape: (id: string, updates: Partial<ShapeBlock>) => void;
  onDeleteShape: (id: string) => void;
  onAddAnnotation: (pageIndex: number, type: "highlight" | "underline" | "strikethrough", x: number, y: number, w: number, h: number) => string;
  onUpdateAnnotation: (id: string, updates: Partial<AnnotationBlock>) => void;
  onDeleteAnnotation: (id: string) => void;
  onAddFreehandPath: (pageIndex: number, points: { x: number; y: number }[], color?: string, strokeWidth?: number) => string;
  onUpdateFreehandPath: (id: string, updates: Partial<FreehandPath>) => void;
  onDeleteFreehandPath: (id: string) => void;
}

export const PdfEditorCanvas = ({
  page, textBlocks, whiteouts, images, shapes, annotations, freehandPaths, activeTool,
  onUpdateTextBlock, onAddTextBlock, onDeleteTextBlock,
  onAddWhiteout, onDeleteWhiteout,
  onAddImage, onUpdateImage, onDeleteImage,
  onAddShape, onUpdateShape, onDeleteShape,
  onAddAnnotation, onUpdateAnnotation, onDeleteAnnotation,
  onAddFreehandPath, onUpdateFreehandPath, onDeleteFreehandPath,
}: PdfEditorCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[]>([]);
  const [isPenDrawing, setIsPenDrawing] = useState(false);

  const getRelPos = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const isDrawTool = (tool: EditorTool) =>
    ["whiteout", "rectangle", "circle", "line", "arrow", "highlight", "underline", "strikethrough"].includes(tool);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current && !(e.target as HTMLElement).closest('.pdf-bg')) return;
    const pos = getRelPos(e);

    if (activeTool === "pen") {
      setPenPoints([pos]);
      setIsPenDrawing(true);
      setSelectedId(null);
      e.preventDefault();
    } else if (isDrawTool(activeTool)) {
      setDrawStart(pos);
      setDrawCurrent(pos);
      setIsDrawing(true);
      setSelectedId(null);
      e.preventDefault();
    } else if (activeTool === "text") {
      const newId = onAddTextBlock(page.pageIndex, pos.x, pos.y);
      setSelectedId(newId);
    } else if (activeTool === "select") {
      if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('pdf-bg')) {
        setSelectedId(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPenDrawing) {
      setPenPoints(prev => [...prev, getRelPos(e)]);
      return;
    }
    if (!isDrawing || !drawStart) return;
    setDrawCurrent(getRelPos(e));
  };

  const handleMouseUp = () => {
    if (isPenDrawing) {
      if (penPoints.length > 2) {
        onAddFreehandPath(page.pageIndex, penPoints);
      }
      setPenPoints([]);
      setIsPenDrawing(false);
      return;
    }

    if (!isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false);
      return;
    }

    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);

    if (w > 5 && h > 5) {
      if (activeTool === "whiteout") {
        onAddWhiteout(page.pageIndex, x, y, w, h);
      } else if (activeTool === "highlight" || activeTool === "underline" || activeTool === "strikethrough") {
        onAddAnnotation(page.pageIndex, activeTool, x, y, w, h);
      } else if (["rectangle", "circle", "line", "arrow"].includes(activeTool)) {
        onAddShape(page.pageIndex, activeTool, x, y, w, h);
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const handleImageUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const maxW = page.width * 0.5;
          const ratio = img.width / img.height;
          const w = Math.min(img.width, maxW);
          const h = w / ratio;
          const id = onAddImage(page.pageIndex, src, 50, 50, w, h);
          setSelectedId(id);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [page, onAddImage]);

  useEffect(() => {
    if (activeTool === "image") {
      handleImageUpload();
    }
  }, [activeTool]);

  const pageTextBlocks = textBlocks.filter(b => b.pageIndex === page.pageIndex);
  const pageWhiteouts = whiteouts.filter(w => w.pageIndex === page.pageIndex);
  const pageImages = images.filter(i => i.pageIndex === page.pageIndex);
  const pageShapes = shapes.filter(s => s.pageIndex === page.pageIndex);
  const pageAnnotations = annotations.filter(a => a.pageIndex === page.pageIndex);
  const pageFreehandPaths = freehandPaths.filter(f => f.pageIndex === page.pageIndex);

  const drawRect = drawStart && drawCurrent && isDrawing ? {
    x: Math.min(drawStart.x, drawCurrent.x),
    y: Math.min(drawStart.y, drawCurrent.y),
    w: Math.abs(drawCurrent.x - drawStart.x),
    h: Math.abs(drawCurrent.y - drawStart.y),
  } : null;

  const pointsToSvgPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  };

  const cursorClass = activeTool === "select" ? "cursor-default"
    : activeTool === "text" ? "cursor-text"
    : "cursor-crosshair";

  return (
    <div
      ref={containerRef}
      className={cn("relative bg-white shadow-xl mx-auto rounded-lg overflow-hidden select-none", cursorClass)}
      style={{ width: page.width, height: page.height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img
        src={page.imageUrl}
        alt={`Page ${page.pageIndex + 1}`}
        className="absolute inset-0 w-full h-full pointer-events-none select-none pdf-bg"
        draggable={false}
      />

      {/* Annotations (highlight, underline, strikethrough) */}
      {pageAnnotations.map(annot => (
        <div
          key={annot.id}
          className={cn("absolute", selectedId === annot.id ? "z-10" : "z-0")}
          style={{ left: annot.x, top: annot.y, width: annot.width, height: annot.height }}
          onClick={(e) => { e.stopPropagation(); setSelectedId(annot.id); }}
        >
          {annot.type === "highlight" && (
            <div className="w-full h-full rounded-sm" style={{ backgroundColor: annot.color, opacity: annot.opacity }} />
          )}
          {annot.type === "underline" && (
            <div className="w-full h-full relative">
              <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded" style={{ backgroundColor: annot.color, opacity: annot.opacity }} />
            </div>
          )}
          {annot.type === "strikethrough" && (
            <div className="w-full h-full relative">
              <div className="absolute top-1/2 left-0 right-0 h-[2px] rounded" style={{ backgroundColor: annot.color, opacity: annot.opacity }} />
            </div>
          )}
          {selectedId === annot.id && (
            <>
              <div className="absolute -inset-1 border-2 border-primary rounded pointer-events-none" />
              <div className="absolute -top-9 right-0 flex gap-1 z-20" onMouseDown={e => e.stopPropagation()}>
                <input
                  type="color" value={annot.color}
                  onChange={(e) => onUpdateAnnotation(annot.id, { color: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border border-border bg-card"
                  onClick={e => e.stopPropagation()}
                />
                <button
                  className="p-1.5 bg-destructive text-destructive-foreground rounded shadow"
                  onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(annot.id); setSelectedId(null); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Whiteouts */}
      {pageWhiteouts.map(wo => (
        <div
          key={wo.id}
          className={cn("absolute bg-white border", selectedId === wo.id ? "border-primary" : "border-transparent")}
          style={{ left: wo.x, top: wo.y, width: wo.width, height: wo.height }}
          onClick={(e) => { e.stopPropagation(); setSelectedId(wo.id); }}
        >
          {selectedId === wo.id && (
            <button
              className="absolute -top-8 right-0 p-1 bg-destructive text-destructive-foreground rounded shadow"
              onClick={(e) => { e.stopPropagation(); onDeleteWhiteout(wo.id); setSelectedId(null); }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}

      {/* Images */}
      {pageImages.map(img => (
        <DraggableElement
          key={img.id}
          x={img.x} y={img.y}
          isSelected={selectedId === img.id}
          onSelect={() => setSelectedId(img.id)}
          onMove={(x, y) => onUpdateImage(img.id, { x, y })}
          onDelete={() => { onDeleteImage(img.id); setSelectedId(null); }}
        >
          <img
            src={img.src}
            alt="Inserted"
            style={{ width: img.width, height: img.height }}
            className="pointer-events-none"
            draggable={false}
          />
          {selectedId === img.id && (
            <div
              className="absolute bottom-0 right-0 w-4 h-4 bg-primary cursor-se-resize rounded-tl"
              onMouseDown={(e) => {
                e.stopPropagation();
                const startX = e.clientX;
                const startW = img.width;
                const ratio = img.width / img.height;
                const onMove = (ev: MouseEvent) => {
                  const dw = ev.clientX - startX;
                  const newW = Math.max(30, startW + dw);
                  onUpdateImage(img.id, { width: newW, height: newW / ratio });
                };
                const onUp = () => {
                  window.removeEventListener("mousemove", onMove);
                  window.removeEventListener("mouseup", onUp);
                };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
            />
          )}
        </DraggableElement>
      ))}

      {/* Shapes */}
      {pageShapes.map(shape => (
        <DraggableElement
          key={shape.id}
          x={shape.x} y={shape.y}
          isSelected={selectedId === shape.id}
          onSelect={() => setSelectedId(shape.id)}
          onMove={(x, y) => onUpdateShape(shape.id, { x, y })}
          onDelete={() => { onDeleteShape(shape.id); setSelectedId(null); }}
        >
          <svg width={shape.width} height={shape.height} className="pointer-events-none overflow-visible">
            {shape.type === "rectangle" && (
              <rect x={1} y={1} width={shape.width - 2} height={shape.height - 2}
                stroke={shape.strokeColor} strokeWidth={shape.strokeWidth}
                fill={shape.fillColor === "transparent" ? "none" : shape.fillColor} />
            )}
            {shape.type === "circle" && (
              <ellipse cx={shape.width / 2} cy={shape.height / 2}
                rx={shape.width / 2 - 1} ry={shape.height / 2 - 1}
                stroke={shape.strokeColor} strokeWidth={shape.strokeWidth}
                fill={shape.fillColor === "transparent" ? "none" : shape.fillColor} />
            )}
            {shape.type === "line" && (
              <line x1={0} y1={shape.height} x2={shape.width} y2={0}
                stroke={shape.strokeColor} strokeWidth={shape.strokeWidth} />
            )}
            {shape.type === "arrow" && (
              <>
                <line x1={0} y1={shape.height} x2={shape.width} y2={0}
                  stroke={shape.strokeColor} strokeWidth={shape.strokeWidth} />
                <polygon
                  points={`${shape.width},0 ${shape.width - 10},5 ${shape.width - 10},-5`}
                  fill={shape.strokeColor}
                  transform={`rotate(${Math.atan2(-shape.height, shape.width) * 180 / Math.PI}, ${shape.width}, 0)`}
                />
              </>
            )}
          </svg>
          {selectedId === shape.id && (
            <div className="absolute -top-9 left-0 flex gap-1 bg-card border border-border rounded-lg shadow-lg p-1 z-20">
              <input
                type="color" value={shape.strokeColor}
                onChange={(e) => { e.stopPropagation(); onUpdateShape(shape.id, { strokeColor: e.target.value }); }}
                className="w-6 h-6 rounded cursor-pointer border border-border"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </DraggableElement>
      ))}

      {/* Text Blocks */}
      {pageTextBlocks.map(block => (
        <TextBlockEditor
          key={block.id}
          block={block}
          isSelected={selectedId === block.id}
          onSelect={() => setSelectedId(block.id)}
          onUpdate={(updates) => onUpdateTextBlock(block.id, updates)}
          onDelete={() => { onDeleteTextBlock(block.id); setSelectedId(null); }}
        />
      ))}

      {/* Freehand paths */}
      {pageFreehandPaths.map(path => (
        <svg
          key={path.id}
          className={cn("absolute inset-0 pointer-events-none", selectedId === path.id && "z-10")}
          width={page.width} height={page.height}
          style={{ pointerEvents: selectedId === path.id ? "auto" : "none" }}
        >
          <path
            d={pointsToSvgPath(path.points)}
            fill="none" stroke={path.color} strokeWidth={path.strokeWidth}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ pointerEvents: "stroke", cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); setSelectedId(path.id); }}
          />
          {selectedId === path.id && (
            <foreignObject x={path.points[0]?.x - 10} y={path.points[0]?.y - 36} width={80} height={32}>
              <div className="flex gap-1" onMouseDown={e => e.stopPropagation()}>
                <input
                  type="color" value={path.color}
                  onChange={(e) => onUpdateFreehandPath(path.id, { color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border border-border bg-card"
                  onClick={e => e.stopPropagation()}
                />
                <button
                  className="p-1 bg-destructive text-destructive-foreground rounded shadow"
                  onClick={(e) => { e.stopPropagation(); onDeleteFreehandPath(path.id); setSelectedId(null); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </foreignObject>
          )}
        </svg>
      ))}

      {/* Pen drawing preview */}
      {isPenDrawing && penPoints.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none z-20" width={page.width} height={page.height}>
          <path
            d={pointsToSvgPath(penPoints)}
            fill="none" stroke="#000000" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Drawing preview */}
      {drawRect && drawRect.w > 2 && drawRect.h > 2 && (
        <div
          className={cn(
            "absolute pointer-events-none border-2 border-dashed",
            activeTool === "whiteout" ? "bg-white/80 border-muted-foreground/30" :
            activeTool === "highlight" ? "bg-yellow-300/40 border-yellow-400" :
            activeTool === "underline" ? "border-blue-400" :
            activeTool === "strikethrough" ? "border-red-400" :
            "border-primary/60"
          )}
          style={{ left: drawRect.x, top: drawRect.y, width: drawRect.w, height: drawRect.h }}
        />
      )}
    </div>
  );
};

// Draggable wrapper
const DraggableElement = ({ children, x, y, isSelected, onSelect, onMove, onDelete }: {
  children: React.ReactNode;
  x: number; y: number;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onDelete: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    const startX = e.clientX - x;
    const startY = e.clientY - y;
    const onMouseMove = (ev: MouseEvent) => onMove(ev.clientX - startX, ev.clientY - startY);
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={ref}
      className={cn("absolute", isSelected && "z-10")}
      style={{ left: x, top: y }}
      onMouseDown={handleMouseDown}
    >
      {isSelected && <div className="absolute -inset-1 border-2 border-primary rounded pointer-events-none" />}
      {isSelected && (
        <button
          className="absolute -top-8 right-0 p-1 bg-destructive text-destructive-foreground rounded shadow z-20"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      {children}
    </div>
  );
};

// Text block editor
const TextBlockEditor = ({ block, isSelected, onSelect, onUpdate, onDelete }: {
  block: TextBlock; isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextBlock>) => void;
  onDelete: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(block.isEditing);
  const [localText, setLocalText] = useState(block.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);

  useEffect(() => { setLocalText(block.text); }, [block.text]);
  useEffect(() => {
    if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [isEditing]);

  const handleSaveEdit = () => {
    setIsEditing(false);
    if (localText.trim() === "") {
      onDelete();
      return;
    }
    onUpdate({ text: localText, isEditing: false });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    if (isEditing) return;
    dragRef.current = false;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = block.x;
    const origY = block.y;
    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current = true;
        onUpdate({ x: origX + dx, y: origY + dy });
      }
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    onUpdate({ isEditing: true });
  };

  return (
    <div
      ref={elRef}
      className={cn(
        "absolute group",
        isSelected && "z-10",
        !isSelected && !isEditing && "hover:outline hover:outline-2 hover:outline-primary/40 hover:outline-offset-1",
        block.isModified && !isSelected && "ring-1 ring-primary/20"
      )}
      style={{ left: block.x, top: block.y, minWidth: Math.max(block.width, 30) }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {isSelected && <div className="absolute -inset-1 border-2 border-primary rounded pointer-events-none" />}

      {isSelected && !isEditing && (
        <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          <button
            className="p-1 bg-card border border-border rounded shadow-lg hover:bg-muted"
            title="Edit text"
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); onUpdate({ isEditing: true }); }}
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            className="p-1 bg-destructive text-destructive-foreground rounded shadow-lg hover:bg-destructive/90"
            title="Delete text"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text" value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={() => setTimeout(() => { if (isEditing) handleSaveEdit(); }, 150)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") { setLocalText(block.text); setIsEditing(false); onUpdate({ isEditing: false }); }
            }}
            className="bg-white/90 border border-primary rounded px-1 outline-none"
            style={{
              fontSize: block.fontSize, fontFamily: block.fontFamily, color: block.color,
              fontWeight: block.bold ? "bold" : "normal", fontStyle: block.italic ? "italic" : "normal",
              minWidth: "80px", width: `${Math.max(localText.length + 2, 10)}ch`,
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="p-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <span
          className={cn(
            "whitespace-nowrap cursor-pointer rounded px-0.5 transition-all",
            isSelected ? "bg-primary/15" : "hover:bg-blue-100/60",
            block.isOriginal && !block.isModified && !isSelected && "text-transparent hover:text-transparent"
          )}
          style={{
            fontSize: block.fontSize, fontFamily: block.fontFamily,
            color: (block.isOriginal && !block.isModified && !isSelected) ? "transparent" : block.color,
            fontWeight: block.bold ? "bold" : "normal", fontStyle: block.italic ? "italic" : "normal",
            lineHeight: 1.2,
          }}
        >
          {block.text}
        </span>
      )}
    </div>
  );
};
