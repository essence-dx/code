import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ContentScheduleSummary } from "@/db/content-planner";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import { createPolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";
import { createPublishExportReleaseGateCenter } from "@/features/operations/publish-export-release-gates";

describe("publish/export release gates", () => {
  test("connects policy exceptions to export and publish gates with override requests and approval evidence", () => {
    const project = createProject({
      id: "project-draft",
      name: "Launch draft",
      approvalStatus: "draft",
      publicShareId: "public-launch",
      editShareId: "edit-launch",
      editSharePermission: "edit",
    });
    const template = createTemplate({
      id: "template-live-draft",
      name: "Live draft template",
      approvalStatus: "draft",
      marketplaceStatus: "published",
    });
    const scheduleItem = createContentItem({
      id: "schedule-no-caption",
      projectId: project.id,
      projectName: project.name,
      title: "Launch social post",
      caption: "",
      status: "planned",
    });
    const exportJob = createExportJob({
      id: "export-failed",
      projectId: project.id,
      projectName: project.name,
      status: "failed",
      progress: 80,
      failureMessage: "Canvas render timeout",
    });
    const publish = createWebsitePublish({
      id: "publish-draft",
      projectId: project.id,
      projectName: project.name,
      status: "published",
      customDomains: [
        createCustomDomain({
          id: "domain-error",
          publishId: "publish-draft",
          projectId: project.id,
          platformStatus: "error",
          platformError: "Vercel attachment failed",
        }),
      ],
    });
    const auditLogs = [
      createAuditLog({
        id: "override-schedule",
        action: "release.override.requested",
        targetType: "schedule",
        targetId: scheduleItem.id,
        summary: "Requested release override for missing caption.",
        metadata: {
          affectedItemId: scheduleItem.id,
          policyDomain: "publishing",
          gateId: "policy-decisions",
        },
      }),
      createAuditLog({
        id: "project-approval",
        action: "approval.updated",
        targetType: "project",
        targetId: project.id,
        summary: "Project approval reviewed.",
      }),
    ];
    const policyAsCode = createPolicyAsCodeGovernanceCenter({
      projects: [project],
      templates: [template],
      contentScheduleItems: [scheduleItem],
      assetAudit: createAssetAudit(),
      reviewTasks: [],
      auditLogs,
      now: "2026-05-18T10:00:00.000Z",
    });

    const center = createPublishExportReleaseGateCenter({
      projects: [project],
      templates: [template],
      contentScheduleItems: [scheduleItem],
      serverExportJobs: [exportJob],
      websitePublishes: [publish],
      policyAsCode,
      auditLogs,
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(
      center.gates.find((gate) => gate.id === "policy-decisions")?.status,
      "blocked",
    );
    assert.equal(
      center.gates.find((gate) => gate.id === "export-readiness")?.status,
      "blocked",
    );
    assert.equal(
      center.gates.find((gate) => gate.id === "publish-readiness")?.status,
      "blocked",
    );
    assert.equal(center.totals.policyExceptions > 0, true);
    assert.equal(center.totals.blockedGates > 0, true);
    assert.equal(
      center.overrideRequests.some(
        (request) =>
          request.affectedItemId === scheduleItem.id &&
          request.status === "requested" &&
          request.auditLogIds.includes("override-schedule"),
      ),
      true,
    );
    assert.equal(
      center.approvalEvidence.some(
        (evidence) =>
          evidence.subjectId === project.id &&
          evidence.auditLogId === "project-approval",
      ),
      true,
    );
    assert.equal(
      center.releasePacket.payload.overrideRequests.some(
        (request) => request.affectedItemId === scheduleItem.id,
      ),
      true,
    );
  });

  test("returns ready when policy, export artifacts, publishing surfaces, and approval audit evidence are clean", () => {
    const project = createProject({
      id: "project-ready",
      name: "Approved launch",
      approvalStatus: "approved",
      publicShareId: "public-ready",
      editShareId: "edit-ready",
      editSharePermission: "comment",
    });
    const template = createTemplate({
      id: "template-ready",
      name: "Approved template",
      approvalStatus: "approved",
      marketplaceStatus: "published",
    });
    const scheduleItem = createContentItem({
      id: "schedule-ready",
      projectId: project.id,
      projectName: project.name,
      title: "Approved social post",
      caption: "Launch copy approved for publishing.",
      status: "planned",
    });
    const exportJob = createExportJob({
      id: "export-ready",
      projectId: project.id,
      projectName: project.name,
      status: "completed",
      progress: 100,
      artifactDataUrl: "data:image/png;base64,aGVsbG8=",
      completedAt: "2026-05-18T09:30:00.000Z",
      updatedAt: "2026-05-18T09:30:00.000Z",
    });
    const publish = createWebsitePublish({
      id: "publish-ready",
      projectId: project.id,
      projectName: project.name,
      status: "published",
      customDomains: [
        createCustomDomain({
          id: "domain-ready",
          publishId: "publish-ready",
          projectId: project.id,
          status: "verified",
          platformStatus: "attached",
          platformAttachedAt: "2026-05-18T09:20:00.000Z",
          verifiedAt: "2026-05-18T09:15:00.000Z",
        }),
      ],
    });
    const auditLogs = [
      createAuditLog({
        id: "approval-ready",
        action: "approval.updated",
        targetType: "project",
        targetId: project.id,
        summary: "Approved launch project.",
      }),
      createAuditLog({
        id: "publish-ready-log",
        action: "website.published",
        targetType: "website",
        targetId: publish.id,
        summary: "Published approved launch website.",
        metadata: { projectId: project.id },
      }),
    ];
    const policyAsCode = createPolicyAsCodeGovernanceCenter({
      projects: [project],
      templates: [template],
      contentScheduleItems: [scheduleItem],
      assetAudit: createAssetAudit(),
      reviewTasks: [],
      auditLogs,
      now: "2026-05-18T10:00:00.000Z",
    });

    const center = createPublishExportReleaseGateCenter({
      projects: [project],
      templates: [template],
      contentScheduleItems: [scheduleItem],
      serverExportJobs: [exportJob],
      websitePublishes: [publish],
      policyAsCode,
      auditLogs,
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(
      center.gates.every((gate) => gate.status === "ready"),
      true,
    );
    assert.equal(center.overrideRequests.length, 0);
    assert.equal(center.approvalEvidence.length, 1);
    assert.deepEqual(center.nextActions, []);
    assert.equal(
      center.releasePacket.dataUrl.startsWith(
        "data:application/json;charset=utf-8",
      ),
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
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-17T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
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
    createdAt: "2026-05-17T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createContentItem(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "schedule",
    projectId: "project",
    projectName: "Project",
    title: "Content",
    channel: "LinkedIn",
    caption: "Caption",
    status: "planned",
    scheduledAt: "2026-05-19T09:00:00.000Z",
    createdAt: "2026-05-17T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export",
    projectId: "project",
    projectName: "Project",
    format: "png",
    formatLabel: "PNG",
    fileName: "project.png",
    status: "completed",
    progress: 100,
    artifactName: "project.png",
    artifactMimeType: "image/png",
    artifactSizeBytes: 2048,
    artifactDataUrl: "data:image/png;base64,aGVsbG8=",
    failureMessage: null,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:10:00.000Z",
    completedAt: "2026-05-18T09:10:00.000Z",
    ...overrides,
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "publish",
    projectId: "project",
    projectName: "Project",
    slug: "project",
    title: "Project",
    seoTitle: "Project",
    seoDescription: "Project launch page",
    status: "published",
    publishedAt: "2026-05-18T09:15:00.000Z",
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:15:00.000Z",
    viewCount: 0,
    clickCount: 0,
    lastAnalyticsAt: null,
    customDomains: [],
    ...overrides,
  };
}

function createCustomDomain(
  overrides: Partial<WebsitePublishSummary["customDomains"][number]> = {},
): WebsitePublishSummary["customDomains"][number] {
  return {
    id: "domain",
    publishId: "publish",
    projectId: "project",
    domain: "example.com",
    status: "pending",
    verificationName: "_essence",
    verificationValue: "verify-token",
    verifiedAt: null,
    platformStatus: "manual",
    platformError: null,
    platformAttachedAt: null,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
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
        id: "asset-ready",
        name: "Approved logo",
        scope: "uploads",
        scopeLabel: "Uploads",
        mimeType: "image/png",
        sizeBytes: 48000,
        updatedAt: "2026-05-17T09:00:00.000Z",
        previewUrl: null,
        href: null,
        referenceCount: 1,
        skippedReferenceCount: 0,
        duplicateKey: null,
        sourceProvider: "Workspace library",
        sourceUrl: "https://example.com/source",
        authorName: "Essence",
        licenseName: "Internal approved asset",
        licenseUrl: "https://example.com/license",
      },
    ],
    largestAssets: [
      {
        id: "asset-ready",
        name: "Approved logo",
        scope: "uploads",
        scopeLabel: "Uploads",
        mimeType: "image/png",
        sizeBytes: 48000,
        updatedAt: "2026-05-17T09:00:00.000Z",
        previewUrl: null,
        href: null,
        referenceCount: 1,
        skippedReferenceCount: 0,
        duplicateKey: null,
        sourceProvider: "Workspace library",
        sourceUrl: "https://example.com/source",
        authorName: "Essence",
        licenseName: "Internal approved asset",
        licenseUrl: "https://example.com/license",
      },
    ],
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
    summary: "Approval updated.",
    actorEmail: "admin@example.com",
    metadata: {},
    createdAt: "2026-05-18T09:20:00.000Z",
    ...overrides,
  };
}
