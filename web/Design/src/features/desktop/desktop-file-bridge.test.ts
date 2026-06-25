import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createDesktopDesignFile,
  getSuggestedDesktopDesignFileName,
  normalizeRecentDesignFiles,
} from "@/features/desktop/desktop-file-bridge";
import {
  collectOfflineAssetCacheRequests,
  estimateDataUrlSizeBytes,
  getDataUrlMimeType,
} from "@/features/desktop/desktop-asset-cache";
import type { DesignDocument } from "@/features/editor/types";

describe("desktop file bridge helpers", () => {
  test("creates portable design files with stable metadata", () => {
    const file = createDesktopDesignFile({
      projectId: "project-1",
      projectName: "Launch Poster",
      document: createDocument(),
      exportedAt: "2026-05-15T10:00:00.000Z",
    });

    assert.equal(file.version, 1);
    assert.equal(file.projectId, "project-1");
    assert.equal(file.projectName, "Launch Poster");
    assert.equal(file.exportedAt, "2026-05-15T10:00:00.000Z");
  });

  test("suggests safe Essence design file names", () => {
    assert.equal(
      getSuggestedDesktopDesignFileName("Spring Campaign!!!"),
      "spring-campaign.essence-design.json",
    );
    assert.equal(
      getSuggestedDesktopDesignFileName(""),
      "untitled-design.essence-design.json",
    );
  });

  test("normalizes recent files and removes duplicate paths", () => {
    assert.deepEqual(
      normalizeRecentDesignFiles([
        {
          projectId: "project-1",
          projectName: "One",
          filePath: "G:/Designs/one.essence-design.json",
          updatedAt: "2026-05-15T10:00:00.000Z",
        },
        {
          projectId: "project-2",
          projectName: "Duplicate",
          filePath: "G:/Designs/one.essence-design.json",
          updatedAt: "2026-05-15T11:00:00.000Z",
        },
        { projectId: "bad" },
      ]),
      [
        {
          projectId: "project-1",
          projectName: "One",
          filePath: "G:/Designs/one.essence-design.json",
          updatedAt: "2026-05-15T10:00:00.000Z",
        },
      ],
    );
  });

  test("collects and dedupes data-url assets for offline caching", () => {
    const document = createDocument();
    const requests = collectOfflineAssetCacheRequests(document);

    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.mimeType, "image/png");
    assert.equal(requests[0]?.sourceElementId, "image-1");
  });

  test("reads data-url metadata", () => {
    const dataUrl = "data:image/png;base64,aGVsbG8=";

    assert.equal(getDataUrlMimeType(dataUrl), "image/png");
    assert.equal(estimateDataUrlSizeBytes(dataUrl), 5);
  });
});

function createDocument(): DesignDocument {
  const imageDataUrl = "data:image/png;base64,aGVsbG8=";

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
