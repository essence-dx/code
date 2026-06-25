import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detectProjectSyncConflict, normalizeRevisionTime, ProjectSyncConflictError } from "../src/lib/projects/project-sync-conflicts";
import { PROJECT_FORMAT_VERSION, type EditorProject } from "../src/lib/editor/types";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

const baseUpdatedAt = "2026-05-15T10:00:00.000Z";
const remoteUpdatedAt = "2026-05-15T10:05:00.000Z";
const localUpdatedAt = "2026-05-15T10:10:00.000Z";

assert.equal(normalizeRevisionTime(new Date(baseUpdatedAt)), baseUpdatedAt);
assert.equal(normalizeRevisionTime("not a date"), undefined);
assert.deepEqual(detectProjectSyncConflict({ baseUpdatedAt, remoteUpdatedAt, localUpdatedAt, mode: "reject-stale" }), {
  code: "project_conflict",
  baseUpdatedAt,
  remoteUpdatedAt,
  localUpdatedAt,
});
assert.equal(detectProjectSyncConflict({ baseUpdatedAt: remoteUpdatedAt, remoteUpdatedAt, localUpdatedAt }), null);
assert.equal(detectProjectSyncConflict({ baseUpdatedAt, remoteUpdatedAt, localUpdatedAt, mode: "force" }), null);
assert.equal(new ProjectSyncConflictError({ code: "project_conflict", remoteUpdatedAt, localUpdatedAt }).name, "ProjectSyncConflictError");

const project: EditorProject = {
  formatVersion: PROJECT_FORMAT_VERSION,
  id: "project_conflict_check",
  title: "Conflict check",
  aspectRatio: "16:9",
  width: 1920,
  height: 1080,
  duration: 30,
  fps: 30,
  background: "#111827",
  layers: [],
  updatedAt: localUpdatedAt,
};

assert.equal(
  syncedProjectPayloadSchema.safeParse({
    project,
    mediaAssets: [],
    sync: { baseUpdatedAt, mode: "reject-stale" },
  }).success,
  true,
);
assert.equal(
  syncedProjectPayloadSchema.safeParse({
    project,
    mediaAssets: [],
    sync: { baseUpdatedAt, mode: "silently-overwrite" },
  }).success,
  false,
);

const serverProjects = read("src/lib/projects/server-projects.ts");
assert.match(serverProjects, /detectProjectSyncConflict/);
assert.match(serverProjects, /ProjectSyncConflictError/);
assert.match(serverProjects, /Force cloud sync/);

const route = read("src/app/api/projects/route.ts");
assert.match(route, /project_conflict/);
assert.match(route, /status: 409/);

const client = read("src/lib/projects/project-sync-client.ts");
assert.match(client, /projectSyncConflictResponseSchema/);
assert.match(client, /parseProjectSyncConflict/);

const cloudSyncButton = read("src/features/projects/components/cloud-sync-button.tsx");
assert.match(cloudSyncButton, /Click Sync again to overwrite/);
assert.match(cloudSyncButton, /mode: forceNextSync \? "force" : "reject-stale"/);

const dashboardCloud = read("src/features/dashboard/hooks/use-dashboard-cloud-library.ts");
assert.match(dashboardCloud, /knownCloudProject\?\.updatedAt/);
assert.match(dashboardCloud, /Cloud copy changed/);

console.log("Project sync conflict checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
