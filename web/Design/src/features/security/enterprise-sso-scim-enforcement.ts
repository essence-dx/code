import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { TeamWorkspaceRole } from "@/db/team-workspaces";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  EnterpriseIdentityProviderConfig,
  EnterpriseIdentityRoleMapping,
  EnterpriseSsoScimReadinessCenter,
  EnterpriseSsoScimStatus,
} from "@/features/security/enterprise-sso-scim-readiness";

export type EnterpriseScimUserPayload = {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
  groups: string[];
};

export type EnterpriseScimGroupPayload = {
  id: string;
  displayName: string;
  members: string[];
};

export type EnterpriseScimProvisioningAction =
  | "create-invite"
  | "update-role"
  | "deactivate-user"
  | "hold-deprovision"
  | "noop";

export type EnterpriseScimProvisioningDecision = {
  id: string;
  idpUserId: string;
  email: string;
  displayName: string;
  action: EnterpriseScimProvisioningAction;
  status: EnterpriseSsoScimStatus;
  workspaceId: string | null;
  workspaceName: string | null;
  desiredRole: TeamWorkspaceRole | null;
  currentRole: TeamWorkspaceRole | null;
  providerGroups: string[];
  blockers: string[];
  auditLogIds: string[];
};

export type EnterpriseScimGroupRoleSync = {
  id: string;
  providerGroup: string;
  workspaceId: string;
  workspaceName: string;
  workspaceRole: TeamWorkspaceRole;
  status: EnterpriseSsoScimStatus;
  desiredMemberCount: number;
  localMemberCount: number;
  pendingInviteCount: number;
  detail: string;
};

export type EnterpriseScimDeprovisionSafety = {
  id: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  status: EnterpriseSsoScimStatus;
  reason: string;
};

