import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { AdminDashboardData } from "@/db/admin-dashboard";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import { createAssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import { createAdminOperationsCenter } from "@/features/admin/admin-operations-center";
import type { WebsitePublishSummary } from "@/db/website-publishing";

const now = new Date("2026-05-16T12:00:00.000Z");

describe("admin operations center", () => {
  test("reports ready operations when moderation queues are empty", () => {
    const center = createAdminOperationsCenter({
      adminData: createAdminData(),
      assetAudit: createAssetLibraryAudit({
        uploads: [],
        brandLogos: [],
        projectManifests: [],
      }),
      websitePublishes: [createWebsitePublish()],
      serverExportJobs: [createExportJob({ status: "completed" })],
      auditLogs: [createAuditLog({ action: "template.marketplace.updated" })],
      now,
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.queueItems, 0);
    assert.equal(center.totals.availableBulkActions, 0);
    assert.equal(center.areas.length, 5);
  });

  test("blocks operations when every moderation area has high severity work", () => {
    const center = createAdminOperationsCenter({
      adminData: createAdminData({
        templates: [
          {
            ...createAdminData().templates[0],
            approvalStatus: "changes-requested",
            marketplaceStatus: "published",
          },
        ],
        emails: [
          {
            id: "email-1",
            recipient: "user@example.com",
            subject: "Verify account",
            purpose: "verification",
            deliveryStatus: "failed",
            errorMessage: "Provider rejected the message.",
            createdAt: "2026-05-16T10:00:00.000Z",
          },
        ],
      }),
      assetAudit: createAssetLibraryAudit({
        uploads: [
          createStoredAsset({ id: "asset-1", dataUrl: "data:image/png,a" }),
          createStoredAsset({ id: "asset-2", dataUrl: "data:image/png,a" }),
        ],
        brandLogos: [],
        projectManifests: [],
      }),
      websitePublishes: [
        createWebsitePublish({
          customDomains: [
            {
              id: "domain-1",
              publishId: "publish-1",
              projectId: "project-1",
              domain: "example.com",
              status: "pending",
              verificationName: "_essence.example.com",
              verificationValue: "token",
              verifiedAt: null,
              platformStatus: "error",
              platformError: "Domain is not attached.",
              platformAttachedAt: null,
              createdAt: "2026-05-16T00:00:00.000Z",
              updatedAt: "2026-05-16T10:00:00.000Z",
            },
          ],
        }),
      ],
      serverExportJobs: [
        createExportJob({
          status: "failed",
          failureMessage: "Renderer crashed.",
        }),
      ],
      auditLogs: [],
      now,
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.highSeverity, 5);
    assert.ok(center.totals.availableBulkActions > 0);
    assert.ok(center.nextActions.length > 0);
  });
});

function createAdminData(
  overrides: Partial<AdminDashboardData> = {},
): AdminDashboardData {
  return {
    users: [],
    sessions: [],
    emails: [],
    projects: [],
    templates: [
      {
        id: "template-1",
        userId: "user-1",
        name: "Launch template",
        width: 1080,
        height: 1080,
        approvalStatus: "approved",
        marketplaceStatus: "published",
        marketplaceCollection: "launch",
        marketplaceSeason: null,
        marketplaceReviewNote: "",
        marketplacePublishedAt: "2026-05-16T00:00:00.000Z",
        marketplaceUseCount: 1,
        marketplaceViewCount: 1,
        updatedAt: "2026-05-16T00:00:00.000Z",
      },
    ],
    health: {
      checkedAt: "2026-05-16T00:00:00.000Z",
      status: "healthy",
      groups: [],
    },
    ...overrides,
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "publish-1",
    projectId: "project-1",
    projectName: "Launch site",
    slug: "launch",
    title: "Launch site",
    seoTitle: "Launch site",
    seoDescription: "Launch details",
    status: "published",
    publishedAt: "2026-05-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    viewCount: 1,
    clickCount: 1,
    lastAnalyticsAt: "2026-05-16T00:00:00.000Z",
    customDomains: [],
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export-1",
    projectId: "project-1",
    projectName: "Launch design",
    format: "png",
    formatLabel: "PNG",
    fileName: "launch.png",
    status: "completed",
    progress: 100,
    artifactName: "launch.png",
    artifactMimeType: "image/png",
    artifactSizeBytes: 100,
    artifactDataUrl: null,
    failureMessage: null,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    completedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createStoredAsset(input: {
  id: string;
  dataUrl: string;
}) {
  return {
    id: input.id,
    name: input.id,
    mimeType: "image/png",
    dataUrl: input.dataUrl,
    sizeBytes: 2_000_000,
    updatedAt: "2026-05-16T00:00:00.000Z",
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "template.marketplace.updated",
    targetType: "template",
    targetId: "template-1",
    summary: "Updated template moderation state.",
    actorEmail: "admin@example.com",
    metadata: {},
    createdAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}
