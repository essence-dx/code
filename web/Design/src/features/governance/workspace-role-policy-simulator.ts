import type {
  TeamWorkspaceManagementSummary,
  TeamWorkspaceMemberSummary,
  TeamWorkspacePendingInviteSummary,
} from "@/db/team-workspace-management";
import type { TeamWorkspaceRole } from "@/db/team-workspaces";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary, SharePermission } from "@/features/editor/types";
import { sharePermissionLabels } from "@/features/projects/project-permissions";

export type WorkspaceRolePolicyStatus = "ready" | "review" | "blocked";

export type WorkspaceRoleEffectivePermissions = {
  canViewProjects: boolean;
  canCommentProjects: boolean;
  canEditProjects: boolean;
  canPublishProjects: boolean;
  canInviteMembers: boolean;
  canManageWorkspace: boolean;
  canManageShareLinks: boolean;
  canUpdateMemberRoles: boolean;
  canTransferOwnership: boolean;
};

export type WorkspaceRolePolicyPrincipalKind =
  | "workspace-member"
  | "pending-invite"
  | "public-share"
  | "edit-share";

export type WorkspaceRolePolicyPrincipal = {
  id: string;
  kind: WorkspaceRolePolicyPrincipalKind;
  label: string;
  roleLabel: string;
  email: string | null;
  workspaceId: string | null;
  projectId: string | null;
  sourceHref: string | null;
  status: WorkspaceRolePolicyStatus;
  effectivePermissions: WorkspaceRoleEffectivePermissions;
  denialExplanations: string[];
  remediationHints: string[];
};

export type WorkspaceRoleShareLinkPreview = {
  id: string;
  projectId: string;
  projectName: string;
  kind: "public" | "edit";
  href: string;
  permissionLabel: string;
  risk: WorkspaceRolePolicyStatus;
  effectivePermissions: WorkspaceRoleEffectivePermissions;
  denialExplanations: string[];
  remediationHint: string | null;
  auditContext: WorkspaceAuditLogSummary[];
};

export type WorkspaceRolePolicyRemediationPlan = {
  id: string;
  workspaceId: string | null;
  projectId: string | null;
  severity: WorkspaceRolePolicyStatus;
  title: string;
  detail: string;
  actions: string[];
  auditLogIds: string[];
};

export type WorkspaceRolePolicyScenario = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  viewerRole: TeamWorkspaceRole;
  status: WorkspaceRolePolicyStatus;
  principals: WorkspaceRolePolicyPrincipal[];
  auditContext: WorkspaceAuditLogSummary[];
  denialExplanations: string[];
};

export type WorkspaceRolePolicySimulator = {
  status: WorkspaceRolePolicyStatus;
  score: number;
  checkedAt: string;
  workspaceScenarios: WorkspaceRolePolicyScenario[];
  shareLinkPreviews: WorkspaceRoleShareLinkPreview[];
  remediationPlans: WorkspaceRolePolicyRemediationPlan[];
  nextActions: string[];
  totals: {
    workspaces: number;
    simulatedPrincipals: number;
    shareLinks: number;
    blockedPolicies: number;
    reviewPolicies: number;
    remediationPlans: number;
  };
};

export type WorkspaceRolePolicySimulatorInput = {
  workspaces: TeamWorkspaceManagementSummary[];
  projects: ProjectSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string;
};

const noPermissions: WorkspaceRoleEffectivePermissions = {
  canViewProjects: false,
  canCommentProjects: false,
  canEditProjects: false,
  canPublishProjects: false,
  canInviteMembers: false,
  canManageWorkspace: false,
  canManageShareLinks: false,
  canUpdateMemberRoles: false,
  canTransferOwnership: false,
};

