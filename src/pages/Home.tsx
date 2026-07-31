import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  Combine,
  Scissors,
  FileArchive,
  FileEdit,
  FileKey,
  Eraser,
  Scaling,
  FileImage,
  IdCard,
  Sparkles,
  ScanText,
  ShieldCheck,
  Cpu,
  WifiOff,
  UserX,
  Wand2,
  PlayCircle,
  Upload,
  Download,
  type LucideIcon,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageHead } from "@/hooks/usePageHead";
import { cn } from "@/lib/utils";

const SITE_URL = "https://open-sesame-pdf.lovable.app";

type Accent =
  | "indigo"
  | "violet"
  | "sky"
  | "teal"
  | "emerald"
  | "amber"
  | "orange"
  | "rose"
  | "fuchsia"
  | "cyan";

interface ToolEntry {
  name: string;
  path: string;
  description: string;
  icon: LucideIcon;
  accent: Accent;
}

interface ToolSection {
  id: string;
  title: string;
  tagline: string;
  tools: ToolEntry[];
}

const SECTIONS: ToolSection[] = [
  {
    id: "pdf-magic",
    title: "PDF Magic",
    tagline: "Merge, split, shrink, edit and unlock documents — right in this tab.",
    tools: [
      { name: "Merge PDF", path: "/merge", description: "Combine several PDFs into one ordered document.", icon: Combine, accent: "indigo" },
      { name: "Split PDF", path: "/split", description: "Split by page or range and download as a ZIP.", icon: Scissors, accent: "violet" },
      { name: "Compress PDF", path: "/compress", description: "Hit an exact target size like 100 KB or 200 KB.", icon: FileArchive, accent: "sky" },
      { name: "PDF Editor", path: "/editor", description: "Edit text directly inside an existing PDF.", icon: FileEdit, accent: "teal" },
      { name: "Unlock PDF", path: "/unlock-pdf", description: "Remove password protection from your own PDFs.", icon: FileKey, accent: "amber" },
    ],
  },
  {
    id: "image-magic",
    title: "Image Magic",
    tagline: "Clean up, resize and convert photos without installing anything.",
    tools: [
      { name: "Background Remover", path: "/background-remover", description: "Cut out any subject and export a transparent PNG.", icon: Eraser, accent: "rose" },
      { name: "Resize Image", path: "/image-resize", description: "Exact pixel sizes plus one-click social presets.", icon: Scaling, accent: "orange" },
      { name: "WebP Converter", path: "/webp-converter", description: "Convert to and from WebP for faster page loads.", icon: FileImage, accent: "emerald" },
      { name: "Passport Photo Maker", path: "/passport-photo", description: "Guided crops and print sheets for ID photos.", icon: IdCard, accent: "cyan" },
    ],
  },
  {
    id: "ai-tools",
    title: "AI Tools",
    tagline: "On-device models — the intelligence runs in your browser, not our servers.",
    tools: [
      { name: "AI Image Upscaler", path: "/image-upscale", description: "Enlarge photos up to 8× with smart sharpening.", icon: Sparkles, accent: "fuchsia" },
      { name: "OCR Image to Text", path: "/image-to-text", description: "Extract selectable, copyable text from scans.", icon: ScanText, accent: "indigo" },
    ],
  },
];

const ACCENT_CLASSES: Record<Accent, string> = {
  indigo: "bg-tool-indigo/10 text-tool-indigo ring-tool-indigo/20",
  violet: "bg-tool-violet/10 text-tool-violet ring-tool-violet/20",
  sky: "bg-tool-sky/10 text-tool-sky ring-tool-sky/20",
  teal: "bg-tool-teal/10 text-tool-teal ring-tool-teal/20",
  emerald: "bg-tool-emerald/10 text-tool-emerald ring-tool-emerald/20",
  amber: "bg-tool-amber/10 text-tool-amber ring-tool-amber/20",
  orange: "bg-tool-orange/10 text-tool-orange ring-tool-orange/20",
  rose: "bg-tool-rose/10 text-tool-rose ring-tool-rose/20",
  fuchsia: "bg-tool-fuchsia/10 text-tool-fuchsia ring-tool-fuchsia/20",
  cyan: "bg-tool-cyan/10 text-tool-cyan ring-tool-cyan/20",
};

const STEPS = [
  { icon: Upload, title: "Pick a file", text: "Drop a PDF or image into any tool. It stays on your device." },
  { icon: Wand2, title: "Run the magic", text: "WebAssembly and JavaScript do the work inside your browser tab." },
  { icon: Download, title: "Download instantly", text: "Save the result. Nothing is stored, queued or uploaded." },
];

const ALL_TOOLS = SECTIONS.flatMap((s) => s.tools.map((t) => ({ ...t, section: s.title })));

