import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createShapeLayer, createTextLayer } from "../src/lib/editor/factory";
import { applyTimelineCutRangesToLayers, normalizeTimelineCutRanges, shiftTimeAfterCuts } from "../src/lib/editor/timeline-cuts";
import { aiCapabilities } from "../src/lib/product/capabilities/ai";

const titleLayer = createTextLayer("text", 0);
titleLayer.name = "Long intro";
titleLayer.start = 0;
titleLayer.duration = 10;

const overlayLayer = createShapeLayer(1);
overlayLayer.name = "Lower third";
overlayLayer.start = 12;
overlayLayer.duration = 3;

const lockedLayer = createTextLayer("text", 2);
lockedLayer.name = "Locked watermark";
lockedLayer.start = 0;
lockedLayer.duration = 10;
lockedLayer.locked = true;

const ranges = normalizeTimelineCutRanges([
  { start: 2, end: 4, reason: "Dead air" },
  { start: 3.5, end: 4.5, reason: "Overlap should merge" },
  { start: 6, end: 7, reason: "Filler phrase" },
]);

assert.equal(ranges.length, 2);
assert.equal(ranges[0].start, 2);
assert.equal(ranges[0].end, 4.5);
assert.equal(ranges[0].duration, 2.5);
assert.equal(shiftTimeAfterCuts(12, ranges), 8.5);

const result = applyTimelineCutRangesToLayers([titleLayer, overlayLayer, lockedLayer], ranges, "2026-05-15T00:00:00.000Z");
assert.equal(result.ranges.length, 2);
assert.equal(result.durationRemoved, 3.5);
assert.equal(result.changedLayerCount, 2);
assert.equal(result.removedLayerCount, 0);
assert.equal(result.createdLayerCount, 2);
assert.equal(result.layers.length, 5);

const titleSegments = result.layers.filter((layer) => layer.name.startsWith("Long intro"));
assert.equal(titleSegments.length, 3);
assert.deepEqual(
  titleSegments.map((layer) => [layer.start, layer.duration, layer.trimStart]),
  [
    [0, 2, 0],
    [2, 1.5, 4.5],
    [3.5, 3, 7],
  ],
);

const shiftedOverlay = result.layers.find((layer) => layer.id === overlayLayer.id);
assert.equal(shiftedOverlay?.start, 8.5);
assert.equal(shiftedOverlay?.duration, 3);

const unchangedLocked = result.layers.find((layer) => layer.id === lockedLayer.id);
assert.equal(unchangedLocked?.start, 0);
assert.equal(unchangedLocked?.duration, 10);

const resultTypes = readFileSync(new URL("../src/features/editor/components/ai-result-types.ts", import.meta.url), "utf8");
const resultView = readFileSync(new URL("../src/features/editor/components/ai-result-view.tsx", import.meta.url), "utf8");
const assistantPanel = readFileSync(new URL("../src/features/editor/components/ai-assistant-panel.tsx", import.meta.url), "utf8");
const storeTypes = readFileSync(new URL("../src/features/editor/state/editor-store-types.ts", import.meta.url), "utf8");
const timelineEditSlice = readFileSync(new URL("../src/features/editor/state/editor-timeline-edit-slice.ts", import.meta.url), "utf8");

assert.match(resultTypes, /isSmartCutOutput/);
assert.match(resultView, /SmartCutReview/);
assert.match(resultView, /Apply accepted cuts/);
assert.match(assistantPanel, /applyTimelineCutRanges/);
assert.match(storeTypes, /applyTimelineCutRanges/);
assert.match(timelineEditSlice, /applyTimelineCutRangesToLayers/);

const smartCutCapability = aiCapabilities.find((capability) => capability.id === "smart-cut");
assert.match(smartCutCapability?.ownerPath ?? "", /timeline-cuts/);
assert.match(smartCutCapability?.evidence.join(" ") ?? "", /review queue/);

console.log("Smart-cut application workflow checks passed.");
