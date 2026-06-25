import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import { createMultiWorkspaceFederationCenter } from "@/features/team/multi-workspace-federation";

describe("multi-workspace federation center", () => {
  test("federates admin commands and audit events across manageable workspaces", () => {
    const center = createMultiWorkspaceFederationCenter({
      workspaces: [
        createWorkspace({
          id: "workspace-core",
          name: "Core Studio",
          role: "owner",
          members: [
            createMember({
              id: "member-owner",
              workspaceId: "workspace-core",
              userId: "user-owner",
              email: "owner@example.com",
              role: "owner",
            }),
            createMember({
              id: "member-designer",
              workspaceId: "workspace-core",
              userId: "user-designer",
              email: "designer@example.com",
              role: "member",
            }),
          ],
          pendingInvites: [
            createInvite({
              id: "invite-core",
              workspaceId: "workspace-core",
              email: "reviewer@example.com",
            }),
          ],
        }),
        createWorkspace({
          id: "workspace-client",
          name: "Client Ops",
          role: "admin",
          members: [
            createMember({
              id: "member-client-owner",
              workspaceId: "workspace-client",
              userId: "user-client-owner",
              email: "client-owner@example.com",
              role: "owner",
            }),
            createMember({
              id: "member-client-admin",
              workspaceId: "workspace-client",
              userId: "user-admin",
              email: "admin@example.com",
              role: "admin",
            }),
          ],
          recentActivity: [
            createActivity({
              id: "activity-client",
              workspaceId: "workspace-client",
              action: "team.member.role.updated",
              summary: "Updated member role",
            }),
          ],
        }),
        createWorkspace({
          id: "workspace-readonly",
          name: "Read Only",
          role: "member",
          members: [
            createMember({
              id: "member-readonly-owner",
              workspaceId: "workspace-readonly",
              userId: "user-readonly-owner",
              email: "readonly-owner@example.com",
              role: "owner",
            }),
          ],
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-core",
          action: "team.invite.created",
          targetType: "team_workspace",
          targetId: "workspace-core",
          summary: "Invited reviewer@example.com",
          createdAt: "2026-05-18T09:20:00.000Z",
        }),
        createAuditLog({
          id: "audit-client-project",
          action: "project.deleted",
          targetType: "project",
          targetId: "project-client",
          summary: "Deleted client project",
          metadata: { workspaceId: "workspace-client" },
          createdAt: "2026-05-18T09:30:00.000Z",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.workspaces, 3);
    assert.equal(center.totals.manageableWorkspaces, 2);
    assert.equal(center.totals.federatedAuditEvents, 3);
    assert.equal(center.totals.blockedCommands, 1);

    const coreScope = center.scopes.find(
      (scope) => scope.workspaceId === "workspace-core",
    );
    assert.equal(coreScope?.manageable, true);
    assert.equal(coreScope?.adminCount, 1);
    assert.equal(coreScope?.pendingInviteCount, 1);
    assert.equal(coreScope?.status, "blocked");

    assert.equal(
      center.commands.some(
        (command) =>
          command.workspaceId === "workspace-core" &&
          command.title.includes("backup admin") &&
          command.status === "blocked",
      ),
      true,
    );
    assert.equal(
      center.commands.some(
        (command) =>
          command.workspaceId === "workspace-core" &&
          command.title.includes("pending invite"),
      ),
      true,
    );

    const clientAudit = center.federatedAuditEvents.find(
      (event) => event.id === "audit-client-project",
    );
    assert.equal(clientAudit?.workspaceName, "Client Ops");
    assert.equal(clientAudit?.targetType, "project");

    const packet = center.commandPackets.find(
      (item) => item.workspaceId === "workspace-core",
    );
    assert.equal(
      packet?.download.fileName,
      "multi-workspace-command-packet-core-studio.json",
    );
    assert.equal(
      packet?.download.href.startsWith("data:application/json"),
      true,
    );
    assert.equal(
      center.nextActions.some((action) => action.includes("Core Studio")),
      true,
    );
  });

  test("stays ready when manageable workspaces have coverage and audit activity", () => {
    const center = createMultiWorkspaceFederationCenter({
      workspaces: [
        createWorkspace({
          id: "workspace-ready",
          name: "Ready Studio",
          role: "owner",
          members: [
            createMember({
              id: "member-owner",
              workspaceId: "workspace-ready",
              userId: "user-owner",
              email: "owner@example.com",
              role: "owner",
            }),
            createMember({
              id: "member-admin",
              workspaceId: "workspace-ready",
              userId: "user-admin",
              email: "admin@example.com",
              role: "admin",
            }),
          ],
          recentActivity: [
            createActivity({
              id: "activity-ready",
              workspaceId: "workspace-ready",
            }),
          ],
        }),
      ],
      auditLogs: [],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.commands.length, 0);
    assert.equal(center.commandPackets.length, 0);
    assert.deepEqual(center.nextActions, []);
  });
});

function createWorkspace(
  overrides: Partial<TeamWorkspaceManagementSummary> = {},
): TeamWorkspaceManagementSummary {
  return {
    id: "workspace",
    ownerId: "user-owner",
    name: "Workspace",
    role: "owner",
    pendingInviteCount: 0,
    members: [
      createMember({
        workspaceId: overrides.id ?? "workspace",
        userId: "user-owner",
        email: "owner@example.com",
        role: "owner",
      }),
    ],
    pendingInvites: [],
    recentActivity: [],
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createMember(
  overrides: Partial<TeamWorkspaceManagementSummary["members"][number]> = {},
): TeamWorkspaceManagementSummary["members"][number] {
  return {
    id: "member",
    workspaceId: "workspace",
    userId: "user",
    email: "user@example.com",
    role: "member",
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createInvite(
  overrides: Partial<
    TeamWorkspaceManagementSummary["pendingInvites"][number]
  > = {},
): TeamWorkspaceManagementSummary["pendingInvites"][number] {
  return {
    id: "invite",
    workspaceId: "workspace",
    email: "invitee@example.com",
    role: "member",
    expiresAt: "2026-05-25T09:00:00.000Z",
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createActivity(
  overrides: Partial<
    TeamWorkspaceManagementSummary["recentActivity"][number]
  > = {},
): TeamWorkspaceManagementSummary["recentActivity"][number] {
  return {
    id: "activity",
    workspaceId: "workspace",
    action: "team.created",
    summary: "Workspace activity",
    actorEmail: "owner@example.com",
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit",
    action: "team.created",
    targetType: "team_workspace",
    targetId: "workspace",
    summary: "Audit activity",
    actorEmail: "owner@example.com",
    metadata: {},
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}
