import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Shield, Zap, Lock, Gauge, Sparkles, ArrowRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { AdSlot } from "@/components/AdSlot";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { usePageHead } from "@/hooks/usePageHead";
import { cn } from "@/lib/utils";
import { PremiumIconFrame } from "@/components/PremiumIcon";
import { IMAGE_TOOLS, SITE_URL, TOOL_CATEGORIES, type ToolCategory } from "@/data/imageTools";

const FEATURES = [
  { icon: Lock, title: "Private by default", text: "Every tool processes files on your device. Nothing is uploaded, stored or logged." },
  { icon: Zap, title: "Instant results", text: "No queues and no round-trips to a server — conversions start the moment you drop a file." },
  { icon: Gauge, title: "Built for speed", text: "Code-split routes and lazy-loaded engines keep the first load light on mobile." },
  { icon: Shield, title: "No accounts, no watermarks", text: "Unlimited use, no sign-up, no credits and no branding stamped on your exports." },
];

const FAQS = [
  { q: "Are these image tools really free?", a: "Yes. Every tool is free and unlimited. Processing runs in your browser, so there are no server costs to recover." },
  { q: "Do my images get uploaded anywhere?", a: "No. Files are read directly by your browser using the File API and never transmitted. You can even disconnect from the internet after the page loads." },
  { q: "Which formats are supported?", a: "JPG, PNG, WebP and AVIF across most tools, plus GIF and BMP inputs where the browser can decode them." },
  { q: "Do the tools work on a phone?", a: "Yes. Every page is responsive and touch-friendly, though very large images depend on your device's available memory." },
  { q: "Is there a file size limit?", a: "Uploads are capped at 30 MB per file to protect low-memory devices. Everything below that is processed at full resolution." },
];

const BLOG = [
  {
    title: "WebP vs AVIF in 2026: which format should you ship?",
    excerpt: "AVIF wins on compression, WebP wins on support. A practical decision tree for picking the right format per asset.",
    tag: "Formats",
    to: "/webp-converter",
  },
  {
    title: "The exact image sizes for Instagram, YouTube and X",
    excerpt: "A cheat sheet of current recommended dimensions, plus why cropping beats stretching every time.",
    tag: "Social",
    to: "/image-resize",
  },
  {
    title: "How browser-based background removal actually works",
    excerpt: "Segmentation models now run in WebAssembly. Here is what that means for privacy and quality.",
    tag: "AI",
    to: "/background-remover",
  },
];

const ImageToolsHub = () => {
  usePageHead({
    title: "ImageTools Hub — Free Online Image Tools That Run In Your Browser",
    description:
      "Remove backgrounds, compress, resize, convert to WebP or AVIF, upscale with AI and extract text with OCR. Free, private, unlimited — nothing is uploaded.",
    canonical: `${SITE_URL}/image-tools`,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: "ImageTools Hub",
          url: `${SITE_URL}/image-tools`,
          description: "Free client-side image tools: background remover, compressor, resizer, converter, upscaler and OCR.",
        },
        {
          "@type": "ItemList",
          itemListElement: IMAGE_TOOLS.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: t.name,
            url: `${SITE_URL}${t.path}`,
          })),
        },
        {
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ],
    },
  });

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return IMAGE_TOOLS.filter((t) => {
      if (category !== "All" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.includes(q))
      );
    });
  }, [query, category]);

  const popular = IMAGE_TOOLS.filter((t) => t.popular);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]"
          aria-hidden
        />
        <div className="container relative py-16 sm:py-24 text-center max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 backdrop-blur text-xs text-muted-foreground mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              100% client-side — your images never leave this device
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-4">
              Every image tool you need, in one place
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Remove backgrounds, compress, resize, convert, upscale and read text from images —
              free, unlimited and completely private.
            </p>

            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tools — try “webp”, “resize” or “ocr”"
                aria-label="Search image tools"
                className="pl-10 h-12 rounded-xl bg-card/70 backdrop-blur"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container py-14 space-y-16">
        {/* Popular tools */}
        {!query && category === "All" && (
          <section>
            <h2 className="text-2xl font-display font-semibold mb-6">Popular tools</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {popular.map((t, i) => (
                <motion.div
                  key={t.slug}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    to={t.path}
                    className="group block h-full rounded-2xl border border-border bg-card/50 backdrop-blur p-6 hover:border-primary/50 hover:shadow-lg transition-all"
                  >
                      <PremiumIconFrame tone="gold" size="md" className="mb-4" aria-hidden="true">
                        <t.icon />
                      </PremiumIconFrame>
                    <h3 className="font-display font-semibold group-hover:text-primary transition-colors">
                      {t.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{t.tagline}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-primary mt-4">
                      Open tool <ArrowRight className="w-3 h-3" aria-hidden />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <AdSlot />

        {/* Categories + all tools */}
        <section>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <h2 className="text-2xl font-display font-semibold mr-3">All tools</h2>
            {(["All", ...TOOL_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  category === c
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-muted-foreground">No tools match “{query}”.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t) => (
                <Link
                  key={t.slug}
                  to={t.path}
                  className="group rounded-2xl border border-border bg-card/50 backdrop-blur p-5 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <PremiumIconFrame tone="blue" size="sm" className="size-8 rounded-lg [&>span]:size-5 [&_svg]:size-3" aria-hidden="true"><t.icon /></PremiumIconFrame>
                    <h3 className="font-medium group-hover:text-primary transition-colors">{t.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <span className="inline-block mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t.category}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Features */}
        <section>
          <h2 className="text-2xl font-display font-semibold mb-6">Why ImageTools Hub</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6">
                <PremiumIconFrame tone="mint" size="sm" className="mb-3" aria-hidden="true"><f.icon /></PremiumIconFrame>
                <h3 className="font-medium mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Blog */}
        <section>
          <h2 className="text-2xl font-display font-semibold mb-6">From the blog</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {BLOG.map((p) => (
              <Link
                key={p.title}
                to={p.to}
                className="group rounded-2xl border border-border bg-card/50 backdrop-blur p-6 hover:border-primary/50 transition-colors"
              >
                <span className="text-[11px] uppercase tracking-wide text-primary">{p.tag}</span>
                <h3 className="font-display font-semibold mt-2 group-hover:text-primary transition-colors">
                  {p.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-display font-semibold mb-6">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card/50 backdrop-blur px-5">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`f-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* CTA */}
        <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card/50 to-card/20 backdrop-blur p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">
            Start with the tool you need right now
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            No sign-up, no upload, no watermark. Pick a tool and drop your first image.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/background-remover">Remove a background</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/image-compress">Compress an image</Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default ImageToolsHub;
