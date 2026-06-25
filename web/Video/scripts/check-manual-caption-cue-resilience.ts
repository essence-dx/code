import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const inspector = readFileSync(new URL("../src/features/editor/components/inspector-panel.tsx", import.meta.url), "utf8");

assert.match(inspector, /import type \{ LayerStyle, LayerTransform, SubtitleCue, TimelineLayer \}/);
assert.match(inspector, /cues: parseManualCaptionText\(event\.target\.value, layer\.cues\)/);
assert.match(inspector, /function parseManualCaptionText\(value: string, existingCues: SubtitleCue\[\] = \[\]\)/);
assert.match(inspector, /parseManualCaptionLine\(line, index, existingCues\[index\]\?\.id\)/);
assert.match(inspector, /function parseManualCaptionLine\(line: string, index: number, existingId\?: string\): SubtitleCue/);
assert.match(inspector, /const fallbackStart = index \* 2;/);
assert.match(inspector, /const fallbackEnd = fallbackStart \+ 2;/);
assert.match(inspector, /const match = line\.match\(/);
assert.ok(inspector.includes("\\s*-\\s*"), "Manual cue parser should accept spaced start-end timing separators.");
assert.ok(inspector.includes("\\d+(?:\\.\\d+)?"), "Manual cue parser should only read finite decimal timing tokens.");
assert.match(inspector, /Number\.isFinite\(start\) \|\| !Number\.isFinite\(end\) \|\| end <= start/);
assert.match(inspector, /function createManualCaptionCue\(existingId: string \| undefined, start: number, end: number, text: string\): SubtitleCue/);
assert.match(inspector, /id: existingId \?\? crypto\.randomUUID\(\)/);
assert.doesNotMatch(inspector, /Number\(line\.match/);
assert.doesNotMatch(inspector, /line\.replace\(\/\^\[\\d\.\]\+-\[\\d\.\]\+/);

console.log("Manual caption cue resilience checks passed.");
