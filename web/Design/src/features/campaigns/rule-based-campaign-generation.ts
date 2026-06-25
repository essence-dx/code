import type {
  RuleBasedCampaignGenerationCenter,
  RuleBasedCampaignGenerationInput,
} from "@/features/campaigns/rule-based-campaign-generation-types";
import { createGenerationPlan } from "@/features/campaigns/rule-based-campaign-generation-plans";
import {
  average,
  createCenterPacket,
  createGeneratedAt,
  createNextActions,
  scoreStatus,
} from "@/features/campaigns/rule-based-campaign-generation-utils";

export type {
  CampaignGeneratedSurface,
  CampaignGeneratedVariant,
  CampaignGenerationCheck,
  CampaignGenerationPlan,
  CampaignGenerationStatus,
  CampaignGenerationTrace,
  RuleBasedCampaignGenerationCenter,
  RuleBasedCampaignGenerationInput,
} from "@/features/campaigns/rule-based-campaign-generation-types";

export function createRuleBasedCampaignGenerationCenter(
  input: RuleBasedCampaignGenerationInput,
): RuleBasedCampaignGenerationCenter {
  const generatedAt = input.generatedAt ?? createGeneratedAt(input);
  const plans = input.campaigns
    .map((campaign) =>
      createGenerationPlan({
        campaign,
        contentDatabase: input.contentDatabase,
        starterPacks: input.starterPacks,
      }),
    )
    .sort((left, right) => right.score - left.score);
  const variants = plans.flatMap((plan) => plan.variants);
  const score = average(
    plans.map((plan) => plan.score),
    input.campaigns.length ? 45 : 100,
  );
  const status = scoreStatus(
    score,
    plans.some((plan) => plan.status === "blocked") ||
      (input.campaigns.length > 0 && !plans.length),
  );
  const nextActions = createNextActions({ plans, variants });
  const totals = {
    campaigns: input.campaigns.length,
    variants: variants.length,
    readyVariants: variants.filter(
      (variant) => variant.reviewStatus === "ready",
    ).length,
    reviewVariants: variants.filter(
      (variant) => variant.reviewStatus === "review",
    ).length,
    blockedVariants: variants.filter(
      (variant) => variant.reviewStatus === "blocked",
    ).length,
    starterPacks: new Set(plans.map((plan) => plan.starterPack.id)).size,
    sourceTraces: plans.reduce(
      (total, plan) =>
        total +
        plan.sourceTrace.length +
        plan.variants.reduce(
          (variantTotal, variant) => variantTotal + variant.sourceTrace.length,
          0,
        ),
      0,
    ),
  };

  return {
    generatedAt,
    status,
    score,
    engine: {
      mode: "deterministic-rules",
      paidAiDependency: false,
    },
    plans,
    variants,
    packet: createCenterPacket({
      generatedAt,
      status,
      score,
      plans,
      variants,
      nextActions,
      totals,
    }),
    nextActions,
    totals,
  };
}
