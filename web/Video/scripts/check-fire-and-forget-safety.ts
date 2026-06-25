import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const localLibraryHook = read("src/features/dashboard/hooks/use-dashboard-local-library.ts");
assert.match(localLibraryHook, /void refreshProjects\(\)\.catch\(\(\) => undefined\)/);
assert.match(localLibraryHook, /async function refreshProjects\(\)[\s\S]*?try[\s\S]*?listLocalProjects\(\)[\s\S]*?catch/);
assert.match(localLibraryHook, /Local project library could not be loaded/);

const audioPreview = read("src/features/editor/components/audio-preview-button.tsx");
assert.match(audioPreview, /async function previewAudio/);
assert.match(audioPreview, /await togglePreview\(\)/);
assert.match(audioPreview, /catch[\s\S]*?setIsPlaying\(false\)/);
assert.match(audioPreview, /audioRef\.current\?\.pause\(\)/);

const reviewDialog = read("src/features/projects/components/review-workspace-dialog.tsx");
assert.match(reviewDialog, /void refresh\(\)\.catch\(\(\) => \{/);
assert.match(reviewDialog, /Review workspace could not be loaded\./);

const compositeRenderer = read("src/lib/render/composite-renderer.ts");
assert.match(compositeRenderer, /void audioContext\.resume\(\)\.catch\(\(\) => undefined\)/);

console.log("Fire-and-forget safety checks passed.");
