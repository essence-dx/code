import type { CampaignBoardSummary } from "@/db/campaigns";
import type {
  ContentDatabaseCenter,
  ContentDatabaseRecord,
} from "@/features/content-database/content-database";
import type {
  CampaignGeneratedVariant,
  CampaignGenerationPlan,
} from "@/features/campaigns/rule-based-campaign-generation-types";
import {
  createCopyBlocks,
  createVariableMap,
  getSurfaceVariableKeys,
  hasRequiredVariables,
  mapFormatToGeneratedSurface,
  pickVariables,
  selectCampaignRecords,
} from "@/features/campaigns/rule-based-campaign-generation-content";
import {
  createPlanTrace,
  createVariantChecks,
  createVariantTrace,
} from "@/features/campaigns/rule-based-campaign-generation-trace";
import {
  average,
  normalize,
  scoreStatus,
  statusScore,
  uniqueTokens,
} from "@/features/campaigns/rule-based-campaign-generation-utils";
import type { TemplateCatalogItem } from "@/features/templates/template-catalog";
import type { TemplateCollectionResult } from "@/features/templates/template-collections";

export function createGenerationPlan(input: {
  campaign: CampaignBoardSummary;
  contentDatabase: ContentDatabaseCenter;
  starterPacks: TemplateCollectionResult[];
}): CampaignGenerationPlan {
  const starterPack = selectStarterPack(input.campaign, input.starterPacks);
  const records = selectCampaignRecords(input.contentDatabase, input.campaign);
  const variableMap = createVariableMap(input.campaign, records);
  const planTrace = createPlanTrace({
    campaign: input.campaign,
    starterPack,
    records,
  });
  const variants = starterPack
    ? starterPack.templates.map((template) =>
        createVariant({
          campaign: input.campaign,
          template,
          starterPack,
          records,
          variableMap,
        }),
      )
    : [];
  const score = average(
    [
      starterPack ? 100 : 0,
      records.length ? Math.min(100, records.length * 8) : 0,
      average(
        variants.map((variant) => statusScore(variant.reviewStatus)),
        0,
      ),
      hasRequiredVariables(variableMap) ? 100 : 70,
    ],
    0,
  );
  const status = scoreStatus(
    score,
    !starterPack ||
      variants.some((variant) => variant.reviewStatus === "blocked"),
  );

  return {
    id: `rule-campaign-generation-${input.campaign.id}`,
    campaignId: input.campaign.id,
    campaignName: input.campaign.name,
    status,
    score,
    starterPack: starterPack
      ? {
          id: starterPack.collection.id,
          name: starterPack.collection.name,
          templateIds: starterPack.templates.map((template) => template.id),
          formats: starterPack.formats,
        }
      : {
          id: "unmatched",
          name: "No starter pack matched",
          templateIds: [],
          formats: [],
        },
    variants,
    sourceTrace: planTrace,
  };
}

function createVariant(input: {
  campaign: CampaignBoardSummary;
  template: TemplateCatalogItem;
  starterPack: TemplateCollectionResult;
  records: ContentDatabaseRecord[];
  variableMap: Record<string, string>;
}): CampaignGeneratedVariant {
  const surface = mapFormatToGeneratedSurface(input.template.format);
  const variableKeys = getSurfaceVariableKeys(surface);
  const copyBlocks = createCopyBlocks({
    campaign: input.campaign,
    template: input.template,
    surface,
    variables: input.variableMap,
  });
  const sourceTrace = createVariantTrace({
    campaign: input.campaign,
    template: input.template,
    starterPack: input.starterPack,
    records: input.records,
    variableKeys,
  });
  const checks = createVariantChecks({
    surface,
    variableKeys,
    variableMap: input.variableMap,
    sourceTrace,
  });
  const reviewStatus = scoreStatus(
    average(
      checks.map((check) => statusScore(check.status)),
      0,
    ),
    checks.some((check) => check.status === "blocked"),
  );

  return {
    id: `${input.campaign.id}-${input.template.id}-rule-variant`,
    campaignId: input.campaign.id,
    templateId: input.template.id,
    templateName: input.template.name,
    format: input.template.format,
    surface,
    reviewStatus,
    title: `${input.campaign.name} - ${input.template.name}`,
    copyBlocks,
    variableMap: pickVariables(input.variableMap, variableKeys),
    sourceTrace,
    checks,
  };
}

function selectStarterPack(
  campaign: CampaignBoardSummary,
  starterPacks: TemplateCollectionResult[],
) {
  const query = normalize(
    [
      campaign.name,
      campaign.brief,
      campaign.goal,
      campaign.audience,
      campaign.deliverables.map((deliverable) => deliverable.channel).join(" "),
    ].join(" "),
  );

  return (
    starterPacks
      .map((starterPack) => ({
        starterPack,
        score: scoreStarterPack(starterPack, query),
      }))
      .filter((entry) => entry.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.starterPack.collection.name.localeCompare(
            right.starterPack.collection.name,
          ),
      )[0]?.starterPack ?? null
  );
}

function scoreStarterPack(
  starterPack: TemplateCollectionResult,
  query: string,
) {
  const fields = [
    starterPack.collection.name,
    starterPack.collection.description,
    starterPack.collection.intent,
    starterPack.collection.tags.join(" "),
    starterPack.templates
      .map((template) =>
        [
          template.name,
          template.description,
          template.category,
          template.industry,
          template.platform,
          template.tags.join(" "),
        ].join(" "),
      )
      .join(" "),
  ];
  const haystack = normalize(fields.join(" "));
  let score = starterPack.templates.length;

  for (const token of uniqueTokens(query)) {
    if (token.length < 3) continue;
    if (haystack.includes(token)) score += 8;
  }

  if (
    starterPack.collection.id.includes("launch") &&
    query.includes("launch")
  ) {
    score += 30;
  }

  return score;
}
