import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { AccountProfile } from "@/db/account-settings";
import type { AuthEmailSummary } from "@/db/auth-emails";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { TeamWorkspaceRole } from "@/db/team-workspaces";
import type { TwoFactorProfile } from "@/db/two-factor";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import {
  createEnterpriseSsoScimReadinessCenter,
  type EnterpriseIdentityProviderConfig,
} from "@/features/security/enterprise-sso-scim-readiness";
import {
  createScimListResponse,
  createEnterpriseSsoScimEnforcementCenter,
  parseEnterpriseScimUserResource,
  validateScimBearerToken,
  type EnterpriseScimUserPayload,
} from "@/features/security/enterprise-sso-scim-enforcement";

describe("enterprise SSO and SCIM enforcement", () => {
  test("creates live SCIM role-sync, provisioning, deprovisioning, and rollout evidence", () => {
    const providerConfig = createProviderConfig();
    const teamManagement = [
      createWorkspace({
        members: [
          createMember({ email: "owner@example.com", role: "owner" }),
          createMember({ email: "admin@example.com", role: "member" }),
          createMember({ email: "former@example.com", role: "member" }),
        ],
      }),
    ];
    const readiness = createEnterpriseSsoScimReadinessCenter({
      accountProfile: createAccount(),
      authEmails: [createAuthEmail()],
      twoFactor: createTwoFactor(),
      teamManagement,
      auditLogs: [createAuditLog()],
      providerConfig,
      now: "2026-05-18T13:00:00.000Z",
    });

    const center = createEnterpriseSsoScimEnforcementCenter({
      readiness,
      teamManagement,
      providerConfig,
      scimUsers: [
        createScimUser({
          email: "owner@example.com",
          groups: ["Essence Owners"],
        }),
        createScimUser({
          id: "idp-admin",
          email: "admin@example.com",
          groups: ["Essence Admins"],
        }),
        createScimUser({
          id: "idp-designer",
          email: "designer@example.com",
          groups: ["Essence Designers"],
        }),
        createScimUser({
          id: "idp-former",
          email: "former@example.com",
          active: false,
          groups: ["Essence Designers"],
        }),
      ],
      auditLogs: [createAuditLog()],
      now: "2026-05-18T13:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.decisions, 4);
    assert.equal(center.totals.readyDecisions, 4);
    assert.equal(center.totals.groupRoleSyncs, 3);
    assert.equal(
      center.groupRoleSyncs.find(
        (sync) => sync.providerGroup === "Essence Admins",
      )?.status,
      "ready",
    );
    assert.equal(
      center.provisioningDecisions.find(
        (decision) => decision.email === "admin@example.com",
      )?.action,
      "update-role",
    );
    assert.equal(
      center.provisioningDecisions.find(
        (decision) => decision.email === "designer@example.com",
      )?.action,
      "create-invite",
    );
    assert.equal(
      center.provisioningDecisions.find(
        (decision) => decision.email === "former@example.com",
      )?.action,
      "deactivate-user",
    );
    assert.equal(
      center.adminRolloutEvidence.download.href.startsWith(
        "data:application/json",
      ),
      true,
    );
  });

  test("blocks missing bearer tokens and holds unsafe owner deprovisioning", () => {
    const providerConfig = createProviderConfig();
    const teamManagement = [
      createWorkspace({
        members: [createMember({ email: "owner@example.com", role: "owner" })],
      }),
    ];
    const readiness = createEnterpriseSsoScimReadinessCenter({
      accountProfile: createAccount(),
      authEmails: [createAuthEmail()],
      twoFactor: createTwoFactor(),
      teamManagement,
      auditLogs: [createAuditLog()],
      providerConfig,
      now: "2026-05-18T13:00:00.000Z",
    });

    const center = createEnterpriseSsoScimEnforcementCenter({
      readiness,
      teamManagement,
      providerConfig,
      scimUsers: [
        createScimUser({
          email: "owner@example.com",
          active: false,
          groups: ["Essence Owners"],
        }),
      ],
      auditLogs: [],
      now: "2026-05-18T13:00:00.000Z",
    });

    assert.equal(
      validateScimBearerToken({
        authorization: "Bearer live-token",
        expectedToken: "live-token",
      }).ok,
      true,
    );
    assert.equal(
      validateScimBearerToken({
        authorization: "Bearer wrong-token",
        expectedToken: "live-token",
      }).ok,
      false,
    );
    assert.equal(center.status, "blocked");
    assert.equal(center.totals.heldDeprovisioning, 1);
    assert.equal(center.provisioningDecisions[0]?.action, "hold-deprovision");
    assert.equal(
      center.nextActions.some((action) =>
        action.includes("Transfer ownership"),
      ),
      true,
    );
  });

  test("normalizes SCIM user resources and list response metadata", () => {
    const user = parseEnterpriseScimUserResource({
      id: "idp-admin",
      userName: "Admin@Example.com",
      displayName: "Admin User",
      active: true,
      emails: [{ value: "admin@example.com", primary: true }],
      groups: [{ display: "Essence Admins" }, { value: "Essence Designers" }],
    });
    const list = createScimListResponse({
      resources: [
        {
          id: "idp-admin",
          userName: "admin@example.com",
          active: true,
        },
      ],
    });

    assert.equal(user?.email, "admin@example.com");
    assert.deepEqual(user?.groups, ["Essence Admins", "Essence Designers"]);
    assert.equal(
      list.schemas[0],
      "urn:ietf:params:scim:api:messages:2.0:ListResponse",
    );
    assert.equal(list.totalResults, 1);
    assert.equal(list.Resources[0]?.id, "idp-admin");
  });
});

function createProviderConfig(): EnterpriseIdentityProviderConfig {
  return {
    providerName: "Entra ID",
    protocol: "oidc",
    entityId: "essence-studio",
    ssoUrl: "https://login.microsoftonline.com/tenant/v2.0",
    certificateFingerprint: "DD:EE:FF",
    scimBaseUrl: "https://essence.studio/api/scim/v2",
    scimTokenConfigured: true,
    jitProvisioning: true,
    domains: ["example.com"],
    roleMappings: [
      {
        id: "owners",
        providerGroup: "Essence Owners",
        workspaceRole: "owner",
        workspaceId: "workspace-core",
      },
      {
        id: "admins",
        providerGroup: "Essence Admins",
        workspaceRole: "admin",
        workspaceId: "workspace-core",
      },
      {
        id: "designers",
        providerGroup: "Essence Designers",
        workspaceRole: "member",
        workspaceId: "workspace-core",
      },
    ],
  };
}

function createScimUser(
  overrides: Partial<EnterpriseScimUserPayload> = {},
): EnterpriseScimUserPayload {
  const email = overrides.email ?? "owner@example.com";

  return {
    id: overrides.id ?? `idp-${email}`,
    email,
    displayName: overrides.displayName ?? email.split("@")[0] ?? email,
    active: overrides.active ?? true,
    groups: overrides.groups ?? ["Essence Designers"],
  };
}

function createWorkspace(
  overrides: Partial<TeamWorkspaceManagementSummary> = {},
): TeamWorkspaceManagementSummary {
  return {
    id: "workspace-core",
    ownerId: "owner-user",
    name: "Core Studio",
    role: "owner",
    pendingInviteCount: 0,
    members: [],
    pendingInvites: [],
    recentActivity: [],
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createMember(input: { email: string; role: TeamWorkspaceRole }) {
  return {
    id: `member-${input.email}`,
    workspaceId: "workspace-core",
    userId: `user-${input.email}`,
    email: input.email,
    role: input.role,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
  };
}

function createAccount(
  overrides: Partial<AccountProfile> = {},
): AccountProfile {
  return {
    id: "owner-user",
    name: "Owner",
    email: "owner@example.com",
    emailVerified: true,
    createdAt: "2026-05-18T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createAuthEmail(
  overrides: Partial<AuthEmailSummary> = {},
): AuthEmailSummary {
  return {
    id: "auth-email",
    subject: "Verify email",
    purpose: "email-verification",
    deliveryStatus: "sent",
    previewUrl: null,
    errorMessage: null,
    sentAt: "2026-05-18T09:00:00.000Z",
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createTwoFactor(
  overrides: Partial<TwoFactorProfile> = {},
): TwoFactorProfile {
  return {
    enabled: true,
    secret: "TOTPSECRET",
    otpauthUrl: "otpauth://totp/Essence:owner@example.com?secret=TOTPSECRET",
    qrDataUrl: "data:image/png;base64,AA==",
    enabledAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-identity",
    action: "team.member.role.updated",
    targetType: "team_workspace",
    targetId: "workspace-core",
    summary: "Updated member role from identity provider sync.",
    actorEmail: "admin@example.com",
    metadata: { workspaceId: "workspace-core" },
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}
