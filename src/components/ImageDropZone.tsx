import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PremiumIconFrame } from "@/components/PremiumIcon";
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
        "group relative overflow-hidden rounded-3xl border-2 border-dashed p-8 sm:p-10 text-center cursor-pointer transition-all",
        "bg-gradient-to-br from-card/90 via-card/60 to-primary/[0.04] backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "before:pointer-events-none before:absolute before:-right-16 before:-top-16 before:h-44 before:w-44 before:rounded-full before:bg-primary/10 before:blur-2xl after:pointer-events-none after:absolute after:inset-3 after:rounded-2xl after:border after:border-white/20",
        dragging ? "border-primary bg-primary/10 scale-[1.01] shadow-[0_0_50px_hsl(var(--primary)/0.18)]" : "border-primary/25 shadow-[0_16px_45px_hsl(var(--primary)/0.06)] hover:border-primary/60 hover:shadow-[0_0_40px_hsl(var(--primary)/0.12)]"
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
      <div className="relative z-10 flex flex-col items-center">
        <PremiumIconFrame tone={dragging ? "gold" : "violet"} size="lg" aria-hidden="true">
          {dragging ? <ImagePlus /> : <Upload />}
        </PremiumIconFrame>
        <p className="mt-4 text-lg font-semibold tracking-tight">
          {dragging ? "Release to upload" : multiple ? "Drop your images here" : "Drop your image here"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">or <span className="font-medium text-primary">click to browse</span>{enablePaste ? " · paste from clipboard also works" : " from your device"}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-medium text-muted-foreground">
          <span className="rounded-full border border-border bg-background/70 px-2.5 py-1">JPG · PNG · WebP</span>
          <span className="rounded-full border border-border bg-background/70 px-2.5 py-1">Up to 30 MB</span>
          <span className="rounded-full border border-border bg-background/70 px-2.5 py-1">Private by default</span>
        </div>
        {hint && <p className="mt-3 max-w-xl text-xs text-muted-foreground/80">{hint}</p>}
      </div>
    </div>
  );
};
