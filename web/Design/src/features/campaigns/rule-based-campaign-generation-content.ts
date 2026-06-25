import type { CampaignBoardSummary } from "@/db/campaigns";
import type {
  ContentDatabaseCenter,
  ContentDatabaseRecord,
} from "@/features/content-database/content-database";
import type { CampaignGeneratedSurface } from "@/features/campaigns/rule-based-campaign-generation-types";
import type {
  TemplateCatalogFormat,
  TemplateCatalogItem,
} from "@/features/templates/template-catalog";
import { uniqueStrings } from "@/features/campaigns/rule-based-campaign-generation-utils";

export function selectCampaignRecords(
  contentDatabase: ContentDatabaseCenter,
  campaign: CampaignBoardSummary,
) {
  const deliverableIds = new Set(
    campaign.deliverables.map((deliverable) => deliverable.id),
  );
  const projectIds = new Set(
    campaign.deliverables
      .map((deliverable) => deliverable.projectId)
      .filter((projectId): projectId is string => Boolean(projectId)),
  );
  const matched = contentDatabase.records.filter((record) =>
    record.sources.some(
      (source) =>
        (source.type === "campaign" && source.id === campaign.id) ||
        (source.type === "deliverable" && deliverableIds.has(source.id)) ||
        (source.type === "project" && projectIds.has(source.id)) ||
        source.type.startsWith("brand-"),
    ),
  );

  return matched.length ? matched : contentDatabase.records;
}

export function createVariableMap(
  campaign: CampaignBoardSummary,
  records: ContentDatabaseRecord[],
) {
  const map: Record<string, string> = {
    campaign_name: campaign.name,
    campaign_goal: campaign.goal,
    campaign_brief: campaign.brief,
    audience: campaign.audience,
    brand_color: campaign.primaryBrandColor ?? "#0f172a",
    brand_logo: campaign.brandLogoName ?? "Brand mark",
    brand_heading_font: campaign.brandFontFamily ?? "Inter",
    launch_date: campaign.launchAt
      ? campaign.launchAt.slice(0, 10)
      : "Launch date",
  };

  for (const record of records) {
    map[record.variableKey] = record.value;
  }

  map.product_name =
    map.product_name || inferProductName(campaign.name, campaign.brief);
  map.early_bird_price =
    map.early_bird_price || extractPrice(campaign.brief) || "Launch offer";
  map.cta = createCallToAction(map.product_name, map.early_bird_price);

  return map;
}

export function hasRequiredVariables(variableMap: Record<string, string>) {
  return ["campaign_name", "product_name", "audience", "campaign_goal"].every(
    (key) => Boolean(variableMap[key]),
  );
}

export function createCopyBlocks(input: {
  campaign: CampaignBoardSummary;
  template: TemplateCatalogItem;
  surface: CampaignGeneratedSurface;
  variables: Record<string, string>;
}) {
  const product = input.variables.product_name;
  const audience = input.variables.audience;
  const price = input.variables.early_bird_price;
  const goal = input.variables.campaign_goal;
  const launchDate = input.variables.launch_date;
  const cta = input.variables.cta;

  if (input.surface === "website") {
    return [
      `${product} is ready for ${audience}`,
      `${input.campaign.brief}`,
      `${goal}. Launch date: ${launchDate}.`,
      cta,
    ];
  }

  if (input.surface === "email") {
    return [
      `Subject: ${product} opens with ${price}`,
      `Preview: ${goal} for ${audience}.`,
      `${input.campaign.brief}`,
      cta,
    ];
  }

  if (input.surface === "social") {
    return [
      `${product} launches ${launchDate}`,
      `${price} for ${audience}`,
      cta,
    ];
  }

  if (input.surface === "video") {
    return [
      `Hook: ${product} for ${audience}`,
      `Beat 1: ${input.campaign.brief}`,
      `Beat 2: ${price} launch offer`,
      `Caption: ${cta}`,
    ];
  }

  if (input.surface === "presentation") {
    return [
      `${product}: campaign narrative`,
      `Audience: ${audience}`,
      `Goal: ${goal}`,
      `Launch: ${launchDate}`,
    ];
  }

  return [
    `${input.template.name}: ${product}`,
    `${input.campaign.brief}`,
    `${cta}`,
  ];
}

export function getSurfaceVariableKeys(surface: CampaignGeneratedSurface) {
  const common = [
    "campaign_name",
    "product_name",
    "audience",
    "campaign_goal",
    "brand_color",
    "brand_logo",
    "brand_heading_font",
    "launch_date",
    "early_bird_price",
    "cta",
  ];

  if (surface === "website") {
    return [...common, "website_title", "website_seo_description"];
  }

  if (surface === "email") {
    return [...common, "email_caption"];
  }

  if (surface === "social") {
    return [...common, "instagram_caption"];
  }

  return common;
}

export function pickVariables(
  variableMap: Record<string, string>,
  variableKeys: string[],
) {
  return Object.fromEntries(
    uniqueStrings(variableKeys).map((key) => [key, variableMap[key] ?? ""]),
  );
}

export function mapFormatToGeneratedSurface(
  format: TemplateCatalogFormat,
): CampaignGeneratedSurface {
  if (format === "website") return "website";
  if (format === "email-template") return "email";
  if (format === "instagram-post") return "social";
  if (format === "video") return "video";
  if (format === "presentation") return "presentation";
  if (
    format === "poster" ||
    format === "flyer" ||
    format === "business-card" ||
    format === "print-product"
  ) {
    return "print";
  }
  if (
    format === "document" ||
    format === "resume" ||
    format === "course" ||
    format === "infographic"
  ) {
    return "document";
  }

  return "social";
}

function inferProductName(name: string, brief: string) {
  const namePrefix = name
    .replace(
      /\b(launch|campaign|preorder|sale|story|email|website|hero)\b.*$/i,
      "",
    )
    .trim();

  if (namePrefix.split(/\s+/).length >= 2) return namePrefix;

  return brief
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");
}

function extractPrice(value: string) {
  return value.match(/\$\s?\d+(?:[.,]\d+)?/)?.[0]?.replace(/\s+/g, "") ?? "";
}

function createCallToAction(product: string, price: string) {
  if (price && price !== "Launch offer") {
    return `Reserve ${product} at ${price}`;
  }

  return `Reserve ${product}`;
}
