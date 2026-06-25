import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ProjectDetail } from "@/features/editor/types";
import { createEmailModelFromProject } from "@/features/email/email-model";

describe("email model", () => {
  test("uses hosted asset URLs for data-url design images", () => {
    const model = createEmailModelFromProject({
      project: createProjectFixture(),
      subject: "Campaign update",
      previewText: "A focused inbox preview.",
      assetBaseUrl: "https://app.example.com",
      blockPackId: "product-update",
    });
    const imageBlock = model.sections[0]?.blocks.find(
      (block) => block.type === "image",
    );

    assert.equal(model.blockPackId, "product-update");
    assert.match(
      imageBlock?.src ?? "",
      /^https:\/\/app\.example\.com\/api\/projects\/project_1\/assets\/asset-[a-f0-9]+$/,
    );
    assert.equal(imageBlock?.sourceKind, "hosted");
    assert.ok(model.sections.some((section) => section.id === "reusable-product-update"));
  });
});

function createProjectFixture() {
  return {
    id: "project_1",
    name: "Campaign",
    document: {
      pages: [
        {
          id: "page_1",
          name: "Hero",
          background: "#ffffff",
          elements: [
            {
              id: "text_1",
              type: "text",
              hidden: false,
              x: 0,
              y: 0,
              content: "Hello inbox",
              textAlign: "left",
              color: "#111827",
              fontFamily: "Arial",
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.2,
            },
            {
              id: "image_1",
              type: "image",
              hidden: false,
              x: 0,
              y: 100,
              src: "data:image/png;base64,aW1hZ2U=",
              alt: "Product screenshot",
              linkUrl: "https://example.com",
              width: 640,
              height: 320,
            },
          ],
        },
      ],
    },
  } as unknown as ProjectDetail;
}
