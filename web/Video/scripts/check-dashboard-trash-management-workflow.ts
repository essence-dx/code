import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const localLibraryHook = readFileSync("src/features/dashboard/hooks/use-dashboard-local-library.ts", "utf8");
const localLibraryCard = readFileSync("src/features/dashboard/components/local-project-library-card.tsx", "utf8");
assert.match(localLibraryCard, /DeletedProjectList/);
assert.match(localLibraryHook, /restoreTrashProjects/);
assert.match(localLibraryHook, /permanentlyDeleteTrashProjects/);
assert.match(localLibraryCard, /onRestoreMany/);
assert.match(localLibraryCard, /onDeleteMany/);
assert.match(localLibraryHook, /Projects could not be restored/);
assert.match(localLibraryHook, /Projects could not be permanently deleted/);

const deletedProjectList = readFileSync("src/features/dashboard/components/deleted-project-list.tsx", "utf8");
assert.match(deletedProjectList, /type DeletedProjectListProps|interface DeletedProjectListProps/);
assert.match(deletedProjectList, /ProjectTrashManagerDialog/);
assert.match(deletedProjectList, /Recently deleted/);
assert.match(deletedProjectList, /Restore projects before permanently removing them/);
assert.match(deletedProjectList, /onRestoreMany/);
assert.match(deletedProjectList, /onDeleteMany/);

const trashDialog = readFileSync("src/features/dashboard/components/project-trash-manager-dialog.tsx", "utf8");
assert.match(trashDialog, /type ProjectTrashManagerDialogProps/);
assert.match(trashDialog, /Deleted projects/);
assert.match(trashDialog, /Manage trash/);
assert.match(trashDialog, /Restore selected/);
assert.match(trashDialog, /Delete selected/);
assert.match(trashDialog, /Select deleted projects/);
assert.match(trashDialog, /onRestoreProjects/);
assert.match(trashDialog, /onDeleteProjects/);
assert.match(trashDialog, /Trash is empty/);

console.log("Dashboard trash management workflow checks passed.");
