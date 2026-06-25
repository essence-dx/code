import type {
  CampaignGeneratedVariant,
  CampaignGenerationPlan,
  CampaignGenerationStatus,
  RuleBasedCampaignGenerationCenter,
  RuleBasedCampaignGenerationInput,
} from "@/features/campaigns/rule-based-campaign-generation-types";

export function createNextActions(input: {
  plans: CampaignGenerationPlan[];
  variants: CampaignGeneratedVariant[];
}) {
  if (
    input.variants.length &&
    input.variants.every((variant) => variant.reviewStatus === "ready")
  ) {
    return [
      "Generated campaign variants are reviewable and source-traced without paid AI.",
    ];
  }

  return uniqueStrings(
    input.plans.flatMap((plan) =>
      plan.variants
        .filter((variant) => variant.reviewStatus !== "ready")
        .flatMap((variant) =>
          variant.checks
            .filter((check) => check.status !== "ready")
            .map((check) => `${variant.templateName}: ${check.detail}`),
        ),
    ),
  ).slice(0, 6);
}

export function createCenterPacket(input: {
  generatedAt: string;
  status: CampaignGenerationStatus;
  score: number;
  plans: CampaignGenerationPlan[];
  variants: CampaignGeneratedVariant[];
  nextActions: string[];
  totals: RuleBasedCampaignGenerationCenter["totals"];
}) {
  const payload = {
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    engine: {
      mode: "deterministic-rules",
      paidAiDependency: false,
    },
    totals: input.totals,
    plans: input.plans.map((plan) => ({
      id: plan.id,
      campaignId: plan.campaignId,
      status: plan.status,
      score: plan.score,
      starterPack: plan.starterPack,
      variants: plan.variants.map((variant) => variant.id),
      sourceTrace: plan.sourceTrace,
    })),
    variants: input.variants,
    nextActions: input.nextActions,
  };

  return {
    fileName: "rule-based-campaign-generation.json",
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
  };
}

export function scoreStatus(
  score: number,
  blocked: boolean,
): CampaignGenerationStatus {
  if (blocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

export function statusScore(status: CampaignGenerationStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 70;

  return 20;
}

export function average(values: number[], fallback = 100) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

export function uniqueTokens(value: string) {
  return uniqueStrings(value.split(/[^a-z0-9]+/g).filter(Boolean));
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

export function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function createGeneratedAt(input: RuleBasedCampaignGenerationInput) {
  const timestamps = [
    input.contentDatabase.generatedAt,
    ...input.campaigns.map((campaign) => campaign.updatedAt),
  ]
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  return new Date(
    timestamps.length ? Math.max(...timestamps) : Date.now(),
  ).toISOString();
}
