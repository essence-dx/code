import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset, createProject } from "../src/lib/editor/factory";
import type { MediaAsset } from "../src/lib/editor/types";
import { createLocalProjectRecord, createLocalProjectTrashRecord, parseLocalProjectTrashRecord } from "../src/lib/projects/local-project-record";

const now = "2026-05-14T00:00:00.000Z";
const mediaAsset: MediaAsset = {
  id: "asset-trash",
  name: "trash.mp4",
  type: "video",
  mimeType: "video/mp4",
  size: 1200,
  duration: 5,
  storageKey: "asset-trash",
  source: "browser-indexeddb",
  objectUrl: "blob:trash",
  createdAt: now,
};
const project = createProject("Trash recovery project");
project.layers = [createLayerFromAsset(mediaAsset)];

const record = createLocalProjectRecord({
  project,
  mediaAssets: [mediaAsset],
  createdAt: now,
  updatedAt: now,
});
const trashRecord = createLocalProjectTrashRecord(record, now);
assert.equal(trashRecord.id, project.id);
assert.equal(trashRecord.deletedAt, now);
assert.equal(trashRecord.layerCount, 1);
assert.equal(trashRecord.mediaCount, 1);
assert.equal("objectUrl" in (trashRecord.mediaAssets[0] ?? {}), false);
assert.equal(parseLocalProjectTrashRecord(trashRecord)?.id, project.id);
assert.equal(parseLocalProjectTrashRecord({ ...trashRecord, deletedAt: "" }), null);

const localStore = readFileSync("src/lib/projects/local-project-store.ts", "utf8");
assert.match(localStore, /trash: EntityTable<LocalProjectTrashRecord, "id">/);
assert.match(localStore, /db\.version\(3\)\.stores/);
assert.match(localStore, /createLocalProjectTrashRecord/);
assert.match(localStore, /listLocalProjectTrash/);
assert.match(localStore, /restoreLocalProjectFromTrash/);
assert.match(localStore, /permanentlyDeleteLocalProject/);
assert.match(localStore, /db\.trash\.put\(trashRecord\)/);
assert.match(localStore, /db\.snapshots\.where\("projectId"\)\.equals\(id\)\.delete\(\)/);

const localLibraryHook = readFileSync("src/features/dashboard/hooks/use-dashboard-local-library.ts", "utf8");
const localLibraryCard = readFileSync("src/features/dashboard/components/local-project-library-card.tsx", "utf8");
assert.match(localLibraryCard, /trashProjects/);
assert.match(localLibraryCard, /DeletedProjectList/);
assert.match(localLibraryHook, /restoreTrashProject/);
assert.match(localLibraryHook, /restoreTrashProjects/);
assert.match(localLibraryHook, /permanentlyDeleteTrashProject/);
assert.match(localLibraryHook, /permanentlyDeleteTrashProjects/);
assert.match(localLibraryHook, /moved to trash/);

const deletedProjectList = readFileSync("src/features/dashboard/components/deleted-project-list.tsx", "utf8");
assert.match(deletedProjectList, /ProjectTrashManagerDialog/);
assert.match(deletedProjectList, /Recently deleted/);
assert.match(deletedProjectList, /Restore projects before permanently removing them/);

console.log("Local trash workflow checks passed.");
