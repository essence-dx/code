import type { DesignDocument } from "@/features/editor/types";
import type {
  TemplateCatalogFormat,
  TemplateCatalogItem,
} from "@/features/templates/template-catalog";
import { createTemplateCatalogDocument } from "@/features/templates/template-catalog-documents";
import {
  defaultRemixInput,
  templateRemixContentPacks,
  templateRemixProfiles,
  templateRemixThemes,
  type TemplateRemixContentPack,
  type TemplateRemixInput,
  type TemplateRemixInputLike,
  type TemplateRemixProfile,
  type TemplateRemixProfileId,
  type TemplateRemixTheme,
} from "@/features/templates/template-remix-presets";

export type {
  TemplateRemixContentPack,
  TemplateRemixContentPackId,
  TemplateRemixInput,
  TemplateRemixProfile,
  TemplateRemixProfileId,
  TemplateRemixTheme,
  TemplateRemixThemeId,
} from "@/features/templates/template-remix-presets";

export type TemplateRemixOption = {
  id: string;
  profile: TemplateRemixProfile;
  theme: TemplateRemixTheme;
  contentPack: TemplateRemixContentPack;
  label: string;
  description: string;
  outputFormat: TemplateCatalogFormat;
  width: number;
  height: number;
  lockSummary: NonNullable<DesignDocument["metadata"]>["templateLockSummary"];
};

export function createTemplateRemixOptions(
  template: TemplateCatalogItem,
): TemplateRemixOption[] {
  const contentPacks = rankContentPacks(template).slice(0, 4);
  const profiles = rankProfiles(template).slice(0, 4);

  return profiles.map((profile, index) => {
    const contentPack = contentPacks[index % contentPacks.length];
    const theme = templateRemixThemes[index % templateRemixThemes.length];
    const input = {
      profileId: profile.id,
      themeId: theme.id,
      contentPackId: contentPack.id,
    };
    const remixedItem = createRemixedTemplateCatalogItem(template, input);
    const lockSummary =
      createRemixedTemplateCatalogDocument(template, input).metadata
        ?.templateLockSummary;

    return {
      id: `${profile.id}:${theme.id}:${contentPack.id}`,
      profile,
      theme,
      contentPack,
      label: `${profile.label} / ${contentPack.label}`,
      description: profile.description,
      outputFormat: remixedItem.format,
      width: remixedItem.width,
      height: remixedItem.height,
      lockSummary,
    };
  });
}

export function createRemixedTemplateCatalogDocument(
  template: TemplateCatalogItem,
  input: TemplateRemixInputLike,
): DesignDocument {
  const normalizedInput = normalizeTemplateRemixInput(input);
  const remixedItem = createRemixedTemplateCatalogItem(
    template,
    normalizedInput,
  );
  const document = createTemplateCatalogDocument(remixedItem);

  return {
    ...document,
    metadata: {
      ...document.metadata,
      templateSourceId: template.id,
      templateSourceName: template.name,
      templateRemixProfileId: normalizedInput.profileId,
      templateRemixThemeId: normalizedInput.themeId,
      templateRemixContentPackId: normalizedInput.contentPackId,
      templateRemixCreatedAt: new Date().toISOString(),
    },
  };
}

export function createRemixedTemplateCatalogItem(
  template: TemplateCatalogItem,
  input: TemplateRemixInputLike,
): TemplateCatalogItem {
  const normalizedInput = normalizeTemplateRemixInput(input);
  const profile = getTemplateRemixProfile(normalizedInput.profileId);
  const theme = getTemplateRemixTheme(normalizedInput.themeId);
  const contentPack = getTemplateRemixContentPack(
    normalizedInput.contentPackId,
  );
  const format =
    profile.format === "source" ? template.format : profile.format;
  const width = profile.width === "source" ? template.width : profile.width;
  const height =
    profile.height === "source" ? template.height : profile.height;

  return {
    ...template,
    id: `${template.id}-${profile.id}-${theme.id}-${contentPack.id}`,
    name: contentPack.headline,
    description: contentPack.description,
    usageNotes: contentPack.usageNotes,
    format,
    category: contentPack.category,
    industry: contentPack.industry,
    platform:
      profile.platform === "source" ? template.platform : profile.platform,
    tags: uniqueStrings([
      ...contentPack.tags,
      ...template.tags,
      "brand-safe-remix",
    ]).slice(0, 10),
    width,
    height,
    accentColor: theme.accentColor,
    surfaceColor: theme.surfaceColor,
    textColor: theme.textColor,
    assetProvenanceNotes: [
      "Original first-party remix generated from Essence starter rules.",
      `Source starter: ${template.name}.`,
      `Remix: ${profile.label}, ${theme.label}, ${contentPack.label}.`,
      "Structural template locks are reapplied after remix creation.",
    ],
  };
}

export function normalizeTemplateRemixInput(
  input: TemplateRemixInputLike,
): TemplateRemixInput {
  const profile = templateRemixProfiles.find(
    (item) => item.id === input.profileId,
  );
  const theme = templateRemixThemes.find((item) => item.id === input.themeId);
  const contentPack = templateRemixContentPacks.find(
    (item) => item.id === input.contentPackId,
  );

  return {
    profileId: profile?.id ?? defaultRemixInput.profileId,
    themeId: theme?.id ?? defaultRemixInput.themeId,
    contentPackId: contentPack?.id ?? defaultRemixInput.contentPackId,
  };
}

export function getTemplateRemixProfile(id: unknown) {
  return (
    templateRemixProfiles.find((profile) => profile.id === id) ??
    templateRemixProfiles.find(
      (profile) => profile.id === defaultRemixInput.profileId,
    )!
  );
}

export function getTemplateRemixTheme(id: unknown) {
  return (
    templateRemixThemes.find((theme) => theme.id === id) ??
    templateRemixThemes.find((theme) => theme.id === defaultRemixInput.themeId)!
  );
}

export function getTemplateRemixContentPack(id: unknown) {
  return (
    templateRemixContentPacks.find((pack) => pack.id === id) ??
    templateRemixContentPacks.find(
      (pack) => pack.id === defaultRemixInput.contentPackId,
    )!
  );
}

function rankProfiles(template: TemplateCatalogItem) {
  return [...templateRemixProfiles].sort((a, b) => {
    const scoreA = getProfileScore(template, a);
    const scoreB = getProfileScore(template, b);

    return scoreB - scoreA || a.label.localeCompare(b.label);
  });
}

function getProfileScore(
  template: TemplateCatalogItem,
  profile: TemplateRemixProfile,
) {
  if (profile.format === "source") return 8;
  if (profile.format === template.format) return 7;
  if (template.category === "Website" && profile.id === "website-landing") {
    return 6;
  }
  if (template.category === "Events" && profile.id === "print-poster") {
    return 6;
  }
  if (template.category === "Email" && profile.id === "email-campaign") {
    return 6;
  }

  return 4;
}

function rankContentPacks(template: TemplateCatalogItem) {
  return [...templateRemixContentPacks].sort((a, b) => {
    const scoreA = getContentPackScore(template, a);
    const scoreB = getContentPackScore(template, b);

    return scoreB - scoreA || a.label.localeCompare(b.label);
  });
}

function getContentPackScore(
  template: TemplateCatalogItem,
  pack: TemplateRemixContentPack,
) {
  let score = 0;

  if (pack.category === template.category) score += 5;
  if (pack.industry === template.industry) score += 4;

  const templateTags = new Set(template.tags);
  for (const tag of pack.tags) {
    if (templateTags.has(tag)) score += 1;
  }

  return score;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}
