import { useCallback, useMemo, useState } from "react";
import { FileSearch, MessageCircleQuestion, ShieldCheck, Sparkles, Upload, Loader2, Send, RotateCcw } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PremiumIconFrame } from "@/components/PremiumIcon";
import { validatePdfFile } from "@/lib/pdfValidation";
import { usePageHead } from "@/hooks/usePageHead";

type Action = "summarize" | "chat" | "extract" | "scan";

type AnalysisResult = {
  summary?: string;
  keyPoints?: string[];
  actionItems?: string[];
  answer?: string;
  citations?: { page: string | number; quote: string }[];
  documentType?: string;
  people?: string[];
  organizations?: string[];
  dates?: string[];
  amounts?: string[];
  importantFields?: { label: string; value: string }[];
  riskLevel?: "low" | "medium" | "high";
  findings?: { type: string; value: string; page: string | number; reason: string }[];
  recommendation?: string;
};

const MAX_TEXT = 120_000;

const extractPdfText = async (file: File) => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item: { str?: string }) => item.str ?? "").join(" ").replace(/\s+/g, " ").trim();
    pages.push(`[Page ${pageNumber}]\n${text}`);
  }
  return pages.filter((page) => page.length > 9).join("\n\n").slice(0, MAX_TEXT);
};

const actionLabels: Record<Action, string> = {
  summarize: "Summarize",
  chat: "Ask PDF",
  extract: "Extract fields",
  scan: "Protect",
};

