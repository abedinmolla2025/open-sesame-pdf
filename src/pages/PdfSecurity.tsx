import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  EyeOff,
  RotateCcw,
  MapPin,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { DropZone } from "@/components/DropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePageHead } from "@/hooks/usePageHead";
import { cn } from "@/lib/utils";
import { PdfFindingPreview } from "@/components/PdfFindingPreview";
import {
  scanPdfForSecurityIssues,
  SEVERITY_ORDER,
  type ScanResult,
  type SecurityFinding,
  type Severity,
} from "@/lib/pdfSecurityScan";

type TriageStatus = "open" | "reviewed" | "ignored";

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/40",
  medium: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  low: "bg-sky-500/15 text-sky-500 border-sky-500/40",
  info: "bg-muted text-muted-foreground border-border",
};

const STATUS_FILTERS: { value: TriageStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "reviewed", label: "Reviewed" },
  { value: "ignored", label: "Ignored" },
];

const PdfSecurity = () => {
  usePageHead({
    title: "PDF Security Scanner — Filter & Triage Findings | Free My PDF",
    description:
      "Scan a PDF in your browser for JavaScript, auto-actions, attachments and external links. Filter findings by severity and triage every location.",
    canonical: "https://free-my-pdf.lovable.app/pdf-security",
  });

  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(new Set(SEVERITY_ORDER));
  const [statusFilter, setStatusFilter] = useState<TriageStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [triage, setTriage] = useState<Record<string, TriageStatus>>({});
  const [activeLoc, setActiveLoc] = useState<{ findingId: string; index: number } | null>(null);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setTriage({});
    setActiveLoc(null);
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setResult(null);
    setTriage({});
    setActiveLoc(null);
  }, []);

  const runScan = useCallback(async () => {
    if (!file) return;
    setScanning(true);
    try {
      const scan = await scanPdfForSecurityIssues(file);
      setResult(scan);
      setTriage({});
      setExpanded(new Set(scan.findings.slice(0, 1).map((f) => f.id)));
      setActiveLoc(scan.findings[0] ? { findingId: scan.findings[0].id, index: 0 } : null);
      toast({
        title: "Scan complete",
        description: `${scan.findings.length} finding${scan.findings.length === 1 ? "" : "s"} in ${scan.durationMs} ms.`,
      });
    } catch {
      toast({ title: "Scan failed", description: "Could not read this PDF.", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }, [file, toast]);

  const counts = useMemo(() => {
    const base: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    result?.findings.forEach((f) => (base[f.severity] += 1));
    return base;
  }, [result]);

  const statusOf = useCallback(
    (id: string): TriageStatus => triage[id] ?? "open",
    [triage]
  );

  const visible = useMemo(() => {
    if (!result) return [] as SecurityFinding[];
    const q = query.trim().toLowerCase();
    return result.findings.filter((f) => {
      if (!severityFilter.has(f.severity)) return false;
      if (statusFilter !== "all" && statusOf(f.id) !== statusFilter) return false;
      if (!q) return true;
      return (
        f.title.toLowerCase().includes(q) ||
        f.rule.toLowerCase().includes(q) ||
        f.locations.some(
          (l) =>
            l.objectHint.toLowerCase().includes(q) ||
            l.snippet.toLowerCase().includes(q) ||
            String(l.offset).includes(q)
        )
      );
    });
  }, [result, severityFilter, statusFilter, query, statusOf]);

  const toggleSeverity = (s: Severity) => {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setActiveLoc((cur) => (cur?.findingId === id ? null : cur));
      } else {
        next.add(id);
        setActiveLoc({ findingId: id, index: 0 });
      }
      return next;
    });
  };

  const setStatus = (id: string, status: TriageStatus) => {
    setTriage((prev) => ({ ...prev, [id]: status }));
  };

  const bulkStatus = (status: TriageStatus) => {
    setTriage((prev) => {
      const next = { ...prev };
      visible.forEach((f) => (next[f.id] = status));
      return next;
    });
  };

  const copyLocations = async (finding: SecurityFinding) => {
    const text = finding.locations
      .map((l) => `${finding.rule}\t@${l.offset}\t${l.objectHint}\t${l.snippet}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast({ title: "Locations copied", description: `${finding.locations.length} location(s) on the clipboard.` });
  };

  return (
    <Layout>
      <div className="container py-10 max-w-4xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40 text-xs text-muted-foreground mb-4">
            <ShieldAlert className="w-3.5 h-3.5" />
            100% client-side — nothing is uploaded
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">PDF Security Scanner</h1>
          <p className="text-muted-foreground">
            Inspect a PDF for risky constructs, then filter by severity and triage each location.
          </p>
        </div>

        <DropZone onFileSelect={handleFileSelect} selectedFile={file} onClear={handleClear} />

        {file && (
          <Button onClick={runScan} disabled={scanning} className="mt-4 w-full sm:w-auto">
            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {scanning ? "Scanning…" : "Scan PDF"}
          </Button>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-4"
          >
            {/* Filter bar */}
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground mr-1">Severity</span>
                {SEVERITY_ORDER.map((s) => {
                  const active = severityFilter.has(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSeverity(s)}
                      aria-pressed={active}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border capitalize transition-all",
                        active ? SEVERITY_STYLES[s] : "border-border text-muted-foreground opacity-50 hover:opacity-80"
                      )}
                    >
                      {s} <span className="ml-1 tabular-nums">{counts[s]}</span>
                    </button>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-xs"
                  onClick={() => setSeverityFilter(new Set(SEVERITY_ORDER))}
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground mr-1">Status</span>
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatusFilter(s.value)}
                    aria-pressed={statusFilter === s.value}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      statusFilter === s.value
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search rule, object, offset or evidence…"
                  aria-label="Search findings"
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => bulkStatus("reviewed")} disabled={!visible.length}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Mark shown reviewed
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => bulkStatus("ignored")} disabled={!visible.length}>
                    <EyeOff className="w-3.5 h-3.5 mr-1" /> Ignore shown
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {visible.length} of {result.findings.length} findings shown · {result.fileName} ·{" "}
                {(result.fileSize / 1024).toFixed(0)} KB · scanned in {result.durationMs} ms
              </p>
            </div>

            {/* Findings */}
            {visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                No findings match the current filters.
              </div>
            ) : (
              visible.map((f) => {
                const open = expanded.has(f.id);
                const status = statusOf(f.id);
                return (
                  <div key={f.id} className="rounded-xl border border-border bg-card/60 backdrop-blur overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(f.id)}
                      aria-expanded={open}
                      className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                    >
                      {open ? (
                        <ChevronDown className="w-4 h-4 mt-1 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mt-1 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{f.title}</span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize",
                              SEVERITY_STYLES[f.severity]
                            )}
                          >
                            {f.severity}
                          </span>
                          <Badge variant="secondary" className="text-[11px]">
                            {f.locations.length} location{f.locations.length === 1 ? "" : "s"}
                          </Badge>
                          {status !== "open" && (
                            <Badge variant="outline" className="text-[11px] capitalize">
                              {status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{f.description}</p>
                      </div>
                    </button>

                    {open && (
                      <div className="border-t border-border p-4 space-y-3">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Recommendation: </span>
                          {f.recommendation}
                        </p>

                        <div className="grid gap-3 lg:grid-cols-2 min-w-0">
                          <div className="min-w-0 space-y-2 max-h-72 lg:max-h-[28rem] overflow-y-auto pr-1">
                            {f.locations.map((l, i) => {
                              const selected =
                                activeLoc?.findingId === f.id && activeLoc.index === i;
                              return (
                                <button
                                  key={`${l.offset}-${i}`}
                                  type="button"
                                  onClick={() => setActiveLoc({ findingId: f.id, index: i })}
                                  aria-pressed={selected}
                                  className={cn(
                                    "w-full text-left rounded-lg border bg-background/60 p-3 transition-colors",
                                    selected
                                      ? "border-primary/60 ring-1 ring-primary/40"
                                      : "border-border hover:border-primary/40"
                                  )}
                                >
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                    <MapPin className="w-3 h-3" />
                                    <span className="tabular-nums">byte {l.offset.toLocaleString()}</span>
                                    <span>·</span>
                                    <span>{l.objectHint}</span>
                                    {l.page && (
                                      <>
                                        <span>·</span>
                                        <span>page {l.page}</span>
                                      </>
                                    )}
                                  </div>
                                  <code className="block text-[11px] font-mono break-all text-foreground/80">
                                    {l.snippet}
                                  </code>
                                </button>
                              );
                            })}
                          </div>

                          {file && activeLoc?.findingId === f.id && (
                            <PdfFindingPreview
                              file={file}
                              locations={f.locations}
                              activeIndex={Math.min(activeLoc.index, f.locations.length - 1)}
                              onSelect={(index) => setActiveLoc({ findingId: f.id, index })}
                              label={f.title}
                            />
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button size="sm" variant={status === "reviewed" ? "default" : "outline"} onClick={() => setStatus(f.id, "reviewed")}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Reviewed
                          </Button>
                          <Button size="sm" variant={status === "ignored" ? "default" : "outline"} onClick={() => setStatus(f.id, "ignored")}>
                            <EyeOff className="w-3.5 h-3.5 mr-1" /> Ignore
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatus(f.id, "open")}>
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reopen
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => copyLocations(f)}>
                            Copy locations
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default PdfSecurity;
