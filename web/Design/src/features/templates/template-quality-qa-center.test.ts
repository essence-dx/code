import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DesignTemplateSummary } from "@/features/editor/types";
import type {
  AccessibilityLocalizationFinishCenter,
  AccessibilityLocalizationItem,
  AccessibilityLocalizationSection,
} from "@/features/localization/accessibility-localization-finish";
import type {
  ProjectAuditDimension,
  ProjectAuditSummary,
} from "@/features/projects/project-audit-center";
import { createTemplateQualityQaCenter } from "@/features/templates/template-quality-qa-center";

describe("template quality QA center", () => {
  test("routes weak templates through accessibility, localization, marketplace, and creator fix plans", () => {
    const center = createTemplateQualityQaCenter({
      now: new Date("2026-05-18T12:00:00.000Z"),
      templates: [
        createTemplate({
          id: "launch-ready",
          name: "Launch Ready Kit",
          creatorName: "Amina Designer",
          marketplaceCollection: "social",
          marketplaceUseCount: 18,
          marketplaceViewCount: 80,
        }),
        createTemplate({
          id: "launch-blocked",
          name: "Launch Blocked Kit",
          creatorName: "Rafi Studio",
          thumbnail: null,
          approvalStatus: "changes-requested",
          marketplaceStatus: "review",
          marketplaceCollection: null,
          marketplaceReviewNote: "Needs accessible preview and Bengali copy.",
          marketplacePublishedAt: null,
          marketplaceUseCount: 0,
          marketplaceViewCount: 24,
          updatedAt: "2026-05-12T12:00:00.000Z",
        }),
      ],
      projectAudits: [
        createAudit({
          projectId: "project-ready",
          projectName: "Launch Ready Kit",
          overallScore: 94,
          status: "ready",
          dimensions: [
            createDimension({
              id: "accessibility",
              score: 95,
              status: "ready",
            }),
            createDimension({ id: "seo", score: 92, status: "ready" }),
            createDimension({ id: "brand", score: 96, status: "ready" }),
          ],
        }),
        createAudit({
          projectId: "project-blocked",
          projectName: "Launch Blocked Kit campaign",
          overallScore: 56,
          status: "fix",
          dimensions: [
            createDimension({
              id: "accessibility",
              score: 38,
              status: "fix",
              detail: "Hero image is missing alt text.",
            }),
            createDimension({
              id: "brand",
              score: 64,
              status: "fix",
            }),
          ],
        }),
      ],
      accessibilityLocalizationFinish: createFinishCenter([
        createFinishSection({
          id: "page-routing",
          title: "Page routing",
          items: [
            createFinishItem({
              id: "blocked-alt",
              title: "Launch Blocked Kit campaign: hero image",
              detail: "Hero image needs alt text before marketplace release.",
              kind: "accessibility",
              status: "blocked",
            }),
          ],
        }),
        createFinishSection({
          id: "translation-qa",
          title: "Translation QA",
          items: [
            createFinishItem({
              id: "blocked-copy",
              title: "Launch Blocked Kit campaign: Bengali copy",
              detail: "Bengali translation pack is missing preview copy.",
              kind: "translation",
              status: "review",
            }),
          ],
        }),
      ]),
      auditLogs: [
        createAuditLog({
          targetId: "launch-blocked",
          createdAt: "2026-05-12T12:00:00.000Z",
        }),
      ],
    });

    const blockedProfile = center.templateProfiles.find(
      (profile) => profile.templateId === "launch-blocked",
    );

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.templates, 2);
    assert.equal(center.totals.blockedTemplates, 1);
    assert.equal(blockedProfile?.status, "blocked");
    assert.equal(blockedProfile?.readiness.accessibility.status, "blocked");
    assert.equal(blockedProfile?.readiness.localization.status, "review");
    assert.equal(blockedProfile?.readiness.marketplace.status, "blocked");
    assert.equal(blockedProfile?.readiness.moderation.status, "blocked");
    assert.equal(
      center.moderationRoutes.some(
        (route) =>
          route.templateId === "launch-blocked" &&
          route.queue === "accessibility-localization",
      ),
      true,
    );
    assert.equal(
      center.creatorFixPlans.some(
        (plan) =>
          plan.templateId === "launch-blocked" &&
          plan.items.some((item) => item.owner === "creator"),
      ),
      true,
    );
    assert.ok(center.qualityPacket.dataUrl.startsWith("data:application/json"));
  });

  test("keeps approved templates ready when audits and listing gates are clean", () => {
    const center = createTemplateQualityQaCenter({
      now: new Date("2026-05-18T12:00:00.000Z"),
      templates: [
        createTemplate({
          id: "brand-ready",
          name: "Brand Ready Kit",
          creatorName: "Amina Designer",
          marketplaceCollection: "business",
          marketplaceSeason: "Evergreen",
          marketplaceUseCount: 12,
          marketplaceViewCount: 36,
        }),
      ],
      projectAudits: [
        createAudit({
          projectId: "project-ready",
          projectName: "Brand Ready Kit",
          overallScore: 96,
          status: "ready",
          dimensions: [
            createDimension({
              id: "accessibility",
              score: 98,
              status: "ready",
            }),
            createDimension({ id: "seo", score: 95, status: "ready" }),
            createDimension({ id: "brand", score: 96, status: "ready" }),
          ],
        }),
      ],
      accessibilityLocalizationFinish: createFinishCenter([]),
      auditLogs: [],
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.readyTemplates, 1);
    assert.equal(center.moderationRoutes.length, 0);
    assert.equal(center.creatorFixPlans[0]?.items.length, 0);
    assert.equal(center.nextActions.length, 0);
  });
});

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template",
    name: "Launch Kit",
    creatorName: null,
    creatorEmail: "creator@example.com",
    width: 1080,
    height: 1080,
    thumbnail: "data:image/png;base64,AAAA",
    isBrandTemplate: false,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "social",
    marketplaceSeason: "Evergreen",
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-10T12:00:00.000Z",
    marketplaceUseCount: 3,
    marketplaceViewCount: 12,
    createdAt: "2026-05-10T12:00:00.000Z",
    updatedAt: "2026-05-10T12:00:00.000Z",
    ...overrides,
  };
}

