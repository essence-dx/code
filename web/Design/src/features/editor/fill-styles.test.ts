import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getCssFillStyle,
  getFillStyleDefaults,
  getSvgFillPaint,
} from "@/features/editor/fill-styles";

describe("fill styles", () => {
  test("creates css linear gradients from fill fields", () => {
    assert.deepEqual(
      getCssFillStyle({
        fill: "#38bdf8",
        fillMode: "linear-gradient",
        fillGradientFrom: "#38bdf8",
        fillGradientTo: "#f97316",
        fillGradientAngle: 45,
      }),
      {
        background: "linear-gradient(45deg, #38bdf8, #f97316)",
      },
    );
  });

  test("creates css pattern fills with repeat sizing", () => {
    const style = getCssFillStyle({
      fill: "#ffffff",
      fillMode: "pattern",
      fillPattern: "dot-grid",
      fillPatternColor: "#000000",
      fillPatternScale: 20,
    });

    assert.equal(style.backgroundColor, "#ffffff");
    assert.equal(style.backgroundSize, "20px 20px");
    assert.match(String(style.backgroundImage), /radial-gradient/);
  });

  test("creates svg fill definitions for vector paths", () => {
    const paint = getSvgFillPaint(
      {
        fill: "#f8fafc",
        fillMode: "texture",
        fillTexture: "linen",
        fillPatternColor: "#0f172a",
        fillTextureIntensity: 40,
      },
      ":r1:",
    );

    assert.equal(paint.fill, "url(#fill-r1)");
    assert.equal(paint.definitions[0]?.type, "texture");
    assert.equal(paint.definitions[0]?.opacity, 0.4);
  });

  test("provides useful defaults when switching fill modes", () => {
    assert.equal(
      getFillStyleDefaults("linear-gradient", "#0ea5e9").fillGradientFrom,
      "#0ea5e9",
    );
    assert.equal(getFillStyleDefaults("texture").fillTexture, "paper");
  });
});
