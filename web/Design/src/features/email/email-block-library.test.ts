import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createReusableEmailSection,
  getEmailBlockPack,
  normalizeEmailBlockPackId,
} from "@/features/email/email-block-library";

describe("email block library", () => {
  test("normalizes unsupported block pack IDs to none", () => {
    assert.equal(normalizeEmailBlockPackId("product-update"), "product-update");
    assert.equal(normalizeEmailBlockPackId("unknown-pack"), "none");
    assert.equal(normalizeEmailBlockPackId(null), "none");
  });

  test("creates reusable email-safe sections from block packs", () => {
    const section = createReusableEmailSection("product-update");

    assert.equal(section?.id, "reusable-product-update");
    assert.ok(section?.blocks.some((block) => block.type === "text"));
    assert.ok(section?.blocks.some((block) => block.type === "button"));
    assert.equal(getEmailBlockPack("product-update").label, "Product update CTA");
  });

  test("returns cloned section blocks so callers can safely edit output", () => {
    const first = createReusableEmailSection("event-reminder");
    const second = createReusableEmailSection("event-reminder");

    assert.notEqual(first?.blocks, second?.blocks);
    assert.deepEqual(first, second);
  });
});
