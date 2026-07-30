import { ReactNode } from "react";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
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
    type: "article",
    breadcrumbs: [
      { name: "Home", url: `${SITE_URL}/` },
      { name: "Image Tools", url: `${SITE_URL}/image-tools` },
      { name: title, url: `${SITE_URL}${path}` },
    ],
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
        <Breadcrumbs
          className="mb-6"
          items={[
            { name: "Home", to: "/" },
            { name: "Image Tools", to: "/image-tools" },
            { name: title },
          ]}
        />
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">{title}</h1>
        <p className="text-xs text-muted-foreground mb-8">Last updated {updated}</p>
        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-display [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </div>
      </div>
    </Layout>
  );
};
