import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = readFileSync(new URL("../src/lib/projects/collaboration-store.ts", import.meta.url), "utf8");
const dialog = readFileSync(new URL("../src/features/projects/components/review-workspace-dialog.tsx", import.meta.url), "utf8");

assert.match(store, /const time = normalizeCommentTime\(input\.time\);/);
assert.match(store, /const layerId = normalizeOptionalId\(input\.layerId\);/);
assert.match(store, /time,/);
assert.match(store, /layerId,/);
assert.match(store, /function normalizeCommentTime\(value: number \| undefined\)/);
assert.match(store, /Number\.isFinite\(value\) && value >= 0 && value <= 7200/);
assert.match(store, /function normalizeOptionalId\(value: string \| undefined\)/);
assert.match(store, /slice\(0, 160\)/);
assert.match(store, /if \(!name \|\| !isWorkspaceEmail\(email\)\) return null;/);
assert.match(store, /function isWorkspaceEmail\(value: string\)/);
assert.ok(store.includes("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"), "Workspace member emails should be checked before saving.");

assert.match(dialog, /const member = await addWorkspaceMember/);
assert.match(dialog, /if \(!member\) \{/);
assert.match(dialog, /Enter a valid workspace member name and email\./);

console.log("Collaboration data validation checks passed.");
