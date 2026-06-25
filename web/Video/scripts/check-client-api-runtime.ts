import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const clientApi = read("src/lib/runtime/client-api.ts");
assert.match(clientApi, /NEXT_PUBLIC_ESSENCE_API_ORIGIN/);
assert.match(clientApi, /__TAURI_INTERNALS__/);
assert.match(clientApi, /ClientApiUnavailableError/);
assert.match(clientApi, /clientApiUnavailableMessage/);
assert.match(clientApi, /isClientApiUnavailableError/);
assert.match(clientApi, /clientApiUrl/);
assert.match(clientApi, /hasClientApiRuntime/);
assert.match(clientApi, /useHasClientApiRuntime/);
assert.match(clientApi, /useIsDesktopRuntime/);
assert.match(clientApi, /useEffect/);
assert.match(clientApi, /useState\(true\)/);
assert.doesNotMatch(clientApi, /typeof window === "undefined"/);

const authClient = read("src/lib/auth/client.ts");
assert.match(authClient, /clientApiOrigin/);
assert.match(authClient, /baseURL/);

const aiPanel = read("src/features/editor/components/ai-assistant-panel.tsx");
assert.match(aiPanel, /clientApiUrl\("\/api\/ai\/editor"\)/);
assert.match(aiPanel, /assertClientApiRuntime/);
assert.match(aiPanel, /isClientApiUnavailableError/);
assert.match(aiPanel, /useHasClientApiRuntime/);
assert.match(aiPanel, /aiAssistantExceptionMessage/);
assert.match(aiPanel, /readAiResponse/);
assert.doesNotMatch(aiPanel, /requestError instanceof Error \? requestError\.message/);

const projectSync = read("src/lib/projects/project-sync-client.ts");
assert.match(projectSync, /clientApiUrl\("\/api\/projects"\)/);
assert.match(projectSync, /credentials: "include"/);
assert.match(projectSync, /assertClientApiRuntime/);
assert.match(projectSync, /readProjectResponse/);
assert.match(projectSync, /safeParse/);
assert.doesNotMatch(projectSync, /as SyncedProjectSummary/);
assert.doesNotMatch(projectSync, /as \{ id: string; updatedAt: string \}/);

const currentProjectCard = read("src/features/dashboard/components/current-project-card.tsx");
assert.match(currentProjectCard, /disabled=\{!canUseOnlineLibrary \|\| isCloudActionPending\}/);

const signedInProjectLibraryCard = read("src/features/dashboard/components/signed-in-project-library-card.tsx");
assert.match(signedInProjectLibraryCard, /disabled=\{!canUseOnlineLibrary \|\| isCloudActionPending\}/);

const dashboardCloudLibrary = read("src/features/dashboard/hooks/use-dashboard-cloud-library.ts");
assert.match(dashboardCloudLibrary, /useHasClientApiRuntime/);
assert.match(dashboardCloudLibrary, /isClientApiUnavailableError/);
assert.match(dashboardCloudLibrary, /syncFailureMessage/);

const cloudSyncButton = read("src/features/projects/components/cloud-sync-button.tsx");
assert.match(cloudSyncButton, /useHasClientApiRuntime/);
assert.match(cloudSyncButton, /isClientApiUnavailableError/);
assert.match(cloudSyncButton, /disabled=\{isSyncing \|\| !canSync\}/);

const authPanel = read("src/features/auth/components/auth-panel.tsx");
assert.match(authPanel, /useHasClientApiRuntime/);
assert.match(authPanel, /assertClientApiRuntime/);
assert.match(authPanel, /isClientApiUnavailableError/);

const envExample = read(".env.example");
assert.match(envExample, /NEXT_PUBLIC_ESSENCE_API_ORIGIN=/);

console.log("Client API runtime guard passed.");
