import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  canCreateBooleanShape,
  createBooleanShapeElement,
  replaceBooleanShapeSources,
} from "@/features/editor/boolean-shapes";
import type { DesignElement, ShapeElement } from "@/features/editor/types";

describe("boolean shape helpers", () => {
  test("creates a union path from selected closed shapes", () => {
    const elements = [makeRectangle("a", 10, 20, 120, 90), makeEllipse("b")];
    const result = createBooleanShapeElement({
      elements,
      elementIds: ["a", "b"],
      operation: "union",
    });

    assert.ok(result);
    assert.equal(result.name, "Union shape");
    assert.equal(result.x, 10);
    assert.equal(result.y, 20);
    assert.equal(result.width, 160);
    assert.equal(result.height, 110);
    assert.equal(result.fillRule, "nonzero");
    assert.equal(result.booleanSourcePaths?.length, 2);
    assert.equal(result.booleanSourceElementIds?.join(","), "a,b");
    assert.match(result.customPathData ?? "", /^M 0 0 H 120/);
  });

  test("creates subtract and exclude results with source paths preserved", () => {
    const elements = [
      makeRectangle("base", 10, 20, 120, 90),
      makeRectangle("cut", 60, 50, 40, 40),
    ];
    const subtract = createBooleanShapeElement({
      elements,
      elementIds: ["base", "cut"],
      operation: "subtract",
    });
    const exclude = createBooleanShapeElement({
      elements,
      elementIds: ["base", "cut"],
      operation: "exclude",
    });

    assert.ok(subtract);
    assert.equal(subtract.width, 120);
    assert.equal(subtract.height, 90);
    assert.equal(subtract.booleanOperation, "subtract");
    assert.equal(subtract.booleanSourcePaths?.[1], "M 50 30 H 90 V 70 H 50 Z");

    assert.ok(exclude);
    assert.equal(exclude.fillRule, "evenodd");
    assert.equal(exclude.booleanOperation, "exclude");
  });

  test("creates intersection bounds and skips non-overlapping shapes", () => {
    const elements = [
      makeRectangle("a", 10, 20, 120, 90),
      makeRectangle("b", 80, 60, 90, 80),
    ];
    const intersect = createBooleanShapeElement({
      elements,
      elementIds: ["a", "b"],
      operation: "intersect",
    });
    const empty = createBooleanShapeElement({
      elements: [makeRectangle("a", 0, 0, 20, 20), makeRectangle("b", 40, 40)],
      elementIds: ["a", "b"],
      operation: "intersect",
    });

    assert.ok(intersect);
    assert.equal(intersect.x, 80);
    assert.equal(intersect.y, 60);
    assert.equal(intersect.width, 50);
    assert.equal(intersect.height, 50);
    assert.equal(empty, null);
  });

  test("filters unsupported selections and replaces sources in layer order", () => {
    const line = makeRectangle("line", 0, 0);
    line.shape = "line";
    const locked = makeRectangle("locked", 30, 30);
    locked.locked = true;
    const elements: DesignElement[] = [
      makeRectangle("before", -30, 0),
      makeRectangle("a", 0, 0),
      line,
      locked,
      makeRectangle("b", 40, 40),
      makeRectangle("after", 120, 0),
    ];
    const result = createBooleanShapeElement({
      elements,
      elementIds: ["a", "line", "locked", "b"],
      operation: "union",
    });

    assert.equal(canCreateBooleanShape(elements, ["a", "line"]), false);
    assert.ok(result);

    const replaced = replaceBooleanShapeSources(elements, ["a", "b"], result);

    assert.deepEqual(
      replaced.map((element) => element.id),
      ["before", result.id, "line", "locked", "after"],
    );
  });
});

function makeRectangle(
  id: string,
  x: number,
  y: number,
  width = 80,
  height = 80,
): ShapeElement {
  return {
    id,
    type: "shape",
    shape: "rectangle",
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    fill: "#38bdf8",
    stroke: "#0f172a",
    strokeWidth: 2,
    radius: 0,
  };
}

function makeEllipse(id: string): ShapeElement {
  return {
    ...makeRectangle(id, 80, 70, 90, 60),
    shape: "ellipse",
  };
}
