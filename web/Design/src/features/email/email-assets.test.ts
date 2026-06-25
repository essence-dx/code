import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ProjectDetail } from "@/features/editor/types";
import {
  applyProjectAssetManifest,
  createProjectAssetUrlForDataUrl,
} from "@/features/assets/project-asset-manifest";
import {
  dataUrlToBytes,
  findEmailImageAsset,
  findHostedProjectAsset,
} from "@/features/email/email-assets";

describe("email image assets", () => {
  test("finds data-url image assets by element id", () => {
    const dataUrl = `data:image/png;base64,${Buffer.from("image").toString(
      "base64",
    )}`;
    const project = {
      document: {
        pages: [
          {
            elements: [
              {
                id: "image_1",
                type: "image",
                src: dataUrl,
              },
            ],
          },
        ],
      },
    } as unknown as ProjectDetail;

    assert.deepEqual(findEmailImageAsset(project, "image_1"), {
      dataUrl,
      mimeType: "image/png",
    });
    assert.equal(findEmailImageAsset(project, "missing"), null);
  });

  test("converts base64 data urls into bytes", () => {
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from("<svg />").toString(
      "base64",
    )}`;

    assert.equal(dataUrlToBytes(dataUrl)?.toString("utf8"), "<svg />");
    assert.equal(dataUrlToBytes("https://example.com/image.png"), null);
  });

  test("finds hosted project assets by manifest id", () => {
    const dataUrl = `data:image/png;base64,${Buffer.from("image").toString(
      "base64",
    )}`;
    const project = {
      document: applyProjectAssetManifest({
        version: 1,
        width: 1080,
        height: 1080,
        activePageId: "page-1",
        pages: [
          {
            id: "page-1",
            name: "Page",
            background: "#ffffff",
            elements: [
              {
                id: "image_1",
                type: "image",
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                rotation: 0,
                opacity: 1,
                src: dataUrl,
                alt: "Image",
                objectFit: "cover",
              },
            ],
          },
        ],
      }),
    } as unknown as ProjectDetail;
    const assetId =
      createProjectAssetUrlForDataUrl({
        projectId: "project_1",
        dataUrl,
      })
        .split("/")
        .at(-1) ?? "";

    assert.deepEqual(findHostedProjectAsset(project, assetId), {
      dataUrl,
      mimeType: "image/png",
    });
  });
});
