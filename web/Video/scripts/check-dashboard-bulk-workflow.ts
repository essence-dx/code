import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const localLibraryHook = readFileSync("src/features/dashboard/hooks/use-dashboard-local-library.ts", "utf8");
const localLibraryCard = readFileSync("src/features/dashboard/components/local-project-library-card.tsx", "utf8");
assert.match(localLibraryHook, /selectedProjectIds/);
assert.match(localLibraryHook, /selectedProjectIdSet/);
assert.match(localLibraryHook, /allVisibleProjectsSelected/);
assert.match(localLibraryHook, /toggleProjectSelection/);
assert.match(localLibraryHook, /selectVisibleProjects/);
assert.match(localLibraryHook, /bulkAssignSelectedProjects/);
assert.match(localLibraryHook, /bulkDuplicateSelectedProjects/);
assert.match(localLibraryHook, /bulkMoveSelectedProjectsToTrash/);
assert.match(localLibraryCard, /ProjectBulkActionsBar/);
assert.match(localLibraryCard, /aria-label="Select visible projects"/);
assert.match(localLibraryCard, /aria-label=\{`Select \$\{item\.title\}`\}/);

const bulkBar = readFileSync("src/features/dashboard/components/project-bulk-actions-bar.tsx", "utf8");
assert.match(bulkBar, /type ProjectBulkActionsBarProps/);
assert.match(bulkBar, /selectedCount === 0/);
assert.match(bulkBar, /Move to folder/);
assert.match(bulkBar, /onAssignFolder/);
assert.match(bulkBar, /onDuplicate/);
assert.match(bulkBar, /onMoveToTrash/);
assert.match(bulkBar, /Select visible/);

console.log("Dashboard bulk workflow checks passed.");
