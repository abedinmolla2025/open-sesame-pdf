import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { usePageHead } from "@/hooks/usePageHead";
import { SITE_URL } from "@/data/imageTools";

interface StaticPageProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  path: string;
  updated?: string;
  children: ReactNode;
}

export const StaticPage = ({
  title,
  metaTitle,
  metaDescription,
  path,
  updated = "30 July 2026",
  children,
}: StaticPageProps) => {
  usePageHead({
    title: metaTitle,
    description: metaDescription,
    canonical: `${SITE_URL}${path}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      url: `${SITE_URL}${path}`,
      description: metaDescription,
    },
  });

  return (
    <Layout>
      <div className="container py-12 max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
          <Link to="/image-tools" className="hover:text-foreground">
            Image Tools
          </Link>
          <span className="mx-1">/</span>
          <span className="text-foreground">{title}</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">{title}</h1>
        <p className="text-xs text-muted-foreground mb-8">Last updated {updated}</p>
        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-display [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </div>
      </div>
    </Layout>
  );
};
