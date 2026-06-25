import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const collaborationStore = read("src/lib/projects/collaboration-store.ts");
assert.match(collaborationStore, /export interface WorkspaceActivityReport/);
assert.match(collaborationStore, /createWorkspaceActivityReport/);
assert.match(collaborationStore, /exportReviewCount/);
assert.match(collaborationStore, /downloadBytes/);
assert.match(collaborationStore, /recentExports/);

const activityCard = read("src/features/settings/components/workspace-activity-card.tsx");
assert.match(activityCard, /WorkspaceActivityCard/);
assert.match(activityCard, /createWorkspaceActivityReport/);
assert.match(activityCard, /AI usage/);
assert.match(activityCard, /Completed export reviews will appear here/);

const settingsPage = read("src/app/settings/page.tsx");
assert.match(settingsPage, /WorkspaceActivityCard/);
assert.match(settingsPage, /recentGenerations: generationReview\.length/);

const capabilities = read("src/lib/product/capabilities/collaboration.ts");
assert.match(capabilities, /workspace activity reporting/);
assert.match(capabilities, /workspace activity/);

console.log("Workspace activity view checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
