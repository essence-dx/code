export const templateMarketplaceStatuses = [
  "draft",
  "review",
  "published",
  "archived",
] as const;

export type TemplateMarketplaceStatus =
  (typeof templateMarketplaceStatuses)[number];

export const templateMarketplaceStatusLabels: Record<
  TemplateMarketplaceStatus,
  string
> = {
  draft: "Draft",
  review: "In review",
  published: "Published",
  archived: "Archived",
};

export const templateMarketplaceCollections = [
  "general",
  "social",
  "business",
  "education",
  "creator",
  "seasonal",
] as const;

export type TemplateMarketplaceCollection =
  (typeof templateMarketplaceCollections)[number];

export const templateMarketplaceCollectionLabels: Record<
  TemplateMarketplaceCollection,
  string
> = {
  general: "General",
  social: "Social",
  business: "Business",
  education: "Education",
  creator: "Creator",
  seasonal: "Seasonal",
};

export function normalizeTemplateMarketplaceStatus(
  value: unknown,
): TemplateMarketplaceStatus {
  if (
    value === "review" ||
    value === "published" ||
    value === "archived"
  ) {
    return value;
  }

  return "draft";
}

export function normalizeTemplateMarketplaceCollection(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().toLowerCase().slice(0, 80)
    : null;
}

export function normalizeTemplateMarketplaceSeason(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 80)
    : null;
}

export function normalizeTemplateMarketplaceReviewNote(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 400) : "";
}

export function shouldStampMarketplacePublishedAt(input: {
  nextStatus: TemplateMarketplaceStatus;
  previousPublishedAt?: Date | null;
}) {
  return input.nextStatus === "published" && !input.previousPublishedAt;
}

export function getMarketplaceStatusBadgeVariant(
  status: TemplateMarketplaceStatus,
) {
  if (status === "published") return "secondary" as const;
  if (status === "archived") return "outline" as const;
  if (status === "review") return "default" as const;

  return "outline" as const;
}
