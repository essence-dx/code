import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WebsiteSection } from "@/features/editor/types";
import { createWebsiteNavigationItems } from "@/features/website/website-navigation-items";

describe("website navigation items", () => {
  test("groups visible sections and keeps ungrouped sections as direct links", () => {
    const items = createWebsiteNavigationItems([
      createSection("hero", "Hero", ""),
      createSection("features", "Features", "Product"),
      createSection("pricing", "Pricing", "Product"),
      createSection("legal", "Legal", "Footer", false),
      createSection("contact", "Contact", "Company"),
    ]);

    assert.equal(items.length, 3);
    assert.equal(items[0]?.kind, "section");
    assert.equal(items[1]?.kind, "group");
    assert.equal(items[2]?.kind, "group");

    if (items[1]?.kind !== "group" || items[2]?.kind !== "group") {
      throw new Error("Expected grouped navigation items.");
    }

    assert.equal(items[1].label, "Product");
    assert.deepEqual(
      items[1].sections.map((section) => section.id),
      ["features", "pricing"],
    );
    assert.equal(items[2].label, "Company");
    assert.deepEqual(
      items[2].sections.map((section) => section.id),
      ["contact"],
    );
  });
});

function createSection(
  id: string,
  navigationLabel: string,
  navigationGroup: string,
  showInNavigation = true,
): WebsiteSection {
  return {
    id,
    anchorId: id,
    name: navigationLabel,
    navigationLabel,
    navigationGroup,
    showInNavigation,
    seoTitle: navigationLabel,
    seoDescription: "",
    background: "#ffffff",
    width: 1200,
    height: 900,
    elements: [],
  };
}
