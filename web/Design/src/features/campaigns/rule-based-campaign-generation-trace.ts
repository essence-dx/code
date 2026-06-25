import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentDatabaseRecord } from "@/features/content-database/content-database";
import type {
  CampaignGeneratedSurface,
  CampaignGenerationCheck,
  CampaignGenerationTrace,
} from "@/features/campaigns/rule-based-campaign-generation-types";
import type { TemplateCatalogItem } from "@/features/templates/template-catalog";
import type { TemplateCollectionResult } from "@/features/templates/template-collections";

export function createPlanTrace(input: {
  campaign: CampaignBoardSummary;
  starterPack: TemplateCollectionResult | null;
  records: ContentDatabaseRecord[];
}) {
  const trace: CampaignGenerationTrace[] = [
    {
      id: `${input.campaign.id}-brief`,
      sourceType: "campaign",
      sourceId: input.campaign.id,
      label: input.campaign.name,
      field: "brief",
      value: input.campaign.brief,
    },
  ];

  if (input.campaign.primaryBrandColor || input.campaign.brandLogoName) {
    trace.push({
      id: `${input.campaign.id}-brand`,
      sourceType: "brand-kit",
      sourceId: input.campaign.id,
      label: "Campaign brand snapshot",
      field: "brand",
      value: [
        input.campaign.primaryBrandColor,
        input.campaign.brandLogoName,
        input.campaign.brandFontFamily,
      ]
        .filter(Boolean)
        .join(" / "),
    });
  }

  if (input.starterPack) {
    trace.push({
      id: `${input.starterPack.collection.id}-starter-pack`,
      sourceType: "starter-pack",
      sourceId: input.starterPack.collection.id,
      label: input.starterPack.collection.name,
      field: "templateIds",
      value: input.starterPack.collection.templateIds.join(", "),
    });
  }

  return trace.concat(input.records.slice(0, 8).map(recordToTrace));
}

export function createVariantTrace(input: {
  campaign: CampaignBoardSummary;
  template: TemplateCatalogItem;
  starterPack: TemplateCollectionResult;
  records: ContentDatabaseRecord[];
  variableKeys: string[];
}) {
  const recordByKey = new Map(
    input.records.map((record) => [record.variableKey, record]),
  );
  const traces: CampaignGenerationTrace[] = [
    {
      id: `${input.campaign.id}-${input.template.id}-campaign`,
      sourceType: "campaign",
      sourceId: input.campaign.id,
      label: input.campaign.name,
      field: "brief",
      value: input.campaign.brief,
    },
    {
      id: `${input.campaign.id}-${input.template.id}-starter-pack`,
      sourceType: "starter-pack",
      sourceId: input.starterPack.collection.id,
      label: input.starterPack.collection.name,
      field: "templateIds",
      value: input.starterPack.collection.templateIds.join(", "),
    },
    {
      id: `${input.campaign.id}-${input.template.id}-template`,
      sourceType: "template",
      sourceId: input.template.id,
      label: input.template.name,
      field: "format",
      value: input.template.format,
    },
  ];

  if (input.campaign.primaryBrandColor || input.campaign.brandLogoName) {
    traces.push({
      id: `${input.campaign.id}-${input.template.id}-brand`,
      sourceType: "brand-kit",
      sourceId: input.campaign.id,
      label: "Campaign brand snapshot",
      field: "brand",
      value: [
        input.campaign.primaryBrandColor,
        input.campaign.brandLogoName,
        input.campaign.brandFontFamily,
      ]
        .filter(Boolean)
        .join(" / "),
    });
  }

  for (const key of input.variableKeys) {
    const record = recordByKey.get(key);

    if (record) traces.push(recordToTrace(record));
  }

  return uniqueTrace(traces);
}

export function createVariantChecks(input: {
  surface: CampaignGeneratedSurface;
  variableKeys: string[];
  variableMap: Record<string, string>;
  sourceTrace: CampaignGenerationTrace[];
}): CampaignGenerationCheck[] {
  const missingVariables = input.variableKeys.filter(
    (key) => !input.variableMap[key],
  );
  const hasStarterPack = input.sourceTrace.some(
    (trace) => trace.sourceType === "starter-pack",
  );
  const hasContent = input.sourceTrace.some(
    (trace) => trace.sourceType === "content-record",
  );
  const hasBrand = input.sourceTrace.some(
    (trace) => trace.sourceType === "brand-kit",
  );

  return [
    {
      id: "variables",
      label: "Variables resolved",
      status: missingVariables.length ? "review" : "ready",
      detail: missingVariables.length
        ? `Missing ${missingVariables.join(", ")} for ${input.surface}.`
        : `${input.variableKeys.length} content variables resolved.`,
    },
    {
      id: "starter-pack",
      label: "Starter pack traced",
      status: hasStarterPack ? "ready" : "blocked",
      detail: hasStarterPack
        ? "Variant keeps starter-pack provenance."
        : "No starter-pack source was attached.",
    },
    {
      id: "content-database",
      label: "Content database traced",
      status: hasContent ? "ready" : "review",
      detail: hasContent
        ? "Variant uses reusable content records."
        : "Variant only used campaign fallback fields.",
    },
    {
      id: "brand",
      label: "Brand snapshot traced",
      status: hasBrand ? "ready" : "review",
      detail: hasBrand
        ? "Variant includes brand-kit evidence."
        : "Add brand-kit snapshot before campaign release.",
    },
  ];
}

function recordToTrace(record: ContentDatabaseRecord): CampaignGenerationTrace {
  return {
    id: `content-record-${record.id}`,
    sourceType: "content-record",
    sourceId: record.id,
    label: record.label,
    field: record.variableKey,
    value: record.value,
  };
}

function uniqueTrace(traces: CampaignGenerationTrace[]) {
  const seen = new Set<string>();

  return traces.filter((trace) => {
    const key = `${trace.sourceType}:${trace.sourceId}:${trace.field}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
