import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  applyObjectRetouchToPixels,
  getImageObjectRetouchSettings,
  normalizeObjectRetouchTool,
  normalizeRetouchBrushSize,
  normalizeRetouchCoordinate,
  normalizeRetouchSoftness,
} from "@/features/editor/image-object-retouch";
import type { ImageElement } from "@/features/editor/types";

describe("image object retouch", () => {
  test("normalizes stored retouch settings", () => {
    const element = makeImageElement({
      objectRetouchTool: "wrong" as ImageElement["objectRetouchTool"],
      objectRetouchTargetX: 140,
      objectRetouchTargetY: -12,
      objectRetouchSourceX: 20,
      objectRetouchSourceY: 80,
      objectRetouchBrushSize: 0,
      objectRetouchSoftness: 150,
    });

    assert.equal(normalizeObjectRetouchTool("clone"), "clone");
    assert.equal(normalizeObjectRetouchTool("wrong"), "erase");
    assert.equal(normalizeRetouchCoordinate(140), 100);
    assert.equal(normalizeRetouchBrushSize(0), 1);
    assert.equal(normalizeRetouchSoftness(150), 100);
    assert.deepEqual(getImageObjectRetouchSettings(element), {
      tool: "erase",
      targetX: 100,
      targetY: 0,
      sourceX: 20,
      sourceY: 80,
      brushSize: 1,
      softness: 100,
    });
  });

  test("erases alpha inside the target brush", () => {
    const pixels = createSolidPixels(5, 5, [40, 80, 120, 255]);

    applyObjectRetouchToPixels({
      pixels,
      width: 5,
      height: 5,
      tool: "erase",
      targetX: 50,
      targetY: 50,
      sourceX: 0,
      sourceY: 0,
      brushSize: 40,
      softness: 0,
    });

    assert.equal(getPixel(pixels, 5, 2, 2).a, 0);
    assert.equal(getPixel(pixels, 5, 0, 0).a, 255);
  });

  test("clones source pixels into the target brush", () => {
    const pixels = createSolidPixels(5, 5, [10, 20, 30, 255]);
    setPixel(pixels, 5, 0, 0, [220, 30, 40, 255]);

    applyObjectRetouchToPixels({
      pixels,
      width: 5,
      height: 5,
      tool: "clone",
      targetX: 50,
      targetY: 50,
      sourceX: 0,
      sourceY: 0,
      brushSize: 40,
      softness: 0,
    });

    assert.deepEqual(getPixel(pixels, 5, 2, 2), {
      r: 220,
      g: 30,
      b: 40,
      a: 255,
    });
  });

  test("heals source texture toward target color", () => {
    const pixels = createSolidPixels(5, 5, [100, 100, 100, 255]);
    setPixel(pixels, 5, 0, 0, [200, 20, 20, 255]);

    applyObjectRetouchToPixels({
      pixels,
      width: 5,
      height: 5,
      tool: "heal",
      targetX: 50,
      targetY: 50,
      sourceX: 0,
      sourceY: 0,
      brushSize: 40,
      softness: 0,
    });

    const healed = getPixel(pixels, 5, 2, 2);

    assert.ok(healed.r < 200);
    assert.ok(healed.g > 20);
    assert.ok(healed.b > 20);
    assert.equal(healed.a, 255);
  });
});

function createSolidPixels(
  width: number,
  height: number,
  color: [number, number, number, number],
) {
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = color[0];
    pixels[index + 1] = color[1];
    pixels[index + 2] = color[2];
    pixels[index + 3] = color[3];
  }

  return pixels;
}

function getPixel(pixels: Uint8ClampedArray, width: number, x: number, y: number) {
  const index = (y * width + x) * 4;

  return {
    r: pixels[index] ?? 0,
    g: pixels[index + 1] ?? 0,
    b: pixels[index + 2] ?? 0,
    a: pixels[index + 3] ?? 0,
  };
}

function setPixel(
  pixels: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  color: [number, number, number, number],
) {
  const index = (y * width + x) * 4;

  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function makeImageElement(overrides: Partial<ImageElement>): ImageElement {
  return {
    id: "image-1",
    type: "image",
    src: "data:image/png;base64,test",
    alt: "Test",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    objectFit: "cover",
    ...overrides,
  };
}
