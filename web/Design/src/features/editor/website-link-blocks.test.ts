import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createWebsiteLinkButtonElements } from "@/features/editor/website-link-blocks";

describe("website link button blocks", () => {
  test("creates a grouped clickable button block", () => {
    const elements = createWebsiteLinkButtonElements({
      label: "Book a call",
      url: "https://example.com/book",
      variant: "outline",
    });
    const groupIds = new Set(elements.map((element) => element.groupId));

    assert.equal(elements.length, 3);
    assert.equal(groupIds.size, 1);
    assert.equal(elements.every((element) => element.linkUrl), true);
    assert.equal(elements[1]?.type, "text");
    assert.equal(
      elements[1]?.type === "text" && elements[1].content,
      "Book a call",
    );
  });
});
