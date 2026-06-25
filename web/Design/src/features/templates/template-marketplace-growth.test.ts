import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { DesignTemplateSummary } from "@/features/editor/types";
import {
  addMarketplaceInstallRecord,
  createOfflineTemplatePackManifest,
  createTemplateMarketplaceGrowth,
  toggleMarketplaceGrowthListValue,
} from "@/features/templates/template-marketplace-growth";

describe("template marketplace growth", () => {
  test("tracks favorites, saved creators, install history, and saved packs", () => {
    const publishedTemplate = createTemplate({
      id: "social-launch",
      name: "Social Launch",
      creatorName: "Amina Designer",
      isTeamTemplate: false,
      marketplaceCollection: "social",
      marketplaceUseCount: 12,
      marketplaceViewCount: 36,
    });
    const growth = createTemplateMarketplaceGrowth([publishedTemplate], {
      favoriteTemplateIds: ["social-launch"],
      savedCreatorKeys: ["creator-amina-designer"],
      offlinePackIds: ["pack-social"],
      installRecords: [
        {
          templateId: "social-launch",
          installedAt: "2026-05-16T08:00:00.000Z",
        },
      ],
    });

    assert.equal(growth.totals.published, 1);
    assert.equal(growth.totals.favorites, 1);
    assert.equal(growth.totals.savedCreators, 1);
    assert.equal(growth.totals.installs, 1);
    assert.equal(growth.favoriteTemplates[0]?.id, "social-launch");
    assert.equal(growth.savedCreators[0]?.detail, "Amina Designer");
    assert.equal(growth.installHistory[0]?.template.id, "social-launch");
    assert.equal(growth.savedOfflinePacks[0]?.id, "pack-social");
  });

  test("surfaces moderation work from quality and marketplace signals", () => {
    const growth = createTemplateMarketplaceGrowth([
      createTemplate({
        id: "viewed-no-installs",
        marketplaceCollection: "business",
        marketplaceUseCount: 0,
        marketplaceViewCount: 42,
      }),
      createTemplate({
        id: "blocked",
        width: 120,
        height: 120,
        thumbnail: null,
        approvalStatus: "draft",
        marketplaceReviewNote: "Preview is not ready.",
        marketplaceViewCount: 4,
      }),
    ]);

    assert.deepEqual(
      growth.moderationQueue.map((item) => item.template.id),
      ["blocked", "viewed-no-installs"],
    );
    assert.equal(growth.moderationQueue[0]?.status, "action");
    assert.equal(
      growth.moderationQueue[1]?.reasons.includes(
        "Low conversion from marketplace views",
      ),
      true,
    );
  });

  test("creates downloadable offline pack manifests", () => {
    const growth = createTemplateMarketplaceGrowth([
      createTemplate({
        id: "education-kit",
        name: "Education Kit",
        marketplaceCollection: "education",
      }),
    ]);
    const pack = growth.offlinePacks[0];

    assert.ok(pack);

    const manifest = createOfflineTemplatePackManifest(
      pack,
      "2026-05-16T08:00:00.000Z",
    );

    assert.equal(manifest.id, "pack-education");
    assert.equal(manifest.templateCount, 1);
    assert.equal(manifest.templates[0]?.name, "Education Kit");
  });

  test("normalizes list toggles and install records", () => {
    assert.deepEqual(toggleMarketplaceGrowthListValue(["a", "b"], "a"), [
      "b",
    ]);
    assert.deepEqual(toggleMarketplaceGrowthListValue(["a"], "b"), ["b", "a"]);

    const state = addMarketplaceInstallRecord(
      {
        favoriteTemplateIds: [],
        savedCreatorKeys: [],
        offlinePackIds: [],
        installRecords: [
          {
            templateId: "old",
            installedAt: "2026-05-16T07:00:00.000Z",
          },
        ],
      },
      "new",
      "2026-05-16T08:00:00.000Z",
    );

    assert.deepEqual(
      state.installRecords.map((record) => record.templateId),
      ["new", "old"],
    );
  });
});

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template",
    name: "Launch Template",
    creatorName: null,
    creatorEmail: "creator@example.com",
    width: 1080,
    height: 1080,
    thumbnail: "data:image/png;base64,AAAA",
    isBrandTemplate: false,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "general",
    marketplaceSeason: null,
    marketplaceReviewNote: "",
    marketplacePublishedAt: new Date().toISOString(),
    marketplaceUseCount: 0,
    marketplaceViewCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
