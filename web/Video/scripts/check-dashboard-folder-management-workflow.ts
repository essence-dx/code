import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = readFileSync("src/lib/projects/collaboration-store.ts", "utf8");
assert.match(store, /renameProjectFolder/);
assert.match(store, /deleteProjectFolder/);
assert.match(store, /normalizeProjectFolderName/);
assert.match(store, /db\.assignments\.where\("folderId"\)\.equals\(folderId\)\.delete\(\)/);

const localLibraryCard = readFileSync("src/features/dashboard/components/local-project-library-card.tsx", "utf8");
const localLibraryHook = readFileSync("src/features/dashboard/hooks/use-dashboard-local-library.ts", "utf8");
assert.match(localLibraryCard, /ProjectFolderManagerDialog/);
assert.match(localLibraryCard, /folderCounts/);
assert.match(localLibraryHook, /createLibraryFolder/);
assert.match(localLibraryHook, /renameLibraryFolder/);
assert.match(localLibraryHook, /deleteLibraryFolder/);
assert.match(localLibraryHook, /Folder removed and projects left unfiled/);

const manager = readFileSync("src/features/dashboard/components/project-folder-manager-dialog.tsx", "utf8");
assert.match(manager, /type ProjectFolderManagerDialogProps/);
assert.match(manager, /Manage folders/);
assert.match(manager, /onCreateFolder/);
assert.match(manager, /onRenameFolder/);
assert.match(manager, /onDeleteFolder/);
assert.match(manager, /No folders yet/);
assert.match(manager, /aria-label=\{`Rename \$\{folder\.name\}`\}/);
assert.match(manager, /aria-label=\{`Remove \$\{folder\.name\}`\}/);

console.log("Dashboard folder management workflow checks passed.");
