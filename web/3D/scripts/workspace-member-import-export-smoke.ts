import { strict as assert } from "node:assert";
import {
  createWorkspaceMemberDirectoryExport,
  createWorkspaceMemberImportPlan,
  parseWorkspaceMemberImportCsv,
} from "@/features/workspaces/member-import-export";
import type { WorkspaceDashboard } from "@/features/workspaces/types";

const workspace: WorkspaceDashboard = {
  id: "workspace-1",
  invites: [
    {
      createdAt: "2026-05-01T00:00:00.000Z",
      email: "pending@mail.com",
      expiresAt: "2026-05-15T00:00:00.000Z",
      id: "invite-pending",
      invitedBy: "Owner User",
      role: "viewer",
      token: "invite-token",
    },
  ],
  members: [
    {
      email: "owner@mail.com",
      id: "member-owner",
      joinedAt: "2026-04-01T00:00:00.000Z",
      name: "Owner User",
      role: "owner",
      userId: "user-owner",
    },
    {
      email: "admin@mail.com",
      id: "member-admin",
      joinedAt: "2026-04-02T00:00:00.000Z",
      name: "Admin User",
      role: "admin",
      userId: "user-admin",
    },
  ],
  name: "Essence workspace",
  role: "owner",
  workspaces: [],
};

const csv = [
  "email,name,role",
  "new-editor@mail.com,New Editor,editor",
  "admin@mail.com,Existing Admin,viewer",
  "pending@mail.com,Pending Invite,viewer",
  "new-editor@mail.com,Duplicate Editor,viewer",
  "bad-email,Bad Email,viewer",
  "new-admin@mail.com,New Admin,admin",
  "owner-import@mail.com,Unsafe Owner,owner",
  "\"quoted.viewer@mail.com\",\"Quoted, Viewer\",viewer",
].join("\n");

const parsedRows = parseWorkspaceMemberImportCsv(csv);

assert.equal(parsedRows.length, 8);
assert.equal(parsedRows[7]?.name, "Quoted, Viewer");

const guardedPlan = createWorkspaceMemberImportPlan({
  allowAdminInvites: false,
  rows: parsedRows,
  workspace,
});

assert.equal(guardedPlan.summary.totalRows, 8);
assert.equal(guardedPlan.summary.inviteReadyCount, 2);
assert.equal(guardedPlan.summary.duplicateMemberCount, 1);
assert.equal(guardedPlan.summary.pendingInviteDuplicateCount, 1);
assert.equal(guardedPlan.summary.importDuplicateCount, 1);
assert.equal(guardedPlan.summary.invalidCount, 1);
assert.equal(guardedPlan.summary.roleSafetyBlockedCount, 2);
assert.equal(guardedPlan.rows.find((row) => row.email === "new-admin@mail.com")?.status, "needs-admin-approval");
assert.equal(guardedPlan.rows.find((row) => row.email === "owner-import@mail.com")?.status, "blocked-role");
assert.deepEqual(
  guardedPlan.invitesToCreate.map((row) => row.email),
  ["new-editor@mail.com", "quoted.viewer@mail.com"],
);
assert.match(guardedPlan.csvContent, /new-editor@mail.com,editor,invite-ready/);

const confirmedPlan = createWorkspaceMemberImportPlan({
  allowAdminInvites: true,
  rows: parsedRows,
  workspace,
});

assert.equal(confirmedPlan.summary.inviteReadyCount, 3);
assert.equal(confirmedPlan.summary.roleSafetyBlockedCount, 1);
assert.deepEqual(
  confirmedPlan.invitesToCreate.map((row) => row.email),
  ["new-editor@mail.com", "new-admin@mail.com", "quoted.viewer@mail.com"],
);

const directoryExport = createWorkspaceMemberDirectoryExport(workspace);

assert.match(directoryExport.csvContent, /member,owner@mail.com,Owner User,owner/);
assert.match(directoryExport.csvContent, /pending_invite,pending@mail.com,Pending invite,viewer/);
assert.match(directoryExport.jsonContent, /"workspaceId": "workspace-1"/);
assert.equal(directoryExport.csvFileName, "workspace-1-member-directory.csv");

console.log("workspace member import/export smoke passed");