export type EnterpriseScimAdminRolloutEvidence = {
  id: string;
  status: EnterpriseSsoScimStatus;
  generatedAt: string;
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type EnterpriseSsoScimEnforcementCenter = {
  generatedAt: string;
  status: EnterpriseSsoScimStatus;
  score: number;
  groupRoleSyncs: EnterpriseScimGroupRoleSync[];
  provisioningDecisions: EnterpriseScimProvisioningDecision[];
  deprovisionSafeties: EnterpriseScimDeprovisionSafety[];
  adminRolloutEvidence: EnterpriseScimAdminRolloutEvidence;
  nextActions: string[];
  totals: {
    groupRoleSyncs: number;
    decisions: number;
    readyDecisions: number;
    blockedDecisions: number;
    heldDeprovisioning: number;
    mappedGroups: number;
    unmanagedGroups: number;
  };
};

export type EnterpriseSsoScimEnforcementInput = {
  readiness: EnterpriseSsoScimReadinessCenter;
  teamManagement: TeamWorkspaceManagementSummary[];
  providerConfig: EnterpriseIdentityProviderConfig | null | undefined;
  scimUsers: EnterpriseScimUserPayload[];
  scimGroups?: EnterpriseScimGroupPayload[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export type ScimBearerValidationResult =
  | { ok: true; token: string }
  | { ok: false; status: 401 | 503; error: string };

export type ScimListResponse<TResource> = {
  schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: TResource[];
};

const roleRank: Record<TeamWorkspaceRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

const statusScores: Record<EnterpriseSsoScimStatus, number> = {
  ready: 100,
  review: 65,
  blocked: 25,
};

export function createEnterpriseSsoScimEnforcementCenter(
  input: EnterpriseSsoScimEnforcementInput,
): EnterpriseSsoScimEnforcementCenter {
  const generatedAt = normalizeNow(input.now).toISOString();
  const workspaces = input.teamManagement;
  const roleMappings = input.providerConfig?.roleMappings ?? [];
  const groupRoleSyncs = createGroupRoleSyncs({
    workspaces,
    roleMappings,
    scimUsers: input.scimUsers,
  });
  const provisioningDecisions = createProvisioningDecisions({
    readiness: input.readiness,
    workspaces,
    roleMappings,
    scimUsers: input.scimUsers,
    auditLogs: input.auditLogs,
  });
  const deprovisionSafeties = createDeprovisionSafeties({
    decisions: provisioningDecisions,
  });
  const status = aggregateStatus([
    { status: input.readiness.status },
    ...groupRoleSyncs,
    ...provisioningDecisions,
  ]);
  const score = average([
    statusScores[input.readiness.status],
    ...groupRoleSyncs.map((sync) => statusScores[sync.status]),
    ...provisioningDecisions.map((decision) => statusScores[decision.status]),
  ]);
  const nextActions = createNextActions({
    readiness: input.readiness,
    groupRoleSyncs,
    provisioningDecisions,
  });
  const adminRolloutEvidence = createAdminRolloutEvidence({
    input,
    generatedAt,
    status,
    score,
    groupRoleSyncs,
    provisioningDecisions,
    deprovisionSafeties,
    nextActions,
  });

  return {
    generatedAt,
    status,
    score,
    groupRoleSyncs,
    provisioningDecisions,
    deprovisionSafeties,
    adminRolloutEvidence,
    nextActions,
    totals: {
      groupRoleSyncs: groupRoleSyncs.length,
      decisions: provisioningDecisions.length,
      readyDecisions: provisioningDecisions.filter(
        (decision) => decision.status === "ready",
      ).length,
      blockedDecisions: provisioningDecisions.filter(
        (decision) => decision.status === "blocked",
      ).length,
      heldDeprovisioning: provisioningDecisions.filter(
        (decision) => decision.action === "hold-deprovision",
      ).length,
      mappedGroups: groupRoleSyncs.filter((sync) => sync.status !== "blocked")
        .length,
      unmanagedGroups: groupRoleSyncs.filter(
        (sync) => sync.status === "blocked",
      ).length,
    },
  };
}

export function validateScimBearerToken(input: {
  authorization: string | null | undefined;
  expectedToken: string | null | undefined;
}): ScimBearerValidationResult {
  const expectedToken = input.expectedToken?.trim();

  if (!expectedToken) {
    return {
      ok: false,
      status: 503,
      error: "SCIM bearer token is not configured.",
    };
  }

  const token = input.authorization?.replace(/^Bearer\s+/i, "").trim();

  if (!token || token !== expectedToken) {
    return {
      ok: false,
      status: 401,
      error: "Invalid SCIM bearer token.",
    };
  }

  return { ok: true, token };
}

export function parseEnterpriseScimUserResource(
  resource: unknown,
): EnterpriseScimUserPayload | null {
  if (!isRecord(resource)) return null;

  const email = normalizeEmail(
    String(
      readPrimaryEmail(resource.emails) ??
        resource.userName ??
        resource.email ??
        "",
    ),
  );

  if (!email || !email.includes("@")) return null;

  return {
    id: String(resource.id ?? resource.externalId ?? email),
    email,
    displayName: String(resource.displayName ?? resource.name ?? email),
    active: resource.active !== false,
    groups: readScimGroups(resource.groups),
  };
}

export function parseEnterpriseScimGroupResource(
  resource: unknown,
): EnterpriseScimGroupPayload | null {
  if (!isRecord(resource)) return null;

  const displayName = String(resource.displayName ?? "").trim();

  if (!displayName) return null;

  return {
    id: String(resource.id ?? resource.externalId ?? displayName),
    displayName,
    members: readScimGroupMembers(resource.members),
  };
}

export function createScimListResponse<TResource>(input: {
  resources: TResource[];
  startIndex?: number;
  totalResults?: number;
}): ScimListResponse<TResource> {
  return {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: input.totalResults ?? input.resources.length,
    startIndex: input.startIndex ?? 1,
    itemsPerPage: input.resources.length,
    Resources: input.resources,
  };
}

function createGroupRoleSyncs(input: {
  workspaces: TeamWorkspaceManagementSummary[];
  roleMappings: EnterpriseIdentityRoleMapping[];
  scimUsers: EnterpriseScimUserPayload[];
}): EnterpriseScimGroupRoleSync[] {
  return input.roleMappings.map((mapping) => {
    const workspace =
      input.workspaces.find((item) => item.id === mapping.workspaceId) ??
      input.workspaces[0];
    const desiredMemberEmails = new Set(
      input.scimUsers
        .filter(
          (user) => user.active && user.groups.includes(mapping.providerGroup),
        )
        .map((user) => normalizeEmail(user.email)),
    );
    const localMembers =
      workspace?.members.filter(
        (member) =>
          member.role === mapping.workspaceRole &&
          desiredMemberEmails.has(normalizeEmail(member.email)),
      ) ?? [];
    const pendingInvites =
      workspace?.pendingInvites.filter(
        (invite) =>
          invite.role === mapping.workspaceRole &&
          desiredMemberEmails.has(normalizeEmail(invite.email)),
      ) ?? [];
    const status: EnterpriseSsoScimStatus = !workspace
      ? "blocked"
      : mapping.providerGroup.trim()
        ? "ready"
        : "blocked";

    return {
      id: `scim-group-sync-${slugify(mapping.id)}`,
      providerGroup: mapping.providerGroup,
      workspaceId: workspace?.id ?? "workspace-missing",
      workspaceName: workspace?.name ?? "Missing workspace",
      workspaceRole: mapping.workspaceRole,
      status,
      desiredMemberCount: desiredMemberEmails.size,
      localMemberCount: localMembers.length,
      pendingInviteCount: pendingInvites.length,
      detail: workspace
        ? `${mapping.providerGroup} syncs ${desiredMemberEmails.size} identity member${desiredMemberEmails.size === 1 ? "" : "s"} into ${workspace.name} as ${mapping.workspaceRole}.`
        : `${mapping.providerGroup} is mapped to a missing workspace.`,
    };
  });
}

function createProvisioningDecisions(input: {
  readiness: EnterpriseSsoScimReadinessCenter;
  workspaces: TeamWorkspaceManagementSummary[];
  roleMappings: EnterpriseIdentityRoleMapping[];
  scimUsers: EnterpriseScimUserPayload[];
  auditLogs: WorkspaceAuditLogSummary[];
}): EnterpriseScimProvisioningDecision[] {
  return input.scimUsers.map((scimUser) => {
    const matchedMappings = input.roleMappings.filter((mapping) =>
      scimUser.groups.includes(mapping.providerGroup),
    );
    const selectedMapping = selectHighestRoleMapping(matchedMappings);
    const workspace =
      input.workspaces.find(
        (item) => item.id === selectedMapping?.workspaceId,
      ) ??
      input.workspaces[0] ??
      null;
    const localMember =
      workspace?.members.find(
        (member) =>
          normalizeEmail(member.email) === normalizeEmail(scimUser.email),
      ) ?? null;
    const blockers = createDecisionBlockers({
      readiness: input.readiness,
      workspace,
      scimUser,
      selectedMapping,
      localMember,
    });
    const action = createDecisionAction({
      scimUser,
      selectedMapping,
      localMember,
      blockers,
    });
    const status: EnterpriseSsoScimStatus = blockers.length
      ? "blocked"
      : !selectedMapping && scimUser.active
        ? "review"
        : "ready";

    return {
      id: `scim-decision-${slugify(scimUser.id || scimUser.email)}`,
      idpUserId: scimUser.id,
      email: normalizeEmail(scimUser.email),
      displayName: scimUser.displayName,
      action,
      status,
      workspaceId: workspace?.id ?? null,
      workspaceName: workspace?.name ?? null,
      desiredRole: selectedMapping?.workspaceRole ?? null,
      currentRole: localMember?.role ?? null,
      providerGroups: scimUser.groups,
      blockers,
      auditLogIds: input.auditLogs
        .filter((log) =>
          `${log.summary} ${log.metadata.email ?? ""}`
            .toLowerCase()
            .includes(normalizeEmail(scimUser.email)),
        )
        .map((log) => log.id),
    };
  });
}

function createDecisionBlockers(input: {
  readiness: EnterpriseSsoScimReadinessCenter;
  workspace: TeamWorkspaceManagementSummary | null;
  scimUser: EnterpriseScimUserPayload;
  selectedMapping: EnterpriseIdentityRoleMapping | null;
  localMember: TeamWorkspaceManagementSummary["members"][number] | null;
}) {
  const blockers = [
    input.readiness.status === "ready"
      ? null
      : `Resolve SSO/SCIM readiness before applying ${input.scimUser.email}.`,
    input.workspace ? null : `Attach ${input.scimUser.email} to a workspace.`,
  ];

  if (!input.scimUser.active && input.localMember?.role === "owner") {
    const ownerCount =
      input.workspace?.members.filter((member) => member.role === "owner")
        .length ?? 0;

    if (ownerCount <= 1) {
      blockers.push(
        `Transfer ownership before deprovisioning ${input.scimUser.email}.`,
      );
    }
  }

  if (
    input.scimUser.active &&
    input.selectedMapping?.workspaceRole === "owner" &&
    input.localMember?.role !== "owner"
  ) {
    blockers.push(
      `Owner elevation for ${input.scimUser.email} requires manual ownership transfer.`,
    );
  }

  return blockers.filter((blocker): blocker is string => Boolean(blocker));
}

function createDecisionAction(input: {
  scimUser: EnterpriseScimUserPayload;
  selectedMapping: EnterpriseIdentityRoleMapping | null;
  localMember: TeamWorkspaceManagementSummary["members"][number] | null;
  blockers: string[];
}): EnterpriseScimProvisioningAction {
  if (!input.scimUser.active) {
    if (!input.localMember) return "noop";
    if (input.blockers.length) return "hold-deprovision";

    return "deactivate-user";
  }

  if (!input.selectedMapping) return "noop";
  if (!input.localMember) return "create-invite";
  if (input.localMember.role !== input.selectedMapping.workspaceRole) {
    return "update-role";
  }

  return "noop";
}

function createDeprovisionSafeties(input: {
  decisions: EnterpriseScimProvisioningDecision[];
}): EnterpriseScimDeprovisionSafety[] {
  return input.decisions
    .filter(
      (decision) =>
        decision.action === "deactivate-user" ||
        decision.action === "hold-deprovision",
    )
    .map((decision) => ({
      id: `scim-deprovision-safety-${slugify(decision.email)}`,
      email: decision.email,
      workspaceId: decision.workspaceId ?? "workspace-missing",
      workspaceName: decision.workspaceName ?? "Missing workspace",
      status: decision.status,
      reason:
        decision.blockers[0] ??
        `Deactivate ${decision.email} after audit-safe handoff.`,
    }));
}

function createNextActions(input: {
  readiness: EnterpriseSsoScimReadinessCenter;
  groupRoleSyncs: EnterpriseScimGroupRoleSync[];
  provisioningDecisions: EnterpriseScimProvisioningDecision[];
}) {
  return [
    ...(input.readiness.status === "ready"
      ? []
      : [`Resolve SSO/SCIM readiness (${input.readiness.score}/100).`]),
    ...input.groupRoleSyncs
      .filter((sync) => sync.status !== "ready")
      .map((sync) => sync.detail),
    ...input.provisioningDecisions.flatMap((decision) => decision.blockers),
    ...input.provisioningDecisions
      .filter((decision) => decision.status === "review")
      .map(
        (decision) =>
          `Map ${decision.email} to a provider group before applying SCIM.`,
      ),
  ].slice(0, 8);
}

function createAdminRolloutEvidence(input: {
  input: EnterpriseSsoScimEnforcementInput;
  generatedAt: string;
  status: EnterpriseSsoScimStatus;
  score: number;
  groupRoleSyncs: EnterpriseScimGroupRoleSync[];
  provisioningDecisions: EnterpriseScimProvisioningDecision[];
  deprovisionSafeties: EnterpriseScimDeprovisionSafety[];
  nextActions: string[];
}): EnterpriseScimAdminRolloutEvidence {
  const payload = {
    kind: "essence-studio.sso-scim-enforcement",
    version: 1,
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    readinessPacketId: input.input.readiness.rolloutPacket.id,
    provider: {
      providerName: input.input.providerConfig?.providerName ?? null,
      protocol: input.input.providerConfig?.protocol ?? null,
      scimBaseUrl: input.input.providerConfig?.scimBaseUrl ?? null,
      scimTokenConfigured:
        input.input.providerConfig?.scimTokenConfigured ?? false,
    },
    groupRoleSyncs: input.groupRoleSyncs,
    provisioningDecisions: input.provisioningDecisions,
    deprovisionSafeties: input.deprovisionSafeties,
    nextActions: input.nextActions,
    auditLogIds: input.input.auditLogs.map((log) => log.id),
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: "sso-scim-enforcement-rollout-evidence",
    status: input.status,
    generatedAt: input.generatedAt,
    download: {
      fileName: "sso-scim-enforcement-rollout-evidence.json",
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function selectHighestRoleMapping(mappings: EnterpriseIdentityRoleMapping[]) {
  return (
    [...mappings].sort(
      (left, right) =>
        roleRank[right.workspaceRole] - roleRank[left.workspaceRole] ||
        left.providerGroup.localeCompare(right.providerGroup),
    )[0] ?? null
  );
}

function aggregateStatus(values: Array<{ status: EnterpriseSsoScimStatus }>) {
  if (values.some((value) => value.status === "blocked")) return "blocked";
  if (values.some((value) => value.status === "review")) return "review";

  return "ready";
}

function average(values: number[]) {
  if (!values.length) return 100;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function readPrimaryEmail(value: unknown) {
  if (!Array.isArray(value)) return null;

  const primary = value.find(
    (item) => isRecord(item) && item.primary === true && item.value,
  );
  const fallback = value.find((item) => isRecord(item) && item.value);
  const record = primary ?? fallback;

  return isRecord(record) ? String(record.value ?? "") : null;
}

function readScimGroups(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (!isRecord(item)) return "";

      return String(item.display ?? item.value ?? "");
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

function readScimGroupMembers(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (!isRecord(item)) return "";

      return String(item.value ?? item.display ?? "");
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}
