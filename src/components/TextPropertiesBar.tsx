import { Bold, Italic, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TextBlock } from "@/hooks/usePdfEditor";
import { cn } from "@/lib/utils";

interface TextPropertiesBarProps {
  block: TextBlock;
  onUpdate: (updates: Partial<TextBlock>) => void;
}

export const TextPropertiesBar = ({ block, onUpdate }: TextPropertiesBarProps) => {
  return (
    <div className="flex items-center gap-2 flex-wrap bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      {/* Font Size */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => onUpdate({ fontSize: Math.max(8, block.fontSize - 1) })}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <Input
          type="number" value={Math.round(block.fontSize)} min={8} max={96}
          onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
          className="w-14 h-7 text-center text-xs px-1"
        />
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => onUpdate({ fontSize: Math.min(96, block.fontSize + 1) })}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* Bold */}
      <Button
        variant={block.bold ? "default" : "ghost"}
        size="icon" className={cn("h-7 w-7", block.bold && "bg-primary text-primary-foreground")}
        onClick={() => onUpdate({ bold: !block.bold })}
      >
        <Bold className="w-3.5 h-3.5" />
      </Button>

      {/* Italic */}
      <Button
        variant={block.italic ? "default" : "ghost"}
        size="icon" className={cn("h-7 w-7", block.italic && "bg-primary text-primary-foreground")}
        onClick={() => onUpdate({ italic: !block.italic })}
      >
        <Italic className="w-3.5 h-3.5" />
      </Button>

      {/* Color */}
      <div className="relative">
        <input
          type="color" value={block.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-7 h-7 rounded cursor-pointer border border-border"
        />
      </div>
    </div>
  );
};
