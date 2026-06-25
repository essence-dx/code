import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { AuthEmailSummary } from "@/db/auth-emails";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import { createProductionObservabilityReport } from "@/features/observability/production-observability";

const now = new Date("2026-05-16T12:00:00.000Z");

describe("production observability", () => {
  test("stays healthy when production signals are inside guardrails", () => {
    const report = createProductionObservabilityReport({
      exportJobs: [createExportJob({ status: "completed", progress: 100 })],
      authEmails: [createEmail({ deliveryStatus: "sent" })],
      websitePublishes: [createPublish()],
      assetAudit: createAssetAudit(),
      reviewTasks: [],
      projects: [],
      now,
    });

    assert.equal(report.status, "healthy");
    assert.equal(report.totals.incidents, 0);
    assert.equal(report.totals.critical, 0);
    assert.equal(report.groups.length, 5);
  });

  test("promotes failed exports, failed emails, and domain errors to critical", () => {
    const report = createProductionObservabilityReport({
      exportJobs: [
        createExportJob({
          id: "export-failed",
          status: "failed",
          failureMessage: "Renderer crashed",
        }),
      ],
      authEmails: [
        createEmail({
          id: "email-failed",
          deliveryStatus: "failed",
          errorMessage: "Brevo rejected the request",
        }),
      ],
      websitePublishes: [
        createPublish({
          customDomains: [
            createDomain({
              id: "domain-error",
              platformStatus: "error",
              platformError: "Vercel returned HTTP 403.",
            }),
          ],
        }),
      ],
      assetAudit: createAssetAudit(),
      reviewTasks: [],
      projects: [],
      now,
    });

    assert.equal(report.status, "critical");
    assert.equal(report.totals.critical, 3);
  });

  test("tracks storage growth and collaboration conflict pressure", () => {
    const report = createProductionObservabilityReport({
      exportJobs: [],
      authEmails: [],
      websitePublishes: [],
      assetAudit: createAssetAudit({
        usagePercent: 82,
        duplicateCount: 2,
        duplicateBytes: 2048,
      }),
      reviewTasks: [
        createReviewTask({
          taskDueAt: "2026-05-15T00:00:00.000Z",
          taskStatus: "todo",
        }),
      ],
      projects: [
        createProject({ editShareId: "edit-1", editSharePermission: "edit" }),
      ],
      now,
    });

    assert.equal(report.status, "critical");
    assert.equal(
      report.groups.find((group) => group.id === "storage")?.status,
      "watch",
    );
    assert.equal(
      report.groups.find((group) => group.id === "collaboration")?.status,
      "critical",
    );
  });
});

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export-1",
    projectId: "project-1",
    projectName: "Launch project",
    format: "pdf",
    formatLabel: "PDF",
    fileName: "launch.pdf",
    status: "completed",
    progress: 100,
    artifactName: "launch.pdf",
    artifactMimeType: "application/pdf",
    artifactSizeBytes: 1000,
    artifactDataUrl: null,
    failureMessage: null,
    createdAt: "2026-05-16T11:59:00.000Z",
    updatedAt: "2026-05-16T12:00:00.000Z",
    completedAt: "2026-05-16T12:00:00.000Z",
    ...overrides,
  };
}

function createEmail(overrides: Partial<AuthEmailSummary> = {}): AuthEmailSummary {
  return {
    id: "email-1",
    subject: "Test email",
    purpose: "email-test",
    deliveryStatus: "sent",
    previewUrl: null,
    errorMessage: null,
    sentAt: "2026-05-16T12:00:00.000Z",
    createdAt: "2026-05-16T11:59:00.000Z",
    ...overrides,
  };
}

function createPublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "publish-1",
    projectId: "project-1",
    projectName: "Launch project",
    slug: "launch",
    title: "Launch",
    seoTitle: "Launch",
    seoDescription: "Launch page",
    status: "published",
    publishedAt: "2026-05-16T12:00:00.000Z",
    createdAt: "2026-05-16T11:00:00.000Z",
    updatedAt: "2026-05-16T12:00:00.000Z",
    viewCount: 0,
    clickCount: 0,
    lastAnalyticsAt: null,
    customDomains: [],
    ...overrides,
  };
}

function createDomain(
  overrides: Partial<WebsitePublishSummary["customDomains"][number]> = {},
): WebsitePublishSummary["customDomains"][number] {
  return {
    id: "domain-1",
    publishId: "publish-1",
    projectId: "project-1",
    domain: "example.com",
    status: "verified",
    verificationName: "_essence",
    verificationValue: "token",
    verifiedAt: "2026-05-16T12:00:00.000Z",
    platformStatus: "attached",
    platformError: null,
    platformAttachedAt: "2026-05-16T12:00:00.000Z",
    createdAt: "2026-05-16T11:00:00.000Z",
    updatedAt: "2026-05-16T12:00:00.000Z",
    ...overrides,
  };
}

function createAssetAudit(
  overrides: Partial<AssetLibraryAudit> = {},
): AssetLibraryAudit {
  return {
    quotaBytes: 1000,
    totalBytes: 100,
    usagePercent: 10,
    assetCount: 1,
    duplicateCount: 0,
    duplicateBytes: 0,
    projectManifestCount: 0,
    skippedProjectReferenceCount: 0,
    scopes: [],
    records: [],
    largestAssets: [],
    duplicateGroups: [],
    ...overrides,
  };
}

function createReviewTask(
  overrides: Partial<ReviewTaskSummary> = {},
): ReviewTaskSummary {
  return {
    id: "task-1",
    projectId: "project-1",
    projectName: "Launch project",
    pageId: "page-1",
    elementId: null,
    authorName: "Reviewer",
    body: "Please resolve this.",
    resolved: false,
    taskStatus: "todo",
    taskAssigneeName: "Designer",
    taskDueAt: null,
    createdAt: "2026-05-16T11:00:00.000Z",
    updatedAt: "2026-05-16T11:00:00.000Z",
    ...overrides,
  };
}

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch project",
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
    updatedAt: "2026-05-16T12:00:00.000Z",
    createdAt: "2026-05-16T11:00:00.000Z",
    ...overrides,
  };
}
