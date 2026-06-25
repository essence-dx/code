import {
  getTemplateCatalogItem,
  templateCatalogItems,
  type TemplateCatalogFormat,
  type TemplateCatalogItem,
} from "@/features/templates/template-catalog";

export type TemplateCollection = {
  id: string;
  name: string;
  description: string;
  intent: string;
  templateIds: string[];
  tags: string[];
};

export type TemplateCollectionResult = {
  collection: TemplateCollection;
  templates: TemplateCatalogItem[];
  formats: TemplateCatalogFormat[];
};

export const templateCollections: TemplateCollection[] = [
  {
    id: "launch-campaign-kit",
    name: "Launch campaign kit",
    description:
      "A practical starter pack for announcing, explaining, and following up on a launch.",
    intent: "Product launches, event announcements, and new-service rollouts.",
    templateIds: [
      "social-launch-announcement",
      "product-landing-page",
      "product-update-email",
      "vertical-video-storyboard",
      "startup-pitch-deck",
    ],
    tags: ["launch", "campaign", "social", "website", "email"],
  },
  {
    id: "client-sales-kit",
    name: "Client sales kit",
    description:
      "Proposal, proof, and follow-up templates for turning a lead into a signed client.",
    intent: "Service businesses, consultants, agencies, and freelancers.",
    templateIds: [
      "client-proposal-document",
      "startup-pitch-deck",
      "product-landing-page",
      "product-update-email",
    ],
    tags: ["sales", "proposal", "proof", "follow-up"],
  },
  {
    id: "community-event-kit",
    name: "Community event kit",
    description:
      "Print, social, and workshop starters for planning and promoting a real event.",
    intent: "Meetups, classes, fundraisers, and local community programs.",
    templateIds: [
      "community-event-poster",
      "social-launch-announcement",
      "strategy-workshop-board",
      "vertical-video-storyboard",
    ],
    tags: ["event", "community", "poster", "workshop"],
  },
  {
    id: "learning-product-kit",
    name: "Learning product kit",
    description:
      "A starter path for packaging lessons, handouts, and educational promotion.",
    intent: "Courses, workshops, coaching programs, and school resources.",
    templateIds: [
      "course-lesson-handout",
      "product-landing-page",
      "product-update-email",
      "data-story-infographic",
    ],
    tags: ["course", "education", "lesson", "marketing"],
  },
  {
    id: "brand-presence-kit",
    name: "Brand presence kit",
    description:
      "Identity, profile, and web starters for shaping a consistent public presence.",
    intent: "Founders, creators, small businesses, and portfolio launches.",
    templateIds: [
      "brand-mark-kit",
      "portfolio-resume-profile",
      "product-landing-page",
      "social-launch-announcement",
    ],
    tags: ["brand", "identity", "portfolio", "website"],
  },
];

export function getTemplateCollection(id: string) {
  return templateCollections.find((collection) => collection.id === id) ?? null;
}

export function getTemplateCollectionsForTemplate(templateId: string) {
  return templateCollections.filter((collection) =>
    collection.templateIds.includes(templateId),
  );
}

export function getTemplateCollectionResult(
  collectionOrId: TemplateCollection | string,
): TemplateCollectionResult | null {
  const collection =
    typeof collectionOrId === "string"
      ? getTemplateCollection(collectionOrId)
      : collectionOrId;

  if (!collection) return null;

  const templates = collection.templateIds
    .map((templateId) => getTemplateCatalogItem(templateId))
    .filter((template): template is TemplateCatalogItem => Boolean(template));

  return {
    collection,
    templates,
    formats: uniqueFormats(templates),
  };
}

export function getTemplateCollectionResults() {
  return templateCollections
    .map(getTemplateCollectionResult)
    .filter((result): result is TemplateCollectionResult => Boolean(result));
}

export function searchTemplateCollections(input: {
  query?: string;
  format?: TemplateCatalogFormat | "all";
  limit?: number;
} = {}) {
  const query = normalize(input.query ?? "");
  const format = input.format ?? "all";

  return getTemplateCollectionResults()
    .map((result) => ({
      ...result,
      score: scoreCollection(result, query, format),
    }))
    .filter((result) => result.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.collection.name.localeCompare(b.collection.name),
    )
    .slice(0, input.limit ?? templateCollections.length)
    .map(({ score: _score, ...result }) => result);
}

function scoreCollection(
  result: TemplateCollectionResult,
  query: string,
  format: TemplateCatalogFormat | "all",
) {
  let score = 1;

  if (
    format !== "all" &&
    !result.templates.some((template) => template.format === format)
  ) {
    return 0;
  }

  if (!query) return score;

  if (normalize(result.collection.name).includes(query)) score += 20;
  if (normalize(result.collection.intent).includes(query)) score += 10;

  const collectionHaystack = normalize(
    [
      result.collection.name,
      result.collection.description,
      result.collection.intent,
      result.collection.tags.join(" "),
    ].join(" "),
  );

  if (collectionHaystack.includes(query)) score += 8;

  for (const template of result.templates) {
    const templateHaystack = normalize(
      [
        template.name,
        template.description,
        template.category,
        template.industry,
        template.platform,
        template.tags.join(" "),
      ].join(" "),
    );

    if (templateHaystack.includes(query)) score += 3;
  }

  return score > 1 ? score : 0;
}

function uniqueFormats(templates: TemplateCatalogItem[]) {
  const knownFormats = new Set(templateCatalogItems.map((template) => template.format));
  const formats = templates
    .map((template) => template.format)
    .filter((format) => knownFormats.has(format));

  return [...new Set(formats)].sort((a, b) => a.localeCompare(b));
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
