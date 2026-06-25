import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type {
  DesignPage,
  ImageElement,
  ProjectDetail,
  TextElement,
} from "@/features/editor/types";
import { createAccessibilityLocalizationFinishCenter } from "@/features/localization/accessibility-localization-finish";

describe("accessibility localization finish center", () => {
  test("reports ready finishing status when pages have accessible copy", () => {
    const center = createAccessibilityLocalizationFinishCenter({
      projects: [
        createProject({
          document: {
            ...createProject().document,
            metadata: { editorLocale: "en" },
            pages: [
              createPage({
                websiteSeoTitle: "Launch page",
                websiteSeoDescription:
                  "A concise launch page for a production-ready campaign.",
                elements: [
                  createText({ content: "Launch system" }),
                  createImage({ alt: "Product dashboard preview" }),
                ],
              }),
            ],
          },
        }),
      ],
      now: new Date("2026-05-16T12:00:00.000Z"),
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.routedIssues, 0);
    assert.ok(center.totals.translationEntries > 0);
    assert.ok(center.handoffExport.dataUrl.includes("data:application/json"));
  });

  test("routes missing alt text and long copy into finishing actions", () => {
    const center = createAccessibilityLocalizationFinishCenter({
      projects: [
        createProject({
          document: {
            ...createProject().document,
            pages: [
              createPage({
                elements: [
                  createImage({ alt: "" }),
                  createText({
                    content:
                      "This headline has a SuperLongUnbrokenLocalizationTokenThatWillOverflowAfterTranslation",
                  }),
                ],
              }),
            ],
          },
          approvalStatus: "changes-requested",
        }),
      ],
      now: new Date("2026-05-16T12:00:00.000Z"),
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.routedIssues, 1);
    assert.ok(center.totals.copyWarnings > 0);
    assert.ok(center.nextActions.length > 0);
  });
});

function createProject(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    id: "project-1",
    name: "Launch",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: "public-1",
    editShareId: null,
    editSharePermission: "view",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-16T10:00:00.000Z",
    createdAt: "2026-05-15T10:00:00.000Z",
    document: {
      version: 1,
      width: 1080,
      height: 1080,
      activePageId: "page-1",
      pages: [createPage()],
      metadata: { editorLocale: "en" },
    },
    ...overrides,
  };
}

function createPage(overrides: Partial<DesignPage> = {}): DesignPage {
  return {
    id: "page-1",
    name: "Landing",
    background: "#ffffff",
    format: "website",
    websiteSeoTitle: "Launch",
    websiteSeoDescription: "Campaign launch page.",
    websiteNavLabel: "Launch",
    elements: [createText(), createImage()],
    ...overrides,
  };
}

function createText(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: "text-1",
    type: "text",
    x: 0,
    y: 0,
    width: 320,
    height: 80,
    rotation: 0,
    opacity: 1,
    content: "Launch",
    fontSize: 32,
    fontFamily: "Inter",
    fontWeight: 700,
    color: "#111111",
    textAlign: "left",
    letterSpacing: 0,
    lineHeight: 1.2,
    ...overrides,
  };
}

function createImage(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    id: "image-1",
    type: "image",
    x: 0,
    y: 120,
    width: 320,
    height: 180,
    rotation: 0,
    opacity: 1,
    src: "data:image/png;base64,aGVsbG8=",
    alt: "Dashboard screenshot",
    objectFit: "cover",
    ...overrides,
  };
}
