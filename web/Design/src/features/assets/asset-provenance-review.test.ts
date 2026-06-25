import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createAssetLibraryAudit } from "@/features/assets/asset-library-audit";
import { createAssetProvenanceReviewCenter } from "@/features/assets/asset-provenance-review";

describe("asset provenance review", () => {
  test("marks public-domain sourced uploads as export safe", () => {
    const center = createAssetProvenanceReviewCenter({
      audit: createAssetLibraryAudit({
        uploads: [
          createUpload({
            id: "safe-asset",
            sourceProvider: "Wikimedia Commons",
            sourceUrl: "https://commons.wikimedia.org/wiki/File:example.png",
            authorName: "Example author",
            licenseName: "CC0 1.0",
            licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
          }),
        ],
        brandLogos: [],
        projectManifests: [],
      }),
      now: "2026-05-16T00:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.exportSafe, 1);
    assert.equal(center.items[0]?.licenseStatus, "export-safe");
    assert.deepEqual(center.items[0]?.exportWarnings, []);
  });

  test("blocks external exports when source or license metadata is missing", () => {
    const center = createAssetProvenanceReviewCenter({
      audit: createAssetLibraryAudit({
        uploads: [
          createUpload({
            id: "missing",
            sourceProvider: null,
            sourceUrl: null,
            licenseName: null,
            licenseUrl: null,
          }),
        ],
        brandLogos: [],
        projectManifests: [],
      }),
      now: "2026-05-16T00:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.blocked, 1);
    assert.equal(center.sourceLineageQueue[0]?.id, "missing");
    assert.match(center.exportWarnings[0]?.exportWarnings[0] ?? "", /source/);
  });

  test("creates attribution warnings for CC BY assets", () => {
    const center = createAssetProvenanceReviewCenter({
      audit: createAssetLibraryAudit({
        uploads: [
          createUpload({
            id: "attribution",
            sourceProvider: "Wikimedia Commons",
            sourceUrl: "https://commons.wikimedia.org/wiki/File:by.png",
            authorName: "Credited author",
            licenseName: "CC BY 4.0",
            licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
          }),
        ],
        brandLogos: [],
        projectManifests: [],
      }),
      now: "2026-05-16T00:00:00.000Z",
    });

    assert.equal(center.status, "review");
    assert.equal(center.totals.needsAttribution, 1);
    assert.equal(center.items[0]?.licenseStatus, "needs-attribution");
    assert.match(center.items[0]?.exportWarnings[0] ?? "", /attribution/);
  });

  test("raises expiration reminders for stale external source reviews", () => {
    const center = createAssetProvenanceReviewCenter({
      audit: createAssetLibraryAudit({
        uploads: [
          createUpload({
            id: "stale",
            sourceProvider: "Wikimedia Commons",
            sourceUrl: "https://commons.wikimedia.org/wiki/File:old.png",
            authorName: "Archive",
            licenseName: "Public Domain",
            licenseUrl: "https://example.com/license",
            updatedAt: "2025-05-01T00:00:00.000Z",
          }),
        ],
        brandLogos: [],
        projectManifests: [],
      }),
      now: "2026-05-16T00:00:00.000Z",
    });

    assert.equal(center.items[0]?.licenseStatus, "expires-soon");
    assert.equal(center.expirationQueue[0]?.id, "stale");
    assert.match(center.nextActions.join(" "), /Refresh license review/);
  });

  test("flags high-impact project manifests with skipped references", () => {
    const center = createAssetProvenanceReviewCenter({
      audit: createAssetLibraryAudit({
        uploads: [],
        brandLogos: [],
        projectManifests: [
          {
            projectId: "project-1",
            projectName: "Launch campaign",
            totalBytes: 20_000,
            entryCount: 8,
            skippedReferenceCount: 2,
            updatedAt: "2026-05-16T00:00:00.000Z",
          },
        ],
      }),
      now: "2026-05-16T00:00:00.000Z",
    });

    assert.equal(center.totals.highImpact, 1);
    assert.equal(center.items[0]?.usageImpact, "high");
    assert.match(center.items[0]?.exportWarnings[0] ?? "", /skipped/);
    assert.equal(center.usageImpactQueue[0]?.id, "project-1");
  });
});

function createUpload(
  overrides: Partial<Parameters<typeof createAssetLibraryAudit>[0]["uploads"][number]> = {},
) {
  return {
    id: "upload-1",
    name: "Hero.png",
    mimeType: "image/png",
    dataUrl: "data:image/png;base64,AAAA",
    sizeBytes: 12_000,
    sourceProvider: "Internal upload",
    sourceUrl: "https://example.com/source.png",
    authorName: "Studio",
    licenseName: "Internal workspace asset",
    licenseUrl: null,
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}
