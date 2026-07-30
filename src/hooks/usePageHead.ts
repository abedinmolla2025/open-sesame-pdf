import { useEffect } from "react";

export interface Crumb {
  name: string;
  url: string;
}

interface HeadOptions {
  title: string;
  description: string;
  canonical: string;
  /** Open Graph type, defaults to "website". */
  type?: string;
  /** Absolute https URL for the social preview image. */
  image?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Renders a BreadcrumbList JSON-LD block. */
  breadcrumbs?: Crumb[];
}

const SITE_NAME = "Free My PDF";

function upsertMeta(selector: string, attr: string, name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function usePageHead({
  title,
  description,
  canonical,
  type = "website",
  image,
  jsonLd,
  breadcrumbs,
}: HeadOptions) {
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : "";
  const crumbKey = breadcrumbs ? JSON.stringify(breadcrumbs) : "";

  useEffect(() => {
    document.title = title;
    upsertMeta('meta[name="description"]', "name", "description", description);

    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME);
    upsertMeta('meta[property="og:locale"]', "property", "og:locale", "en_US");

    upsertMeta(
      'meta[name="twitter:card"]',
      "name",
      "twitter:card",
      image ? "summary_large_image" : "summary"
    );
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

    if (image) {
      upsertMeta('meta[property="og:image"]', "property", "og:image", image);
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", image);
    }

    upsertLink("canonical", canonical);

    const scripts: HTMLScriptElement[] = [];
    const addJsonLd = (data: unknown) => {
      const el = document.createElement("script");
      el.type = "application/ld+json";
      el.setAttribute("data-page-jsonld", "true");
      el.textContent = JSON.stringify(data);
      document.head.appendChild(el);
      scripts.push(el);
    };

    if (jsonLd) (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).forEach(addJsonLd);

    if (breadcrumbs && breadcrumbs.length > 0) {
      addJsonLd({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          item: c.url,
        })),
      });
    }

    return () => {
      scripts.forEach((s) => s.parentNode?.removeChild(s));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, canonical, type, image, jsonLdKey, crumbKey]);
}
