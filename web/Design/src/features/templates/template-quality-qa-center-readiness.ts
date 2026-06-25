import type { DesignTemplateSummary } from "@/features/editor/types";
import type { ProjectAuditDimension } from "@/features/projects/project-audit-center";
import type { MarketplaceDiscoveryTemplate } from "@/features/templates/template-marketplace-discovery";
import type { RelatedTemplateEvidence } from "@/features/templates/template-quality-qa-center-evidence";
import type { TemplateQualityReadiness } from "@/features/templates/template-quality-qa-center-types";
import {
  average,
  clamp,
  daysBetween,
  formatShortDate,
  scoreToStatus,
  uniqueStrings,
} from "@/features/templates/template-quality-qa-center-utils";

export function createAccessibilityReadiness(input: {
  template: DesignTemplateSummary;
  evidence: RelatedTemplateEvidence;
}): TemplateQualityReadiness {
  const accessibilityDimensions = input.evidence.audits
    .map((audit) =>
      audit.dimensions.find((dimension) => dimension.id === "accessibility"),
    )
    .filter((dimension): dimension is ProjectAuditDimension =>
      Boolean(dimension),
    );
  const accessibilityItems = input.evidence.finishItems.filter(
    (item) => item.kind === "accessibility",
  );
  const signals = uniqueStrings([
    ...accessibilityDimensions
      .filter((dimension) => dimension.status !== "ready")
      .map((dimension) => dimension.detail),
    ...accessibilityItems.map((item) => item.detail),
  ]);

  if (!accessibilityDimensions.length && !accessibilityItems.length) {
    return {
      id: "accessibility",
      label: "Accessibility",
      status: "review",
      score: 72,
      detail: "No related project audit is attached to this template yet.",
      signals: ["Attach a project audit before marketplace QA is finalized."],
    };
  }

  const auditScore = average(
    accessibilityDimensions.map((dimension) => dimension.score),
    100,
  );
  const issueScore = Math.max(
    0,
    100 -
      accessibilityItems.filter((item) => item.status === "blocked").length *
        30 -
      accessibilityItems.filter((item) => item.status === "review").length * 14,
  );
  const score = Math.min(auditScore, issueScore);
  const status = scoreToStatus(
    score,
    accessibilityDimensions.some((dimension) => dimension.status === "fix") ||
      accessibilityItems.some((item) => item.status === "blocked"),
  );

  return {
    id: "accessibility",
    label: "Accessibility",
    status,
    score,
    detail: accessibilityItems.length
      ? `${accessibilityItems.length} accessibility issue${accessibilityItems.length === 1 ? "" : "s"} routed from finishing QA.`
      : `${accessibilityDimensions.length} related audit dimension${accessibilityDimensions.length === 1 ? "" : "s"} checked.`,
    signals,
  };
}

export function createLocalizationReadiness(input: {
  template: DesignTemplateSummary;
  evidence: RelatedTemplateEvidence;
}): TemplateQualityReadiness {
  const localizationItems = input.evidence.finishItems.filter(
    (item) =>
      item.kind === "copy-length" ||
      item.kind === "translation" ||
      item.kind === "handoff",
  );
  const signals = uniqueStrings(localizationItems.map((item) => item.detail));

  if (!localizationItems.length) {
    return {
      id: "localization",
      label: "Localization",
      status: "ready",
      score: 100,
      detail: "No related copy-length or translation QA issues are open.",
      signals: [],
    };
  }

  const score = Math.max(
    0,
    100 -
      localizationItems.filter((item) => item.status === "blocked").length *
        28 -
      localizationItems.filter((item) => item.status === "review").length * 14,
  );
  const status = localizationItems.some((item) => item.status === "blocked")
    ? "blocked"
    : localizationItems.some((item) => item.status === "review") || score < 85
      ? "review"
      : "ready";

  return {
    id: "localization",
    label: "Localization",
    status,
    score,
    detail: `${localizationItems.length} copy or translation issue${localizationItems.length === 1 ? "" : "s"} linked to this template.`,
    signals,
  };
}

export function createMarketplaceReadiness(input: {
  template: DesignTemplateSummary;
  discoveryTemplate: MarketplaceDiscoveryTemplate;
}): TemplateQualityReadiness {
  const gateSignals = input.discoveryTemplate.qualityGates
    .filter((gate) => gate.status !== "pass")
    .map((gate) => gate.label);
  const publishedDateSignal =
    input.template.marketplaceStatus === "published" &&
    !input.template.marketplacePublishedAt
      ? "Published listing needs a publish timestamp."
      : null;
  const signals = uniqueStrings([
    ...gateSignals,
    publishedDateSignal,
    input.template.marketplaceReviewNote.trim()
      ? input.template.marketplaceReviewNote.trim()
      : null,
  ]);
  const hasFailingGate = input.discoveryTemplate.qualityGates.some(
    (gate) => gate.status === "fail",
  );
  const score = clamp(
    input.discoveryTemplate.qualityScore - (publishedDateSignal ? 10 : 0),
  );
  const status = scoreToStatus(score, hasFailingGate);

  return {
    id: "marketplace",
    label: "Marketplace readiness",
    status,
    score,
    detail: signals.length
      ? `${signals.length} listing gate${signals.length === 1 ? "" : "s"} need attention.`
      : "Listing gates, approval, preview, dimensions, and metadata are ready.",
    signals,
  };
}

export function createModerationReadiness(input: {
  template: DesignTemplateSummary;
  discoveryTemplate: MarketplaceDiscoveryTemplate;
  evidence: RelatedTemplateEvidence;
  now: Date;
}): TemplateQualityReadiness {
  const openedAt =
    input.evidence.marketplaceLog?.createdAt ??
    input.template.updatedAt ??
    input.template.createdAt;
  const openDays = daysBetween(input.now, openedAt);
  const isOpenReview = input.template.marketplaceStatus === "review";
  const signals = uniqueStrings([
    isOpenReview ? "Template is waiting for marketplace review." : null,
    input.template.approvalStatus === "changes-requested"
      ? "Approval changes are requested before publish."
      : null,
    input.template.marketplaceReviewNote.trim()
      ? input.template.marketplaceReviewNote.trim()
      : null,
    isOpenReview && openDays >= 2
      ? `Marketplace moderation has been open for ${openDays} days.`
      : null,
    input.discoveryTemplate.viewCount >= 20 &&
    input.discoveryTemplate.conversionRate < 8
      ? "Demand exists but installs are low."
      : null,
  ]);
  const score = clamp(
    100 -
      (isOpenReview ? 20 : 0) -
      (input.template.approvalStatus === "changes-requested" ? 32 : 0) -
      (input.template.marketplaceReviewNote.trim() ? 18 : 0) -
      (isOpenReview && openDays >= 4
        ? 30
        : isOpenReview && openDays >= 2
          ? 12
          : 0) -
      (input.discoveryTemplate.viewCount >= 20 &&
      input.discoveryTemplate.conversionRate < 8
        ? 10
        : 0),
  );
  const status = scoreToStatus(
    score,
    input.template.approvalStatus === "changes-requested" ||
      (isOpenReview && openDays >= 4),
  );

  return {
    id: "moderation",
    label: "Moderation routing",
    status,
    score,
    detail: signals.length
      ? `${signals.length} moderation signal${signals.length === 1 ? "" : "s"} found since ${formatShortDate(openedAt)}.`
      : "No open moderation pressure is attached to this template.",
    signals,
  };
}