export function createWorkspaceRolePolicySimulator(
  input: WorkspaceRolePolicySimulatorInput,
): WorkspaceRolePolicySimulator {
  const checkedAt = input.now ?? new Date().toISOString();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const workspaceScenarios = input.workspaces.map((workspace) =>
    createWorkspaceScenario({
      workspace,
      auditLogs: input.auditLogs,
    }),
  );
  const shareLinkPreviews = activeProjects.flatMap((project) =>
    createProjectShareLinkPreviews({
      project,
      auditLogs: input.auditLogs,
    }),
  );
  const remediationPlans = [
    ...workspaceScenarios.flatMap(createWorkspaceRemediationPlans),
    ...shareLinkPreviews.flatMap(createShareLinkRemediationPlans),
  ];
  const blockedPolicies =
    workspaceScenarios.filter((scenario) => scenario.status === "blocked")
      .length +
    shareLinkPreviews.filter((preview) => preview.risk === "blocked").length;
  const reviewPolicies =
    workspaceScenarios.filter((scenario) => scenario.status === "review")
      .length +
    shareLinkPreviews.filter((preview) => preview.risk === "review").length;
  const status = createStatus({ blockedPolicies, reviewPolicies });

  return {
    status,
    score: scorePolicies({
      blockedPolicies,
      reviewPolicies,
      shareLinks: shareLinkPreviews.length,
      remediationPlans: remediationPlans.length,
    }),
    checkedAt,
    workspaceScenarios,
    shareLinkPreviews,
    remediationPlans,
    nextActions: remediationPlans.slice(0, 4).map((plan) => plan.title),
    totals: {
      workspaces: input.workspaces.length,
      simulatedPrincipals:
        workspaceScenarios.reduce(
          (total, scenario) => total + scenario.principals.length,
          0,
        ) + shareLinkPreviews.length,
      shareLinks: shareLinkPreviews.length,
      blockedPolicies,
      reviewPolicies,
      remediationPlans: remediationPlans.length,
    },
  };
}

function createWorkspaceScenario(input: {
  workspace: TeamWorkspaceManagementSummary;
  auditLogs: WorkspaceAuditLogSummary[];
}): WorkspaceRolePolicyScenario {
  const memberPrincipals = input.workspace.members.map(createMemberPrincipal);
  const invitePrincipals = input.workspace.pendingInvites.map(
    createInvitePrincipal,
  );
  const principals = [...memberPrincipals, ...invitePrincipals];
  const hasOwner = input.workspace.members.some(
    (member) => member.role === "owner",
  );
  const hasPendingAdmin = input.workspace.pendingInvites.some(
    (invite) => invite.role === "admin",
  );
  const denialExplanations = [
    ...principals.flatMap((principal) => principal.denialExplanations),
    ...(hasOwner
      ? []
      : ["Workspace needs an owner before role changes are safe."]),
  ];
  const status: WorkspaceRolePolicyStatus = hasOwner
    ? hasPendingAdmin
      ? "review"
      : "ready"
    : "blocked";

  return {
    id: `workspace-policy-${input.workspace.id}`,
    workspaceId: input.workspace.id,
    workspaceName: input.workspace.name,
    viewerRole: input.workspace.role,
    status,
    principals,
    auditContext: findAuditContext({
      auditLogs: input.auditLogs,
      targetIds: [input.workspace.id],
      metadataKey: "workspaceId",
      metadataValue: input.workspace.id,
    }),
    denialExplanations: dedupe(denialExplanations).slice(0, 8),
  };
}

function createMemberPrincipal(
  member: TeamWorkspaceMemberSummary,
): WorkspaceRolePolicyPrincipal {
  const effectivePermissions = permissionsForRole(member.role);

  return {
    id: `member-${member.userId}`,
    kind: "workspace-member",
    label: member.email,
    roleLabel: roleLabel(member.role),
    email: member.email,
    workspaceId: member.workspaceId,
    projectId: null,
    sourceHref: null,
    status: member.role === "member" ? "review" : "ready",
    effectivePermissions,
    denialExplanations: denialExplanationsForPermissions({
      label: member.email,
      effectivePermissions,
      context: "workspace member",
    }),
    remediationHints:
      member.role === "member"
        ? [
            "Promote to admin only when this person should invite teammates or manage share links.",
          ]
        : [],
  };
}

function createInvitePrincipal(
  invite: TeamWorkspacePendingInviteSummary,
): WorkspaceRolePolicyPrincipal {
  return {
    id: `invite-${invite.id}`,
    kind: "pending-invite",
    label: invite.email,
    roleLabel: `Pending ${roleLabel(invite.role).toLowerCase()}`,
    email: invite.email,
    workspaceId: invite.workspaceId,
    projectId: null,
    sourceHref: null,
    status: invite.role === "admin" ? "review" : "ready",
    effectivePermissions: noPermissions,
    denialExplanations: [
      `${invite.email} has no effective workspace access until the invite is accepted.`,
      `Pending ${invite.role} invite cannot manage workspace roles, share links, or projects yet.`,
    ],
    remediationHints:
      invite.role === "admin"
        ? [
            "Review whether the pending admin invite still needs elevated access.",
          ]
        : [],
  };
}

function createProjectShareLinkPreviews(input: {
  project: ProjectSummary;
  auditLogs: WorkspaceAuditLogSummary[];
}): WorkspaceRoleShareLinkPreview[] {
  return [
    ...(input.project.publicShareId
      ? [
          createPublicSharePreview({
            project: input.project,
            auditLogs: input.auditLogs,
          }),
        ]
      : []),
    ...(input.project.editShareId
      ? [
          createEditSharePreview({
            project: input.project,
            auditLogs: input.auditLogs,
          }),
        ]
      : []),
  ];
}

