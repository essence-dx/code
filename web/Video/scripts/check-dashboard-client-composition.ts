import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const dashboardClient = read("src/features/dashboard/components/dashboard-client.tsx");
const controller = read("src/features/dashboard/hooks/use-dashboard-client-controller.ts");
const overviewSection = read("src/features/dashboard/components/dashboard-overview-section.tsx");
const librarySection = read("src/features/dashboard/components/dashboard-library-section.tsx");

assert.match(dashboardClient, /useDashboardClientController/);
assert.match(dashboardClient, /DashboardOverviewSection/);
assert.match(dashboardClient, /DashboardLibrarySection/);
assert.doesNotMatch(dashboardClient, /useRouter/);
assert.doesNotMatch(dashboardClient, /useEditorStore/);
assert.doesNotMatch(dashboardClient, /useDashboardLocalLibrary/);
assert.doesNotMatch(dashboardClient, /useDashboardCloudLibrary/);

assert.match(controller, /useRouter/);
assert.match(controller, /useEditorStore/);
assert.match(controller, /useDashboardLocalLibrary/);
assert.match(controller, /useDashboardCloudLibrary/);
assert.match(controller, /openEditor = \(\) => router\.push\("\/editor"\)/);
assert.match(controller, /refreshLocalProjects: localLibrary\.refreshProjects/);

assert.match(overviewSection, /CurrentProjectCard/);
assert.match(overviewSection, /AiWorkspaceCard/);
assert.match(overviewSection, /onCreatePresetProject/);
assert.match(overviewSection, /onSyncCurrentProject/);

assert.match(librarySection, /LocalProjectLibraryCard/);
assert.match(librarySection, /SignedInProjectLibraryCard/);
assert.match(librarySection, /bundleInputRef/);

console.log("Dashboard client composition checks passed.");
