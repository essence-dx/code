import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createAdvancedBatchAssetOperationCenter } from "@/features/assets/advanced-batch-asset-operations";
import { createAssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ProjectSummary } from "@/features/editor/types";

describe("advanced batch asset operations", () => {
  test("plans bulk transforms, metadata queues, usage previews, and reversible cleanup packets", () => {
    const publishedProject = createProject({
      id: "project-launch",
      name: "Launch landing page",
      width: 1440,
      height: 1200,
      publicShareId: "public-launch",
    });
    const socialProject = createProject({
      id: "project-social",
      name: "Launch social story",
      width: 1080,
      height: 1920,
    });
    const duplicateDataUrl = "data:image/png;base64,DUPLICATE";
    const audit = createAssetLibraryAudit({
      uploads: [
        createStoredAsset({
          id: "hero-original",
          name: "Pocket Garden hero photo",
          mimeType: "image/png",
          dataUrl: duplicateDataUrl,
          sizeBytes: 8_400_000,
          sourceProvider: "Unsplash",
          sourceUrl: "https://images.example.com/pocket-garden",
          licenseName: "CC0 1.0",
          licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
        }),
        createStoredAsset({
          id: "hero-copy",
          name: "Pocket Garden hero photo copy",
          mimeType: "image/png",
          dataUrl: duplicateDataUrl,
          sizeBytes: 8_400_000,
        }),
        createStoredAsset({
          id: "launch-logo",
          name: "Launch logo transparent",
          mimeType: "image/svg+xml",
          sizeBytes: 54_000,
        }),
        createStoredAsset({
          id: "launch-video",
          name: "Launch teaser raw",
          mimeType: "video/mp4",
          sizeBytes: 28_000_000,
        }),
      ],
      brandLogos: [
        createStoredAsset({
          id: "brand-mark",
          name: "Pocket Garden mark",
          mimeType: "image/svg+xml",
          sizeBytes: 22_000,
        }),
      ],
      projectManifests: [
        {
          projectId: publishedProject.id,
          projectName: publishedProject.name,
          totalBytes: 10_000_000,
          entryCount: 7,
          skippedReferenceCount: 1,
          updatedAt: "2026-05-18T08:00:00.000Z",
        },
        {
          projectId: socialProject.id,
          projectName: socialProject.name,
          totalBytes: 6_000_000,
          entryCount: 3,
          skippedReferenceCount: 0,
          updatedAt: "2026-05-18T08:30:00.000Z",
        },
      ],
      quotaBytes: 64_000_000,
    });

    const center = createAdvancedBatchAssetOperationCenter({
      audit,
      projects: [publishedProject, socialProject],
      now: "2026-05-18T09:00:00.000Z",
    });

    assert.equal(center.status, "review");
    assert.ok(center.score >= 65);
    assert.ok(center.totals.transformCandidates >= 3);
    assert.ok(center.totals.metadataQueueItems >= 3);
    assert.equal(center.totals.cleanupPackets, 1);
    assert.ok(
      center.transformPlans.some(
        (plan) =>
          plan.kind === "format-conversion" &&
          plan.outputFormat === "image/webp" &&
          plan.assetIds.includes("hero-original"),
      ),
    );
    assert.ok(
      center.transformPlans.some(
        (plan) =>
          plan.kind === "resize" && plan.assetIds.includes("hero-original"),
      ),
    );
    assert.ok(
      center.transformPlans.some(
        (plan) =>
          plan.kind === "crop" && plan.targetProjectIds.includes("project-social"),
      ),
    );
    assert.ok(
      center.altTextQueue.some(
        (item) =>
          item.assetId === "hero-copy" &&
          item.suggestedAltText === "Pocket Garden hero photo copy",
      ),
    );
    assert.ok(
      center.licenseMetadataQueue.some(
        (item) =>
          item.assetId === "hero-copy" &&
          item.missingFields.includes("license"),
      ),
    );
    assert.ok(
      center.usageImpactPreviews.some(
        (preview) =>
          preview.projectId === "project-launch" &&
          preview.publicSurface === true &&
          preview.status === "review",
      ),
    );

    const cleanupPacket = center.reversibleCleanupPackets[0];

    assert.equal(cleanupPacket?.retainAssetId, "hero-original");
    assert.deepEqual(cleanupPacket?.removeAssetIds, ["hero-copy"]);
    assert.equal(cleanupPacket?.rollbackSteps.length, 3);
    assert.match(cleanupPacket?.dataUrl ?? "", /^data:application\/json/);
    assert.ok(
      center.nextActions.includes(
        "Review reversible cleanup packet before removing Pocket Garden hero photo copy.",
      ),
    );
  });
});

function createStoredAsset(input: {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
  sourceProvider?: string | null;
  sourceUrl?: string | null;
  licenseName?: string | null;
  licenseUrl?: string | null;
}) {
  return {
    id: input.id,
    name: input.name,
    mimeType: input.mimeType,
    dataUrl: input.dataUrl ?? `data:${input.mimeType};base64,AAAA`,
    sizeBytes: input.sizeBytes,
    sourceProvider: input.sourceProvider,
    sourceUrl: input.sourceUrl,
    authorName: null,
    licenseName: input.licenseName,
    licenseUrl: input.licenseUrl,
    updatedAt: "2026-05-18T08:00:00.000Z",
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
    editSharePermission: "edit",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-18T08:30:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}
