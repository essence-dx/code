import type { AccountProfile } from "@/db/account-settings";
import type { AuthEmailSummary } from "@/db/auth-emails";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { TeamWorkspaceRole } from "@/db/team-workspaces";
import type { TwoFactorProfile } from "@/db/two-factor";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";

export type EnterpriseSsoScimStatus = "ready" | "review" | "blocked";

export type EnterpriseIdentityProtocol = "saml" | "oidc";

export type EnterpriseIdentityRoleMapping = {
  id: string;
  providerGroup: string;
  workspaceRole: TeamWorkspaceRole;
  workspaceId?: string | null;
};

export type EnterpriseIdentityProviderConfig = {
  providerName?: string | null;
  protocol?: EnterpriseIdentityProtocol | null;
  entityId?: string | null;
  ssoUrl?: string | null;
  certificateFingerprint?: string | null;
  scimBaseUrl?: string | null;
  scimTokenConfigured?: boolean;
  jitProvisioning?: boolean;
  domains?: string[];
  roleMappings?: EnterpriseIdentityRoleMapping[];
};

export type EnterpriseSsoScimProviderCheck = {
  id:
    | "identity-provider"
    | "scim-provisioning"
    | "domain-capture"
    | "role-mapping"
    | "audit-and-mfa";
  label: string;
  status: EnterpriseSsoScimStatus;
  score: number;
  detail: string;
  evidence: string[];
};

export type EnterpriseSsoScimRoleMappingPreview = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  providerGroup: string;
  workspaceRole: TeamWorkspaceRole;
  status: EnterpriseSsoScimStatus;
  localMemberCount: number;
  pendingInviteCount: number;
  auditLogIds: string[];
  detail: string;
};

export type EnterpriseSsoScimDomainCapturePlan = {
  id: string;
  domain: string;
  status: EnterpriseSsoScimStatus;
  configuredInProvider: boolean;
  verifiedAccountDomain: boolean;
  personalDomain: boolean;
  memberCount: number;
  pendingInviteCount: number;
  requiredSteps: string[];
};

