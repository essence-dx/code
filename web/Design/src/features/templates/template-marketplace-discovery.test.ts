import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { DesignTemplateSummary } from "@/features/editor/types";
import {
  createMarketplaceDiscoveryCollections,
  createTemplateMarketplaceDiscovery,
  toDiscoveryTemplate,
} from "@/features/templates/template-marketplace-discovery";

describe("template marketplace discovery", () => {
  test("features only published templates and keeps creator attribution", () => {
    const discovery = createTemplateMarketplaceDiscovery([
      createTemplate({
        id: "published-social",
        name: "Social Launch",
        marketplaceStatus: "published",
        marketplaceCollection: "social",
        creatorName: "Amina Designer",
        marketplaceUseCount: 8,
        marketplaceViewCount: 20,
      }),
      createTemplate({
        id: "review-business",
        name: "Business Deck",
        marketplaceStatus: "review",
        marketplaceCollection: "business",
      }),
    ]);

    assert.deepEqual(
      discovery.featuredTemplates.map((template) => template.id),
      ["published-social"],
    );
    assert.equal(discovery.totals.published, 1);
    assert.equal(discovery.totals.views, 20);
    assert.equal(discovery.totals.uses, 8);
    assert.equal(
      discovery.featuredTemplates[0]?.creatorDetail,
      "Amina Designer",
    );
  });

  test("groups featured collections by marketplace collection", () => {
    const collections = createMarketplaceDiscoveryCollections([
      toDiscoveryTemplate(
        createTemplate({
          id: "social-1",
          marketplaceCollection: "social",
          marketplaceUseCount: 5,
        }),
      ),
      toDiscoveryTemplate(
        createTemplate({
          id: "social-2",
          marketplaceCollection: "social",
          marketplaceUseCount: 2,
        }),
      ),
      toDiscoveryTemplate(
        createTemplate({
          id: "education-1",
          marketplaceCollection: "education",
          marketplaceUseCount: 9,
        }),
      ),
    ]);

    assert.equal(collections[0]?.id, "social");
    assert.equal(collections[0]?.templateCount, 2);
    assert.equal(collections[0]?.totalUses, 7);
    assert.equal(collections[1]?.id, "education");
  });

  test("surfaces blocked and review-ready quality gate work", () => {
    const blocked = toDiscoveryTemplate(
      createTemplate({
        id: "tiny",
        width: 120,
        height: 120,
        thumbnail: null,
        approvalStatus: "draft",
        marketplaceReviewNote: "Needs a stronger preview.",
      }),
    );
    const ready = toDiscoveryTemplate(
      createTemplate({
        id: "ready",
        approvalStatus: "approved",
        marketplaceCollection: "business",
      }),
    );

    assert.equal(blocked.qualityStatus, "blocked");
    assert.equal(
      blocked.qualityGates.some((gate) => gate.id === "dimensions"),
      true,
    );
    assert.equal(ready.qualityStatus, "ready");
    assert.equal(ready.qualityScore, 100);
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
