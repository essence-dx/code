import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createAssetLibraryAudit } from "@/features/assets/asset-library-audit";
import { createAssetLibraryOperationCenter } from "@/features/assets/asset-library-operations";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";

describe("asset library operations", () => {
  test("creates collections, license queues, references, and reusable shelves", () => {
    const project = createProject({
      id: "project-1",
      name: "Launch campaign",
      publicShareId: "share-1",
    });
    const audit = createAssetLibraryAudit({
      uploads: [
        createStoredAsset({
          id: "upload-1",
          name: "Hero upload",
          mimeType: "image/png",
          sizeBytes: 12_000,
        }),
      ],
      brandLogos: [
        createStoredAsset({
          id: "brand-1",
          name: "Primary logo",
          mimeType: "image/svg+xml",
          sizeBytes: 4_000,
        }),
      ],
      projectManifests: [
        {
          projectId: project.id,
          projectName: project.name,
          totalBytes: 20_000,
          entryCount: 3,
          skippedReferenceCount: 0,
          updatedAt: "2026-05-16T00:00:00.000Z",
        },
      ],
    });
    const operations = createAssetLibraryOperationCenter({
      audit,
      projects: [project],
      templates: [],
    });

    assert.equal(operations.totals.assets, 3);
    assert.equal(operations.totals.collections, 4);
    assert.equal(operations.licenseQueue[0]?.id, "upload-1");
    assert.equal(operations.referenceHotspots[0]?.id, project.id);
    assert.equal(
      operations.reusableShelves.find((shelf) => shelf.id === "brand-assets")
        ?.items.length,
      1,
    );
    assert.ok(
      operations.bulkMoveGroups.some(
        (group) =>
          group.id === "license-review" && group.assetIds.includes("upload-1"),
      ),
    );
  });

  test("scores a fully tracked asset library as ready", () => {
    const project = createProject({ publicShareId: "share-1" });
    const audit = createAssetLibraryAudit({
      uploads: [],
      brandLogos: [
        createStoredAsset({
          id: "brand-logo",
          name: "Brand logo",
          mimeType: "image/svg+xml",
        }),
        createStoredAsset({
          id: "brand-video",
          name: "Brand sound mark",
          mimeType: "audio/mpeg",
        }),
        createStoredAsset({
          id: "brand-doc",
          name: "Brand guide",
          mimeType: "application/pdf",
        }),
      ],
      projectManifests: [
        {
          projectId: project.id,
          projectName: project.name,
          totalBytes: 16_000,
          entryCount: 4,
          skippedReferenceCount: 0,
          updatedAt: "2026-05-16T00:00:00.000Z",
        },
      ],
    });
    const operations = createAssetLibraryOperationCenter({
      audit,
      projects: [project],
      templates: [createTemplate({ name: project.name })],
    });

    assert.equal(operations.status, "ready");
    assert.ok(operations.score >= 85);
    assert.equal(operations.licenseQueue.length, 0);
    assert.equal(operations.totals.reusableShelfItems, 5);
  });
});

function createStoredAsset(input: {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
}) {
  return {
    id: input.id,
    name: input.name,
    mimeType: input.mimeType,
    dataUrl: `data:${input.mimeType};base64,AAAA`,
    sizeBytes: input.sizeBytes ?? 10_000,
    updatedAt: "2026-05-16T00:00:00.000Z",
  };
}

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch campaign",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "edit",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template-1",
    name: "Launch campaign",
    creatorName: "Studio",
    creatorEmail: null,
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: true,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "brand",
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-16T00:00:00.000Z",
    marketplaceUseCount: 1,
    marketplaceViewCount: 1,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}