function createPublicSharePreview(input: {
  project: ProjectSummary;
  auditLogs: WorkspaceAuditLogSummary[];
}): WorkspaceRoleShareLinkPreview {
  const risk: WorkspaceRolePolicyStatus = "review";

  return {
    id: `public-${input.project.id}`,
    projectId: input.project.id,
    projectName: input.project.name,
    kind: "public",
    href: `/view/${input.project.publicShareId}`,
    permissionLabel: "Public view",
    risk,
    effectivePermissions: {
      ...noPermissions,
      canViewProjects: true,
    },
    denialExplanations: [
      "Public links can view the project but cannot comment, edit, publish, or manage workspace settings.",
      ...(input.project.approvalStatus !== "approved"
        ? [
            "Public access should wait until the project approval state is approved.",
          ]
        : []),
    ],
    remediationHint:
      input.project.approvalStatus !== "approved"
        ? `Disable ${input.project.name} public link until approval is complete.`
        : null,
    auditContext: findProjectAuditContext(input.auditLogs, input.project.id),
  };
}

function createEditSharePreview(input: {
  project: ProjectSummary;
  auditLogs: WorkspaceAuditLogSummary[];
}): WorkspaceRoleShareLinkPreview {
  const effectivePermissions = permissionsForSharePermission(
    input.project.editSharePermission,
  );
  const risk = createEditShareRisk(input.project);

  return {
    id: `edit-${input.project.id}`,
    projectId: input.project.id,
    projectName: input.project.name,
    kind: "edit",
    href: `/edit/${input.project.editShareId}`,
    permissionLabel: sharePermissionLabels[input.project.editSharePermission],
    risk,
    effectivePermissions,
    denialExplanations: [
      `The ${sharePermissionLabels[input.project.editSharePermission].toLowerCase()} link does not grant workspace management, invite, role-change, ownership-transfer, or publishing permissions.`,
      ...(risk === "blocked"
        ? [
            "Edit access is blocked for policy review while approval is not approved.",
          ]
        : []),
    ],
    remediationHint:
      risk === "blocked" || input.project.editSharePermission === "edit"
        ? `Downgrade ${input.project.name} edit link to comment or view when external editing is no longer required.`
        : null,
    auditContext: findProjectAuditContext(input.auditLogs, input.project.id),
  };
}

function createWorkspaceRemediationPlans(
  scenario: WorkspaceRolePolicyScenario,
): WorkspaceRolePolicyRemediationPlan[] {
  const ownerPlan =
    scenario.status === "blocked"
      ? [
          {
            id: `workspace-owner-${scenario.workspaceId}`,
            workspaceId: scenario.workspaceId,
            projectId: null,
            severity: "blocked" as const,
            title: `Assign an owner for ${scenario.workspaceName}`,
            detail:
              "Workspace role simulation found no owner, so ownership transfer and role changes cannot be governed safely.",
            actions: [
              "Confirm the intended accountable owner.",
              "Transfer ownership before changing admin or member policy.",
              "Record the ownership change in the audit log.",
            ],
            auditLogIds: scenario.auditContext.map((log) => log.id),
          },
        ]
      : [];

  const pendingAdminPlans = scenario.principals
    .filter(
      (principal) =>
        principal.kind === "pending-invite" && principal.status === "review",
    )
    .map((principal) => ({
      id: `pending-admin-${principal.id}`,
      workspaceId: scenario.workspaceId,
      projectId: null,
      severity: "review" as const,
      title: `Review pending admin invite for ${principal.label}`,
      detail:
        "Admin invites should be intentional because accepted admins can invite teammates and manage share-link policy.",
      actions: [
        "Confirm the invite is still needed.",
        "Downgrade the invite to member when admin access is unnecessary.",
        "Revoke stale invites before the next release review.",
      ],
      auditLogIds: scenario.auditContext.map((log) => log.id),
    }));

  return [...ownerPlan, ...pendingAdminPlans];
}

