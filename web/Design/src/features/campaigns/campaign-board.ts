import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
} from "@/features/editor/types";
import {
  designResizeProfiles,
  type DesignResizeProfile,
} from "@/features/editor/resize-profiles";

export type CampaignBrandInput = {
  colors: BrandColorSummary[];
  logos: BrandLogoSummary[];
  fonts: BrandFontSummary[];
  requestedColor?: string | null;
};

export type CampaignBrandSnapshot = {
  primaryBrandColor: string | null;
  brandLogoName: string | null;
  brandFontFamily: string | null;
};

export type CampaignDeliverableShape = {
  width: number;
  height: number;
  variantName?: string | null;
};

export type CampaignDerivativeDeliverableShape = {
  projectId: string | null;
  projectSourceProjectId: string | null;
  projectVariantProfileId: string | null;
  projectWidth: number | null;
  projectHeight: number | null;
};

export const campaignDerivativeProfileIds = [
  "instagram-square",
  "story-reel",
  "presentation-wide",
  "website-hero",
  "email-banner",
] as const;

export function createCampaignBrandSnapshot(
  input: CampaignBrandInput,
): CampaignBrandSnapshot {
  const requestedColor = input.requestedColor?.trim().toLowerCase() ?? "";
  const matchingColor = input.colors.find(
    (item) => item.color.toLowerCase() === requestedColor,
  );
  const headingFont =
    input.fonts.find((font) => font.role === "heading") ?? input.fonts[0];

  return {
    primaryBrandColor: matchingColor?.color ?? input.colors[0]?.color ?? null,
    brandLogoName: input.logos[0]?.name ?? null,
    brandFontFamily: headingFont?.fontFamily ?? null,
  };
}

export function inferCampaignDeliverableChannel(
  deliverable: CampaignDeliverableShape,
) {
  const ratio = deliverable.width / Math.max(1, deliverable.height);
  const variant = deliverable.variantName?.trim();

  if (variant) return variant;
  if (deliverable.width === deliverable.height) return "Social";
  if (ratio > 2.4) return "Banner";
  if (ratio > 1.55 && ratio < 1.9) return "Presentation";
  if (ratio < 0.68) return "Vertical video";
  if (deliverable.height > deliverable.width) return "Document or print";

  return "Design";
}

export function getCampaignDerivativeSource<
  Deliverable extends CampaignDerivativeDeliverableShape,
>(deliverables: Deliverable[]) {
  const linkedDeliverables = deliverables.filter((item) => item.projectId);

  return (
    linkedDeliverables.find((item) => !item.projectSourceProjectId) ??
    linkedDeliverables[0] ??
    null
  );
}

export function getRecommendedCampaignDerivativeProfiles(input: {
  deliverables: CampaignDerivativeDeliverableShape[];
  sourceProjectId: string | null;
  limit?: number;
}): DesignResizeProfile[] {
  if (!input.sourceProjectId) return [];

  const sourceProjectId = input.sourceProjectId;
  const preferredProfileIds = new Set<string>(campaignDerivativeProfileIds);
  const preferredProfiles = [
    ...campaignDerivativeProfileIds
      .map((id) => designResizeProfiles.find((profile) => profile.id === id))
      .filter((profile): profile is DesignResizeProfile => Boolean(profile)),
    ...designResizeProfiles.filter(
      (profile) => !preferredProfileIds.has(profile.id),
    ),
  ];

  return preferredProfiles
    .filter(
      (profile) =>
        !input.deliverables.some((deliverable) =>
          isExistingSourceVariant({
            deliverable,
            sourceProjectId,
            profile,
          }),
        ),
    )
    .slice(0, input.limit ?? 4);
}

export function isExistingSourceVariant(input: {
  deliverable: CampaignDerivativeDeliverableShape;
  sourceProjectId: string;
  profile: DesignResizeProfile;
}) {
  const { deliverable, sourceProjectId, profile } = input;
  const belongsToSource =
    deliverable.projectId === sourceProjectId ||
    deliverable.projectSourceProjectId === sourceProjectId;

  if (!belongsToSource) return false;

  return (
    deliverable.projectVariantProfileId === profile.id ||
    (deliverable.projectWidth === profile.width &&
      deliverable.projectHeight === profile.height)
  );
}
