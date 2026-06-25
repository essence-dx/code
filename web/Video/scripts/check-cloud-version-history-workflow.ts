import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  restoreSyncedProjectVersionInputSchema,
  syncedProjectAuditEventSchema,
  syncedProjectVersionSummarySchema,
} from "../src/lib/projects/project-version-contracts";

const version = syncedProjectVersionSummarySchema.parse({
  id: "version_1",
  projectId: "project_1",
  label: "Cloud sync",
  action: "sync",
  layerCount: 4,
  mediaCount: 2,
  duration: 30,
  createdAt: "2026-05-15T00:00:00.000Z",
});
assert.equal(version.action, "sync");

const auditEvent = syncedProjectAuditEventSchema.parse({
  id: "audit_1",
  projectId: "project_1",
  action: "restore",
  detail: "Project restored.",
  createdAt: "2026-05-15T00:00:00.000Z",
});
assert.equal(auditEvent.action, "restore");
assert.equal(restoreSyncedProjectVersionInputSchema.parse({ versionId: "version_1" }).versionId, "version_1");
assert.throws(() => restoreSyncedProjectVersionInputSchema.parse({ versionId: "" }));

const schema = read("src/lib/db/schema.ts");
assert.match(schema, /projectVersions/);
assert.match(schema, /projectAuditEvents/);
assert.match(schema, /project_versions_project_created_idx/);
assert.match(schema, /project_audit_events_project_created_idx/);

const server = read("src/lib/projects/server-projects.ts");
assert.match(server, /recordProjectVersion/);
assert.match(server, /recordProjectAuditEvent/);
assert.match(server, /listSyncedProjectVersions/);
assert.match(server, /restoreSyncedProjectVersion/);
assert.match(server, /pruneProjectVersions/);

const apiRoute = read("src/app/api/projects/[id]/versions/route.ts");
assert.match(apiRoute, /listSyncedProjectVersions/);
assert.match(apiRoute, /restoreSyncedProjectVersion/);
assert.match(apiRoute, /parseProjectIdParam/);

const client = read("src/lib/projects/project-sync-client.ts");
assert.match(client, /listCloudProjectVersions/);
assert.match(client, /restoreCloudProjectVersion/);
assert.match(client, /syncedProjectVersionSummarySchema/);

const dialog = read("src/features/dashboard/components/cloud-project-version-dialog.tsx");
assert.match(dialog, /Cloud version history/);
assert.match(dialog, /Restore points/);
assert.match(dialog, /Audit history/);
assert.match(dialog, /restoreCloudProjectVersion/);

const signedInLibrary = read("src/features/dashboard/components/signed-in-project-library-card.tsx");
assert.match(signedInLibrary, /CloudProjectVersionDialog/);
assert.match(signedInLibrary, /setSyncMessage/);

console.log("Cloud version history workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
