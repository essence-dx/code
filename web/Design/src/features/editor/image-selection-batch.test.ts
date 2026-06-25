import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  applyColorRangeSelectionToPixels,
  applyMagicBrushSelectionToPixels,
  createObjectRegionFrameUpdates,
  createPhotoBatchPresetUpdates,
  createPhotoSelectionPresetUpdates,
  createPhotoSelectionReadinessReport,
  getPhotoSelectionSettings,
  normalizePhotoSelectionMode,
  normalizePhotoSelectionPresetId,
  normalizePhotoSelectionRegion,
} from "@/features/editor/image-selection-batch";
import type { DesignElement, ImageElement } from "@/features/editor/types";

describe("image selection batch workflows", () => {
  test("normalizes stored selection settings", () => {
    const element = makeImageElement({
      photoSelectionMode: "bad" as ImageElement["photoSelectionMode"],
      photoSelectionPresetId: "wrong" as ImageElement["photoSelectionPresetId"],
      photoSelectionBrushX: -20,
      photoSelectionBrushY: 140,
      photoSelectionBrushSize: 0,
      photoSelectionBrushRefine: 130,
      photoSelectionRegionX: 90,
      photoSelectionRegionY: 95,
      photoSelectionRegionWidth: 40,
      photoSelectionRegionHeight: 20,
    });

    assert.equal(normalizePhotoSelectionMode("magic-brush"), "magic-brush");
    assert.equal(normalizePhotoSelectionMode("wrong"), "color-range");
    assert.equal(
      normalizePhotoSelectionPresetId("portrait-soft-mask"),
      "portrait-soft-mask",
    );
    assert.equal(normalizePhotoSelectionPresetId("wrong"), "product-cutout");
    assert.deepEqual(normalizePhotoSelectionRegion({ x: 90, y: 95, width: 40, height: 20 }), {
      x: 90,
      y: 95,
      width: 10,
      height: 5,
    });
    assert.deepEqual(getPhotoSelectionSettings(element), {
      mode: "color-range",
      presetId: "product-cutout",
      brushX: 0,
      brushY: 100,
      brushSize: 1,
      brushRefine: 100,
      region: {
        x: 90,
        y: 95,
        width: 10,
        height: 5,
      },
    });
  });

  test("creates non-destructive preset updates for one image", () => {
    const element = makeImageElement({
      src: "data:image/png;base64,current",
    });
    const updates = createPhotoSelectionPresetUpdates(
      element,
      "product-cutout",
    ) as Partial<ImageElement>;

    assert.equal(updates.photoSelectionMode, "color-range");
    assert.equal(updates.photoSelectionPresetId, "product-cutout");
    assert.equal(updates.backgroundCutoutOriginalSrc, element.src);
    assert.equal(updates.backgroundCutoutEnabled, true);
    assert.equal(updates.filterSharpen, 16);
  });

  test("creates batch updates for image layers only", () => {
    const image = makeImageElement({ id: "image-1" });
    const text = { id: "text-1", type: "text" } as DesignElement;
    const updates = createPhotoBatchPresetUpdates([image, text], "web-ready");

    assert.equal(updates.length, 1);
    assert.equal(updates[0]?.elementId, "image-1");
    assert.equal(
      (updates[0]?.updates as Partial<ImageElement>).photoSelectionMode,
      "object-region",
    );
  });

  test("applies color range alpha selection to matching pixels", () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 10, 20, 30, 255,
    ]);

    applyColorRangeSelectionToPixels({
      pixels,
      color: "#ffffff",
      tolerance: 10,
      feather: 0,
      invert: false,
    });

    assert.equal(pixels[3], 0);
    assert.equal(pixels[7], 255);
  });

  test("applies magic brush alpha refinement inside the brush", () => {
    const pixels = createSolidPixels(5, 5, [255, 255, 255, 255]);
    setPixel(pixels, 5, 0, 0, [10, 10, 10, 255]);

    applyMagicBrushSelectionToPixels({
      pixels,
      width: 5,
      height: 5,
      brushX: 50,
      brushY: 50,
      brushSize: 100,
      refine: 80,
      invert: false,
    });

    assert.equal(getPixel(pixels, 5, 2, 2).a, 0);
    assert.equal(getPixel(pixels, 5, 0, 0).a, 255);
  });

  test("frames an object region through crop metadata", () => {
    const element = makeImageElement({
      photoSelectionRegionX: 25,
      photoSelectionRegionY: 30,
      photoSelectionRegionWidth: 50,
      photoSelectionRegionHeight: 40,
    });
    const updates = createObjectRegionFrameUpdates(
      element,
    ) as Partial<ImageElement>;

    assert.equal(updates.objectFit, "cover");
    assert.equal(updates.cropEnabled, true);
    assert.equal(updates.cropScale, 200);
    assert.equal(updates.cropX, 0);
    assert.equal(updates.cropY, 0);
  });

  test("reports image selection readiness for batch editing", () => {
    const report = createPhotoSelectionReadinessReport([
      makeImageElement({
        photoSelectionMode: "magic-brush",
        backgroundCutoutOriginalSrc: "data:image/png;base64,original",
        photoSelectionRegionWidth: 60,
        photoSelectionRegionHeight: 60,
      }),
      makeImageElement({ id: "image-2" }),
    ]);

    assert.equal(report.imageLayers, 2);
    assert.equal(report.layersWithSelections, 1);
    assert.equal(report.layersWithOriginals, 1);
    assert.equal(report.layersWithRegions, 1);
    assert.equal(report.score, 68);
    assert.deepEqual(report.issues, []);
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

function makeImageElement(overrides: Partial<ImageElement> = {}): ImageElement {
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
