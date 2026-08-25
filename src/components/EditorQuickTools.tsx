import { useMemo, useState } from "react";
import { Search, Type, PenLine, Link2, FormInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumIconFrame } from "@/components/PremiumIcon";
import { Separator } from "@/components/ui/separator";
import type { TextBlock } from "@/hooks/usePdfEditor";

interface EditorQuickToolsProps {
  textBlocks: TextBlock[];
  currentPage: number;
  onReplaceText: (id: string, text: string) => void;
  onAddText: () => void;
  onSetTool: (tool: "select" | "text" | "image" | "pen") => void;
}

export const EditorQuickTools = ({
  textBlocks,
  currentPage,
  onReplaceText,
  onAddText,
  onSetTool,
}: EditorQuickToolsProps) => {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [open, setOpen] = useState(true);

  const matches = useMemo(() => {
    if (!find) return [];
    const needle = caseSensitive ? find : find.toLowerCase();
    return textBlocks.filter((block) => {
      const haystack = caseSensitive ? block.text : block.text.toLowerCase();
      return haystack.includes(needle);
    });
  }, [caseSensitive, find, textBlocks]);

  const replaceAll = () => {
    if (!find) return;
    const needle = caseSensitive ? find : find.toLowerCase();
    for (const block of matches) {
      const nextText = block.text
        .split(caseSensitive ? find : new RegExp(find.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&"), "gi"))
        .join(replace);
      if (nextText !== block.text) onReplaceText(block.id, nextText);
    }
    void needle;
  };

  return (
    <aside className="mt-3 sm:mt-4 rounded-xl border border-border bg-card/95 shadow-sm overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold">Editor tools</span>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="grid max-h-[55vh] gap-3 overflow-y-auto border-t border-border p-3 sm:p-4 lg:grid-cols-[1fr_1.2fr] lg:gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick insert</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start gap-2" onClick={onAddText}>
                <PremiumIconFrame tone="gold" size="sm" className="size-6 rounded-lg [&>span]:size-5 [&_svg]:size-3" aria-hidden="true"><Type /></PremiumIconFrame> Text
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => onSetTool("image")}>
                <PremiumIconFrame tone="blue" size="sm" className="size-6 rounded-lg [&>span]:size-5 [&_svg]:size-3" aria-hidden="true"><Link2 /></PremiumIconFrame> Image
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => onSetTool("pen")}>
                <PremiumIconFrame tone="violet" size="sm" className="size-6 rounded-lg [&>span]:size-5 [&_svg]:size-3" aria-hidden="true"><PenLine /></PremiumIconFrame> Sign / Draw
              </Button>
              <Button variant="outline" className="justify-start gap-2" onClick={() => onSetTool("text")}>
                <PremiumIconFrame tone="mint" size="sm" className="size-6 rounded-lg [&>span]:size-5 [&_svg]:size-3" aria-hidden="true"><FormInput /></PremiumIconFrame> Form text
              </Button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground sm:mt-3 sm:text-xs">
              Select an insert tool, then click on the page. Objects can be moved, resized, recolored, or deleted before saving.
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Find and replace</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="editor-find">Find</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="editor-find" className="pl-8" value={find} onChange={(event) => setFind(event.target.value)} placeholder="Search PDF text" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editor-replace">Replace with</Label>
                <Input id="editor-replace" value={replace} onChange={(event) => setReplace(event.target.value)} placeholder="Replacement text" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} />
                Case sensitive
              </label>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-xs text-muted-foreground">{find ? `${matches.length} match${matches.length === 1 ? "" : "es"}` : "Type a search term"}</span>
              <Button size="sm" onClick={replaceAll} disabled={!find || matches.length === 0}>Replace all</Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground sm:mt-3 sm:text-xs">Current page: {currentPage + 1}. Text replacement applies to extracted PDF text blocks and is included in the exported PDF.</p>
          </div>
        </div>
      )}
    </aside>
  );
};
