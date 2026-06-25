import type { DesignPresetId } from "@/features/editor/types";

export type TemplateCatalogFormat = Exclude<DesignPresetId, "custom">;

export type TemplateCatalogItem = {
  id: string;
  name: string;
  description: string;
  usageNotes: string;
  format: TemplateCatalogFormat;
  category: string;
  industry: string;
  season: string;
  platform: string;
  tags: string[];
  width: number;
  height: number;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  assetProvenanceNotes: string[];
};

export type TemplateCatalogSearchInput = {
  query?: string;
  format?: TemplateCatalogFormat | "all";
  category?: string;
  industry?: string;
  season?: string;
  platform?: string;
};

export type TemplateCatalogDiscoveryFacetKind =
  | "format"
  | "category"
  | "industry"
  | "season"
  | "platform";

export type TemplateCatalogDiscoveryFacet = {
  id: string;
  kind: TemplateCatalogDiscoveryFacetKind;
  label: string;
  count: number;
  templateIds: string[];
  topTemplateId: string | null;
};

export type TemplateCatalogDiscoverySummary = {
  totals: {
    templates: number;
    formats: number;
    categories: number;
    industries: number;
    seasons: number;
    platforms: number;
  };
  formats: TemplateCatalogDiscoveryFacet[];
  categories: TemplateCatalogDiscoveryFacet[];
  industries: TemplateCatalogDiscoveryFacet[];
  seasons: TemplateCatalogDiscoveryFacet[];
  platforms: TemplateCatalogDiscoveryFacet[];
  provenance: {
    withNotes: number;
    missingNotes: number;
    readyPercent: number;
  };
  recommendedFacets: TemplateCatalogDiscoveryFacet[];
};

