import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createAssetLibraryAudit } from "@/features/assets/asset-library-audit";
import { createCreativeAssetIntelligenceCenter } from "@/features/assets/creative-asset-intelligence";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type { WebsitePublishSummary } from "@/db/website-publishing";

describe("creative asset intelligence", () => {
  test("creates recommendations, cleanup previews, dependency simulations, and remediation packets", () => {
    const project = createProject({
      id: "project-launch",
      name: "Launch campaign",
      publicShareId: "public-launch",
    });
    const audit = createAssetLibraryAudit({
      uploads: [
        createStoredAsset({
          id: "upload-new",
          name: "Repeated hero",
          updatedAt: "2026-05-18T10:00:00.000Z",
          sourceProvider: "Unsplash",
          sourceUrl: "https://example.com/source",
          authorName: "Studio",
          licenseName: "Internal approved asset",
          licenseUrl: "https://example.com/license",
        }),
        createStoredAsset({
          id: "upload-old",
          name: "Repeated hero copy",
          updatedAt: "2026-05-10T10:00:00.000Z",
          sourceProvider: "Unsplash",
          sourceUrl: "https://example.com/source",
          authorName: "Studio",
          licenseName: "Internal approved asset",
          licenseUrl: "https://example.com/license",
        }),
        createStoredAsset({
          id: "missing-license",
          name: "Unverified launch photo",
          dataUrl: "data:image/jpeg;base64,BBBB",
          sizeBytes: 24000,
        }),
      ],
      brandLogos: [
        createStoredAsset({
          id: "brand-logo",
          name: "Primary logo",
          dataUrl: "data:image/svg+xml;base64,CCCC",
          mimeType: "image/svg+xml",
          sourceProvider: "Brand library",
          sourceUrl: "https://example.com/brand",
          authorName: "Essence",
          licenseName: "Internal workspace asset",
          licenseUrl: "https://example.com/brand-license",
        }),
      ],
      projectManifests: [
        {
          projectId: project.id,
          projectName: project.name,
          totalBytes: 64000,
          entryCount: 5,
          skippedReferenceCount: 2,
          updatedAt: "2026-05-18T09:00:00.000Z",
        },
      ],
    });

    const center = createCreativeAssetIntelligenceCenter({
      audit,
      projects: [project],
      templates: [createTemplate({ name: project.name })],
      serverExportJobs: [
        createExportJob({
          projectId: project.id,
          projectName: project.name,
          status: "failed",
          failureMessage: "Missing asset reference",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          projectId: project.id,
          projectName: project.name,
          status: "published",
        }),
      ],
      now: "2026-05-18T12:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.duplicateGroups, 1);
    assert.equal(center.totals.licenseGaps > 0, true);
    assert.equal(center.totals.dependencyRisks > 0, true);
    assert.equal(
      center.recommendations.some(
        (recommendation) => recommendation.kind === "duplicate-cleanup",
      ),
      true,
    );
    assert.equal(
      center.recommendations.some(
        (recommendation) => recommendation.kind === "license-remediation",
      ),
      true,
    );

    const duplicatePreview = center.batchCleanupPreviews[0];
    assert.equal(duplicatePreview?.retainAssetId, "upload-new");
    assert.deepEqual(duplicatePreview?.removableAssetIds, ["upload-old"]);
    assert.equal((duplicatePreview?.reclaimBytes ?? 0) > 0, true);

    const impact = center.dependencyImpactSimulations.find(
      (simulation) => simulation.assetId === project.id,
    );
    assert.equal(impact?.affectedProjects[0]?.projectId, project.id);
    assert.equal(impact?.affectedExports.length, 1);
    assert.equal(impact?.affectedWebsites.length, 1);
    assert.equal(impact?.warnings.length > 0, true);

    assert.equal(
      center.remediationPacket.dataUrl.startsWith(
        "data:application/json;charset=utf-8",
      ),
      true,
    );
    assert.equal(
      center.remediationPacket.payload.recommendations.length > 0,
      true,
    );
    assert.equal(center.nextActions.length > 0, true);
  });

  test("scores a clean, licensed, referenced asset library as ready", () => {
    const project = createProject({
      id: "project-ready",
      name: "Ready campaign",
      publicShareId: "public-ready",
    });
    const audit = createAssetLibraryAudit({
      uploads: [
        createStoredAsset({
          id: "tracked-upload",
          name: "Tracked upload",
          dataUrl: "data:image/jpeg;base64,DDDD",
          sourceProvider: "Workspace library",
          sourceUrl: "https://example.com/source",
          authorName: "Essence",
          licenseName: "Internal approved asset",
          licenseUrl: "https://example.com/license",
        }),
      ],
      brandLogos: [
        createStoredAsset({
          id: "brand-logo",
          name: "Primary logo",
          dataUrl: "data:image/svg+xml;base64,EEEE",
          mimeType: "image/svg+xml",
          sourceProvider: "Brand library",
          sourceUrl: "https://example.com/brand",
          authorName: "Essence",
          licenseName: "Internal workspace asset",
          licenseUrl: "https://example.com/brand-license",
        }),
      ],
      projectManifests: [
        {
          projectId: project.id,
          projectName: project.name,
          totalBytes: 32000,
          entryCount: 3,
          skippedReferenceCount: 0,
          updatedAt: "2026-05-18T09:00:00.000Z",
        },
      ],
    });

    const center = createCreativeAssetIntelligenceCenter({
      audit,
      projects: [project],
      templates: [createTemplate({ name: project.name })],
      serverExportJobs: [
        createExportJob({
          projectId: project.id,
          projectName: project.name,
          status: "completed",
          artifactDataUrl: "data:image/png;base64,aGVsbG8=",
        }),
      ],
      websitePublishes: [
        createWebsitePublish({
          projectId: project.id,
          projectName: project.name,
          status: "published",
        }),
      ],
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.duplicateGroups, 0);
    assert.equal(center.totals.licenseGaps, 0);
    assert.equal(center.totals.dependencyRisks, 0);
    assert.deepEqual(center.batchCleanupPreviews, []);
    assert.deepEqual(center.nextActions, []);
  });
});

function createStoredAsset(input: {
  id: string;
  name: string;
  dataUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  updatedAt?: string;
  sourceProvider?: string;
  sourceUrl?: string;
  authorName?: string;
  licenseName?: string;
  licenseUrl?: string;
}) {
  return {
    id: input.id,
    name: input.name,
    mimeType: input.mimeType ?? "image/png",
    dataUrl: input.dataUrl ?? "data:image/png;base64,AAAA",
    sizeBytes: input.sizeBytes ?? 12000,
    sourceProvider: input.sourceProvider,
    sourceUrl: input.sourceUrl,
    authorName: input.authorName,
    licenseName: input.licenseName,
    licenseUrl: input.licenseUrl,
    updatedAt: input.updatedAt ?? "2026-05-18T10:00:00.000Z",
  };
}

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
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:30:00.000Z",
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template",
    name: "Project",
    creatorName: "Essence",
    creatorEmail: "team@example.com",
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: true,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "Launch",
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-18T09:00:00.000Z",
    marketplaceUseCount: 2,
    marketplaceViewCount: 8,
    createdAt: "2026-05-18T09:00:00.000Z",
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
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:05:00.000Z",
    completedAt: "2026-05-18T10:05:00.000Z",
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
    seoDescription: "Project website",
    status: "published",
    publishedAt: "2026-05-18T10:10:00.000Z",
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:10:00.000Z",
    viewCount: 0,
    clickCount: 0,
    lastAnalyticsAt: null,
    customDomains: [],
    ...overrides,
  };
}
