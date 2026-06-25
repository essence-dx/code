import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  applyBackgroundCutoutToPixels,
  normalizeCutoutFeather,
  normalizeCutoutTolerance,
  normalizeHexColor,
  parseHexColor,
} from "@/features/editor/image-background-cutout";

describe("image background cutout", () => {
  test("normalizes cutout settings for stored image layers", () => {
    assert.equal(normalizeHexColor("#fff"), "#ffffff");
    assert.equal(normalizeHexColor("bad"), "#ffffff");
    assert.equal(normalizeCutoutTolerance(150), 100);
    assert.equal(normalizeCutoutTolerance(-5), 0);
    assert.equal(normalizeCutoutFeather(45), 40);
    assert.deepEqual(parseHexColor("#0ea5e9"), {
      r: 14,
      g: 165,
      b: 233,
    });
  });

  test("removes matching background pixels and preserves foreground pixels", () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 10, 20, 30, 255,
    ]);

    applyBackgroundCutoutToPixels({
      pixels,
      color: "#ffffff",
      tolerance: 10,
      feather: 0,
      invert: false,
    });

    assert.equal(pixels[3], 0);
    assert.equal(pixels[7], 255);
  });

  test("inverted cutout keeps matching pixels and removes non-matching pixels", () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 10, 20, 30, 255,
    ]);

    applyBackgroundCutoutToPixels({
      pixels,
      color: "#ffffff",
      tolerance: 10,
      feather: 0,
      invert: true,
    });

    assert.equal(pixels[3], 255);
    assert.equal(pixels[7], 0);
  });
});