export const templateCatalogItems: TemplateCatalogItem[] = [
  {
    id: "social-launch-announcement",
    name: "Launch announcement post",
    description: "A square launch layout for product, event, or service news.",
    usageNotes:
      "Replace the headline, swap the proof points, then export for feed posts.",
    format: "instagram-post",
    category: "Marketing",
    industry: "SaaS",
    season: "Evergreen",
    platform: "Instagram",
    tags: ["launch", "announcement", "social", "product"],
    width: 1080,
    height: 1080,
    accentColor: "#0f766e",
    surfaceColor: "#ecfeff",
    textColor: "#0f172a",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from editable geometric blocks and launch-copy placeholders for feed-safe exports.",
    ),
  },
  {
    id: "startup-pitch-deck",
    name: "Investor pitch deck",
    description:
      "Three-slide pitch starter with problem, proof, and next-step pages.",
    usageNotes:
      "Use the first page for the promise, the second for traction, and the third for the ask.",
    format: "presentation",
    category: "Business",
    industry: "Startup",
    season: "Evergreen",
    platform: "Presentation",
    tags: ["pitch", "deck", "investor", "fundraising"],
    width: 1920,
    height: 1080,
    accentColor: "#2563eb",
    surfaceColor: "#eff6ff",
    textColor: "#111827",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original slide structure, proof sections, and editable pitch narrative blocks.",
    ),
  },
  {
    id: "client-proposal-document",
    name: "Client proposal one-pager",
    description:
      "A structured document page for scope, outcome, timeline, and next steps.",
    usageNotes:
      "Turn rough service notes into a concise proposal before exporting DOCX or PDF.",
    format: "document",
    category: "Sales",
    industry: "Services",
    season: "Evergreen",
    platform: "PDF",
    tags: ["proposal", "client", "scope", "document"],
    width: 794,
    height: 1123,
    accentColor: "#7c3aed",
    surfaceColor: "#f5f3ff",
    textColor: "#18181b",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original proposal sections and editable document-copy placeholders.",
    ),
  },
  {
    id: "strategy-workshop-board",
    name: "Strategy workshop board",
    description: "A whiteboard starter for goals, blockers, bets, and owners.",
    usageNotes:
      "Run a planning session by moving cards from signals into decisions.",
    format: "whiteboard",
    category: "Workshop",
    industry: "Operations",
    season: "Quarterly planning",
    platform: "Whiteboard",
    tags: ["workshop", "planning", "strategy", "sticky-notes"],
    width: 2400,
    height: 1350,
    accentColor: "#ea580c",
    surfaceColor: "#fff7ed",
    textColor: "#1c1917",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original workshop lanes, sticky-note prompts, and decision-card structure.",
    ),
  },
  {
    id: "community-event-poster",
    name: "Community event poster",
    description:
      "A vertical poster layout with date, venue, highlights, and CTA.",
    usageNotes:
      "Use it for meetups, classes, fundraisers, or neighborhood events.",
    format: "poster",
    category: "Events",
    industry: "Community",
    season: "Seasonal",
    platform: "Print",
    tags: ["poster", "event", "venue", "print"],
    width: 1080,
    height: 1350,
    accentColor: "#be123c",
    surfaceColor: "#fff1f2",
    textColor: "#111827",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original print-safe poster hierarchy with editable event details and CTA areas.",
    ),
  },
  {
    id: "data-story-infographic",
    name: "Data story infographic",
    description:
      "A tall explainer for metrics, narrative sections, and summary takeaways.",
    usageNotes:
      "Connect the placeholders to table/chart work when the dataset is ready.",
    format: "infographic",
    category: "Analytics",
    industry: "Research",
    season: "Evergreen",
    platform: "Web",
    tags: ["infographic", "metrics", "report", "chart"],
    width: 800,
    height: 2000,
    accentColor: "#0891b2",
    surfaceColor: "#ecfeff",
    textColor: "#0f172a",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original metric blocks, chart placeholders, and explainer-section structure.",
    ),
  },
  {
    id: "portfolio-resume-profile",
    name: "Portfolio resume profile",
    description:
      "A profile-forward resume layout with skills, outcomes, and contact space.",
    usageNotes: "Lead with measurable work, then tune sections for PDF export.",
    format: "resume",
    category: "Career",
    industry: "Creative",
    season: "Hiring",
    platform: "PDF",
    tags: ["resume", "portfolio", "profile", "career"],
    width: 816,
    height: 1056,
    accentColor: "#334155",
    surfaceColor: "#f8fafc",
    textColor: "#111827",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original resume sections, editable profile copy, and outcome-led layout blocks.",
    ),
  },
  {
    id: "product-landing-page",
    name: "Product landing page",
    description:
      "A hosted website starter with hero, proof, feature, and contact sections.",
    usageNotes:
      "Publish as a responsive site, then attach analytics and a custom domain.",
    format: "website",
    category: "Website",
    industry: "SaaS",
    season: "Evergreen",
    platform: "Website",
    tags: ["landing-page", "website", "hero", "conversion"],
    width: 1440,
    height: 2200,
    accentColor: "#16a34a",
    surfaceColor: "#f0fdf4",
    textColor: "#052e16",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original hosted-page sections, conversion copy blocks, and navigation-ready structure.",
    ),
  },
  {
    id: "vertical-video-storyboard",
    name: "Short-form video storyboard",
    description:
      "A vertical video planning frame with hook, beats, caption, and CTA.",
    usageNotes:
      "Plan the scenes, attach media clips, then export timeline-aware MP4.",
    format: "video",
    category: "Content",
    industry: "Creator",
    season: "Evergreen",
    platform: "TikTok",
    tags: ["video", "storyboard", "reels", "shorts"],
    width: 1080,
    height: 1920,
    accentColor: "#db2777",
    surfaceColor: "#fdf2f8",
    textColor: "#111827",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original scene-planning beats, caption placeholders, and timeline-ready storyboard blocks.",
    ),
  },
  {
    id: "product-update-email",
    name: "Product update email",
    description:
      "An email-safe campaign layout with headline, sections, and CTA block.",
    usageNotes:
      "Keep copy concise, send a test email, then export inline HTML.",
    format: "email-template",
    category: "Email",
    industry: "Ecommerce",
    season: "Evergreen",
    platform: "Email",
    tags: ["email", "newsletter", "campaign", "update"],
    width: 1200,
    height: 1800,
    accentColor: "#ca8a04",
    surfaceColor: "#fefce8",
    textColor: "#1c1917",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original email-safe sections, CTA structure, and reusable campaign content blocks.",
    ),
  },
  {
    id: "course-lesson-handout",
    name: "Course lesson handout",
    description:
      "A learning asset starter with objectives, explanation, activity, and recap.",
    usageNotes: "Use it as a printable worksheet or a downloadable lesson PDF.",
    format: "course",
    category: "Education",
    industry: "Learning",
    season: "Back to school",
    platform: "PDF",
    tags: ["course", "lesson", "worksheet", "education"],
    width: 1200,
    height: 1600,
    accentColor: "#4f46e5",
    surfaceColor: "#eef2ff",
    textColor: "#111827",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original lesson sections, activity prompts, and printable learning blocks.",
    ),
  },
  {
    id: "brand-mark-kit",
    name: "Brand mark kit",
    description:
      "A compact logo exploration board with mark, wordmark, and usage notes.",
    usageNotes:
      "Create a rough identity direction before saving it into the brand kit.",
    format: "logo",
    category: "Branding",
    industry: "Small business",
    season: "Evergreen",
    platform: "Brand kit",
    tags: ["logo", "brand", "identity", "mark"],
    width: 800,
    height: 800,
    accentColor: "#0f172a",
    surfaceColor: "#f4f4f5",
    textColor: "#111827",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original mark-exploration frames, editable wordmark notes, and brand-kit prompts.",
    ),
  },
  {
    id: "restaurant-menu-launch",
    name: "Restaurant menu launch flyer",
    description:
      "A print-ready menu flyer for seasonal dishes, specials, and ordering details.",
    usageNotes:
      "Swap in menu sections, add pickup or delivery details, then export for print and local sharing.",
    format: "flyer",
    category: "Local business",
    industry: "Food and beverage",
    season: "Seasonal",
    platform: "Print",
    tags: ["restaurant", "menu", "flyer", "local"],
    width: 1200,
    height: 1600,
    accentColor: "#dc2626",
    surfaceColor: "#fff7ed",
    textColor: "#111827",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original menu sections, offer badges, and print-safe restaurant layout blocks.",
    ),
  },
  {
    id: "restaurant-social-special",
    name: "Daily special social post",
    description:
      "A square restaurant promo layout for daily specials, events, and limited offers.",
    usageNotes:
      "Update the headline, offer detail, and CTA before exporting to feed posts.",
    format: "instagram-post",
    category: "Marketing",
    industry: "Food and beverage",
    season: "Evergreen",
    platform: "Instagram",
    tags: ["restaurant", "special", "social", "promo"],
    width: 1080,
    height: 1080,
    accentColor: "#f97316",
    surfaceColor: "#fff7ed",
    textColor: "#1c1917",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original promo hierarchy, editable price blocks, and social-safe CTA copy.",
    ),
  },
  {
    id: "restaurant-email-offer",
    name: "Restaurant offer email",
    description:
      "An email-safe dining offer with feature dish, coupon code, and reservation CTA.",
    usageNotes:
      "Keep the offer direct, add reservation links, then send a test before export.",
    format: "email-template",
    category: "Email",
    industry: "Food and beverage",
    season: "Evergreen",
    platform: "Email",
    tags: ["restaurant", "email", "coupon", "reservation"],
    width: 1200,
    height: 1800,
    accentColor: "#b91c1c",
    surfaceColor: "#fef2f2",
    textColor: "#111827",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original email offer sections, coupon blocks, and reservation CTA structure.",
    ),
  },
  {
    id: "clinic-care-flyer",
    name: "Clinic care flyer",
    description:
      "A healthcare service flyer with appointment benefits, care steps, and contact details.",
    usageNotes:
      "Replace care steps with verified clinic information and keep claims specific.",
    format: "flyer",
    category: "Healthcare",
    industry: "Healthcare",
    season: "Evergreen",
    platform: "Print",
    tags: ["clinic", "healthcare", "appointment", "flyer"],
    width: 1200,
    height: 1600,
    accentColor: "#0284c7",
    surfaceColor: "#eff6ff",
    textColor: "#0f172a",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original care-step blocks, appointment prompts, and accessible healthcare layout structure.",
    ),
  },
  {
    id: "clinic-appointment-card",
    name: "Clinic appointment card",
    description:
      "A compact reminder card for appointment times, preparation notes, and contact channels.",
    usageNotes:
      "Use it for front-desk printouts or follow-up packets with patient-safe copy.",
    format: "business-card",
    category: "Healthcare",
    industry: "Healthcare",
    season: "Evergreen",
    platform: "Print",
    tags: ["clinic", "appointment", "card", "print"],
    width: 1050,
    height: 600,
    accentColor: "#0891b2",
    surfaceColor: "#ecfeff",
    textColor: "#0f172a",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original appointment reminder fields, contact blocks, and print-safe card structure.",
    ),
  },
  {
    id: "clinic-website-intake",
    name: "Clinic intake website",
    description:
      "A hosted clinic page starter with care promise, service proof, and intake form.",
    usageNotes:
      "Publish after validating service copy, contact channels, privacy wording, and form routing.",
    format: "website",
    category: "Website",
    industry: "Healthcare",
    season: "Evergreen",
    platform: "Website",
    tags: ["clinic", "website", "intake", "form"],
    width: 1440,
    height: 2200,
    accentColor: "#0d9488",
    surfaceColor: "#f0fdfa",
    textColor: "#0f172a",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original clinic hero, service proof, privacy-aware intake prompts, and contact sections.",
    ),
  },
  {
    id: "nonprofit-fundraiser-poster",
    name: "Fundraiser event poster",
    description:
      "A nonprofit poster for cause, event details, donation goals, and volunteer CTA.",
    usageNotes:
      "Add verified donation details, event logistics, and a clear volunteer or donor next step.",
    format: "poster",
    category: "Events",
    industry: "Nonprofit",
    season: "Seasonal",
    platform: "Print",
    tags: ["nonprofit", "fundraiser", "poster", "event"],
    width: 1080,
    height: 1350,
    accentColor: "#15803d",
    surfaceColor: "#f0fdf4",
    textColor: "#052e16",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original donation-goal blocks, volunteer prompts, and print-safe event hierarchy.",
    ),
  },
  {
    id: "nonprofit-impact-report",
    name: "Nonprofit impact report",
    description:
      "A concise impact report with outcomes, stories, donation usage, and next actions.",
    usageNotes:
      "Replace example metrics with verified impact numbers before exporting to PDF.",
    format: "document",
    category: "Reports",
    industry: "Nonprofit",
    season: "Annual report",
    platform: "PDF",
    tags: ["nonprofit", "impact", "report", "donor"],
    width: 794,
    height: 1123,
    accentColor: "#16a34a",
    surfaceColor: "#f7fee7",
    textColor: "#14532d",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original impact sections, donor transparency blocks, and editable report copy.",
    ),
  },
  {
    id: "nonprofit-donor-email",
    name: "Donor update email",
    description:
      "An email-safe donor update with story, progress, donation CTA, and gratitude block.",
    usageNotes:
      "Use real project updates, keep the ask specific, and test the email before sending.",
    format: "email-template",
    category: "Email",
    industry: "Nonprofit",
    season: "Evergreen",
    platform: "Email",
    tags: ["nonprofit", "donor", "email", "update"],
    width: 1200,
    height: 1800,
    accentColor: "#65a30d",
    surfaceColor: "#f7fee7",
    textColor: "#1a2e05",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original donor-story sections, progress blocks, and email-safe gratitude CTA structure.",
    ),
  },
  {
    id: "real-estate-listing-flyer",
    name: "Property listing flyer",
    description:
      "A real estate listing flyer with property highlights, viewing details, and contact CTA.",
    usageNotes:
      "Replace placeholders with accurate listing facts and export for open house handouts.",
    format: "flyer",
    category: "Sales",
    industry: "Real estate",
    season: "Evergreen",
    platform: "Print",
    tags: ["real-estate", "listing", "flyer", "open-house"],
    width: 1200,
    height: 1600,
    accentColor: "#7c2d12",
    surfaceColor: "#fff7ed",
    textColor: "#1c1917",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original property-highlight cards, viewing details, and print-safe real estate layout blocks.",
    ),
  },
  {
    id: "real-estate-open-house-post",
    name: "Open house social post",
    description:
      "A square announcement post for open house dates, location highlights, and agent CTA.",
    usageNotes:
      "Update date, neighborhood notes, and contact details before exporting for social channels.",
    format: "instagram-post",
    category: "Marketing",
    industry: "Real estate",
    season: "Evergreen",
    platform: "Instagram",
    tags: ["real-estate", "open-house", "social", "listing"],
    width: 1080,
    height: 1080,
    accentColor: "#a16207",
    surfaceColor: "#fefce8",
    textColor: "#1c1917",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original open-house announcement blocks, neighborhood prompts, and social-safe CTA copy.",
    ),
  },
  {
    id: "real-estate-neighborhood-guide",
    name: "Neighborhood guide document",
    description:
      "A buyer-facing guide for neighborhood highlights, amenities, commute notes, and next steps.",
    usageNotes:
      "Keep details factual and local, then share as a PDF follow-up after property tours.",
    format: "document",
    category: "Guides",
    industry: "Real estate",
    season: "Evergreen",
    platform: "PDF",
    tags: ["real-estate", "neighborhood", "guide", "buyer"],
    width: 794,
    height: 1123,
    accentColor: "#92400e",
    surfaceColor: "#fffbeb",
    textColor: "#1c1917",
    assetProvenanceNotes: createAssetProvenanceNotes(
      "Built from original neighborhood sections, buyer prompts, and editable guide copy blocks.",
    ),
  },
];

