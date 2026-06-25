import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dialog = readFileSync(new URL("../src/features/projects/components/review-workspace-dialog.tsx", import.meta.url), "utf8");

assert.match(dialog, /type ReviewWorkspaceMessage/);
assert.match(dialog, /async function runReviewAction/);
assert.match(dialog, /Review workspace could not be loaded\./);
assert.match(dialog, /Comment could not be saved\./);
assert.match(dialog, /Comment status could not be updated\./);
assert.match(dialog, /Folder could not be created\./);
assert.match(dialog, /Project folder could not be updated\./);
assert.match(dialog, /Review link could not be created\./);
assert.match(dialog, /Workspace member could not be added\./);
assert.match(dialog, /Enter a valid workspace member name and email\./);
assert.match(dialog, /Workspace member could not be removed\./);
assert.match(dialog, /disabled=\{isReviewActionPending\}/);

console.log("Review workspace resilience checks passed.");
