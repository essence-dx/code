import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DesignTemplateSummary } from "@/features/editor/types";
import { createTemplateMarketplaceIntelligence } from "@/features/templates/template-marketplace-intelligence";

describe("template marketplace intelligence", () => {
  test("ranks template demand and identifies collection gaps", () => {
    const intelligence = createTemplateMarketplaceIntelligence({
      now: new Date("2026-05-18T12:00:00.000Z"),
      templates: [
        createTemplate({
          id: "social-hot",
          name: "Social Launch",
          creatorName: "Amina Designer",
          marketplaceCollection: "social",
          marketplaceUseCount: 18,
          marketplaceViewCount: 72,
          marketplacePublishedAt: "2026-05-15T12:00:00.000Z",
        }),
        createTemplate({
          id: "business-looked",
          name: "Business One Pager",
          creatorName: "Rafi Studio",
          marketplaceCollection: "business",
          marketplaceUseCount: 1,
          marketplaceViewCount: 64,
          marketplacePublishedAt: "2026-04-18T12:00:00.000Z",
        }),
        createTemplate({
          id: "creator-review",
          name: "Creator Media Kit",
          creatorName: "Rafi Studio",
          marketplaceStatus: "review",
          marketplaceCollection: "creator",
          marketplaceUseCount: 0,
          marketplaceViewCount: 16,
          marketplacePublishedAt: null,
        }),
      ],
      auditLogs: [],
    });

    assert.equal(intelligence.totals.publishedTemplates, 2);
    assert.equal(intelligence.demandSignals[0]?.templateId, "social-hot");
    assert.equal(intelligence.demandSignals[0]?.signal, "rising");
    assert.equal(
      intelligence.demandSignals.find(
        (signal) => signal.templateId === "business-looked",
      )?.signal,
      "under-converting",
    );
    assert.equal(
      intelligence.collectionGaps.some(
        (gap) => gap.collection === "education" && gap.severity === "blocked",
      ),
      true,
    );
    assert.equal(intelligence.installCohorts[0]?.label, "Last 7 days");
    assert.equal(intelligence.installCohorts[0]?.uses, 18);
  });

  test("surfaces creator quality trends and moderation SLA pressure", () => {
    const intelligence = createTemplateMarketplaceIntelligence({
      now: new Date("2026-05-18T12:00:00.000Z"),
      templates: [
        createTemplate({
          id: "good-creator",
          creatorName: "Amina Designer",
          marketplaceCollection: "social",
          marketplaceUseCount: 16,
          marketplaceViewCount: 44,
        }),
        createTemplate({
          id: "stalled-review",
          creatorName: "Rafi Studio",
          marketplaceStatus: "review",
          approvalStatus: "draft",
          marketplaceCollection: "business",
          marketplaceReviewNote: "Needs preview polish.",
          marketplaceUseCount: 0,
          marketplaceViewCount: 28,
          updatedAt: "2026-05-12T12:00:00.000Z",
        }),
      ],
      auditLogs: [
        createAuditLog({
          targetId: "stalled-review",
          createdAt: "2026-05-12T12:00:00.000Z",
        }),
      ],
    });

    assert.equal(
      intelligence.creatorTrends[0]?.creatorDetail,
      "Amina Designer",
    );
    assert.equal(intelligence.creatorTrends[0]?.trend, "leader");
    assert.equal(
      intelligence.moderationSla.items[0]?.templateId,
      "stalled-review",
    );
    assert.equal(intelligence.moderationSla.items[0]?.status, "overdue");
    assert.equal(intelligence.moderationSla.overdueCount, 1);
    assert.equal(
      intelligence.nextActions.some((action) =>
        action.includes("Review overdue marketplace submissions"),
      ),
      true,
    );
  });
});

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template",
    name: "Launch Template",
    creatorName: null,
    creatorEmail: "creator@example.com",
    width: 1080,
    height: 1080,
    thumbnail: "data:image/png;base64,AAAA",
    isBrandTemplate: false,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "general",
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-10T12:00:00.000Z",
    marketplaceUseCount: 0,
    marketplaceViewCount: 0,
    createdAt: "2026-05-10T12:00:00.000Z",
    updatedAt: "2026-05-10T12:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-log",
    action: "template.marketplace.updated",
    targetType: "template",
    targetId: "template",
    summary: "Updated template marketplace listing",
    actorEmail: "admin@example.com",
    metadata: {},
    createdAt: "2026-05-18T12:00:00.000Z",
    ...overrides,
  };
}
