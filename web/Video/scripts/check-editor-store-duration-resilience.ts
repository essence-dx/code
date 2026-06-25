import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = readFileSync(new URL("../src/features/editor/state/editor-store.ts", import.meta.url), "utf8");
const timelineEditSlice = readFileSync(new URL("../src/features/editor/state/editor-timeline-edit-slice.ts", import.meta.url), "utf8");

assert.match(store, /createEditorTimelineEditSlice\(set, get,/);
assert.match(timelineEditSlice, /function applyLayerPatch/);
assert.match(timelineEditSlice, /clampLayerTiming\(finiteNumber\(next\.start, layer\.start\), finiteNumber\(next\.duration, layer\.duration\)\)/);
assert.match(timelineEditSlice, /playbackRate: normalizePlaybackRate\(finiteNumber\(next\.playbackRate, layer\.playbackRate\), layer\.playbackRate\)/);
assert.match(timelineEditSlice, /speed: normalizeLayerSpeed\(next\.speed, finiteNumber\(next\.playbackRate, layer\.playbackRate\)\)/);
assert.match(timelineEditSlice, /track: Math\.max\(0, Math\.round\(finiteNumber\(next\.track, layer\.track\)\)\)/);
assert.match(timelineEditSlice, /duration: deps\.projectDurationForLayers\(project\.duration, layers\)/);
assert.match(timelineEditSlice, /duration: deps\.projectDurationForLayers\(maxEnd, layers\)/);
assert.match(store, /function projectDurationForLayers/);
assert.match(timelineEditSlice, /function finiteNumber\(value: unknown, fallback: number\)/);
assert.match(store, /return Math\.min\(max, Math\.max\(min, finiteNumber\(value, min\)\)\)/);

console.log("Editor store duration resilience checks passed.");
