export type WebsiteSeoAuditCode =
  | "design"
  | "title"
  | "seo-title"
  | "description"
  | "slug";

export type WebsiteSeoAuditItem = {
  code: WebsiteSeoAuditCode;
  status: "ok" | "warning";
};

export type WebsiteSeoAuditResult = {
  score: number;
  total: number;
  items: WebsiteSeoAuditItem[];
};

export function createWebsiteSeoAudit(input: {
  projectName?: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
}): WebsiteSeoAuditResult {
  const projectName = normalizeText(input.projectName, 120);
  const title = normalizeText(input.title, 120) || projectName;
  const seoTitle = normalizeText(input.seoTitle, 120);
  const seoDescription = normalizeText(input.seoDescription, 180);
  const slug = normalizeText(input.slug, 80);
  const items: WebsiteSeoAuditItem[] = [
    {
      code: "design",
      status: projectName ? "ok" : "warning",
    },
    {
      code: "title",
      status: title.length >= 3 && title.length <= 70 ? "ok" : "warning",
    },
    {
      code: "seo-title",
      status:
        seoTitle.length >= 10 && seoTitle.length <= 70 ? "ok" : "warning",
    },
    {
      code: "description",
      status:
        seoDescription.length >= 80 && seoDescription.length <= 160
          ? "ok"
          : "warning",
    },
    {
      code: "slug",
      status: !slug || isReadableSlug(slug) ? "ok" : "warning",
    },
  ];

  return {
    score: items.filter((item) => item.status === "ok").length,
    total: items.length,
    items,
  };
}

function isReadableSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function normalizeText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}
