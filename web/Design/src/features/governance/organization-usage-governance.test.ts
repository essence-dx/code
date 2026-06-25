import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { AuthEmailSummary } from "@/db/auth-emails";
import type {
  TeamWorkspaceManagementSummary,
  TeamWorkspaceMemberSummary,
  TeamWorkspacePendingInviteSummary,
} from "@/db/team-workspace-management";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import { createAssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { AutomationRecipeSummary } from "@/features/automation/automation-recipes";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import { createOrganizationUsageGovernance } from "@/features/governance/organization-usage-governance";

describe("organization usage governance", () => {
  test("builds quota pressure views across storage, exports, publishing, email, automation, and seats", () => {
    const assetAudit = createAssetLibraryAudit({
      quotaBytes: 10_000,
      uploads: [
        createStoredAsset({ id: "asset-1", sizeBytes: 4_500 }),
        createStoredAsset({ id: "asset-2", sizeBytes: 4_500 }),
      ],
      brandLogos: [],
      projectManifests: [
        {
          projectId: "project-1",
          projectName: "Launch page",
          totalBytes: 900,
          entryCount: 3,
          skippedReferenceCount: 1,
          updatedAt: "2026-05-18T09:00:00.000Z",
        },
      ],
    });
    const center = createOrganizationUsageGovernance({
      assetAudit,
      serverExportJobs: [
        createExportJob({ id: "export-1", status: "failed" }),
        createExportJob({ id: "export-2", status: "failed" }),
        createExportJob({ id: "export-3", status: "completed" }),
      ],
      websitePublishes: [
        createWebsitePublish({
          id: "site-1",
          customDomains: [
            createDomain({
              id: "domain-1",
              platformStatus: "error",
              platformError: "DNS record missing",
            }),
          ],
        }),
        createWebsitePublish({ id: "site-2", status: "published" }),
      ],
      websiteFormSubmissions: [
        createFormSubmission({ id: "form-1" }),
        createFormSubmission({ id: "form-2" }),
      ],
      authEmails: [
        createAuthEmail({ id: "email-1", deliveryStatus: "failed" }),
        createAuthEmail({ id: "email-2", deliveryStatus: "delivered" }),
        createAuthEmail({ id: "email-3", deliveryStatus: "failed" }),
      ],
      automationRecipes: [
        createRecipe({ id: "scheduled-export", disabledReason: null }),
        createRecipe({
          id: "review-nudge",
          disabledReason: "No open review tasks need a nudge.",
        }),
      ],
      teamManagement: [
        createWorkspace({
          members: [
            createMember({ id: "owner", userId: "owner-user", role: "owner" }),
            createMember({ id: "admin", userId: "admin-user", role: "admin" }),
            createMember({
              id: "member",
              userId: "member-user",
              role: "member",
            }),
          ],
          pendingInvites: [
            createInvite({ id: "invite-1" }),
            createInvite({ id: "invite-2" }),
          ],
        }),
      ],
      quotas: {
        exportJobs: 3,
        publishedWebsites: 2,
        emailSends: 3,
        automationRecipes: 2,
        teamSeats: 5,
      },
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.blockedAreas >= 1, true);
    assert.equal(center.totals.reviewAreas >= 4, true);
    assert.equal(center.totals.pressureAreas, 6);

    const storage = center.areas.find((area) => area.id === "storage");
    assert.equal(storage?.status, "blocked");
    assert.equal(storage?.used, 9_900);
    assert.equal(storage?.quota, 10_000);
    assert.equal(
      storage?.signals.some((signal) => signal.includes("99.0%")),
      true,
    );

    const exportArea = center.areas.find((area) => area.id === "exports");
    assert.equal(exportArea?.usagePercent, 100);
    assert.equal(
      exportArea?.signals.some((signal) => signal.includes("2 failed exports")),
      true,
    );

    const teamSeats = center.areas.find((area) => area.id === "team-seats");
    assert.equal(teamSeats?.used, 5);
    assert.equal(teamSeats?.quota, 5);

    assert.equal(
      center.remediationPlans.some((plan) =>
        plan.title.includes("Reduce storage pressure"),
      ),
      true,
    );
    assert.equal(
      center.nextActions.some((action) => action.includes("storage")),
      true,
    );
  });

  test("keeps organization governance ready when usage is under pressure thresholds", () => {
    const center = createOrganizationUsageGovernance({
      assetAudit: createAssetLibraryAudit({
        quotaBytes: 100_000,
        uploads: [createStoredAsset({ sizeBytes: 1_000 })],
        brandLogos: [],
        projectManifests: [],
      }),
      serverExportJobs: [createExportJob({ status: "completed" })],
      websitePublishes: [createWebsitePublish({ status: "published" })],
      websiteFormSubmissions: [],
      authEmails: [createAuthEmail({ deliveryStatus: "delivered" })],
      automationRecipes: [createRecipe({ disabledReason: null })],
      teamManagement: [
        createWorkspace({
          members: [createMember({ role: "owner" })],
          pendingInvites: [],
        }),
      ],
      quotas: {
        exportJobs: 10,
        publishedWebsites: 10,
        emailSends: 10,
        automationRecipes: 10,
        teamSeats: 10,
      },
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.blockedAreas, 0);
    assert.equal(center.remediationPlans.length, 0);
    assert.deepEqual(center.nextActions, []);
  });
});

function createStoredAsset(
  overrides: Partial<
    Parameters<typeof createAssetLibraryAudit>[0]["uploads"][number]
  > = {},
) {
  return {
    id: "asset",
    name: "asset.png",
    mimeType: "image/png",
    dataUrl: `data:image/png;base64,${overrides.id ?? "asset"}`,
    sizeBytes: 1_000,
    sourceProvider: "Upload",
    sourceUrl: null,
    authorName: null,
    licenseName: "Internal",
    licenseUrl: null,
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export",
    projectId: "project-1",
    projectName: "Launch page",
    format: "pdf",
    formatLabel: "PDF",
    fileName: "launch.pdf",
    status: "completed",
    progress: 100,
    artifactName: "launch.pdf",
    artifactMimeType: "application/pdf",
    artifactSizeBytes: 2_000,
    artifactDataUrl: null,
    failureMessage: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    completedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "site",
    projectId: "project-1",
    projectName: "Launch page",
    slug: "launch",
    title: "Launch site",
    seoTitle: "Launch",
    seoDescription: "Launch site",
    status: "published",
    publishedAt: "2026-05-18T08:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    viewCount: 0,
    clickCount: 0,
    lastAnalyticsAt: null,
    customDomains: [],
    ...overrides,
  };
}

function createDomain(
  overrides: Partial<WebsitePublishSummary["customDomains"][number]> = {},
): WebsitePublishSummary["customDomains"][number] {
  return {
    id: "domain",
    publishId: "site",
    projectId: "project-1",
    domain: "launch.example.com",
    status: "pending",
    verificationName: "_essence",
    verificationValue: "verify",
    verifiedAt: null,
    platformStatus: "manual",
    platformError: null,
    platformAttachedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createFormSubmission(
  overrides: Partial<WebsiteFormSubmissionSummary> = {},
): WebsiteFormSubmissionSummary {
  return {
    id: "form",
    publishId: "site",
    projectId: "project-1",
    websiteTitle: "Launch site",
    sectionId: "contact",
    payload: { email: "client@example.com" },
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createAuthEmail(
  overrides: Partial<AuthEmailSummary> = {},
): AuthEmailSummary {
  return {
    id: "email",
    subject: "Verify account",
    purpose: "email-verification",
    deliveryStatus: "delivered",
    previewUrl: null,
    errorMessage: null,
    sentAt: "2026-05-18T09:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    ...overrides,
  };
}

function createRecipe(
  overrides: Partial<AutomationRecipeSummary> = {},
): AutomationRecipeSummary {
  return {
    id: "scheduled-export",
    title: "Scheduled export prep",
    description: "Queue exports.",
    targetLabel: "Design",
    actionLabel: "Queue export",
    defaultStartAt: "2026-05-19T09:00:00.000Z",
    cadenceDays: null,
    targets: [{ id: "project-1", label: "Launch page", helper: "PDF" }],
    disabledReason: null,
    metrics: [],
    ...overrides,
  };
}

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
