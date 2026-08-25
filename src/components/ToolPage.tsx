import { ReactNode, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, HelpCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AdSlot } from "@/components/AdSlot";
import { usePageHead } from "@/hooks/usePageHead";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { IMAGE_TOOLS, SITE_URL, getTool, relatedTools } from "@/data/imageTools";
import { PremiumIconFrame } from "@/components/PremiumIcon";

export interface Faq {
  q: string;
  a: string;
}

interface ToolPageProps {
  slug: string;
  title: string;
  metaDescription: string;
  intro: string;
  howTo: string[];
  features: string[];
  benefits: string[];
  faqs: Faq[];
  children: ReactNode;
}

export const ToolPage = ({
  slug,
  title,
  metaDescription,
  intro,
  howTo,
  features,
  benefits,
  faqs,
  children,
}: ToolPageProps) => {
  const tool = getTool(slug);
  const canonical = `${SITE_URL}${tool?.path ?? `/${slug}`}`;

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          name: tool?.name ?? title,
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Any (web browser)",
          url: canonical,
          description: metaDescription,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "Image Tools", item: `${SITE_URL}/image-tools` },
            { "@type": "ListItem", position: 3, name: tool?.name ?? title, item: canonical },
          ],
        },
        {
          "@type": "HowTo",
          name: `How to use the ${tool?.name ?? title}`,
          step: howTo.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
        },
        {
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ],
    }),
    [canonical, faqs, howTo, metaDescription, title, tool]
  );

  usePageHead({ title, description: metaDescription, canonical, type: "website", jsonLd });

  const related = relatedTools(slug, 3);
  const Icon = tool?.icon;

  return (
    <Layout>
      <div className="container py-8 sm:py-10 max-w-5xl">
        <Breadcrumbs
          className="mb-6"
          items={[
            { name: "Home", to: "/" },
            { name: "Image Tools", to: "/image-tools" },
            { name: tool?.name ?? title },
          ]}
        />


        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            {Icon && (
              <PremiumIconFrame tone="gold" size="lg" label={`${tool?.name ?? title} icon`}>
                <Icon className="w-5 h-5" />
              </PremiumIconFrame>
            )}
            <h1 className="text-3xl md:text-4xl font-display font-bold">{tool?.name ?? title}</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">{intro}</p>
        </motion.header>

        <section aria-label="Tool" className="mb-12">
          {children}
        </section>

        <AdSlot className="mb-12" />

        <div className="grid gap-10 md:grid-cols-2 mb-12">
          <section>
            <h2 className="text-xl font-display font-semibold mb-4">How to use it</h2>
            <ol className="space-y-3">
              {howTo.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold mb-4">Features</h2>
            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f} className="flex gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-display font-semibold mb-4">Benefits</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {benefits.map((b) => (
              <div
                key={b}
                className="rounded-xl border border-border bg-card/50 backdrop-blur p-4 text-sm text-muted-foreground"
              >
                {b}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" aria-hidden /> Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="rounded-xl border border-border bg-card/50 backdrop-blur px-4">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mb-4">
          <h2 className="text-xl font-display font-semibold mb-4">Related tools</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((t) => (
              <Link
                key={t.slug}
                to={t.path}
                className="group rounded-xl border border-border bg-card/50 backdrop-blur p-4 hover:border-primary/50 transition-colors"
              >
                <t.icon className="w-5 h-5 text-primary mb-2" aria-hidden />
                <div className="font-medium group-hover:text-primary transition-colors">{t.name}</div>
                <p className="text-xs text-muted-foreground mt-1">{t.tagline}</p>
              </Link>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Browse the full set on the{" "}
            <Link to="/image-tools" className="text-primary underline underline-offset-4">
              image tools hub
            </Link>
            , or jump straight to the{" "}
            <Link to="/image-compress" className="text-primary underline underline-offset-4">
              image compressor
            </Link>{" "}
            and{" "}
            <Link to="/webp-converter" className="text-primary underline underline-offset-4">
              WebP converter
            </Link>
            . {IMAGE_TOOLS.length} tools available in total.
          </p>
        </section>
      </div>
    </Layout>
  );
};
