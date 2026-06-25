import assert from "node:assert/strict";
import type { MediaAsset } from "../src/lib/editor/types";
import {
  mediaRecoveryKey,
  recoverMediaAssets,
  selectMediaAssetsForRecovery,
  type MediaRecoveryAdapter,
} from "../src/lib/media/media-recovery";

const projectId = "project-recovery-check";

function asset(input: Partial<MediaAsset> & Pick<MediaAsset, "id" | "source" | "storageKey">): MediaAsset {
  return {
    name: `${input.id}.png`,
    type: "image",
    mimeType: "image/png",
    size: 1000,
    duration: 5,
    createdAt: "2026-05-14T00:00:00.000Z",
    ...input,
  };
}

const browserMissing = asset({
  id: "asset-browser",
  source: "browser-indexeddb",
  storageKey: "asset-browser",
});
const desktopMissing = asset({
  id: "asset-desktop",
  source: "tauri-fs",
  storageKey: "G:/missing/video.mp4",
  type: "video",
  mimeType: "video/mp4",
});
const alreadyLoaded = asset({
  id: "asset-loaded",
  source: "browser-indexeddb",
  storageKey: "asset-loaded",
  objectUrl: "blob:loaded",
});

const attempted = new Set<string>();
assert.deepEqual(
  selectMediaAssetsForRecovery(projectId, [browserMissing, desktopMissing, alreadyLoaded], attempted).map((item) => item.id),
  ["asset-browser", "asset-desktop"],
);

const adapters: MediaRecoveryAdapter[] = [
  {
    source: "browser-indexeddb",
    restore: async (item) => ({ ...item, objectUrl: "blob:restored-browser" }),
  },
  {
    source: "tauri-fs",
    restore: async (item) => item,
  },
];

const firstPass = await recoverMediaAssets(projectId, [browserMissing, desktopMissing, alreadyLoaded], adapters, attempted);
assert.deepEqual(firstPass.recovered.map((item) => item.id), ["asset-browser"]);
assert.deepEqual(firstPass.unavailable.map((item) => item.id), ["asset-desktop"]);
assert.equal(attempted.has(mediaRecoveryKey(projectId, browserMissing)), true);
assert.equal(attempted.has(mediaRecoveryKey(projectId, desktopMissing)), true);

const secondPass = await recoverMediaAssets(projectId, [browserMissing, desktopMissing], adapters, attempted);
assert.deepEqual(secondPass.recovered, []);
assert.deepEqual(secondPass.unavailable, []);

console.log("Media recovery scenarios passed.");
