import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  appendDrawPoint,
  createDrawElementFromPoints,
  getDrawSvgPath,
  normalizeDrawPoints,
} from "@/features/editor/draw-strokes";

describe("draw strokes", () => {
  test("normalizes canvas points into a padded local stroke frame", () => {
    const frame = normalizeDrawPoints(
      [
        { x: 100, y: 120 },
        { x: 160, y: 180 },
      ],
      10,
    );

    assert.deepEqual(frame, {
      x: 93,
      y: 113,
      width: 74,
      height: 74,
      points: [
        { x: 7, y: 7 },
        { x: 67, y: 67 },
      ],
    });
  });

  test("creates highlighter and eraser stroke layers from points", () => {
    const highlighter = createDrawElementFromPoints({
      tool: "highlighter",
      points: [
        { x: 20, y: 20 },
        { x: 80, y: 20 },
      ],
    });
    const eraser = createDrawElementFromPoints({
      tool: "eraser",
      pageBackground: "#f8fafc",
      points: [
        { x: 20, y: 20 },
        { x: 80, y: 20 },
      ],
    });

    assert.equal(highlighter?.type, "draw");
    assert.equal(highlighter?.strokeOpacity, 0.42);
    assert.equal(eraser?.stroke, "#f8fafc");
    assert.equal(eraser?.strokeWidth, 32);
  });

  test("builds a smooth svg path and filters tiny pointer movement", () => {
    const points = appendDrawPoint([{ x: 0, y: 0 }], { x: 1, y: 1 }, 4);
    const nextPoints = appendDrawPoint(points, { x: 8, y: 0 }, 4);

    assert.equal(points.length, 1);
    assert.equal(nextPoints.length, 2);
    assert.equal(
      getDrawSvgPath([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 0 },
      ]),
      "M 0 0 Q 10 10 15 5 L 20 0",
    );
  });
});
