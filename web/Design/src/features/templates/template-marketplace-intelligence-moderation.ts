import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DesignTemplateSummary } from "@/features/editor/types";
import type { MarketplaceDiscoveryTemplate } from "@/features/templates/template-marketplace-discovery";
import type {
  MarketplaceModerationSlaItem,
  MarketplaceModerationSlaStatus,
  TemplateMarketplaceIntelligence,
} from "@/features/templates/template-marketplace-intelligence-types";
import {
  average,
  daysBetween,
  moderationSlaWeight,
  uniqueStrings,
} from "@/features/templates/template-marketplace-intelligence-utils";

export function createModerationSla(input: {
  templates: DesignTemplateSummary[];
  discoveryTemplates: MarketplaceDiscoveryTemplate[];
  auditLogs: WorkspaceAuditLogSummary[];
  now: Date;
}): TemplateMarketplaceIntelligence["moderationSla"] {
  const discoveryById = new Map(
    input.discoveryTemplates.map(
      (template) => [template.id, template] as const,
    ),
  );
  const marketplaceLogsByTarget = createMarketplaceAuditLogMap(input.auditLogs);
  const items = input.templates
    .map((template) => {
      const discoveryTemplate = discoveryById.get(template.id);

      if (!discoveryTemplate) return null;

      const reasons = moderationReasons(template, discoveryTemplate);

      if (!reasons.length) return null;

      const openedAt =
        marketplaceLogsByTarget.get(template.id)?.createdAt ??
        template.updatedAt ??
        template.createdAt;
      const daysOpen = daysBetween(input.now, openedAt);
      const status = classifyModerationSla(daysOpen);

      return {
        templateId: template.id,
        templateName: template.name,
        creatorDetail: discoveryTemplate.creatorDetail,
        collectionLabel: discoveryTemplate.collectionLabel,
        status,
        daysOpen,
        openedAt,
        reasons,
      };
    })
    .filter((item): item is MarketplaceModerationSlaItem => Boolean(item))
    .sort(
      (a, b) =>
        moderationSlaWeight(a.status) - moderationSlaWeight(b.status) ||
        b.daysOpen - a.daysOpen ||
        a.templateName.localeCompare(b.templateName),
    )
    .slice(0, 8);

  return {
    items,
    overdueCount: items.filter((item) => item.status === "overdue").length,
    dueSoonCount: items.filter((item) => item.status === "due-soon").length,
    averageDaysOpen: average(
      items.map((item) => item.daysOpen),
      1,
    ),
  };
}

function moderationReasons(
  template: DesignTemplateSummary,
  discoveryTemplate: MarketplaceDiscoveryTemplate,
) {
  const reasons = [
    template.marketplaceStatus === "review"
      ? "Template is waiting for marketplace review"
      : null,
    template.marketplaceReviewNote.trim() || null,
    ...discoveryTemplate.qualityGates
      .filter((gate) => gate.status !== "pass")
      .map((gate) => gate.label),
    discoveryTemplate.viewCount >= 20 && discoveryTemplate.conversionRate < 8
      ? "Demand exists but installs are low"
      : null,
  ];

  return uniqueStrings(
    reasons.filter((reason): reason is string => Boolean(reason)),
  );
}

function createMarketplaceAuditLogMap(logs: WorkspaceAuditLogSummary[]) {
  const byTarget = new Map<string, WorkspaceAuditLogSummary>();

  for (const log of logs) {
    if (log.action !== "template.marketplace.updated" || !log.targetId) {
      continue;
    }

    const current = byTarget.get(log.targetId);

    if (!current || Date.parse(log.createdAt) < Date.parse(current.createdAt)) {
      byTarget.set(log.targetId, log);
    }
  }

  return byTarget;
}

function classifyModerationSla(
  daysOpen: number,
): MarketplaceModerationSlaStatus {
  if (daysOpen >= 4) return "overdue";
  if (daysOpen >= 2) return "due-soon";

  return "on-track";
}