const Home = () => {
  usePageHead({
    title: "Open Sesame PDF — Free Browser-Based PDF & Image Tools",
    description:
      "Merge, split, compress, edit and unlock PDFs plus remove backgrounds, resize and upscale images. Fast, secure and 100% browser-based — no uploads, no signup.",
    canonical: `${SITE_URL}/`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Open Sesame PDF",
      url: `${SITE_URL}/`,
      description:
        "Free browser-based PDF and image tools. All processing happens locally on your device.",
    },
  });

  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return ALL_TOOLS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.section.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full blur-3xl bg-magic-gold/40 animate-pulse-glow" />
          <div className="absolute top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl bg-magic-indigo/20" />
          <div className="absolute -bottom-24 right-0 w-[380px] h-[380px] rounded-full blur-3xl bg-magic-indigo/15" />
        </div>

        <div className="container relative z-10 px-4 pt-16 pb-10 md:pt-24 md:pb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 mb-7"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">11 tools · No signup · Free forever</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto max-w-4xl font-display font-bold tracking-tight text-4xl md:text-6xl lg:text-7xl leading-[1.05]"
          >
            Unlock the Magic of{" "}
            <span className="gradient-text">PDF &amp; Image Tools</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground"
          >
            Fast, Secure, and 100% Browser-based. No registration, no file uploads to servers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button asChild size="lg" className="h-14 px-8 text-base rounded-xl glow-effect w-full sm:w-auto">
              <a href="#tools">
                Explore Tools
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base rounded-xl bg-card/70 backdrop-blur w-full sm:w-auto"
            >
              <a href="#how-it-works">
                <PlayCircle className="w-5 h-5 mr-2" />
                How it Works
              </a>
            </Button>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mx-auto mt-12 max-w-2xl"
          >
            <div className="relative rounded-2xl border border-border/70 bg-card/50 p-2 backdrop-blur-xl shadow-[var(--shadow-card)]">
              <label htmlFor="tool-search" className="sr-only">
                Search for a tool
              </label>
              <Search className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="tool-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a tool (e.g., Compress, Merge, OCR)..."
                className="h-14 pl-14 pr-4 text-base bg-transparent border-0 focus-visible:ring-0 placeholder:text-muted-foreground"
              />
            </div>

            {results && (
              <div className="mt-3 rounded-2xl border border-border bg-card/90 backdrop-blur-xl p-2 text-left">
                {results.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    No tool matches “{query}”. Try “PDF”, “image” or “text”.
                  </p>
                ) : (
                  <ul>
                    {results.map((t) => (
                      <li key={t.path}>
                        <Link
                          to={t.path}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted transition-colors"
                        >
                          <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg ring-1", ACCENT_CLASSES[t.accent])}>
                            <t.icon className="w-4 h-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium truncate">{t.name}</span>
                            <span className="block text-xs text-muted-foreground truncate">{t.description}</span>
                          </span>
                          <ArrowRight className="ml-auto w-4 h-4 text-muted-foreground shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Tool sections */}
      <section id="tools" className="container px-4 py-12 md:py-16 scroll-mt-20">
        <h2 className="sr-only">All tools</h2>
        <div className="space-y-14">
          {SECTIONS.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-20">
              <div className="mb-6 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="font-display text-2xl md:text-3xl font-bold">{section.title}</h3>
                  <p className="text-muted-foreground mt-1">{section.tagline}</p>
                </div>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {section.tools.length} tools
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.tools.map((tool) => (
                  <motion.div
                    key={tool.path}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.4 }}
                  >
                    <Link
                      to={tool.path}
                      className="group block h-full glass-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className={cn(
                          "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-110",
                          ACCENT_CLASSES[tool.accent]
                        )}
                      >
                        <tool.icon className="w-5 h-5" />
                      </span>
                      <h4 className="font-semibold text-lg flex items-center gap-1.5">
                        {tool.name}
                        <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                      </h4>
                      <p className="mt-1.5 text-sm text-muted-foreground">{tool.description}</p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy first */}
      <section className="container px-4 py-12 md:py-16">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 md:p-12">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-16 w-[380px] h-[380px] rounded-full blur-3xl bg-magic-gold/30" />
            <div className="absolute -bottom-28 -left-16 w-[320px] h-[320px] rounded-full blur-3xl bg-magic-indigo/20" />
          </div>

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 mb-5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Privacy First
                </span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold">
                Your files never leave your device
              </h2>
              <p className="mt-4 text-muted-foreground md:text-lg">
                Every tool on Open Sesame PDF runs entirely inside your browser using WebAssembly
                and JavaScript. There is no upload step, no server-side queue and no temporary
                storage — which means nothing to leak, subpoena or delete later. Turn off your
                Wi-Fi after the page loads and the tools still work.
              </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { icon: Cpu, title: "WebAssembly powered", text: "Native-speed processing on your own CPU." },
                { icon: WifiOff, title: "Works offline", text: "No network calls once the tool has loaded." },
                { icon: UserX, title: "No accounts", text: "No sign-up, no tracking of your documents." },
              ].map((item) => (
                <li key={item.title} className="flex gap-3 rounded-2xl border border-border bg-background/60 p-4">
                  <item.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container px-4 py-12 md:py-16 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold">How it works</h2>
          <p className="mt-3 text-muted-foreground">
            Three steps, zero uploads. Open a tool and you are already done setting up.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass-card p-6 text-center"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <step.icon className="w-5 h-5" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground tabular-nums">
                Step {i + 1}
              </p>
              <h3 className="mt-1 font-semibold text-lg">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="lg" className="h-14 px-8 text-base rounded-xl">
            <a href="#tools">
              Explore Tools
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Home;
