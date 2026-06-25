import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createAssetLibraryAudit,
  defaultAssetQuotaBytes,
  formatAssetBytes,
} from "@/features/assets/asset-library-audit";

describe("asset library audit", () => {
  test("summarizes uploads, brand logos, project manifests, and quota use", () => {
    const audit = createAssetLibraryAudit({
      uploads: [
        createStoredAsset({ id: "upload-1", sizeBytes: 4000 }),
        createStoredAsset({ id: "upload-2", sizeBytes: 4000 }),
      ],
      brandLogos: [createStoredAsset({ id: "brand-1", sizeBytes: 8000 })],
      projectManifests: [
        {
          projectId: "project-1",
          projectName: "Launch campaign",
          totalBytes: 16000,
          entryCount: 2,
          skippedReferenceCount: 1,
          updatedAt: "2026-05-15T10:00:00.000Z",
        },
      ],
    });

    assert.equal(audit.quotaBytes, defaultAssetQuotaBytes);
    assert.equal(audit.totalBytes, 32000);
    assert.equal(audit.assetCount, 3);
    assert.equal(audit.projectManifestCount, 2);
    assert.equal(audit.skippedProjectReferenceCount, 1);
    assert.equal(audit.scopes[0]?.totalBytes, 8000);
    assert.equal(audit.scopes[1]?.totalBytes, 8000);
    assert.equal(audit.scopes[2]?.count, 2);
  });

  test("detects removable duplicates while keeping the newest asset", () => {
    const audit = createAssetLibraryAudit({
      uploads: [
        createStoredAsset({
          id: "upload-new",
          updatedAt: "2026-05-15T11:00:00.000Z",
        }),
        createStoredAsset({
          id: "upload-old",
          updatedAt: "2026-05-15T10:00:00.000Z",
        }),
      ],
      brandLogos: [],
      projectManifests: [],
    });

    assert.equal(audit.duplicateCount, 1);
    assert.equal(audit.duplicateBytes, 12000);
    assert.equal(audit.duplicateGroups[0]?.assets[0]?.id, "upload-new");
    assert.equal(audit.duplicateGroups[0]?.assets[1]?.id, "upload-old");
  });

  test("formats asset sizes for dashboard labels", () => {
    assert.equal(formatAssetBytes(512), "512 B");
    assert.equal(formatAssetBytes(1536), "1.5 KB");
    assert.equal(formatAssetBytes(2 * 1024 * 1024), "2.0 MB");
  });
});

function createStoredAsset(input: {
  id: string;
  sizeBytes?: number;
  updatedAt?: string;
}) {
  return {
    id: input.id,
    name: input.id,
    mimeType: "image/png",
    dataUrl: "data:image/png;base64,AAAA",
    sizeBytes: input.sizeBytes ?? 12000,
    updatedAt: input.updatedAt ?? "2026-05-15T10:00:00.000Z",
  };
}
