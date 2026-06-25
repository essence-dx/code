import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createVectorPathGeometry,
  getVectorPathData,
  updateVectorPathSegment,
} from "@/features/editor/vector-path";
import type { VectorPathElement } from "@/features/editor/types";

describe("vector path helpers", () => {
  test("creates predictable Bezier path data", () => {
    const element: VectorPathElement = {
      id: "path-1",
      type: "path",
      name: "Curve",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      pathPreset: "curve",
      startX: 10,
      startY: 72,
      closed: false,
      fill: "#38bdf8",
      stroke: "#0f172a",
      strokeWidth: 4,
      segments: [
        {
          control1X: 22,
          control1Y: 8,
          control2X: 76,
          control2Y: 10,
          x: 90,
          y: 66,
        },
      ],
    };

    assert.equal(
      getVectorPathData(element),
      "M 10 72 C 22 8 76 10 90 66",
    );
  });

  test("creates closed blob geometry and open wave geometry", () => {
    const blob = createVectorPathGeometry({
      preset: "blob",
      width: 200,
      height: 100,
    });
    const wave = createVectorPathGeometry({
      preset: "wave",
      width: 200,
      height: 100,
    });

    assert.equal(blob.closed, true);
    assert.equal(blob.segments.length, 3);
    assert.equal(wave.closed, false);
    assert.equal(wave.segments.length, 2);
  });

  test("updates one segment without mutating the others", () => {
    const segments = createVectorPathGeometry({
      preset: "wave",
      width: 200,
      height: 100,
    }).segments;
    const updated = updateVectorPathSegment(segments, 1, { y: 80 });

    assert.equal(updated[0]?.y, segments[0]?.y);
    assert.equal(updated[1]?.y, 80);
    assert.notEqual(updated, segments);
  });
});
