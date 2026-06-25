import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset, createProject } from "../src/lib/editor/factory";
import type { MediaAsset } from "../src/lib/editor/types";
import {
  createLocalProjectSnapshotRecord,
  parseLocalProjectSnapshotRecord,
} from "../src/lib/projects/local-project-record";

const now = "2026-05-14T00:00:00.000Z";
const mediaAsset: MediaAsset = {
  id: "asset-snapshot",
  name: "snapshot.mp4",
  type: "video",
  mimeType: "video/mp4",
  size: 1200,
  duration: 5,
  storageKey: "asset-snapshot",
  source: "browser-indexeddb",
  objectUrl: "blob:snapshot",
  createdAt: now,
};
const project = createProject("Snapshot project");
project.layers = [createLayerFromAsset(mediaAsset)];

const snapshot = createLocalProjectSnapshotRecord({
  project,
  mediaAssets: [mediaAsset],
  label: "Before caption cleanup",
  createdAt: now,
});
assert.match(snapshot.id, /^snapshot_/);
assert.equal(snapshot.projectId, project.id);
assert.equal(snapshot.label, "Before caption cleanup");
assert.equal(snapshot.layerCount, 1);
assert.equal(snapshot.mediaCount, 1);
assert.equal("objectUrl" in (snapshot.mediaAssets[0] ?? {}), false);
assert.equal(parseLocalProjectSnapshotRecord(snapshot)?.id, snapshot.id);
assert.equal(parseLocalProjectSnapshotRecord({ ...snapshot, label: "" }), null);

const localStore = readFileSync("src/lib/projects/local-project-store.ts", "utf8");
assert.match(localStore, /snapshots: EntityTable<LocalProjectSnapshotRecord, "id">/);
assert.match(localStore, /db\.version\(2\)\.stores/);
assert.match(localStore, /createLocalProjectSnapshot/);
assert.match(localStore, /listLocalProjectSnapshots/);
assert.match(localStore, /restoreLocalProjectSnapshot/);
assert.match(localStore, /deleteLocalProjectSnapshot/);
assert.match(localStore, /pruneLocalProjectSnapshots/);
assert.match(localStore, /db\.snapshots\.where\("projectId"\)\.equals\(id\)\.delete\(\)/);

const topbar = readFileSync("src/features/editor/components/project-topbar.tsx", "utf8");
assert.match(topbar, /SnapshotButton/);

const snapshotButton = readFileSync("src/features/projects/components/snapshot-button.tsx", "utf8");
assert.match(snapshotButton, /createLocalProjectSnapshot/);
assert.match(snapshotButton, /Create checkpoint/);
assert.match(snapshotButton, /Checkpoint created/);

const localLibraryHook = readFileSync("src/features/dashboard/hooks/use-dashboard-local-library.ts", "utf8");
const localLibraryCard = readFileSync("src/features/dashboard/components/local-project-library-card.tsx", "utf8");
assert.match(localLibraryCard, /snapshotCounts/);
assert.match(localLibraryCard, /ProjectSnapshotDialog/);
assert.match(localLibraryHook, /restoreSnapshot/);
assert.match(localLibraryHook, /deleteSnapshot/);
assert.match(localLibraryCard, /SnapshotCountBadge/);

console.log("Local snapshot workflow checks passed.");
