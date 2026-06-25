import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const localLibraryCard = readFileSync("src/features/dashboard/components/local-project-library-card.tsx", "utf8");
const localLibraryHook = readFileSync("src/features/dashboard/hooks/use-dashboard-local-library.ts", "utf8");
assert.match(localLibraryHook, /listProjectFolders/);
assert.match(localLibraryHook, /getProjectFolderAssignment/);
assert.match(localLibraryHook, /assignProjectFolder/);
assert.match(localLibraryHook, /createProjectFolder/);
assert.match(localLibraryHook, /folderAssignments/);
assert.match(localLibraryHook, /folderFilter/);
assert.match(localLibraryHook, /matchesFolderFilter/);
assert.match(localLibraryCard, /ProjectFolderDialog/);
assert.match(localLibraryCard, /ProjectFolderBadge/);
assert.match(localLibraryCard, /All folders/);
assert.match(localLibraryCard, /No folder/);

const folderDialog = readFileSync("src/features/dashboard/components/project-folder-dialog.tsx", "utf8");
assert.match(folderDialog, /type ProjectFolderDialogProps/);
assert.match(folderDialog, /onAssignFolder/);
assert.match(folderDialog, /onCreateFolder/);
assert.match(folderDialog, /Project folder/);
assert.match(folderDialog, /Project folder could not be updated/);
assert.match(folderDialog, /Folder could not be created/);
assert.match(folderDialog, /No folder/);

console.log("Dashboard folder workflow checks passed.");
