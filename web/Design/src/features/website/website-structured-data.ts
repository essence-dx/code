import type { WebsiteModel, WebsiteSection } from "@/features/editor/types";

type WebsiteStructuredDataInput = {
  appUrl: string;
  slug: string;
  model: WebsiteModel;
};

export function createWebsiteStructuredData({
  appUrl,
  slug,
  model,
}: WebsiteStructuredDataInput) {
  const url = `${appUrl.replace(/\/$/, "")}/site/${slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: model.seoTitle || model.title,
    description: model.seoDescription || undefined,
    url,
    hasPart: model.sections.map((section, index) =>
      createSectionStructuredData({
        section,
        position: index + 1,
        pageUrl: url,
      }),
    ),
  };
}

export function stringifyStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function createSectionStructuredData({
  section,
  position,
  pageUrl,
}: {
  section: WebsiteSection;
  position: number;
  pageUrl: string;
}) {
  return {
    "@type": "WebPageElement",
    "@id": `${pageUrl}#${section.anchorId}`,
    position,
    name: section.seoTitle || section.name,
    description: section.seoDescription || undefined,
  };
}
