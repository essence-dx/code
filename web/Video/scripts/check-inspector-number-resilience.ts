import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fields = readFileSync(new URL("../src/features/editor/components/inspector-fields.tsx", import.meta.url), "utf8");
const timing = readFileSync(new URL("../src/features/editor/components/inspector-timing-section.tsx", import.meta.url), "utf8");
const transform = readFileSync(new URL("../src/features/editor/components/inspector-transform-section.tsx", import.meta.url), "utf8");

assert.match(timing, /TIMELINE_MIN_LAYER_SECONDS/);
assert.match(fields, /function NumberField\(/);
assert.match(fields, /min\?: number/);
assert.match(fields, /max\?: number/);
assert.match(fields, /function handleChange\(rawValue: string\)/);
assert.match(fields, /rawValue\.trim\(\) === ""/);
assert.match(fields, /Number\.isFinite\(parsed\)/);
assert.match(fields, /clampInspectorNumber\(parsed, min, max\)/);
assert.match(fields, /function clampInspectorNumber/);
assert.match(timing, /label="Duration"[\s\S]*?min=\{TIMELINE_MIN_LAYER_SECONDS\}/);
assert.match(timing, /label="Speed"[\s\S]*?min=\{0\.1\}/);
assert.match(transform, /label="Width"[\s\S]*?min=\{1\}/);
assert.match(transform, /label="Height"[\s\S]*?min=\{1\}/);
assert.doesNotMatch(fields, /onChange=\{\(event\) => onChange\(Number\(event\.target\.value\)\)\}/);

console.log("Inspector number resilience checks passed.");
