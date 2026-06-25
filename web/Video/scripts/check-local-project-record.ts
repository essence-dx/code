import assert from "node:assert/strict";
import { createProject } from "../src/lib/editor/factory";
import { PROJECT_FORMAT_VERSION, type MediaAsset } from "../src/lib/editor/types";
import { createLocalProjectRecord, parseLocalProjectRecord } from "../src/lib/projects/local-project-record";

const now = "2026-05-14T00:00:00.000Z";
const project = createProject("Local record check", "16:9");
const mediaAsset: MediaAsset = {
  id: "asset_local_check",
  name: "clip.mp4",
  type: "video",
  mimeType: "video/mp4",
  size: 1000,
  duration: 5,
  width: 1920,
  height: 1080,
  storageKey: "asset_local_check",
  source: "browser-indexeddb",
  objectUrl: "blob:local",
  createdAt: now,
};

const record = createLocalProjectRecord({ project, mediaAssets: [mediaAsset], createdAt: now, updatedAt: now });
assert.equal(record.project.formatVersion, PROJECT_FORMAT_VERSION);
assert.equal("objectUrl" in (record.mediaAssets[0] ?? {}), false);
assert.equal(record.mediaCount, 1);
assert.equal(record.layerCount, 0);
assert.equal(parseLocalProjectRecord(record)?.id, record.id);
assert.equal(parseLocalProjectRecord({ ...record, duration: Number.NaN }), null);
assert.equal(parseLocalProjectRecord({ ...record, project: { ...record.project, width: 0 } }), null);

console.log("Local project record checks passed.");
