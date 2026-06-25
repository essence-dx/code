import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createPanelWindow } from "@/features/editor/panel-list-window";

describe("panel list window", () => {
  test("returns all items when the list fits under the limit", () => {
    const items = createItems(3);
    const window = createPanelWindow(items, { limit: 5 });

    assert.equal(window.isWindowed, false);
    assert.deepEqual(window.items, items);
    assert.equal(window.hiddenCount, 0);
  });

  test("keeps active items visible before filling the window", () => {
    const window = createPanelWindow(createItems(10), {
      activeIds: ["item-8"],
      limit: 4,
    });

    assert.equal(window.isWindowed, true);
    assert.deepEqual(
      window.items.map((item) => item.id),
      ["item-0", "item-1", "item-2", "item-8"],
    );
    assert.equal(window.hiddenCount, 6);
  });

  test("dedupes active ids already inside the leading window", () => {
    const window = createPanelWindow(createItems(10), {
      activeIds: ["item-1", "item-2"],
      limit: 4,
    });

    assert.deepEqual(
      window.items.map((item) => item.id),
      ["item-0", "item-1", "item-2", "item-3"],
    );
  });
});

function createItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
  }));
}
