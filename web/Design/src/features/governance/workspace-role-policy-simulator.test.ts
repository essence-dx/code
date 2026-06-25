import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type {
  TeamWorkspaceManagementSummary,
  TeamWorkspaceMemberSummary,
  TeamWorkspacePendingInviteSummary,
} from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary } from "@/features/editor/types";
import { createWorkspaceRolePolicySimulator } from "@/features/governance/workspace-role-policy-simulator";

describe("workspace role policy simulator", () => {
  test("simulates effective permissions with share-link risks and remediation plans", () => {
    const workspace = createWorkspace({
      members: [
        createMember({
          userId: "owner-user",
          email: "owner@example.com",
          role: "owner",
        }),
        createMember({
          userId: "member-user",
          email: "member@example.com",
          role: "member",
        }),
      ],
      pendingInvites: [
        createInvite({
          id: "invite-admin",
          email: "ops@example.com",
          role: "admin",
        }),
      ],
    });
    const project = createProject({
      id: "project-launch",
      name: "Launch plan",
      publicShareId: "public-launch",
      editShareId: "edit-launch",
      editSharePermission: "edit",
      approvalStatus: "changes-requested",
    });
    const simulator = createWorkspaceRolePolicySimulator({
      workspaces: [workspace],
      projects: [project],
      auditLogs: [
        createAuditLog({
          id: "audit-role",
          action: "team.member.role.updated",
          targetType: "team_workspace",
          targetId: workspace.id,
          summary: "Changed member@example.com to member",
        }),
        createAuditLog({
          id: "audit-approval",
          action: "approval.updated",
          targetType: "project",
          targetId: project.id,
          summary: "Approval moved back to changes requested",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(simulator.status, "blocked");
    assert.equal(simulator.totals.workspaces, 1);
    assert.equal(simulator.totals.shareLinks, 2);
    assert.equal(simulator.totals.blockedPolicies, 1);

    const workspaceScenario = simulator.workspaceScenarios[0];
    assert.equal(workspaceScenario?.auditContext[0]?.id, "audit-role");

    const member = workspaceScenario?.principals.find(
      (principal) => principal.id === "member-member-user",
    );
    assert.equal(member?.effectivePermissions.canEditProjects, true);
    assert.equal(member?.effectivePermissions.canManageWorkspace, false);
    assert.equal(
      member?.denialExplanations.some((item) =>
        item.includes("owner or admin role"),
      ),
      true,
    );

    const editPreview = simulator.shareLinkPreviews.find(
      (preview) => preview.id === "edit-project-launch",
    );
    assert.equal(editPreview?.href, "/edit/edit-launch");
    assert.equal(editPreview?.risk, "blocked");
    assert.equal(editPreview?.effectivePermissions.canEditProjects, true);
    assert.equal(
      editPreview?.denialExplanations.some((item) =>
        item.includes("does not grant workspace management"),
      ),
      true,
    );

    assert.equal(
      simulator.remediationPlans.some(
        (plan) =>
          plan.projectId === project.id &&
          plan.title.includes("Downgrade Launch plan edit link"),
      ),
      true,
    );
  });

  test("keeps policy simulation ready when workspaces have no exposed links or pending access", () => {
    const simulator = createWorkspaceRolePolicySimulator({
      workspaces: [
        createWorkspace({
          members: [
            createMember({
              userId: "owner-user",
              email: "owner@example.com",
              role: "owner",
            }),
            createMember({
              userId: "admin-user",
              email: "admin@example.com",
              role: "admin",
            }),
          ],
          pendingInvites: [],
        }),
      ],
      projects: [createProject({ id: "project-ready", name: "Ready plan" })],
      auditLogs: [],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(simulator.status, "ready");
    assert.equal(simulator.totals.blockedPolicies, 0);
    assert.equal(simulator.remediationPlans.length, 0);
    assert.deepEqual(simulator.nextActions, []);
  });
});

function createWorkspace(
  overrides: Partial<TeamWorkspaceManagementSummary> = {},
): TeamWorkspaceManagementSummary {
  return {
    id: "workspace-1",
    ownerId: "owner-user",
    name: "Launch workspace",
    role: "owner",
    pendingInviteCount: 0,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    members: [],
    pendingInvites: [],
    recentActivity: [],
    ...overrides,
  };
}

function createMember(
  overrides: Partial<TeamWorkspaceMemberSummary> = {},
): TeamWorkspaceMemberSummary {
  return {
    id: "member",
    workspaceId: "workspace-1",
    userId: "user",
    email: "user@example.com",
    role: "member",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createInvite(
  overrides: Partial<TeamWorkspacePendingInviteSummary> = {},
): TeamWorkspacePendingInviteSummary {
  return {
    id: "invite",
    workspaceId: "workspace-1",
    email: "invitee@example.com",
    role: "member",
    expiresAt: "2026-05-30T08:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project",
    name: "Project",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: null,
    editSharePermission: "view",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit",
    action: "team.member.role.updated",
    targetType: "team_workspace",
    targetId: "workspace-1",
    summary: "Workspace policy changed",
    actorEmail: "owner@example.com",
    metadata: {},
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}
