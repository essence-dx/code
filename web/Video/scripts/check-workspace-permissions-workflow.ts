import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canWorkspaceRole, createWorkspacePermissionSet, WorkspacePermissionError } from "../src/lib/projects/workspace-permissions";

assert.equal(canWorkspaceRole("owner", "member:manage"), true);
assert.equal(canWorkspaceRole("owner", "share:manage"), true);
assert.equal(canWorkspaceRole("owner", "invite:manage"), true);
assert.equal(canWorkspaceRole("owner", "project-permission:manage"), true);
assert.equal(canWorkspaceRole("editor", "folder:manage"), true);
assert.equal(canWorkspaceRole("editor", "member:manage"), false);
assert.equal(canWorkspaceRole("editor", "invite:manage"), false);
assert.equal(canWorkspaceRole("editor", "audit:view"), true);
assert.equal(canWorkspaceRole("viewer", "comment:create"), true);
assert.equal(canWorkspaceRole("viewer", "comment:resolve"), false);
assert.equal(canWorkspaceRole("viewer", "share:manage"), false);
assert.equal(canWorkspaceRole("viewer", "audit:view"), false);

const viewerPermissions = createWorkspacePermissionSet("viewer");
assert.equal(viewerPermissions.canCreateComment, true);
assert.equal(viewerPermissions.canResolveComment, false);
assert.equal(viewerPermissions.canManageFolders, false);
assert.equal(viewerPermissions.canManageInvites, false);
assert.equal(viewerPermissions.canManageProjectPermissions, false);
assert.equal(viewerPermissions.canViewAuditHistory, false);
assert.equal(viewerPermissions.canManageShareLinks, false);
assert.equal(viewerPermissions.canManageMembers, false);
assert.equal(viewerPermissions.canViewExportHistory, true);

const permissionError = new WorkspacePermissionError("member:manage");
assert.equal(permissionError.name, "WorkspacePermissionError");

const store = read("src/lib/projects/collaboration-store.ts");
assert.match(store, /assertWorkspacePermission\(actorRole, "folder:manage"\)/);
assert.match(store, /assertWorkspacePermission\(actorRole, "private-folder:manage"\)/);
assert.match(store, /assertWorkspacePermission\(actorRole, "comment:create"\)/);
assert.match(store, /assertWorkspacePermission\(actorRole, "comment:resolve"\)/);
assert.match(store, /assertWorkspacePermission\(actorRole, "share:manage"\)/);
assert.match(store, /assertWorkspacePermission\(actorRole, "member:manage"\)/);
assert.match(store, /assertWorkspacePermission\(actorRole, "invite:manage"\)/);
assert.match(store, /assertWorkspacePermission\(actorRole, "project-permission:manage"\)/);
assert.match(store, /assertWorkspacePermission\(actorRole, "audit:view"\)/);

const dialog = read("src/features/projects/components/review-workspace-dialog.tsx");
assert.match(dialog, /createWorkspacePermissionSet/);
assert.match(dialog, /Active access/);
assert.match(dialog, /permissions\.canCreateComment/);
assert.match(dialog, /permissions\.canManageFolders/);
assert.match(dialog, /permissions\.canManagePrivateFolders/);
assert.match(dialog, /permissions\.canManageShareLinks/);
assert.match(dialog, /permissions\.canManageMembers/);
assert.match(dialog, /permissions\.canManageProjectPermissions/);
assert.match(dialog, /permissions\.canViewExportHistory/);

console.log("Workspace permission workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
