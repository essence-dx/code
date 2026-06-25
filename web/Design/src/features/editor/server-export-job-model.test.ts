import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  canStoreExportArtifact,
  createStoredExportArtifactPayload,
  maxStoredExportArtifactBytes,
  normalizeServerExportProgress,
} from "@/features/editor/server-export-job-model";

describe("server export job model", () => {
  test("normalizes progress for polling and dashboard status", () => {
    assert.equal(normalizeServerExportProgress(-10), 0);
    assert.equal(normalizeServerExportProgress(44.6), 45);
    assert.equal(normalizeServerExportProgress(140), 100);
    assert.equal(normalizeServerExportProgress("soon"), 0);
  });

  test("stores small artifacts and keeps oversized artifact metadata only", () => {
    const smallArtifact = {
      fileName: "design.svg",
      mimeType: "image/svg+xml",
      sizeBytes: 128,
      dataUrl: "data:image/svg+xml,%3Csvg%20/%3E",
    };
    const largeArtifact = {
      ...smallArtifact,
      sizeBytes: maxStoredExportArtifactBytes + 1,
    };

    assert.equal(canStoreExportArtifact(smallArtifact), true);
    assert.equal(canStoreExportArtifact(largeArtifact), false);
    assert.equal(
      createStoredExportArtifactPayload(largeArtifact).artifactDataUrl,
      null,
    );
  });
});