export type EnterpriseSsoScimRolloutPacket = {
  id: string;
  status: EnterpriseSsoScimStatus;
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type EnterpriseSsoScimReadinessCenter = {
  status: EnterpriseSsoScimStatus;
  score: number;
  providerChecks: EnterpriseSsoScimProviderCheck[];
  roleMappingPreviews: EnterpriseSsoScimRoleMappingPreview[];
  domainCapturePlans: EnterpriseSsoScimDomainCapturePlan[];
  rolloutPacket: EnterpriseSsoScimRolloutPacket;
  nextActions: string[];
  totals: {
    workspaces: number;
    providerChecks: number;
    blockedChecks: number;
    reviewChecks: number;
    roleMappings: number;
    domainPlans: number;
    capturedDomains: number;
    pendingInvites: number;
  };
};

export type EnterpriseSsoScimReadinessInput = {
  accountProfile: AccountProfile;
  authEmails: AuthEmailSummary[];
  twoFactor: TwoFactorProfile;
  teamManagement: TeamWorkspaceManagementSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  providerConfig?: EnterpriseIdentityProviderConfig | null;
  now?: string | Date;
};

const personalEmailDomains = new Set([
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "yahoo.com",
  "proton.me",
  "protonmail.com",
]);

export function createEnterpriseSsoScimReadinessCenter(
  input: EnterpriseSsoScimReadinessInput,
): EnterpriseSsoScimReadinessCenter {
  const now = normalizeNow(input.now);
  const workspaces = input.teamManagement.length
    ? input.teamManagement
    : [createPersonalWorkspace(input.accountProfile)];
  const domainCapturePlans = createDomainCapturePlans({
    accountProfile: input.accountProfile,
    workspaces,
    providerConfig: input.providerConfig,
  });
  const roleMappingPreviews = createRoleMappingPreviews({
    workspaces,
    providerConfig: input.providerConfig,
    auditLogs: input.auditLogs,
  });
  const providerChecks = createProviderChecks({
    accountProfile: input.accountProfile,
    authEmails: input.authEmails,
    twoFactor: input.twoFactor,
    providerConfig: input.providerConfig,
    domainCapturePlans,
    roleMappingPreviews,
    auditLogs: input.auditLogs,
  });
  const blockedChecks = providerChecks.filter(
    (check) => check.status === "blocked",
  ).length;
  const reviewChecks = providerChecks.filter(
    (check) => check.status === "review",
  ).length;
  const status = blockedChecks ? "blocked" : reviewChecks ? "review" : "ready";
  const score = Math.round(
    providerChecks.reduce((total, check) => total + check.score, 0) /
      providerChecks.length,
  );
  const nextActions = createNextActions({
    providerChecks,
    domainCapturePlans,
    roleMappingPreviews,
  });
  const rolloutPacket = createRolloutPacket({
    status,
    score,
    providerChecks,
    domainCapturePlans,
    roleMappingPreviews,
    nextActions,
    now,
  });

  return {
    status,
    score,
    providerChecks,
    roleMappingPreviews,
    domainCapturePlans,
    rolloutPacket,
    nextActions,
    totals: {
      workspaces: workspaces.length,
      providerChecks: providerChecks.length,
      blockedChecks,
      reviewChecks,
      roleMappings: roleMappingPreviews.length,
      domainPlans: domainCapturePlans.length,
      capturedDomains: domainCapturePlans.filter(
        (plan) => plan.configuredInProvider,
      ).length,
      pendingInvites: workspaces.reduce(
        (total, workspace) => total + workspace.pendingInvites.length,
        0,
      ),
    },
  };
}

function createProviderChecks(input: {
  accountProfile: AccountProfile;
  authEmails: AuthEmailSummary[];
  twoFactor: TwoFactorProfile;
  providerConfig: EnterpriseIdentityProviderConfig | null | undefined;
  domainCapturePlans: EnterpriseSsoScimDomainCapturePlan[];
  roleMappingPreviews: EnterpriseSsoScimRoleMappingPreview[];
  auditLogs: WorkspaceAuditLogSummary[];
}): EnterpriseSsoScimProviderCheck[] {
  const config = input.providerConfig;
  const hasProviderMetadata = Boolean(
    config?.providerName &&
      config.protocol &&
      config.entityId &&
      config.ssoUrl &&
      config.certificateFingerprint,
  );
  const hasPartialProviderMetadata = Boolean(
    config?.providerName || config?.ssoUrl || config?.entityId,
  );
  const hasScim = Boolean(config?.scimBaseUrl && config.scimTokenConfigured);
  const hasPartialScim = Boolean(config?.scimBaseUrl || config?.scimTokenConfigured);
  const domainStatus = aggregateStatus(input.domainCapturePlans);
  const mappingStatus = aggregateStatus(input.roleMappingPreviews);
  const recentIdentityAudit = input.auditLogs.filter(isIdentityAuditLog);
  const failedAuthEmails = input.authEmails.filter(
    (email) => email.deliveryStatus === "failed",
  );
  const auditAndMfaScore =
    input.twoFactor.enabled &&
    input.accountProfile.emailVerified &&
    !failedAuthEmails.length &&
    recentIdentityAudit.length
      ? 100
      : !input.twoFactor.enabled || !input.accountProfile.emailVerified
        ? 45
        : 70;

  return [
    {
      id: "identity-provider",
      label: "Identity provider metadata",
      status: hasProviderMetadata
        ? "ready"
        : hasPartialProviderMetadata
          ? "review"
          : "blocked",
      score: hasProviderMetadata ? 100 : hasPartialProviderMetadata ? 65 : 20,
      detail: hasProviderMetadata
        ? `${config?.providerName} ${config?.protocol?.toUpperCase()} metadata is ready for staged rollout.`
        : "Provider name, protocol, entity ID, SSO URL, and certificate fingerprint are required before rollout.",
      evidence: [
        config?.providerName ? `Provider: ${config.providerName}` : "Provider missing",
        config?.protocol ? `Protocol: ${config.protocol}` : "Protocol missing",
        config?.ssoUrl ? "SSO URL present" : "SSO URL missing",
        config?.certificateFingerprint
          ? "Certificate fingerprint present"
          : "Certificate fingerprint missing",
      ],
    },
    {
      id: "scim-provisioning",
      label: "SCIM provisioning",
      status: hasScim ? "ready" : "blocked",
      score: hasScim ? 100 : hasPartialScim ? 45 : 20,
      detail: hasScim
        ? "SCIM base URL and token configuration are present."
        : "SCIM base URL and token configuration must be completed before automated provisioning.",
      evidence: [
        config?.scimBaseUrl ? "SCIM base URL present" : "SCIM base URL missing",
        config?.scimTokenConfigured
          ? "SCIM token configured"
          : "SCIM token missing",
        config?.jitProvisioning
          ? "JIT provisioning enabled"
          : "JIT provisioning not enabled",
      ],
    },
    {
      id: "domain-capture",
      label: "Domain capture planning",
      status: domainStatus,
      score: scoreStatusCollection(input.domainCapturePlans),
      detail: `${input.domainCapturePlans.length} domains are included in capture planning.`,
      evidence: input.domainCapturePlans.map(
        (plan) =>
          `${plan.domain}: ${plan.memberCount} members, ${plan.pendingInviteCount} invites`,
      ),
    },
    {
      id: "role-mapping",
      label: "Role mapping preview",
      status: mappingStatus,
      score: scoreStatusCollection(input.roleMappingPreviews),
      detail: `${input.roleMappingPreviews.length} provider group mappings preview workspace roles.`,
      evidence: input.roleMappingPreviews.map(
        (mapping) =>
          `${mapping.providerGroup} -> ${mapping.workspaceName} ${mapping.workspaceRole}`,
      ),
    },
    {
      id: "audit-and-mfa",
      label: "Audit and MFA guardrails",
      status: scoreToStatus(auditAndMfaScore),
      score: auditAndMfaScore,
      detail:
        "Rollout guardrails use verified account email, two-factor status, auth email delivery, and identity audit evidence.",
      evidence: [
        input.accountProfile.emailVerified
          ? "Account email verified"
          : "Account email is not verified",
        input.twoFactor.enabled ? "Two-factor enabled" : "Two-factor disabled",
        `${failedAuthEmails.length} failed auth email events`,
        `${recentIdentityAudit.length} identity audit events`,
      ],
    },
  ];
}

function createRoleMappingPreviews(input: {
  workspaces: TeamWorkspaceManagementSummary[];
  providerConfig: EnterpriseIdentityProviderConfig | null | undefined;
  auditLogs: WorkspaceAuditLogSummary[];
}): EnterpriseSsoScimRoleMappingPreview[] {
  const configuredMappings = input.providerConfig?.roleMappings ?? [];
  const mappings = configuredMappings.length
    ? configuredMappings
    : input.workspaces.flatMap((workspace) =>
        (["owner", "admin", "member"] as const).map((role) => ({
          id: `${workspace.id}-${role}`,
          providerGroup: `${workspace.name} ${role}s`,
          workspaceRole: role,
          workspaceId: workspace.id,
        })),
      );

  return mappings.map((mapping) => {
    const workspace =
      input.workspaces.find((item) => item.id === mapping.workspaceId) ??
      input.workspaces[0];
    const localMembers =
      workspace?.members.filter((member) => member.role === mapping.workspaceRole) ??
      [];
    const pendingInvites =
      workspace?.pendingInvites.filter(
        (invite) => invite.role === mapping.workspaceRole,
      ) ?? [];
    const auditContext = input.auditLogs.filter(
      (log) =>
        log.targetId === workspace?.id ||
        String(log.metadata.workspaceId ?? "") === workspace?.id,
    );
    const hasGroup = Boolean(mapping.providerGroup.trim());
    const hasWorkspace = Boolean(workspace);
    const status: EnterpriseSsoScimStatus = !hasGroup || !hasWorkspace
      ? "blocked"
      : mapping.workspaceRole === "owner" && localMembers.length === 0
        ? "blocked"
        : "ready";

    return {
      id: mapping.id,
      workspaceId: workspace?.id ?? "workspace-missing",
      workspaceName: workspace?.name ?? "Missing workspace",
      providerGroup: mapping.providerGroup,
      workspaceRole: mapping.workspaceRole,
      status,
      localMemberCount: localMembers.length,
      pendingInviteCount: pendingInvites.length,
      auditLogIds: auditContext.map((log) => log.id),
      detail: hasWorkspace
        ? `${mapping.providerGroup} maps to ${mapping.workspaceRole} in ${workspace.name}.`
        : `${mapping.providerGroup} is not attached to an existing workspace.`,
    };
  });
}

function createDomainCapturePlans(input: {
  accountProfile: AccountProfile;
  workspaces: TeamWorkspaceManagementSummary[];
  providerConfig: EnterpriseIdentityProviderConfig | null | undefined;
}): EnterpriseSsoScimDomainCapturePlan[] {
  const configuredDomains = new Set(
    (input.providerConfig?.domains ?? []).map(normalizeDomain).filter(Boolean),
  );
  const memberEmails = input.workspaces.flatMap((workspace) =>
    workspace.members.map((member) => member.email),
  );
  const inviteEmails = input.workspaces.flatMap((workspace) =>
    workspace.pendingInvites.map((invite) => invite.email),
  );
  const domains = new Set(
    [
      extractDomain(input.accountProfile.email),
      ...memberEmails.map(extractDomain),
      ...inviteEmails.map(extractDomain),
      ...configuredDomains,
    ].filter(Boolean),
  );

  return Array.from(domains)
    .map((domain) => {
      const memberCount = countEmailsForDomain(memberEmails, domain);
      const pendingInviteCount = countEmailsForDomain(inviteEmails, domain);
      const accountDomain = extractDomain(input.accountProfile.email);
      const verifiedAccountDomain =
        accountDomain === domain && input.accountProfile.emailVerified;
      const configuredInProvider = configuredDomains.has(domain);
      const personalDomain = personalEmailDomains.has(domain);
      const requiredSteps = [
        configuredInProvider
          ? null
          : `Add ${domain} to the identity provider domain allowlist.`,
        verifiedAccountDomain || accountDomain !== domain
          ? null
          : `Verify ${input.accountProfile.email} before domain capture.`,
        personalDomain
          ? "Replace personal email identities with managed workspace domains before capture."
          : null,
        pendingInviteCount
          ? `Resolve ${pendingInviteCount} pending invite${
              pendingInviteCount === 1 ? "" : "s"
            } before enforcing SSO.`
          : null,
      ].filter((step): step is string => Boolean(step));
      const status: EnterpriseSsoScimStatus =
        accountDomain === domain && !verifiedAccountDomain
          ? "blocked"
          : personalDomain || requiredSteps.length
            ? "review"
            : "ready";

      return {
        id: `domain-${domain}`,
        domain,
        status,
        configuredInProvider,
        verifiedAccountDomain,
        personalDomain,
        memberCount,
        pendingInviteCount,
        requiredSteps,
      };
    })
    .sort(
      (left, right) =>
        statusWeight(left.status) - statusWeight(right.status) ||
        right.memberCount - left.memberCount ||
        left.domain.localeCompare(right.domain),
    );
}

function createNextActions(input: {
  providerChecks: EnterpriseSsoScimProviderCheck[];
  domainCapturePlans: EnterpriseSsoScimDomainCapturePlan[];
  roleMappingPreviews: EnterpriseSsoScimRoleMappingPreview[];
}) {
  const checkActions = input.providerChecks
    .filter((check) => check.status !== "ready")
    .map((check) => `${check.label}: ${check.detail}`);
  const domainActions = input.domainCapturePlans
    .filter((plan) => plan.status !== "ready")
    .flatMap((plan) => plan.requiredSteps.map((step) => `${plan.domain}: ${step}`));
  const mappingActions = input.roleMappingPreviews
    .filter((mapping) => mapping.status !== "ready")
    .map((mapping) => `${mapping.workspaceName}: ${mapping.detail}`);

  return [...checkActions, ...domainActions, ...mappingActions].slice(0, 5);
}

function createRolloutPacket(input: {
  status: EnterpriseSsoScimStatus;
  score: number;
  providerChecks: EnterpriseSsoScimProviderCheck[];
  domainCapturePlans: EnterpriseSsoScimDomainCapturePlan[];
  roleMappingPreviews: EnterpriseSsoScimRoleMappingPreview[];
  nextActions: string[];
  now: Date;
}): EnterpriseSsoScimRolloutPacket {
  const payload = {
    kind: "essence-studio.sso-scim-rollout-packet",
    version: 1,
    generatedAt: input.now.toISOString(),
    status: input.status,
    score: input.score,
    providerChecks: input.providerChecks,
    domainCapturePlans: input.domainCapturePlans,
    roleMappingPreviews: input.roleMappingPreviews,
    nextActions: input.nextActions,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: "sso-scim-rollout-packet",
    status: input.status,
    download: {
      fileName: "sso-scim-rollout-packet.json",
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function createPersonalWorkspace(
  accountProfile: AccountProfile,
): TeamWorkspaceManagementSummary {
  return {
    id: "personal-workspace",
    ownerId: accountProfile.id,
    name: "Personal workspace",
    role: "owner",
    pendingInviteCount: 0,
    members: [
      {
        id: "personal-owner",
        workspaceId: "personal-workspace",
        userId: accountProfile.id,
        email: accountProfile.email,
        role: "owner",
        createdAt: accountProfile.createdAt,
        updatedAt: accountProfile.updatedAt,
      },
    ],
    pendingInvites: [],
    recentActivity: [],
    createdAt: accountProfile.createdAt,
    updatedAt: accountProfile.updatedAt,
  };
}

function isIdentityAuditLog(log: WorkspaceAuditLogSummary) {
  return (
    log.action === "auth.two_factor.enabled" ||
    log.action === "auth.two_factor.disabled" ||
    log.action === "team.member.role.updated" ||
    log.action === "team.invite.created" ||
    log.action === "team.invite.accepted" ||
    log.action === "team.owner.transferred"
  );
}

function scoreStatusCollection(
  values: Array<{ status: EnterpriseSsoScimStatus }>,
) {
  if (!values.length) return 30;

  return Math.round(
    values.reduce((total, value) => total + statusScore(value.status), 0) /
      values.length,
  );
}

function aggregateStatus(values: Array<{ status: EnterpriseSsoScimStatus }>) {
  if (values.some((value) => value.status === "blocked")) return "blocked";
  if (values.some((value) => value.status === "review")) return "review";

  return "ready";
}

function statusScore(status: EnterpriseSsoScimStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 65;

  return 25;
}

function scoreToStatus(score: number): EnterpriseSsoScimStatus {
  if (score >= 80) return "ready";
  if (score >= 55) return "review";

  return "blocked";
}

function statusWeight(status: EnterpriseSsoScimStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function countEmailsForDomain(emails: string[], domain: string) {
  return emails.filter((email) => extractDomain(email) === domain).length;
}

function extractDomain(email: string) {
  return normalizeDomain(email.split("@")[1] ?? "");
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase();
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}
