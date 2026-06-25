import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mediaBin = readFileSync(new URL("../src/features/editor/components/media-bin.tsx", import.meta.url), "utf8");
const mediaBinTypes = readFileSync(new URL("../src/features/editor/components/media-bin-types.ts", import.meta.url), "utf8");
const importControls = readFileSync(new URL("../src/features/editor/components/media-bin-import-controls.tsx", import.meta.url), "utf8");

assert.match(mediaBinTypes, /export type MediaPanelMessage/);
assert.match(importControls, /onReconnectMissingMediaBatch/);
assert.match(importControls, /onImportDesktopFiles/);
assert.match(mediaBin, /let importedCount = 0/);
assert.match(mediaBin, /let failedCount = 0/);
assert.match(mediaBin, /addMediaAsset\(await saveBrowserMedia\(file\)\)/);
assert.match(mediaBin, /failedCount \+= 1/);
assert.match(mediaBin, /mediaImportResultMessage\(importedCount, failedCount\)/);
assert.match(mediaBin, /Selected file could not reconnect this media item\./);
assert.match(mediaBin, /desktopImportFailureMessage\(error\)/);

console.log("Media import resilience checks passed.");
