import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const currentProjectCard = readFileSync(new URL("../src/features/dashboard/components/current-project-card.tsx", import.meta.url), "utf8");
const localLibraryCard = readFileSync(new URL("../src/features/dashboard/components/local-project-library-card.tsx", import.meta.url), "utf8");
const signedInLibraryCard = readFileSync(new URL("../src/features/dashboard/components/signed-in-project-library-card.tsx", import.meta.url), "utf8");
const dashboardMessageView = readFileSync(new URL("../src/features/dashboard/components/dashboard-message-view.tsx", import.meta.url), "utf8");
const localLibraryHook = readFileSync(new URL("../src/features/dashboard/hooks/use-dashboard-local-library.ts", import.meta.url), "utf8");
const cloudLibraryHook = readFileSync(new URL("../src/features/dashboard/hooks/use-dashboard-cloud-library.ts", import.meta.url), "utf8");

assert.match(readFileSync(new URL("../src/features/dashboard/dashboard-types.ts", import.meta.url), "utf8"), /type DashboardMessage/);
assert.match(localLibraryHook, /const \[isLibraryActionPending, setIsLibraryActionPending\]/);
assert.match(cloudLibraryHook, /const \[isCloudActionPending, setIsCloudActionPending\]/);
assert.match(localLibraryHook, /async function runLocalLibraryAction/);
assert.match(localLibraryHook, /Project could not be opened\./);
assert.match(localLibraryHook, /Project could not be created\./);
assert.match(localLibraryHook, /Project could not be duplicated\./);
assert.match(localLibraryHook, /Project could not be deleted\./);
assert.match(cloudLibraryHook, /async function saveCloudMetadataLocally/);
assert.match(cloudLibraryHook, /Project metadata could not be saved locally\./);
assert.match(cloudLibraryHook, /Project metadata saved locally\./);
assert.match(dashboardMessageView, /export function DashboardMessageView/);
assert.match(localLibraryCard, /disabled=\{isLibraryActionPending\}/);
assert.match(currentProjectCard, /disabled=\{!canUseOnlineLibrary \|\| isCloudActionPending\}/);
assert.match(signedInLibraryCard, /disabled=\{isCloudActionPending\}/);
assert.doesNotMatch(cloudLibraryHook, /trySaveLocalProject\(shell\.project, shell\.mediaAssets\)\.then\(refreshLocalProjects\)/);

console.log("Dashboard action resilience checks passed.");
