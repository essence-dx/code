import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { AccountProfile } from "@/db/account-settings";
import type { AuthEmailSummary } from "@/db/auth-emails";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { TwoFactorProfile } from "@/db/two-factor";
import { createEnterpriseSsoScimReadinessCenter } from "@/features/security/enterprise-sso-scim-readiness";

describe("enterprise SSO and SCIM readiness center", () => {
  test("builds provider checks, role mappings, domain capture plans, and rollout packets", () => {
    const center = createEnterpriseSsoScimReadinessCenter({
      accountProfile: createAccount({ emailVerified: false }),
      authEmails: [
        createAuthEmail({
          purpose: "email-verification",
          deliveryStatus: "failed",
          errorMessage: "SMTP missing",
        }),
      ],
      twoFactor: createTwoFactor({ enabled: false }),
      teamManagement: [
        createWorkspace({
          id: "workspace-core",
          name: "Core Studio",
          members: [
            createMember({
              id: "owner",
              workspaceId: "workspace-core",
              email: "owner@example.com",
              role: "owner",
            }),
            createMember({
              id: "admin",
              workspaceId: "workspace-core",
              email: "admin@example.com",
              role: "admin",
            }),
          ],
          pendingInvites: [
            createInvite({
              id: "invite",
              workspaceId: "workspace-core",
              email: "designer@gmail.com",
              role: "member",
            }),
          ],
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-role",
          action: "team.member.role.updated",
          targetId: "workspace-core",
          metadata: { workspaceId: "workspace-core" },
        }),
      ],
      providerConfig: {
        providerName: "Okta",
        protocol: "saml",
        entityId: "essence-studio",
        ssoUrl: "https://idp.example.com/sso",
        certificateFingerprint: "AA:BB:CC",
        scimBaseUrl: "https://idp.example.com/scim/v2",
        scimTokenConfigured: false,
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
        ],
      },
      now: "2026-05-18T09:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.workspaces, 1);
    assert.equal(center.totals.providerChecks, 5);
    assert.equal(center.totals.roleMappings, 2);
    assert.equal(center.totals.domainPlans, 2);

    assert.equal(
      center.providerChecks.some(
        (check) => check.id === "scim-provisioning" && check.status === "blocked",
      ),
      true,
    );
    assert.equal(
      center.roleMappingPreviews.some(
        (mapping) =>
          mapping.workspaceId === "workspace-core" &&
          mapping.providerGroup === "Essence Owners" &&
          mapping.workspaceRole === "owner" &&
          mapping.status === "ready",
      ),
      true,
    );

    const examplePlan = center.domainCapturePlans.find(
      (plan) => plan.domain === "example.com",
    );
    assert.equal(examplePlan?.status, "blocked");
    assert.equal(examplePlan?.verifiedAccountDomain, false);
    assert.equal(
      examplePlan?.requiredSteps.some((step) => step.includes("Verify")),
      true,
    );

    const personalPlan = center.domainCapturePlans.find(
      (plan) => plan.domain === "gmail.com",
    );
    assert.equal(personalPlan?.status, "review");
    assert.equal(personalPlan?.personalDomain, true);

    assert.equal(center.rolloutPacket.download.fileName, "sso-scim-rollout-packet.json");
    assert.equal(
      center.rolloutPacket.download.href.startsWith("data:application/json"),
      true,
    );
    assert.equal(
      center.nextActions.some((action) => action.includes("SCIM")),
      true,
    );
  });

  test("keeps readiness green when provider, SCIM, domains, mapping, MFA, and audit evidence are present", () => {
    const center = createEnterpriseSsoScimReadinessCenter({
      accountProfile: createAccount({ emailVerified: true }),
      authEmails: [createAuthEmail({ deliveryStatus: "sent" })],
      twoFactor: createTwoFactor({ enabled: true }),
      teamManagement: [
        createWorkspace({
          id: "workspace-ready",
          name: "Ready Studio",
          members: [
            createMember({
              workspaceId: "workspace-ready",
              email: "owner@example.com",
              role: "owner",
            }),
            createMember({
              workspaceId: "workspace-ready",
              email: "admin@example.com",
              role: "admin",
            }),
          ],
        }),
      ],
      auditLogs: [
        createAuditLog({
          action: "auth.two_factor.enabled",
          targetType: "account",
          metadata: { workspaceId: "workspace-ready" },
        }),
        createAuditLog({
          id: "audit-invite",
          action: "team.invite.accepted",
          targetId: "workspace-ready",
          metadata: { workspaceId: "workspace-ready" },
        }),
      ],
      providerConfig: {
        providerName: "Entra ID",
        protocol: "oidc",
        entityId: "essence-studio",
        ssoUrl: "https://login.microsoftonline.com/tenant/v2.0",
        certificateFingerprint: "DD:EE:FF",
        scimBaseUrl: "https://graph.microsoft.com/scim/v2",
        scimTokenConfigured: true,
        jitProvisioning: true,
        domains: ["example.com"],
        roleMappings: [
          {
            id: "ready-owners",
            providerGroup: "Ready Owners",
            workspaceRole: "owner",
            workspaceId: "workspace-ready",
          },
          {
            id: "ready-admins",
            providerGroup: "Ready Admins",
            workspaceRole: "admin",
            workspaceId: "workspace-ready",
          },
          {
            id: "ready-members",
            providerGroup: "Ready Members",
            workspaceRole: "member",
            workspaceId: "workspace-ready",
          },
        ],
      },
      now: "2026-05-18T09:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.blockedChecks, 0);
    assert.equal(center.totals.reviewChecks, 0);
    assert.deepEqual(center.nextActions, []);
    assert.equal(
      center.providerChecks.every((check) => check.status === "ready"),
      true,
    );
  });
});

function createAccount(overrides: Partial<AccountProfile> = {}): AccountProfile {
  return {
    id: "user-1",
    name: "Owner",
    email: "owner@example.com",
    emailVerified: true,
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createAuthEmail(
  overrides: Partial<AuthEmailSummary> = {},
): AuthEmailSummary {
  return {
    id: "email-1",
    subject: "Verify your email",
    purpose: "email-verification",
    deliveryStatus: "sent",
    previewUrl: null,
    errorMessage: null,
    sentAt: "2026-05-18T08:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createTwoFactor(overrides: Partial<TwoFactorProfile> = {}): TwoFactorProfile {
  return {
    enabled: true,
    secret: "secret",
    otpauthUrl: "otpauth://totp/Essence",
    qrDataUrl: "data:image/png;base64,qr",
    enabledAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createWorkspace(
  overrides: Partial<TeamWorkspaceManagementSummary> = {},
): TeamWorkspaceManagementSummary {
  return {
    id: "workspace",
    ownerId: "user-owner",
    name: "Workspace",
    role: "owner",
    pendingInviteCount: 0,
    members: [],
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
  overrides: Partial<TeamWorkspaceManagementSummary["pendingInvites"][number]> = {},
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

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "team.invite.created",
    targetType: "team_workspace",
    targetId: "workspace",
    summary: "Invited teammate.",
    actorEmail: "owner@example.com",
    metadata: {},
    createdAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}
