import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  Eraser,
  ImageDown,
  Scaling,
  FileImage,
  Sparkles,
  ScanText,
  Combine,
  Scissors,
  FileArchive,
  FileEdit,
  FileKey,
  ShieldCheck,
  IdCard,
  Zap,
  Lock,
  Wifi,
  Gauge,
  BadgeCheck,
  UserX,
  Upload,
  Download,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { AdSlot } from "@/components/AdSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePageHead } from "@/hooks/usePageHead";

const SITE_URL = "https://free-my-pdf.lovable.app";

interface ToolEntry {
  name: string;
  path: string;
  description: string;
  icon: LucideIcon;
  group: "Image Tools" | "PDF Tools" | "AI Tools" | "Converters";
  popular?: boolean;
}

const TOOLS: ToolEntry[] = [
  { name: "Background Remover", path: "/background-remover", description: "Cut out any subject and download a transparent PNG.", icon: Eraser, group: "AI Tools", popular: true },
  { name: "Compress Image", path: "/image-compress", description: "Shrink JPG, PNG and WebP with no visible quality loss.", icon: ImageDown, group: "Image Tools", popular: true },
  { name: "Resize Image", path: "/image-resize", description: "Exact pixel sizes plus one-click social presets.", icon: Scaling, group: "Image Tools", popular: true },
  { name: "WebP Converter", path: "/webp-converter", description: "Convert to and from WebP for faster page loads.", icon: FileImage, group: "Converters", popular: true },
  { name: "AI Image Upscaler", path: "/image-upscale", description: "Enlarge photos up to 8× with sharpening.", icon: Sparkles, group: "AI Tools", popular: true },
  { name: "OCR Image to Text", path: "/image-to-text", description: "Extract selectable text from photos and scans.", icon: ScanText, group: "AI Tools", popular: true },
  { name: "Merge PDF", path: "/merge", description: "Combine several PDFs into one ordered document.", icon: Combine, group: "PDF Tools", popular: true },
  { name: "Split PDF", path: "/split", description: "Split by page or range and download as a ZIP.", icon: Scissors, group: "PDF Tools", popular: true },
  { name: "Compress PDF", path: "/compress", description: "Hit an exact target size like 100 KB or 200 KB.", icon: FileArchive, group: "PDF Tools", popular: true },
  { name: "JPG to PDF", path: "/image-to-pdf", description: "Turn JPG, PNG or WebP images into a single PDF.", icon: FileImage, group: "Converters", popular: true },
  { name: "PDF Editor", path: "/editor", description: "Edit text directly inside an existing PDF.", icon: FileEdit, group: "PDF Tools", popular: true },
  { name: "Unlock PDF", path: "/unlock-pdf", description: "Remove password protection from your own PDFs.", icon: FileKey, group: "PDF Tools", popular: true },
  { name: "Passport Photo Maker", path: "/passport-photo", description: "Guided crops and print sheets for ID photos.", icon: IdCard, group: "Image Tools" },
  { name: "PDF Security Scan", path: "/pdf-security", description: "Scan a PDF for scripts, actions and embedded risks.", icon: ShieldCheck, group: "PDF Tools" },
  { name: "Signature Field Detector", path: "/signature", description: "Inspect signature fields inside a PDF.", icon: ShieldCheck, group: "PDF Tools" },
  { name: "Image Tools Hub", path: "/image-tools", description: "Browse every image utility in one place.", icon: Wand2, group: "Image Tools" },
];

const POPULAR_SEARCHES = [
  { label: "Compress Image", path: "/image-compress" },
  { label: "Background Remover", path: "/background-remover" },
  { label: "Merge PDF", path: "/merge" },
  { label: "WebP Converter", path: "/webp-converter" },
  { label: "OCR", path: "/image-to-text" },
];

const CATEGORIES: ToolEntry["group"][] = ["Image Tools", "PDF Tools", "AI Tools", "Converters"];

