import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PdfPage, TextBlock } from "@/hooks/usePdfEditor";

interface PdfEditorCanvasProps {
  page: PdfPage;
  textBlocks: TextBlock[];
  onUpdateTextBlock: (id: string, updates: Partial<TextBlock>) => void;
  onAddTextBlock: (pageIndex: number, x: number, y: number) => string;
  onDeleteTextBlock: (id: string) => void;
  isAddingText: boolean;
}

export const PdfEditorCanvas = ({
  page,
  textBlocks,
  onUpdateTextBlock,
  onAddTextBlock,
  onDeleteTextBlock,
  isAddingText,
}: PdfEditorCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!isAddingText) {
      setSelectedBlockId(null);
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newId = onAddTextBlock(page.pageIndex, x, y);
    setSelectedBlockId(newId);
  };

  const pageTextBlocks = textBlocks.filter(
    (block) => block.pageIndex === page.pageIndex
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-white shadow-lg mx-auto",
        isAddingText && "cursor-crosshair"
      )}
      style={{ width: page.width, height: page.height }}
      onClick={handleCanvasClick}
    >
      {/* PDF Page Background */}
      <img
        src={page.imageUrl}
        alt={`Page ${page.pageIndex + 1}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
        draggable={false}
      />

      {/* Text Blocks */}
      {pageTextBlocks.map((block) => (
        <TextBlockEditor
          key={block.id}
          block={block}
          isSelected={selectedBlockId === block.id}
          onSelect={() => setSelectedBlockId(block.id)}
          onUpdate={(updates) => onUpdateTextBlock(block.id, updates)}
          onDelete={() => onDeleteTextBlock(block.id)}
        />
      ))}
    </div>
  );
};

interface TextBlockEditorProps {
  block: TextBlock;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextBlock>) => void;
  onDelete: () => void;
}

const TextBlockEditor = ({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: TextBlockEditorProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(block.isEditing);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    onUpdate({ isEditing: true });
  };

  const handleBlur = () => {
    setIsEditing(false);
    onUpdate({ isEditing: false });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      onUpdate({ isEditing: false });
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      onUpdate({ isEditing: false });
    }
  };

  return (
    <motion.div
      className={cn(
        "absolute group",
        isSelected && "ring-2 ring-primary ring-offset-1",
        !block.isOriginal && "bg-primary/5"
      )}
      style={{
        left: block.x,
        top: block.y,
        minWidth: block.width,
        minHeight: block.height,
      }}
      drag={!isEditing}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        onUpdate({
          x: block.x + info.offset.x,
          y: block.y + info.offset.y,
        });
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Drag Handle */}
      {isSelected && !isEditing && (
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {/* Delete Button */}
      {isSelected && !block.isOriginal && (
        <button
          className="absolute -right-6 top-1/2 -translate-y-1/2 p-1 rounded bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={block.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none"
          style={{
            fontSize: block.fontSize,
            fontFamily: block.fontFamily,
            color: block.color,
            minWidth: "50px",
            width: `${block.text.length + 2}ch`,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className={cn(
            "select-none whitespace-nowrap",
            isSelected && "cursor-move"
          )}
          style={{
            fontSize: block.fontSize,
            fontFamily: block.fontFamily,
            color: block.color,
          }}
        >
          {block.text}
        </span>
      )}
    </motion.div>
  );
};