const AiPdfAssistant = () => {
  usePageHead({
    title: "AI PDF Assistant — Summarize, Ask and Protect PDFs",
    description: "Analyze a PDF with AI: summarize, ask questions, extract fields and scan for sensitive data.",
    canonical: "https://open-sesame-pdf.lovable.app/ai-pdf-assistant",
  });

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [active, setActive] = useState<Action>("summarize");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const upload = useCallback(async (nextFile: File) => {
    setError("");
    setResult(null);
    const validation = await validatePdfFile(nextFile);
    if (!validation.ok) {
      setError(validation.reason ?? "Please choose a valid PDF.");
      return;
    }
    setFile(nextFile);
    setLoading(true);
    try {
      const extracted = await extractPdfText(nextFile);
      if (!extracted) throw new Error("No searchable text was found. Try OCR first for a scanned PDF.");
      setText(extracted);
    } catch (cause) {
      setFile(null);
      setError(cause instanceof Error ? cause.message : "Could not read this PDF.");
    } finally {
      setLoading(false);
    }
  }, []);

  const run = useCallback(async () => {
    if (!text) return;
    if (active === "chat" && !question.trim()) {
      setError("Ask a question about the PDF first.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const response = await fetch("/api/ai-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: active, text, question }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "AI analysis failed.");
      setResult(payload.result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [active, question, text]);

  const reset = () => {
    setFile(null);
    setText("");
    setQuestion("");
    setResult(null);
    setError("");
  };

  const hasText = useMemo(() => text.length > 0, [text]);

  return (
    <Layout>
      <div className="container min-w-0 max-w-6xl px-4 py-8 sm:py-12">
        <Breadcrumbs className="mb-6" items={[{ name: "Home", to: "/" }, { name: "AI PDF Assistant" }]} />
        <header className="mx-auto max-w-3xl text-center">
          <PremiumIconFrame tone="violet" size="lg" label="AI PDF Assistant icon"><Sparkles /></PremiumIconFrame>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">AI workspace</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-5xl">Understand every PDF faster</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">Summarize, ask questions, extract key fields and find sensitive data. Your original PDF stays in your browser; AI mode sends only extracted text for temporary processing.</p>
        </header>

        <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur sm:p-6">
          {!file ? (
            <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background/60 p-6 text-center transition hover:border-primary/50 hover:bg-primary/5">
              <input type="file" accept=".pdf,application/pdf" className="sr-only" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void upload(selected); event.target.value = ""; }} />
              <PremiumIconFrame tone="blue" size="lg" aria-hidden="true"><Upload /></PremiumIconFrame>
              <span className="mt-4 text-base font-semibold">Drop a PDF to start</span>
              <span className="mt-1 text-sm text-muted-foreground">Text is extracted locally before any AI request.</span>
            </label>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <PremiumIconFrame tone="gold" size="sm" aria-hidden="true"><FileSearch /></PremiumIconFrame>
                <div className="min-w-0"><p className="truncate font-semibold">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · {text.length.toLocaleString()} extracted characters</p></div>
              </div>
              <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />New PDF</Button>
            </div>
          )}
          {loading && <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{hasText ? "Analyzing document…" : "Reading PDF text locally…"}</p>}
          {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        </section>

        {hasText && (
          <section className="mx-auto mt-6 grid max-w-5xl gap-6 lg:grid-cols-[220px_1fr]">
            <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="AI PDF actions">
              {(Object.keys(actionLabels) as Action[]).map((action) => (
                <button key={action} type="button" onClick={() => { setActive(action); setResult(null); setError(""); }} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${active === action ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/40"}`}>
                  {action === "chat" ? <MessageCircleQuestion className="h-4 w-4" /> : action === "scan" ? <ShieldCheck className="h-4 w-4" /> : <FileSearch className="h-4 w-4" />}
                  {actionLabels[action]}
                </button>
              ))}
              <div className="mt-2 hidden rounded-xl border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground lg:block">AI answers are grounded in the extracted text and may include page references. Verify important facts in the source PDF.</div>
            </nav>

            <div className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-6">
              <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-semibold">{actionLabels[active]}</h2><p className="text-sm text-muted-foreground">{active === "chat" ? "Ask a grounded question about this document." : active === "scan" ? "Detect likely personal and financial information before sharing." : "Generate a structured result from this document."}</p></div><Button onClick={() => void run()} disabled={loading}>{active === "chat" ? <Send className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}{loading ? "Working…" : actionLabels[active]}</Button></div>
              {active === "chat" && <div className="mt-5"><Textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What is the termination period in this contract?" className="min-h-24" /></div>}
              {!result && <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Run {actionLabels[active].toLowerCase()} to see a grounded result here.</div>}
              {result && <ResultView active={active} result={result} />}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

const ResultView = ({ active, result }: { active: Action; result: AnalysisResult }) => (
  <div className="mt-6 space-y-5 text-sm">
    {active === "summarize" && <><div><h3 className="font-semibold">Summary</h3><p className="mt-2 leading-7 text-muted-foreground">{result.summary}</p></div><ResultList title="Key points" items={result.keyPoints} /><ResultList title="Action items" items={result.actionItems} /></>}
    {active === "chat" && <><div className="rounded-2xl bg-primary/5 p-4 leading-7">{result.answer}</div>{result.citations?.length ? <div><h3 className="font-semibold">Sources</h3><div className="mt-2 space-y-2">{result.citations.map((citation, index) => <blockquote key={`${citation.page}-${index}`} className="border-l-2 border-primary pl-3 text-muted-foreground">Page {citation.page}: “{citation.quote}”</blockquote>)}</div></div> : null}</>}
    {active === "extract" && <><div className="grid gap-3 sm:grid-cols-2">{[["Document type", result.documentType], ["People", result.people?.join(", ")], ["Organizations", result.organizations?.join(", ")], ["Dates", result.dates?.join(", ")], ["Amounts", result.amounts?.join(", ")]].map(([label, value]) => <div key={label} className="rounded-xl border border-border p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1">{value || "None found"}</p></div>)}</div><ResultList title="Important fields" items={result.importantFields?.map((field) => `${field.label}: ${field.value}`)} /></>}
    {active === "scan" && <><div className={`rounded-2xl border p-4 ${result.riskLevel === "high" ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}><p className="font-semibold">Risk level: {result.riskLevel}</p><p className="mt-1 text-muted-foreground">{result.recommendation}</p></div><div className="space-y-2">{result.findings?.length ? result.findings.map((finding, index) => <div key={`${finding.type}-${index}`} className="rounded-xl border border-border p-3"><p className="font-medium">{finding.type} · Page {finding.page}</p><p className="mt-1 text-muted-foreground">{finding.value} — {finding.reason}</p></div>) : <p className="text-muted-foreground">No likely sensitive data found.</p>}</div></>}
  </div>
);

const ResultList = ({ title, items }: { title: string; items?: string[] }) => items?.length ? <div><h3 className="font-semibold">{title}</h3><ul className="mt-2 space-y-2">{items.map((item, index) => <li key={`${item}-${index}`} className="rounded-xl border border-border p-3 text-muted-foreground">{item}</li>)}</ul></div> : null;

export default AiPdfAssistant;