const REASONS = [
  { icon: BadgeCheck, title: "100% Free", body: "Every tool is free with no trial, no credits and no watermarks." },
  { icon: Zap, title: "Fast Processing", body: "Work happens on your own hardware, so there is no upload queue." },
  { icon: Lock, title: "Secure", body: "Files stay in the browser tab and are discarded when you close it." },
  { icon: ShieldCheck, title: "Privacy First", body: "No file ever reaches a server, so nothing can be stored or shared." },
  { icon: UserX, title: "No Registration", body: "No account, no email, no cookies required to use a tool." },
  { icon: Wifi, title: "Works on Any Device", body: "Installable as an app and usable offline on phone, tablet or desktop." },
  { icon: Gauge, title: "High Quality Results", body: "Full-resolution output with controls over quality and dimensions." },
];

const STEPS = [
  { icon: Upload, title: "Upload your file", body: "Drag and drop, paste from the clipboard, or pick a file. Nothing is uploaded." },
  { icon: Wand2, title: "Process instantly", body: "Choose your settings and the tool runs locally in a few seconds." },
  { icon: Download, title: "Download result", body: "Save the finished file — single download or a ZIP for batches." },
];

const FEATURED = [
  { name: "Background Remover", path: "/background-remover", icon: Eraser, blurb: "Studio-grade cutouts for product shots and portraits, straight to transparent PNG." },
  { name: "Compress PDF", path: "/compress", icon: FileArchive, blurb: "Meet strict upload limits with target-size compression down to 50 KB." },
  { name: "AI Image Upscaler", path: "/image-upscale", icon: Sparkles, blurb: "Rescue small images with up to 8× enlargement and unsharp detail recovery." },
  { name: "OCR Image to Text", path: "/image-to-text", icon: ScanText, blurb: "Pull clean, copyable text out of receipts, screenshots and scanned pages." },
  { name: "WebP Converter", path: "/webp-converter", icon: FileImage, blurb: "Swap heavy JPG and PNG assets for WebP and cut page weight in half." },
];

const ARTICLES = [
  { title: "How to Compress Images Without Losing Quality", excerpt: "Quality sliders, resampling and the file formats that matter for the web.", path: "/image-compress", read: "6 min read" },
  { title: "The Best Free PDF Tools in 2026", excerpt: "What to look for in a merger, splitter and compressor — and what to avoid.", path: "/image-tools", read: "8 min read" },
  { title: "JPG vs WebP: Which Should You Use?", excerpt: "A side-by-side look at compression, transparency and browser support.", path: "/webp-converter", read: "5 min read" },
  { title: "How OCR Works in Your Browser", excerpt: "From pixels to characters, and why client-side OCR keeps documents private.", path: "/image-to-text", read: "7 min read" },
  { title: "An Image Optimization Guide for Faster Sites", excerpt: "Sizing, formats and lazy loading rules that move Core Web Vitals.", path: "/image-resize", read: "9 min read" },
];

const FAQS = [
  { q: "Are these PDF and image tools really free?", a: "Yes. Every tool on ImagePDF Tools is free to use with no account, no usage limits and no watermarks on the output." },
  { q: "Do my files get uploaded to a server?", a: "No. All processing runs inside your browser using JavaScript and WebAssembly. Your files never leave your device, which is why the tools also work offline." },
  { q: "Do I need to create an account?", a: "No registration is required. Open a tool, drop in a file and download the result." },
  { q: "Is there a file size limit?", a: "The practical limit is your device's memory rather than a server quota. Most phones handle files up to around 100 MB comfortably; desktops handle much more." },
  { q: "Can I compress a PDF to an exact size like 100 KB?", a: "Yes. The PDF compressor has a target-size mode with 50 KB, 100 KB, 150 KB and 200 KB presets plus a custom value, and it re-compresses iteratively until it fits." },
  { q: "Will compressing an image ruin its quality?", a: "Not at typical settings. You control the quality level and can compare original and compressed sizes before downloading, so you decide the trade-off." },
  { q: "Which image formats are supported?", a: "JPG, PNG and WebP are supported across the image tools, and conversions between them are available in the WebP converter and image-to-PDF tools." },
  { q: "How accurate is the OCR tool?", a: "Accuracy depends on the image. Sharp, high-contrast, straight scans of printed text give the best results; handwriting and low-resolution photos are less reliable." },
  { q: "Can I use these tools on my phone?", a: "Yes. The site is mobile-first and installable as a progressive web app, so you can add it to your home screen and use it like a native app." },
  { q: "Is it legal to unlock a password-protected PDF?", a: "Only unlock documents you own or are authorised to access. The unlocker requires the correct password and is intended for your own files." },
];

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

