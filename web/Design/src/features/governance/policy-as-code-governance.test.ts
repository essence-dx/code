import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import { createPolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";

describe("policy-as-code governance center", () => {
  test("builds dry-run enforcement reports for sharing, publishing, assets, approvals, and retention", () => {
    const center = createPolicyAsCodeGovernanceCenter({
      projects: [
        createProject({
          id: "project-public-draft",
          name: "Launch draft",
          publicShareId: "public-launch",
          editShareId: "edit-launch",
          editSharePermission: "edit",
          approvalStatus: "draft",
          updatedAt: "2025-12-10T09:00:00.000Z",
        }),
        createProject({
          id: "project-trash",
          name: "Archived campaign",
          deletedAt: "2026-03-01T09:00:00.000Z",
          updatedAt: "2026-03-01T09:00:00.000Z",
        }),
      ],
      templates: [
        createTemplate({
          id: "template-public",
          name: "Public launch kit",
          marketplaceStatus: "published",
          approvalStatus: "draft",
        }),
      ],
      contentScheduleItems: [
        createContentItem({
          id: "content-no-caption",
          projectId: "project-public-draft",
          projectName: "Launch draft",
          title: "Launch announcement",
          channel: "LinkedIn",
          caption: "",
          status: "planned",
        }),
      ],
      assetAudit: createAssetAudit({
        skippedProjectReferenceCount: 2,
      }),
      reviewTasks: [
        createReviewTask({
          id: "review-overdue",
          projectId: "project-public-draft",
          projectName: "Launch draft",
          taskStatus: "todo",
          taskAssigneeName: "Rina",
          taskDueAt: "2026-05-10T09:00:00.000Z",
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "share-risk",
          action: "project.created",
          targetId: "project-public-draft",
          summary: "Launch draft created",
        }),
        createAuditLog({
          id: "hold-trash",
          action: "project.legal_hold.enabled",
          targetId: "project-trash",
          summary: "Legal hold enabled for Archived campaign",
          metadata: { reason: "Contract review" },
          createdAt: "2026-03-02T09:00:00.000Z",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.rules.length, 5);
    assert.equal(center.dryRunReports.length, 5);
    assert.equal(center.totals.policyDomains, 5);
    assert.equal(center.totals.blockedRules, 4);
    assert.equal(center.totals.reviewRules, 1);

    const sharing = center.dryRunReports.find(
      (report) => report.domain === "sharing",
    );
    assert.equal(sharing?.status, "blocked");
    assert.equal(sharing?.affectedItems.length, 1);
    assert.equal(
      sharing?.plannedActions.some((action) =>
        action.includes("Downgrade editable share link"),
      ),
      true,
    );

    const publishing = center.dryRunReports.find(
      (report) => report.domain === "publishing",
    );
    assert.equal(publishing?.status, "blocked");
    assert.equal(
      publishing?.affectedItems.some((item) => item.kind === "template"),
      true,
    );
    assert.equal(
      publishing?.affectedItems.some((item) => item.kind === "schedule"),
      true,
    );

    const assets = center.dryRunReports.find(
      (report) => report.domain === "assets",
    );
    assert.equal(assets?.status, "review");
    assert.equal(
      assets?.plannedActions.some((action) =>
        action.includes("Attach source and license metadata"),
      ),
      true,
    );

    const approvals = center.dryRunReports.find(
      (report) => report.domain === "approvals",
    );
    assert.equal(approvals?.status, "blocked");
    assert.equal(
      approvals?.affectedItems.some((item) => item.id === "review-overdue"),
      true,
    );

    const retention = center.dryRunReports.find(
      (report) => report.domain === "retention",
    );
    assert.equal(retention?.status, "blocked");
    assert.equal(
      retention?.plannedActions.some((action) =>
        action.includes("Preserve legal hold"),
      ),
      true,
    );

    assert.equal(
      center.enforcementPacket.download.fileName,
      "policy-as-code-dry-run-packet.json",
    );
    assert.equal(
      center.enforcementPacket.download.href.startsWith(
        "data:application/json",
      ),
      true,
    );
    assert.equal(center.nextActions.length > 0, true);
  });

  test("keeps policy dry-runs ready when governed work has clean evidence", () => {
    const center = createPolicyAsCodeGovernanceCenter({
      projects: [
        createProject({
          id: "project-ready",
          name: "Ready launch",
          publicShareId: "public-ready",
          editShareId: "edit-ready",
          editSharePermission: "comment",
          approvalStatus: "approved",
          updatedAt: "2026-05-15T09:00:00.000Z",
        }),
      ],
      templates: [
        createTemplate({
          id: "template-ready",
          name: "Approved launch kit",
          marketplaceStatus: "published",
          approvalStatus: "approved",
        }),
      ],
      contentScheduleItems: [
        createContentItem({
          id: "content-ready",
          projectId: "project-ready",
          projectName: "Ready launch",
          title: "Ready launch post",
          channel: "LinkedIn",
          caption: "Launch copy approved by the workspace.",
          status: "planned",
        }),
      ],
      assetAudit: createAssetAudit({
        records: [
          {
            id: "asset-ready",
            name: "Approved logo",
            scope: "uploads",
            scopeLabel: "Uploads",
            mimeType: "image/png",
            sizeBytes: 24000,
            updatedAt: "2026-05-15T09:00:00.000Z",
            previewUrl: null,
            href: null,
            referenceCount: null,
            skippedReferenceCount: null,
            duplicateKey: null,
            sourceProvider: "Workspace library",
            sourceUrl: "https://example.com/license",
            authorName: "Essence Studio",
            licenseName: "Internal approved asset",
            licenseUrl: "https://example.com/license",
          },
        ],
      }),
      reviewTasks: [
        createReviewTask({
          id: "review-ready",
          projectId: "project-ready",
          projectName: "Ready launch",
          taskStatus: "done",
          taskAssigneeName: "Rina",
          taskDueAt: "2026-05-20T09:00:00.000Z",
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "approval-ready",
          action: "approval.updated",
          targetId: "project-ready",
          summary: "Ready launch approved",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.blockedRules, 0);
    assert.equal(center.totals.reviewRules, 0);
    assert.equal(center.totals.violations, 0);
    assert.deepEqual(center.nextActions, []);
    assert.equal(
      center.dryRunReports.every((report) => report.status === "ready"),
      true,
    );
  });
});

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project",
    name: "Project",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "view",
    approvalStatus: "draft",
    starred: false,
    deletedAt: null,
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-05-17T09:00:00.000Z",
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template",
    name: "Template",
    creatorName: "Essence",
    creatorEmail: "team@example.com",
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: true,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "draft",
    marketplaceCollection: null,
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: null,
    marketplaceUseCount: 0,
    marketplaceViewCount: 0,
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-05-17T09:00:00.000Z",
    ...overrides,
  };
}

function createContentItem(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "content",
    projectId: "project",
    projectName: "Project",
    title: "Content",
    channel: "LinkedIn",
    caption: "Caption",
    status: "planned",
    scheduledAt: "2026-05-19T09:00:00.000Z",
    createdAt: "2026-05-17T09:00:00.000Z",
    updatedAt: "2026-05-17T09:00:00.000Z",
    ...overrides,
  };
}

function createReviewTask(
  overrides: Partial<ReviewTaskSummary> = {},
): ReviewTaskSummary {
  return {
    id: "review",
    projectId: "project",
    projectName: "Project",
    pageId: "page",
    elementId: null,
    authorName: "Reviewer",
    body: "Review this design",
    resolved: false,
    taskStatus: "todo",
    taskAssigneeName: "Reviewer",
    taskDueAt: "2026-05-20T09:00:00.000Z",
    createdAt: "2026-05-15T09:00:00.000Z",
    updatedAt: "2026-05-15T09:00:00.000Z",
    ...overrides,
  };
}

function createAssetAudit(
  overrides: Partial<AssetLibraryAudit> = {},
): AssetLibraryAudit {
  return {
    quotaBytes: 250_000_000,
    totalBytes: 48000,
    usagePercent: 0.02,
    assetCount: 1,
    duplicateCount: 0,
    duplicateBytes: 0,
    projectManifestCount: 0,
    skippedProjectReferenceCount: 0,
    scopes: [
      {
        scope: "uploads",
        label: "Uploads",
        count: 1,
        totalBytes: 48000,
      },
    ],
    records: [
      {
        id: "asset-unlicensed",
        name: "Unlicensed launch image",
        scope: "uploads",
        scopeLabel: "Uploads",
        mimeType: "image/png",
        sizeBytes: 48000,
        updatedAt: "2026-05-15T09:00:00.000Z",
        previewUrl: null,
        href: null,
        referenceCount: null,
        skippedReferenceCount: null,
        duplicateKey: null,
        sourceProvider: null,
        sourceUrl: null,
        authorName: null,
        licenseName: null,
        licenseUrl: null,
      },
    ],
    largestAssets: [],
    duplicateGroups: [],
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit",
    action: "approval.updated",
    targetType: "project",
    targetId: "project",
    summary: "Audit event",
    actorEmail: "admin@example.com",
    metadata: {},
    createdAt: "2026-05-17T09:00:00.000Z",
    ...overrides,
  };
}
