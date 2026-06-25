import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = read("src/lib/db/schema.ts");
assert.match(schema, /export const workspaceMembers = sqliteTable/);
assert.match(schema, /export const workspaceInvitations = sqliteTable/);
assert.match(schema, /export const projectPermissionOverrides = sqliteTable/);
assert.match(schema, /export const workspaceAuditEvents = sqliteTable/);
assert.match(schema, /visibility: text\("visibility"/);
assert.match(schema, /folderAccess: text\("folder_access"/);
assert.match(schema, /workspaceMembers: many\(workspaceMembers\)/);
assert.match(schema, /projectPermissionOverrides: many\(projectPermissionOverrides\)/);

const contracts = read("src/lib/projects/workspace-access-contracts.ts");
assert.match(contracts, /serverWorkspaceAccessSummarySchema/);
assert.match(contracts, /serverWorkspaceAccessMutationSchema = z\.discriminatedUnion/);
assert.match(contracts, /createServerWorkspaceInvitationInputSchema/);
assert.match(contracts, /setServerProjectPermissionInputSchema/);
assert.match(contracts, /setServerFolderVisibilityInputSchema/);
assert.match(contracts, /serverWorkspaceInvitationAcceptanceSchema/);
assert.match(contracts, /workspaceInvitationAcceptPath/);

const server = read("src/lib/projects/server-workspace-access.ts");
assert.match(server, /export async function listServerWorkspaceAccess/);
assert.match(server, /export async function mutateServerWorkspaceAccess/);
assert.match(server, /export async function acceptServerWorkspaceInvitation/);
assert.match(server, /requireProjectAccess/);
assert.match(server, /getWorkspaceMemberRole/);
assert.match(server, /getWorkspaceMemberByEmail/);
assert.match(server, /getProjectOverride/);
assert.match(server, /getProjectFolderVisibility/);
assert.match(server, /visibleFolders/);
assert.match(server, /isRestrictedFolderProject/);
assert.match(server, /assertServerWorkspacePermission/);
assert.match(server, /recordWorkspaceAuditEvent/);
assert.match(server, /ServerWorkspaceAccessAuthError/);
assert.match(server, /ServerWorkspaceAccessForbiddenError/);
assert.match(server, /ServerWorkspaceAccessNotFoundError/);
assert.match(server, /ServerWorkspaceInvitationNotFoundError/);
assert.match(server, /ServerWorkspaceInvitationUnavailableError/);

const route = read("src/app/api/projects/[id]/access/route.ts");
assert.match(route, /export async function GET/);
assert.match(route, /export async function POST/);
assert.match(route, /corsPreflight/);
assert.match(route, /readJsonRequest/);
assert.match(route, /listServerWorkspaceAccess/);
assert.match(route, /mutateServerWorkspaceAccess/);

const acceptRoute = read("src/app/api/workspace-invitations/[token]/accept/route.ts");
assert.match(acceptRoute, /export async function POST/);
assert.match(acceptRoute, /acceptServerWorkspaceInvitation/);
assert.match(acceptRoute, /ServerWorkspaceInvitationNotFoundError/);
assert.match(acceptRoute, /ServerWorkspaceInvitationUnavailableError/);

const client = read("src/lib/projects/workspace-access-client.ts");
assert.match(client, /getCloudWorkspaceAccess/);
assert.match(client, /mutateCloudWorkspaceAccess/);
assert.match(client, /serverWorkspaceAccessSummarySchema/);
assert.match(client, /credentials: "include"/);

const panel = read("src/features/projects/components/cloud-workspace-access-panel.tsx");
assert.match(panel, /CloudWorkspaceAccessPanel/);
assert.match(panel, /getCloudWorkspaceAccess/);
assert.match(panel, /mutateCloudWorkspaceAccess/);
assert.match(panel, /createWorkspaceInvitationEmailDraft/);
assert.match(panel, /emailInvitation/);
assert.match(panel, /copyInvitationLink/);
assert.match(panel, /invitation\.acceptPath/);
assert.match(panel, /permissions\.canManageInvites/);
assert.match(panel, /permissions\.canManageProjectPermissions/);
assert.match(panel, /permissions\.canManageFolders/);

const dialog = read("src/features/projects/components/review-workspace-dialog.tsx");
assert.match(dialog, /CloudWorkspaceAccessPanel/);

const acceptPage = read("src/app/invite/[token]/page.tsx");
assert.match(acceptPage, /WorkspaceInvitationAcceptPanel/);

const acceptPanel = read("src/features/projects/components/workspace-invitation-accept-panel.tsx");
assert.match(acceptPanel, /acceptCloudWorkspaceInvitation/);
assert.match(acceptPanel, /Sign in/);
assert.match(acceptPanel, /Open dashboard/);

const acceptClient = read("src/lib/projects/workspace-invitation-client.ts");
assert.match(acceptClient, /acceptCloudWorkspaceInvitation/);
assert.match(acceptClient, /serverWorkspaceInvitationAcceptanceSchema/);

const invitationEmail = read("src/lib/projects/workspace-invitation-email.ts");
assert.match(invitationEmail, /createWorkspaceInvitationEmailDraft/);
assert.match(invitationEmail, /mailto:/);
assert.match(invitationEmail, /Use the same email address that received this invite/);

const migration = read("drizzle/0006_marvelous_speed_demon.sql");
assert.match(migration, /CREATE TABLE `workspace_members`/);
assert.match(migration, /CREATE TABLE `workspace_invitations`/);
assert.match(migration, /CREATE TABLE `project_permission_overrides`/);
assert.match(migration, /CREATE TABLE `workspace_audit_events`/);
assert.match(migration, /ALTER TABLE `folders` ADD `visibility`/);
assert.match(migration, /ALTER TABLE `projects` ADD `folder_access`/);

const todo = read("todo.md");
assert.match(todo, /server-enforced multi-user workspace invitations and folder permissions/i);

console.log("Server workspace access workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
