import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { IMAGE_MIME_TYPES, validateImageFile } from "@/lib/imageUtils";

interface ImageDropZoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string[];
  hint?: string;
  enablePaste?: boolean;
}

export const ImageDropZone = ({
  onFiles,
  multiple = false,
  accept = IMAGE_MIME_TYPES,
  hint,
  enablePaste = true,
}: ImageDropZoneProps) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const accepted = useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list);
      const good: File[] = [];
      const bad: string[] = [];
      files.forEach((f) => {
        const v = validateImageFile(f, accept);
        if (v.ok) good.push(f);
        else bad.push(v.reason ?? f.name);
      });
      if (bad.length) {
        toast({
          title: bad.length === 1 ? "File rejected" : `${bad.length} files rejected`,
          description: bad.slice(0, 3).join(" "),
          variant: "destructive",
        });
      }
      if (good.length) onFiles(multiple ? good : [good[0]]);
    },
    [accept, multiple, onFiles, toast]
  );

  useEffect(() => {
    if (!enablePaste) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f && f.type.startsWith("image/")) files.push(f);
        }
      }
      if (files.length) accepted(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accepted, enablePaste]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload images"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.length) accepted(e.dataTransfer.files);
      }}
      className={cn(
        "relative rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center cursor-pointer transition-all",
        "bg-card/40 backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) accepted(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
        {dragging ? (
          <ImagePlus className="w-6 h-6 text-primary" />
        ) : (
          <Upload className="w-6 h-6 text-primary" />
        )}
      </div>
      <p className="font-medium">
        {dragging ? "Drop to upload" : multiple ? "Drop images here" : "Drop an image here"}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {hint ?? "or click to browse · paste from clipboard also works"}
      </p>
    </div>
  );
};
