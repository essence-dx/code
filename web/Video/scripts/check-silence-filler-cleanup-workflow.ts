import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset, createTextLayer } from "../src/lib/editor/factory";
import { createTimelineCleanupCutOutput, detectSilentSourceRanges } from "../src/lib/editor/cleanup-cuts";
import { applyTimelineCutRangesToLayers } from "../src/lib/editor/timeline-cuts";
import { aiCapabilities } from "../src/lib/product/capabilities/ai";
import type { MediaAsset } from "../src/lib/editor/types";

const subtitleLayer = createTextLayer("subtitle", 0);
subtitleLayer.start = 0;
subtitleLayer.duration = 12;
subtitleLayer.cues = [
  { id: "caption-1", start: 0, end: 1, text: "Welcome to the edit", emphasis: "normal" },
  { id: "caption-2", start: 2, end: 2.8, text: "um this part can go", emphasis: "normal" },
  { id: "caption-3", start: 7, end: 8, text: "keep this line", emphasis: "normal" },
];

const asset: MediaAsset = {
  id: "asset-audio",
  name: "dialogue.wav",
  type: "audio",
  mimeType: "audio/wav",
  size: 1200,
  duration: 8,
  waveformPeaks: [0.44, 0.38, 0.4, 0.31, 0.01, 0.015, 0.02, 0.34, 0.41, 0.39, 0.02, 0.018, 0.36, 0.4, 0.38, 0.42],
  storageKey: "browser-media/dialogue.wav",
  source: "browser-indexeddb",
  createdAt: "2026-05-15T00:00:00.000Z",
};

const audioLayer = createLayerFromAsset(asset, 1);
audioLayer.start = 10;
audioLayer.duration = 8;

const silentRanges = detectSilentSourceRanges(asset.waveformPeaks ?? [], asset.duration, 0.045, 0.45);
assert.deepEqual(silentRanges, [
  { start: 2, end: 3.5 },
  { start: 5, end: 6 },
]);

const output = createTimelineCleanupCutOutput([subtitleLayer, audioLayer], [asset]);
assert.equal(output.objective.includes("Review silence"), true);
assert.equal(output.cuts.some((cut) => cut.reason.includes("filler phrase")), true);
assert.equal(output.cuts.some((cut) => cut.reason.includes("low-volume audio")), true);
assert.equal(output.cuts.some((cut) => cut.start === 2 && cut.end === 2.8), true);
assert.equal(output.cuts.some((cut) => cut.start === 12 && cut.end === 13.5), true);

const applied = applyTimelineCutRangesToLayers(
  [subtitleLayer, audioLayer],
  output.cuts.map((cut) => ({ start: cut.start, end: cut.end, reason: cut.reason })),
);
assert.equal(applied.changedLayerCount >= 2, true);
assert.equal(applied.ranges.length >= 3, true);

const assistantPanel = readFileSync(new URL("../src/features/editor/components/ai-assistant-panel.tsx", import.meta.url), "utf8");
assert.match(assistantPanel, /createTimelineCleanupCutOutput/);
assert.match(assistantPanel, /Review silence\/fillers/);
assert.match(assistantPanel, /setResult\(\{ action: "smart-cut", output \}\)/);

const silenceCapability = aiCapabilities.find((capability) => capability.id === "applied-silence-removal");
assert.match(silenceCapability?.evidence.join(" ") ?? "", /silence/);
assert.match(silenceCapability?.evidence.join(" ") ?? "", /filler/);

console.log("Silence and filler cleanup workflow checks passed.");
