import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  applyProjectAssetManifest,
  createProjectAssetManifest,
  createProjectAssetUrlForDataUrl,
  findProjectAssetById,
  rewriteDocumentDataUrlsToHostedUrls,
} from "@/features/assets/project-asset-manifest";
import type { DesignDocument } from "@/features/editor/types";

describe("project asset manifest", () => {
  test("dedupes repeated data-url assets and tracks references", () => {
    const manifest = createProjectAssetManifest(createDocument(), {
      now: "2026-05-15T10:00:00.000Z",
    });

    assert.equal(manifest.version, 1);
    assert.equal(manifest.updatedAt, "2026-05-15T10:00:00.000Z");
    assert.equal(manifest.entryCount, 1);
    assert.equal(manifest.entries[0]?.mimeType, "image/png");
    assert.equal(manifest.entries[0]?.sizeBytes, 5);
    assert.equal(manifest.entries[0]?.referenceCount, 2);
    assert.deepEqual(
      manifest.entries[0]?.references.map((reference) => reference.elementId),
      ["image-1", "image-2"],
    );
  });

  test("stores a compact manifest on saved documents", () => {
    const document = applyProjectAssetManifest(createDocument(), {
      now: "2026-05-15T10:00:00.000Z",
    });

    assert.equal(document.metadata?.projectAssetManifest?.entryCount, 1);
    assert.equal(document.pages[0]?.elements[0]?.type, "image");
  });

  test("finds hosted project assets by stable asset id", () => {
    const document = applyProjectAssetManifest(createDocument());
    const dataUrl = getImageDataUrl();
    const hostedUrl = createProjectAssetUrlForDataUrl({
      projectId: "project-1",
      dataUrl,
      assetBaseUrl: "https://app.example.com",
    });
    const assetId = hostedUrl.split("/").at(-1) ?? "";
    const asset = findProjectAssetById(document, assetId);

    assert.ok(asset);
    assert.equal(asset.dataUrl, dataUrl);
    assert.equal(asset.mimeType, "image/png");
    assert.equal(asset.reference.elementId, "image-1");
  });

  test("rewrites data-url layer sources to project asset URLs for hosted exports", () => {
    const document = rewriteDocumentDataUrlsToHostedUrls({
      document: createDocument(),
      projectId: "project-1",
      assetBaseUrl: "https://app.example.com",
    });
    const image = document.pages[0]?.elements[0];

    assert.equal(image?.type, "image");
    if (image?.type !== "image") return;

    assert.match(
      image.src,
      /^https:\/\/app\.example\.com\/api\/projects\/project-1\/assets\/asset-[a-f0-9]+$/,
    );
    assert.equal(document.metadata?.projectAssetManifest?.entryCount, 1);
  });
});

function createDocument(): DesignDocument {
  const imageDataUrl = getImageDataUrl();

  return {
    version: 1,
    width: 1080,
    height: 1080,
    activePageId: "page-1",
    pages: [
      {
        id: "page-1",
        name: "Launch",
        background: "#ffffff",
        elements: [
          {
            id: "image-1",
            type: "image",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            rotation: 0,
            opacity: 1,
            src: imageDataUrl,
            alt: "Launch image",
            objectFit: "cover",
          },
          {
            id: "image-2",
            type: "image",
            x: 120,
            y: 0,
            width: 100,
            height: 100,
            rotation: 0,
            opacity: 1,
            src: imageDataUrl,
            alt: "Duplicate image",
            objectFit: "cover",
          },
        ],
      },
    ],
  };
}

function getImageDataUrl() {
  return "data:image/png;base64,aGVsbG8=";
}
