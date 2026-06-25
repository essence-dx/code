import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = read("src/lib/projects/collaboration-store.ts");
assert.match(store, /export interface WorkspaceInvitation/);
assert.match(store, /export interface ProjectPermissionOverride/);
assert.match(store, /export interface WorkspaceAuditEvent/);
assert.match(store, /db\.version\(4\)\.stores/);
assert.match(store, /invitations: "id, email, status, role, updatedAt"/);
assert.match(store, /projectPermissions: "id, projectId, memberEmail, role, updatedAt"/);
assert.match(store, /auditEvents: "id, action, targetType, createdAt"/);
assert.match(store, /createWorkspaceInvitation/);
assert.match(store, /revokeWorkspaceInvitation/);
assert.match(store, /setProjectPermissionOverride/);
assert.match(store, /removeProjectPermissionOverride/);
assert.match(store, /listWorkspaceAuditEvents/);
assert.match(store, /recordWorkspaceAuditEvent/);
assert.match(store, /visibility: ProjectFolderVisibility/);
assert.match(store, /access: ProjectFolderAssignmentAccess/);

const accessPanel = read("src/features/projects/components/workspace-access-panel.tsx");
assert.match(accessPanel, /WorkspaceAccessPanel/);
assert.match(accessPanel, /createWorkspaceInvitation/);
assert.match(accessPanel, /setProjectPermissionOverride/);
assert.match(accessPanel, /listWorkspaceAuditEvents/);
assert.match(accessPanel, /permissions\.canManageInvites/);
assert.match(accessPanel, /permissions\.canManageProjectPermissions/);
assert.match(accessPanel, /permissions\.canViewAuditHistory/);

const reviewDialog = read("src/features/projects/components/review-workspace-dialog.tsx");
assert.match(reviewDialog, /WorkspaceAccessPanel/);
assert.match(reviewDialog, /folderVisibility/);
assert.match(reviewDialog, /folderAccess/);
assert.match(reviewDialog, /updateProjectFolderVisibility/);

const todo = read("todo.md");
assert.match(todo, /workspace roles, invites, project permissions, private folders, and audit history/i);

console.log("Workspace access workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