function createAudit(
  overrides: Partial<ProjectAuditSummary> = {},
): ProjectAuditSummary {
  return {
    projectId: "project",
    projectName: "Launch Kit",
    updatedAt: "2026-05-18T12:00:00.000Z",
    overallScore: 92,
    status: "ready",
    dimensions: [
      createDimension({ id: "accessibility", score: 92, status: "ready" }),
    ],
    ...overrides,
  };
}

function createDimension(
  overrides: Partial<ProjectAuditDimension> = {},
): ProjectAuditDimension {
  return {
    id: "accessibility",
    label: "Accessibility",
    status: "ready",
    score: 92,
    detail: "Checks look ready.",
    ...overrides,
  } as ProjectAuditDimension;
}

function createFinishCenter(
  sections: AccessibilityLocalizationSection[],
): AccessibilityLocalizationFinishCenter {
  return {
    status: sections.some((section) => section.status === "blocked")
      ? "blocked"
      : sections.some((section) => section.status === "review")
        ? "review"
        : "ready",
    score: sections.length
      ? Math.round(
          sections.reduce((total, section) => total + section.score, 0) /
            sections.length,
        )
      : 100,
    sections,
    nextActions: [],
    handoffExport: {
      fileName: "finish.json",
      generatedAt: "2026-05-18T12:00:00.000Z",
      dataUrl: "data:application/json,%7B%7D",
    },
    totals: {
      projects: 1,
      pages: 1,
      routedIssues: sections.reduce(
        (total, section) => total + section.items.length,
        0,
      ),
      copyWarnings: 0,
      translationEntries: 1,
      handoffExports: 1,
    },
  };
}

function createFinishSection(
  overrides: Partial<AccessibilityLocalizationSection> = {},
): AccessibilityLocalizationSection {
  const items = overrides.items ?? [];

  return {
    id: "page-routing",
    title: "Page routing",
    description: "Issues routed to project pages.",
    status: items.some((item) => item.status === "blocked")
      ? "blocked"
      : items.some((item) => item.status === "review")
        ? "review"
        : "ready",
    score: items.length ? 48 : 100,
    metricLabel: "issues",
    metricValue: items.length,
    emptyState: "No issues.",
    items,
    ...overrides,
  } as AccessibilityLocalizationSection;
}

function createFinishItem(
  overrides: Partial<AccessibilityLocalizationItem> = {},
): AccessibilityLocalizationItem {
  return {
    id: "finish-item",
    title: "Launch Kit copy",
    detail: "Copy needs review.",
    href: "/designs/project",
    status: "review",
    badge: "Review",
    meta: ["Launch Kit"],
    kind: "translation",
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
