import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createLayerMotionGroupUpdates,
  createLayerMotionPresetPackUpdates,
  createLayerMotionReadinessReport,
} from "@/features/editor/layer-motion-advanced";
import type { DesignElement } from "@/features/editor/types";

describe("advanced layer motion", () => {
  test("applies reusable motion packs with editable keyframes", () => {
    const element = createShapeElement();
    const updates = createLayerMotionPresetPackUpdates(element, "slide-story");

    assert.equal(updates.motionPresetPackId, "slide-story");
    assert.equal(updates.motionPreset, "none");
    assert.equal(updates.motionDurationSeconds, 1.2);
    assert.equal(updates.motionEasing, "ease-in-out");
    assert.equal(updates.motionKeyframes?.length, 3);
    assert.equal(updates.motionKeyframes?.at(0)?.opacity, 0);
  });

  test("scores packed, grouped, keyframed motion as ready", () => {
    const element = {
      ...createShapeElement(),
      motionGroupId: "motion-hero",
      ...createLayerMotionPresetPackUpdates(createShapeElement(), "slide-story"),
    } as DesignElement;
    const report = createLayerMotionReadinessReport([element]);

    assert.equal(report.status, "ready");
    assert.equal(report.counts.animatedLayers, 1);
    assert.equal(report.counts.presetPackedLayers, 1);
    assert.equal(report.counts.customKeyframedLayers, 1);
    assert.equal(report.counts.timelineGroups, 1);
  });

  test("flags missing grouping and invalid duplicate keyframes", () => {
    const first = {
      ...createShapeElement({ id: "first" }),
      motionPreset: "fade" as const,
      motionDurationSeconds: 0.8,
    };
    const second = {
      ...createShapeElement({ id: "second" }),
      motionKeyframes: [
        { timeSeconds: 0, x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
        { timeSeconds: 0, x: 10, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
      ],
    };
    const report = createLayerMotionReadinessReport([first, second]);

    assert.equal(report.status, "attention");
    assert.equal(report.counts.invalidLayers, 1);
    assert.equal(
      report.checks.find((check) => check.id === "timeline-groups")?.status,
      "attention",
    );
    assert.equal(
      report.checks.find((check) => check.id === "export-readiness")?.status,
      "blocked",
    );
  });

  test("creates staggered timeline group updates", () => {
    const updates = createLayerMotionGroupUpdates({
      elements: [
        createShapeElement({ id: "first" }),
        createShapeElement({ id: "second" }),
      ],
      groupId: "motion-launch",
      startSeconds: 0.2,
      staggerSeconds: 0.15,
    });

    assert.deepEqual(updates, [
      {
        elementId: "first",
        updates: {
          motionGroupId: "motion-launch",
          motionStartSeconds: 0.2,
        },
      },
      {
        elementId: "second",
        updates: {
          motionGroupId: "motion-launch",
          motionStartSeconds: 0.35,
        },
      },
    ]);
  });
});

function createShapeElement(
  overrides: Partial<Extract<DesignElement, { type: "shape" }>> = {},
): DesignElement {
  return {
    id: "shape-1",
    type: "shape",
    shape: "rectangle",
    x: 100,
    y: 120,
    width: 240,
    height: 160,
    rotation: 0,
    opacity: 1,
    fill: "#0f172a",
    stroke: "#ffffff",
    strokeWidth: 0,
    radius: 12,
    ...overrides,
  };
}