export function getTemplateCatalogItem(id: string) {
  return templateCatalogItems.find((item) => item.id === id) ?? null;
}

export function getRelatedTemplateCatalogItems(
  templateOrId: TemplateCatalogItem | string,
  limit = 3,
) {
  const template =
    typeof templateOrId === "string"
      ? getTemplateCatalogItem(templateOrId)
      : templateOrId;

  if (!template) return [];

  return templateCatalogItems
    .filter((item) => item.id !== template.id)
    .map((item) => ({
      item,
      score: getRelatedTemplateScore(template, item),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function searchTemplateCatalog(input: TemplateCatalogSearchInput = {}) {
  const query = normalizeSearchText(input.query ?? "");
  const format = input.format ?? "all";
  const category = input.category ?? "all";
  const industry = input.industry ?? "all";
  const season = input.season ?? "all";
  const platform = input.platform ?? "all";

  return templateCatalogItems.filter((item) => {
    const haystack = normalizeSearchText(
      [
        item.name,
        item.description,
        item.usageNotes,
        item.format,
        item.category,
        item.industry,
        item.season,
        item.platform,
        item.tags.join(" "),
        item.assetProvenanceNotes.join(" "),
      ].join(" "),
    );

    return (
      (!query || haystack.includes(query)) &&
      (format === "all" || item.format === format) &&
      (category === "all" || item.category === category) &&
      (industry === "all" || item.industry === industry) &&
      (season === "all" || item.season === season) &&
      (platform === "all" || item.platform === platform)
    );
  });
}

export function getTemplateCatalogFilterOptions() {
  return {
    formats: uniqueSorted(templateCatalogItems.map((item) => item.format)),
    categories: uniqueSorted(templateCatalogItems.map((item) => item.category)),
    industries: uniqueSorted(templateCatalogItems.map((item) => item.industry)),
    seasons: uniqueSorted(templateCatalogItems.map((item) => item.season)),
    platforms: uniqueSorted(templateCatalogItems.map((item) => item.platform)),
  };
}

export function createTemplateCatalogDiscovery(
  items: TemplateCatalogItem[] = templateCatalogItems,
): TemplateCatalogDiscoverySummary {
  const formats = createFacetGroup(items, "format", (item) => item.format);
  const categories = createFacetGroup(
    items,
    "category",
    (item) => item.category,
  );
  const industries = createFacetGroup(
    items,
    "industry",
    (item) => item.industry,
  );
  const seasons = createFacetGroup(items, "season", (item) => item.season);
  const platforms = createFacetGroup(
    items,
    "platform",
    (item) => item.platform,
  );
  const withNotes = items.filter(
    (item) => item.assetProvenanceNotes.length,
  ).length;
  const allFacets = [
    ...formats,
    ...categories,
    ...industries,
    ...seasons,
    ...platforms,
  ];

  return {
    totals: {
      templates: items.length,
      formats: formats.length,
      categories: categories.length,
      industries: industries.length,
      seasons: seasons.length,
      platforms: platforms.length,
    },
    formats,
    categories,
    industries,
    seasons,
    platforms,
    provenance: {
      withNotes,
      missingNotes: items.length - withNotes,
      readyPercent: items.length
        ? Math.round((withNotes / items.length) * 100)
        : 0,
    },
    recommendedFacets: allFacets
      .filter((facet) => facet.count > 1)
      .sort(
        (a, b) =>
          b.count - a.count ||
          facetKindWeight(a.kind) - facetKindWeight(b.kind) ||
          a.label.localeCompare(b.label),
      )
      .slice(0, 8),
  };
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function createFacetGroup(
  items: TemplateCatalogItem[],
  kind: TemplateCatalogDiscoveryFacetKind,
  selectValue: (item: TemplateCatalogItem) => string,
): TemplateCatalogDiscoveryFacet[] {
  const grouped = new Map<string, TemplateCatalogItem[]>();

  for (const item of items) {
    const id = selectValue(item);
    const group = grouped.get(id) ?? [];
    group.push(item);
    grouped.set(id, group);
  }

  return Array.from(grouped.entries())
    .map(([id, group]) => ({
      id,
      kind,
      label: id,
      count: group.length,
      templateIds: group.map((item) => item.id),
      topTemplateId:
        [...group].sort((a, b) => a.name.localeCompare(b.name))[0]?.id ?? null,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function facetKindWeight(kind: TemplateCatalogDiscoveryFacetKind) {
  const weights: Record<TemplateCatalogDiscoveryFacetKind, number> = {
    format: 0,
    category: 1,
    industry: 2,
    platform: 3,
    season: 4,
  };

  return weights[kind];
}

function createAssetProvenanceNotes(detail: string) {
  return [
    "Original first-party layout authored for Essence Canva.",
    detail,
    "Uses editable shapes, text, and color surfaces; no bundled third-party stock assets.",
  ];
}

function getRelatedTemplateScore(
  template: TemplateCatalogItem,
  candidate: TemplateCatalogItem,
) {
  let score = 0;

  if (candidate.format === template.format) score += 5;
  if (candidate.category === template.category) score += 4;
  if (candidate.industry === template.industry) score += 3;
  if (candidate.platform === template.platform) score += 2;

  const tags = new Set(template.tags);
  for (const tag of candidate.tags) {
    if (tags.has(tag)) score += 1;
  }

  return score;
}
