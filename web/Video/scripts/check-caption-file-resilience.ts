import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const inspector = readFileSync(new URL("../src/features/editor/components/inspector-panel.tsx", import.meta.url), "utf8");

assert.match(inspector, /const \[captionMessage, setCaptionMessage\]/);
assert.match(inspector, /const \[isImportingCaptions, setIsImportingCaptions\]/);
assert.match(inspector, /try \{[\s\S]*?parseSubtitleFile\(await file\.text\(\)\)/);
assert.match(inspector, /No captions found in this file\./);
assert.match(inspector, /Caption file could not be imported\./);
assert.match(inspector, /finally \{[\s\S]*?setIsImportingCaptions\(false\)/);
assert.match(inspector, /function exportCaptions/);
assert.match(inspector, /Caption file downloaded\./);
assert.match(inspector, /Caption file could not be downloaded\./);
assert.match(inspector, /disabled=\{isImportingCaptions\}/);

console.log("Caption file resilience checks passed.");
