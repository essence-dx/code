import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const localLibraryCard = readFileSync("src/features/dashboard/components/local-project-library-card.tsx", "utf8");
const localLibraryHook = readFileSync("src/features/dashboard/hooks/use-dashboard-local-library.ts", "utf8");
assert.match(localLibraryCard, /ProjectSnapshotDialog/);
assert.match(localLibraryHook, /restoreSnapshot/);
assert.match(localLibraryHook, /deleteSnapshot/);
assert.match(localLibraryHook, /deleteLocalProjectSnapshot/);

const snapshotDialog = readFileSync("src/features/dashboard/components/project-snapshot-dialog.tsx", "utf8");
assert.match(snapshotDialog, /listLocalProjectSnapshots/);
assert.match(snapshotDialog, /DialogContent/);
assert.match(snapshotDialog, /Checkpoint history/);
assert.match(snapshotDialog, /No checkpoints yet/);
assert.match(snapshotDialog, /onRestoreSnapshot/);
assert.match(snapshotDialog, /onDeleteSnapshot/);
assert.match(snapshotDialog, /setSnapshots\(\(current\) => current\.filter/);

const localStore = readFileSync("src/lib/projects/local-project-store.ts", "utf8");
assert.match(localStore, /deleteLocalProjectSnapshot/);
assert.match(localStore, /db\.snapshots\.delete\(snapshotId\)/);

console.log("Snapshot browser workflow checks passed.");
