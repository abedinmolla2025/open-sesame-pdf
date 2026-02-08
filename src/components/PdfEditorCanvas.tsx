import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, Edit3, Check } from "lucide-react";
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
    // Only add text if clicking directly on canvas (not on a text block)
    if (e.target !== containerRef.current) return;
    
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
        "relative bg-white shadow-xl mx-auto rounded-lg overflow-hidden",
        isAddingText && "cursor-crosshair"
      )}
      style={{ width: page.width, height: page.height }}
      onClick={handleCanvasClick}
    >
      {/* PDF Page Background */}
      <img
        src={page.imageUrl}
        alt={`Page ${page.pageIndex + 1}`}
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        draggable={false}
      />

      {/* Text Blocks Overlay */}
      {pageTextBlocks.map((block) => (
        <TextBlockEditor
          key={block.id}
          block={block}
          isSelected={selectedBlockId === block.id}
          onSelect={() => setSelectedBlockId(block.id)}
          onDeselect={() => setSelectedBlockId(null)}
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
  onDeselect: () => void;
  onUpdate: (updates: Partial<TextBlock>) => void;
  onDelete: () => void;
}

const TextBlockEditor = ({
  block,
  isSelected,
  onSelect,
  onDeselect,
  onUpdate,
  onDelete,
}: TextBlockEditorProps) => {
  const [isEditing, setIsEditing] = useState(block.isEditing);
  const [localText, setLocalText] = useState(block.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalText(block.text);
  }, [block.text]);

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

  const handleSaveEdit = () => {
    setIsEditing(false);
    onUpdate({ text: localText, isEditing: false });
  };

  const handleBlur = () => {
    // Small delay to allow button click to register
    setTimeout(() => {
      if (isEditing) {
        handleSaveEdit();
      }
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      setLocalText(block.text);
      setIsEditing(false);
      onUpdate({ isEditing: false });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      onSelect();
    }
  };

  return (
    <div
      className={cn(
        "absolute group transition-all",
        isSelected && "z-10",
        block.isModified && "ring-1 ring-primary/30"
      )}
      style={{
        left: block.x,
        top: block.y,
        minWidth: Math.max(block.width, 50),
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -inset-1 border-2 border-primary rounded pointer-events-none" />
      )}

      {/* Toolbar */}
      {isSelected && !isEditing && (
        <div className="absolute -top-10 left-0 flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg p-1 z-20">
          <button
            className="p-1.5 rounded hover:bg-muted transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            title="Edit text"
          >
            <Edit3 className="w-3.5 h-3.5 text-foreground" />
          </button>
          {!block.isOriginal && (
            <button
              className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          )}
        </div>
      )}

      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-white/90 border border-primary rounded px-1 outline-none"
            style={{
              fontSize: block.fontSize,
              fontFamily: block.fontFamily,
              color: block.color,
              minWidth: "80px",
              width: `${Math.max(localText.length + 2, 10)}ch`,
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="p-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              handleSaveEdit();
            }}
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <span
          className={cn(
            "whitespace-nowrap cursor-pointer hover:bg-primary/10 rounded px-0.5 transition-colors",
            isSelected && "bg-primary/10"
          )}
          style={{
            fontSize: block.fontSize,
            fontFamily: block.fontFamily,
            color: block.color,
            lineHeight: 1.2,
          }}
        >
          {block.text}
        </span>
      )}
    </div>
  );
};
