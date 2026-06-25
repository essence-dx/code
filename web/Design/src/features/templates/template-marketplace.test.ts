import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  normalizeTemplateMarketplaceCollection,
  normalizeTemplateMarketplaceReviewNote,
  normalizeTemplateMarketplaceSeason,
  normalizeTemplateMarketplaceStatus,
  shouldStampMarketplacePublishedAt,
} from "@/features/templates/template-marketplace";

describe("template marketplace", () => {
  test("normalizes marketplace status values", () => {
    assert.equal(normalizeTemplateMarketplaceStatus("review"), "review");
    assert.equal(normalizeTemplateMarketplaceStatus("published"), "published");
    assert.equal(normalizeTemplateMarketplaceStatus("archived"), "archived");
    assert.equal(normalizeTemplateMarketplaceStatus("unknown"), "draft");
  });

  test("normalizes listing taxonomy and review notes", () => {
    assert.equal(normalizeTemplateMarketplaceCollection("  Social  "), "social");
    assert.equal(normalizeTemplateMarketplaceCollection(""), null);
    assert.equal(normalizeTemplateMarketplaceSeason("Winter 2026"), "Winter 2026");
    assert.equal(normalizeTemplateMarketplaceSeason(" "), null);
    assert.equal(normalizeTemplateMarketplaceReviewNote("  Ready  "), "Ready");
  });

  test("only stamps first publish time once", () => {
    assert.equal(
      shouldStampMarketplacePublishedAt({
        nextStatus: "published",
        previousPublishedAt: null,
      }),
      true,
    );
    assert.equal(
      shouldStampMarketplacePublishedAt({
        nextStatus: "published",
        previousPublishedAt: new Date(),
      }),
      false,
    );
    assert.equal(
      shouldStampMarketplacePublishedAt({
        nextStatus: "review",
        previousPublishedAt: null,
      }),
      false,
    );
  });
});