function createShareLinkRemediationPlans(
  preview: WorkspaceRoleShareLinkPreview,
): WorkspaceRolePolicyRemediationPlan[] {
  if (!preview.remediationHint) return [];

  return [
    {
      id: `share-${preview.id}`,
      workspaceId: null,
      projectId: preview.projectId,
      severity: preview.risk,
      title:
        preview.kind === "edit"
          ? `Downgrade ${preview.projectName} edit link`
          : `Review ${preview.projectName} public link`,
      detail: preview.remediationHint,
      actions:
        preview.kind === "edit"
          ? [
              "Switch the edit share link to comment or view.",
              "Keep edit links only for active collaborators.",
              "Re-run the policy simulator after the share update.",
            ]
          : [
              "Disable the public link until approval is complete.",
              "Confirm the public preview route is intended.",
              "Re-run the policy simulator after approval changes.",
            ],
      auditLogIds: preview.auditContext.map((log) => log.id),
    },
  ];
}

function permissionsForRole(
  role: TeamWorkspaceRole,
): WorkspaceRoleEffectivePermissions {
  if (role === "owner") {
    return {
      canViewProjects: true,
      canCommentProjects: true,
      canEditProjects: true,
      canPublishProjects: true,
      canInviteMembers: true,
      canManageWorkspace: true,
      canManageShareLinks: true,
      canUpdateMemberRoles: true,
      canTransferOwnership: true,
    };
  }

  if (role === "admin") {
    return {
      canViewProjects: true,
      canCommentProjects: true,
      canEditProjects: true,
      canPublishProjects: true,
      canInviteMembers: true,
      canManageWorkspace: true,
      canManageShareLinks: true,
      canUpdateMemberRoles: false,
      canTransferOwnership: false,
    };
  }

  return {
    canViewProjects: true,
    canCommentProjects: true,
    canEditProjects: true,
    canPublishProjects: false,
    canInviteMembers: false,
    canManageWorkspace: false,
    canManageShareLinks: false,
    canUpdateMemberRoles: false,
    canTransferOwnership: false,
  };
}

function permissionsForSharePermission(
  permission: SharePermission,
): WorkspaceRoleEffectivePermissions {
  return {
    ...noPermissions,
    canViewProjects: true,
    canCommentProjects: permission === "comment" || permission === "edit",
    canEditProjects: permission === "edit",
  };
}

function denialExplanationsForPermissions(input: {
  label: string;
  effectivePermissions: WorkspaceRoleEffectivePermissions;
  context: string;
}) {
  const denials = [];

  if (!input.effectivePermissions.canManageWorkspace) {
    denials.push(
      `${input.label} needs an owner or admin role to manage workspace settings.`,
    );
  }

  if (!input.effectivePermissions.canUpdateMemberRoles) {
    denials.push(
      `${input.label} cannot update member roles because role changes are owner-only.`,
    );
  }

  if (!input.effectivePermissions.canTransferOwnership) {
    denials.push(
      `${input.label} cannot transfer ownership from this ${input.context} policy.`,
    );
  }

  if (!input.effectivePermissions.canPublishProjects) {
    denials.push(
      `${input.label} cannot publish projects without elevated workspace access.`,
    );
  }

  return denials;
}

function createEditShareRisk(
  project: ProjectSummary,
): WorkspaceRolePolicyStatus {
  if (
    project.editSharePermission === "edit" &&
    project.approvalStatus !== "approved"
  ) {
    return "blocked";
  }

  return project.editSharePermission === "edit" ? "review" : "ready";
}

function createStatus(input: {
  blockedPolicies: number;
  reviewPolicies: number;
}): WorkspaceRolePolicyStatus {
  if (input.blockedPolicies) return "blocked";
  if (input.reviewPolicies) return "review";

  return "ready";
}

function scorePolicies(input: {
  blockedPolicies: number;
  reviewPolicies: number;
  shareLinks: number;
  remediationPlans: number;
}) {
  const penalty =
    input.blockedPolicies * 24 +
    input.reviewPolicies * 10 +
    input.shareLinks * 3 +
    input.remediationPlans * 4;

  return Math.max(0, Math.min(100, 100 - penalty));
}

function findProjectAuditContext(
  auditLogs: WorkspaceAuditLogSummary[],
  projectId: string,
) {
  return findAuditContext({
    auditLogs,
    targetIds: [projectId],
    metadataKey: "projectId",
    metadataValue: projectId,
  });
}

function findAuditContext(input: {
  auditLogs: WorkspaceAuditLogSummary[];
  targetIds: string[];
  metadataKey: string;
  metadataValue: string;
}) {
  const targetIds = new Set(input.targetIds);

  return input.auditLogs
    .filter(
      (log) =>
        (log.targetId && targetIds.has(log.targetId)) ||
        String(log.metadata[input.metadataKey] ?? "") === input.metadataValue,
    )
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )
    .slice(0, 4);
}

function roleLabel(role: TeamWorkspaceRole) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";

  return "Member";
}

function dedupe(values: string[]) {
  return [...new Set(values)];
}