const Home = () => {
  const [query, setQuery] = useState("");

  usePageHead({
    title: "ImagePDF Tools — Free PDF & Image Tools, No Registration",
    description:
      "Compress, convert, resize, remove backgrounds, run OCR and merge PDFs free in your browser. Fast, secure, private — no uploads and no sign-up.",
    canonical: `${SITE_URL}/`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ImagePDF Tools",
        url: `${SITE_URL}/`,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/image-tools?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
    breadcrumbs: [{ name: "Home", url: `${SITE_URL}/` }],
  });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return TOOLS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [query]);

  const popular = TOOLS.filter((t) => t.popular).slice(0, 12);

  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[520px] bg-primary/15 blur-3xl rounded-full" />
          <div className="absolute bottom-0 right-0 w-[360px] h-[360px] bg-primary/10 blur-3xl rounded-full" />
        </div>

        <div className="container relative z-10 py-16 md:py-24 text-center">
          <motion.div {...fade}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Free • Private • Browser-based
            </span>
            <h1 className="mt-6 font-display text-4xl md:text-6xl font-bold tracking-tight">
              Free PDF &amp; Image Tools
              <span className="block mt-3 text-xl md:text-2xl font-medium text-muted-foreground">
                Fast • Secure • No Registration
              </span>
            </h1>
            <p className="mt-6 mx-auto max-w-2xl text-base md:text-lg text-muted-foreground">
              Compress, convert, resize, remove background, OCR, merge PDFs and more. Everything
              works directly in your browser.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-2xl w-full sm:w-auto">
                <a href="#popular-tools">
                  Explore Tools <ArrowRight className="ml-1 w-4 h-4" aria-hidden="true" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-2xl w-full sm:w-auto">
                <a href="#why-us">Learn More</a>
              </Button>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div {...fade} transition={{ duration: 0.5, delay: 0.1 }} className="mt-10 max-w-xl mx-auto">
            <label htmlFor="tool-search" className="sr-only">
              Search tools
            </label>
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="tool-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a tool — compress, merge, OCR…"
                className="h-12 pl-11 rounded-2xl bg-card/60 backdrop-blur border-border"
              />
            </div>

            {results.length > 0 && (
              <ul className="mt-3 rounded-2xl border border-border bg-card/80 backdrop-blur p-2 text-left shadow-lg">
                {results.map((t) => (
                  <li key={t.path}>
                    <Link
                      to={t.path}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted transition-colors"
                    >
                      <t.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                      <span className="text-sm font-medium">{t.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{t.group}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Popular:</span>
              {POPULAR_SEARCHES.map((p) => (
                <Link
                  key={p.path}
                  to={p.path}
                  className="rounded-full border border-border bg-card/50 px-3 py-1 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container">
        <AdSlot label="Advertisement" format="leaderboard" className="mb-16" />
      </div>

      {/* POPULAR TOOLS */}
      <section id="popular-tools" className="container py-8 scroll-mt-24">
        <SectionHeading
          title="Popular tools"
          subtitle="The tools people reach for most — all running locally in your browser."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((t, i) => (
            <motion.article
              key={t.path}
              {...fade}
              transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.2) }}
              className="group rounded-2xl border border-border bg-card/60 backdrop-blur p-6 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <t.icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{t.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
              <Button asChild variant="ghost" size="sm" className="mt-4 px-0 text-primary hover:bg-transparent">
                <Link to={t.path} aria-label={`Open ${t.name}`}>
                  Open Tool <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
              </Button>
            </motion.article>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="container py-16 scroll-mt-24">
        <SectionHeading title="Tools by category" subtitle="Browse the full toolkit by what you need to do." />
        <div className="grid gap-6 md:grid-cols-2">
          {CATEGORIES.map((cat) => (
            <motion.div
              key={cat}
              {...fade}
              className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 shadow-sm"
            >
              <h3 className="font-display font-semibold text-xl">{cat}</h3>
              <ul className="mt-4 space-y-2">
                {TOOLS.filter((t) => t.group === cat).map((t) => (
                  <li key={t.path}>
                    <Link
                      to={t.path}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 -mx-3 hover:bg-muted transition-colors"
                    >
                      <t.icon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                      <span className="text-sm font-medium">{t.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section id="why-us" className="container py-16 scroll-mt-24">
        <SectionHeading title="Why choose ImagePDF Tools" subtitle="Built to be quick, private and genuinely free." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r) => (
            <motion.div
              key={r.title}
              {...fade}
              className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 shadow-sm"
            >
              <r.icon className="w-6 h-6 text-primary" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">{r.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="container">
        <AdSlot label="Advertisement" format="inline" className="my-8" />
      </div>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="container py-16 scroll-mt-24">
        <SectionHeading title="How it works" subtitle="Three steps, no account, no waiting room." />
        <ol className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              {...fade}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  {i + 1}
                </span>
                <s.icon className="w-5 h-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* FEATURED */}
      <section id="featured" className="container py-16 scroll-mt-24">
        <SectionHeading title="Featured tools" subtitle="The heavy lifters worth bookmarking." />
        <div className="grid gap-6 md:grid-cols-2">
          {FEATURED.map((f) => (
            <motion.article
              key={f.path}
              {...fade}
              className="rounded-2xl border border-border bg-gradient-to-br from-card/80 to-card/40 backdrop-blur p-8 shadow-sm hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <f.icon className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="mt-5 font-display text-2xl font-semibold">{f.name}</h3>
              <p className="mt-3 text-muted-foreground">{f.blurb}</p>
              <Button asChild className="mt-6 rounded-2xl">
                <Link to={f.path}>Open {f.name}</Link>
              </Button>
            </motion.article>
          ))}
        </div>
      </section>

      {/* BLOG */}
      <section id="blog" className="container py-16 scroll-mt-24">
        <SectionHeading title="Latest articles" subtitle="Guides on compression, formats and document workflows." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.map((a) => (
            <motion.article
              key={a.title}
              {...fade}
              className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 shadow-sm hover:border-primary/30 transition-colors"
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{a.read}</p>
              <h3 className="mt-3 font-semibold text-lg">{a.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{a.excerpt}</p>
              <Link
                to={a.path}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                Try the tool <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </motion.article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-16 scroll-mt-24">
        <SectionHeading title="Frequently asked questions" subtitle="Everything about privacy, limits and quality." />
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* TRUST */}
      <section id="trust" className="container py-16 scroll-mt-24">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Lock, title: "Secure processing", body: "Files are processed securely inside your browser tab and never transmitted." },
            { icon: UserX, title: "No registration needed", body: "No sign-up, no email, no credit card — open a tool and start working." },
            { icon: ShieldCheck, title: "Privacy first", body: "Nothing is stored, logged or shared. Close the tab and the file is gone." },
          ].map((t) => (
            <motion.div
              key={t.title}
              {...fade}
              className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 text-center shadow-sm"
            >
              <t.icon className="w-6 h-6 text-primary mx-auto" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">{t.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <motion.div
          {...fade}
          className="rounded-2xl border border-primary/20 bg-primary/10 backdrop-blur p-10 md:p-14 text-center shadow-lg"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold">Ready to optimize your files?</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Over 15 free image and PDF tools, all running privately in your browser.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-2xl">
            <Link to="/image-tools">Start Using Free Tools</Link>
          </Button>
        </motion.div>
      </section>
    </Layout>
  );
};

const SectionHeading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-10 text-center">
    <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
    <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
  </div>
);

export default Home;
