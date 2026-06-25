import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  AssetAuditRecord,
  AssetLibraryAudit,
} from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import { createDataResidencyExportControlsCenter } from "@/features/compliance/data-residency-export-controls";

describe("data residency and export controls", () => {
  test("builds region previews, restricted asset checks, and evidence packets", () => {
    const center = createDataResidencyExportControlsCenter({
      projects: [
        createProject({
          id: "project-eu-launch",
          name: "EU client launch",
          approvalStatus: "approved",
        }),
      ],
      assetAudit: createAssetAudit({
        records: [
          createAsset({
            id: "asset-editorial",
            name: "Editorial restricted launch photo",
            licenseName: "Editorial use only",
            sourceProvider: "External stock",
            sourceUrl: "https://stock.example.com/photo",
            licenseUrl: "https://stock.example.com/license",
          }),
        ],
      }),
      serverExportJobs: [
        createExportJob({
          id: "export-us-video",
          projectId: "project-eu-launch",
          projectName: "EU client launch",
          format: "mp4",
          formatLabel: "MP4",
          status: "completed",
          artifactDataUrl: "data:video/mp4;base64,AAAA",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          id: "publish-apac",
          projectId: "project-eu-launch",
          projectName: "EU client launch",
          customDomains: [
            createDomain({
              id: "domain-sg",
              domain: "launch.example.sg",
              status: "verified",
            }),
          ],
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-export",
          action: "export.completed",
          targetId: "export-us-video",
          summary: "MP4 export completed",
        }),
      ],
      policy: {
        homeRegion: "eu",
        allowedRegions: ["eu"],
        exportRegionByJobId: {
          "export-us-video": "us",
        },
      },
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.allowedRegions, 1);
    assert.equal(center.totals.blockedControls, 4);
    assert.equal(center.totals.restrictedAssets, 1);
    assert.equal(center.totals.exportReports, 1);

    const exportPreview = center.regionPolicyPreviews.find(
      (preview) => preview.id === "export-export-us-video",
    );
    assert.equal(exportPreview?.status, "blocked");
    assert.equal(exportPreview?.detectedRegion, "us");
    assert.equal(
      exportPreview?.evidence.some((item) =>
        item.includes("outside allowed regions"),
      ),
      true,
    );

    const domainPreview = center.regionPolicyPreviews.find(
      (preview) => preview.id === "domain-domain-sg",
    );
    assert.equal(domainPreview?.status, "blocked");
    assert.equal(domainPreview?.detectedRegion, "apac");

    const assetCheck = center.restrictedAssetChecks[0];
    assert.equal(assetCheck?.status, "blocked");
    assert.equal(assetCheck?.assetName, "Editorial restricted launch photo");
    assert.equal(
      assetCheck?.restrictions.some((restriction) =>
        restriction.includes("Editorial"),
      ),
      true,
    );

    assert.equal(center.complianceEvidencePacket.status, "blocked");
    assert.equal(
      center.complianceEvidencePacket.download.fileName,
      "data-residency-export-controls-packet.json",
    );
    assert.equal(
      center.complianceEvidencePacket.download.href.startsWith(
        "data:application/json",
      ),
      true,
    );
    assert.equal(
      center.nextActions.some((action) =>
        action.includes("EU client launch"),
      ),
      true,
    );
  });

  test("stays ready when regions, assets, and exports match policy", () => {
    const center = createDataResidencyExportControlsCenter({
      projects: [
        createProject({
          id: "project-ready",
          name: "Ready regional launch",
          approvalStatus: "approved",
        }),
      ],
      assetAudit: createAssetAudit({
        records: [
          createAsset({
            id: "asset-ready",
            name: "Approved logo",
            licenseName: "Internal approved asset",
            sourceProvider: "Workspace library",
            sourceUrl: "https://example.eu/assets/logo",
            authorName: "Essence Studio",
            licenseUrl: "https://example.eu/license",
          }),
        ],
      }),
      serverExportJobs: [
        createExportJob({
          id: "export-ready-pdf",
          projectId: "project-ready",
          projectName: "Ready regional launch",
          format: "pdf",
          formatLabel: "PDF",
          status: "completed",
          artifactDataUrl: "data:application/pdf;base64,AAAA",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          id: "publish-ready",
          projectId: "project-ready",
          projectName: "Ready regional launch",
          customDomains: [
            createDomain({
              id: "domain-ready",
              domain: "ready.example.eu",
              status: "verified",
            }),
          ],
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-ready",
          action: "website.domain.verified",
          targetId: "project-ready",
          summary: "Domain verified",
        }),
      ],
      policy: {
        homeRegion: "eu",
        allowedRegions: ["eu"],
        exportRegionByJobId: {
          "export-ready-pdf": "eu",
        },
      },
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.blockedControls, 0);
    assert.equal(center.totals.reviewControls, 0);
    assert.equal(center.totals.restrictedAssets, 0);
    assert.equal(center.nextActions.length, 0);
    assert.equal(
      center.regionPolicyPreviews.every((preview) => preview.status === "ready"),
      true,
    );
    assert.equal(
      center.exportControlReports.every((report) => report.status === "ready"),
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
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-05-17T09:00:00.000Z",
    ...overrides,
  };
}

function createAsset(overrides: Partial<AssetAuditRecord> = {}): AssetAuditRecord {
  return {
    id: "asset",
    name: "Asset",
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
    sourceProvider: "Workspace library",
    sourceUrl: "https://example.eu/asset",
    authorName: "Essence Studio",
    licenseName: "Internal approved asset",
    licenseUrl: "https://example.eu/license",
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
    projectManifestCount: 1,
    skippedProjectReferenceCount: 0,
    scopes: [
      {
        scope: "uploads",
        label: "Uploads",
        count: 1,
        totalBytes: 48000,
      },
    ],
    records: [createAsset()],
    largestAssets: [],
    duplicateGroups: [],
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
    format: "pdf",
    formatLabel: "PDF",
    fileName: "project.pdf",
    status: "completed",
    progress: 100,
    artifactName: "project.pdf",
    artifactMimeType: "application/pdf",
    artifactSizeBytes: 120000,
    artifactDataUrl: "data:application/pdf;base64,AAAA",
    failureMessage: null,
    createdAt: "2026-05-17T09:00:00.000Z",
    updatedAt: "2026-05-17T09:30:00.000Z",
    completedAt: "2026-05-17T09:30:00.000Z",
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
    seoDescription: "Project description",
    status: "published",
    publishedAt: "2026-05-17T09:00:00.000Z",
    createdAt: "2026-05-17T09:00:00.000Z",
    updatedAt: "2026-05-17T09:00:00.000Z",
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
    id: "domain",
    publishId: "publish",
    projectId: "project",
    domain: "project.example.eu",
    status: "verified",
    verificationName: "_essence",
    verificationValue: "token",
    verifiedAt: "2026-05-17T09:00:00.000Z",
    platformStatus: "attached",
    platformError: null,
    platformAttachedAt: "2026-05-17T09:00:00.000Z",
    createdAt: "2026-05-17T09:00:00.000Z",
    updatedAt: "2026-05-17T09:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit",
    action: "website.domain.verified",
    targetType: "project",
    targetId: "project",
    summary: "Audit event",
    actorEmail: "admin@example.com",
    metadata: {},
    createdAt: "2026-05-17T09:00:00.000Z",
    ...overrides,
  };
}
