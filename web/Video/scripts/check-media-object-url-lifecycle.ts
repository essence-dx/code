import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = readFileSync(new URL("../src/features/editor/state/editor-store.ts", import.meta.url), "utf8");
const mediaSlice = readFileSync(new URL("../src/features/editor/state/editor-media-slice.ts", import.meta.url), "utf8");
const projectPlaybackSlice = readFileSync(new URL("../src/features/editor/state/editor-project-playback-slice.ts", import.meta.url), "utf8");

assert.match(store, /createEditorProjectPlaybackSlice\(set, get,/);
assert.match(store, /createEditorMediaSlice\(set, get,/);
assert.match(projectPlaybackSlice, /createNewProject: [\s\S]*?deps\.revokeMediaAssetObjectUrls\(state\.mediaAssets\);/);
assert.match(projectPlaybackSlice, /loadProject: [\s\S]*?deps\.revokeMediaAssetObjectUrls\(state\.mediaAssets, mediaAssets\);/);
assert.match(mediaSlice, /addMediaAsset: \(asset\) => set\(\(state\) => \(\{ mediaAssets: deps\.upsertAsset\(state\.mediaAssets, asset\) \}\)\)/);
assert.match(mediaSlice, /removeMediaAsset: [\s\S]*?deps\.revokeRemovedMediaRecovery\(state\.lastRemovedMedia\);/);
assert.match(mediaSlice, /restoreLastRemovedMedia: [\s\S]*?deps\.upsertAsset\(state\.mediaAssets, recovery\.asset\)/);
assert.match(store, /const existing = assets\.find\(\(item\) => item\.id === asset\.id\);/);
assert.match(store, /revokeReplacedObjectUrl\(existing, asset\);/);
assert.match(store, /function revokeMediaAssetObjectUrls\(assets: MediaAsset\[\], keepAssets: MediaAsset\[\] = \[\]\)/);
assert.match(store, /const keepUrls = new Set\(keepAssets\.flatMap\(\(asset\) => \(asset\.objectUrl \? \[asset\.objectUrl\] : \[\]\)\)\);/);
assert.match(store, /if \(!asset\.objectUrl \|\| keepUrls\.has\(asset\.objectUrl\)\) return;/);
assert.match(store, /previous\.objectUrl && previous\.objectUrl !== next\.objectUrl/);
assert.match(store, /if \(objectUrl\.startsWith\("blob:"\)\) \{\s*URL\.revokeObjectURL\(objectUrl\);/);
assert.equal(store.match(/URL\.revokeObjectURL/g)?.length, 1);

console.log("Media object URL lifecycle checks passed.");
