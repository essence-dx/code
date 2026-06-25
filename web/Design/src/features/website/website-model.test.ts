import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ProjectDetail } from "@/features/editor/types";
import {
  createWebsiteModelFromProject,
  normalizeWebsiteNavigationStyle,
  parseWebsiteModel,
} from "@/features/website/website-model";

describe("website model", () => {
  test("normalizes legacy published models with section anchors and top navigation", () => {
    const model = parseWebsiteModel({
      version: 1,
      sourceProjectId: "project_1",
      title: "Campaign site",
      seoTitle: "Campaign site",
      seoDescription: "A campaign landing page.",
      sections: [
        {
          id: "page_hero",
          name: "Hero Section",
          background: "#ffffff",
          width: 1200,
          height: 900,
          elements: [],
        },
        {
          id: "page_hero_duplicate",
          name: "Hero Section",
          background: "#ffffff",
          width: 1200,
          height: 900,
          elements: [],
        },
      ],
    });

    assert.equal(model.navigationStyle, "top");
    assert.equal(model.sections[0]?.anchorId, "hero-section");
    assert.equal(model.sections[1]?.anchorId, "hero-section-2");
    assert.equal(model.sections[0]?.navigationLabel, "Hero Section");
    assert.equal(model.sections[0]?.navigationGroup, "");
    assert.equal(model.sections[0]?.showInNavigation, true);
  });

  test("rejects unsupported navigation styles", () => {
    assert.equal(normalizeWebsiteNavigationStyle("side"), "side");
    assert.equal(normalizeWebsiteNavigationStyle("drawer"), "top");
  });

  test("uses explicit page SEO fields before name and notes fallbacks", () => {
    const model = createWebsiteModelFromProject({
      project: {
        id: "project_1",
        name: "Campaign",
        width: 1200,
        height: 900,
        folderId: null,
        sourceProjectId: null,
        variantProfileId: null,
        variantName: null,
        thumbnail: null,
        publicShareId: null,
        editShareId: null,
        editSharePermission: "view",
        approvalStatus: "draft",
        starred: false,
        deletedAt: null,
        updatedAt: "2026-05-15T00:00:00.000Z",
        createdAt: "2026-05-15T00:00:00.000Z",
        document: {
          version: 1,
          width: 1200,
          height: 900,
          activePageId: "page_1",
          pages: [
            {
              id: "page_1",
              name: "Hero",
              background: "#ffffff",
              notes: "Fallback notes.",
              websiteSeoTitle: "Launch offer",
              websiteSeoDescription: "A focused launch description.",
              websiteNavLabel: "Offer",
              websiteNavGroup: "Product",
              websiteHideFromNavigation: true,
              elements: [],
            },
          ],
        },
      } satisfies ProjectDetail,
      title: "Campaign site",
      seoTitle: "Campaign site",
      seoDescription: "A campaign landing page.",
      navigationStyle: "top",
    });

    assert.equal(model.sections[0]?.seoTitle, "Launch offer");
    assert.equal(
      model.sections[0]?.seoDescription,
      "A focused launch description.",
    );
    assert.equal(model.sections[0]?.navigationLabel, "Offer");
    assert.equal(model.sections[0]?.navigationGroup, "Product");
    assert.equal(model.sections[0]?.showInNavigation, false);
  });
});
