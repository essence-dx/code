import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type {
  AccountProfile,
  AccountSessionSummary,
} from "@/db/account-settings";
import type { AuthEmailSummary } from "@/db/auth-emails";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary } from "@/features/editor/types";
import { createCompliancePrivacyCenter } from "@/features/compliance/compliance-privacy-center";

describe("compliance privacy center", () => {
  test("creates ready consent and export packets for safe public forms", () => {
    const center = createCompliancePrivacyCenter({
      profile: createProfile(),
      sessions: [createSession()],
      authEmails: [createAuthEmail()],
      projects: [createProject()],
      websitePublishes: [createPublish()],
      websiteFormSubmissions: [
        createSubmission({
          payload: {
            email: "reader@example.com",
            consent: "yes",
          },
        }),
      ],
      auditLogs: [createAuditLog()],
      now: new Date("2026-05-16T00:00:00.000Z"),
    });

    assert.equal(center.totals.publishedForms, 1);
    assert.equal(center.totals.consentReadyForms, 1);
    assert.equal(center.totals.sensitiveFieldIssues, 0);
    assert.equal(center.accountPackets.length, 2);
    assert.ok(center.accountPackets[0]?.dataUrl.startsWith("data:application/json"));
    assert.ok(center.score >= 80);
  });

  test("blocks unsafe public form payloads and old audit retention", () => {
    const center = createCompliancePrivacyCenter({
      profile: createProfile({ emailVerified: false }),
      sessions: [],
      authEmails: [],
      projects: [createProject({ publicShareId: "public-share" })],
      websitePublishes: [createPublish()],
      websiteFormSubmissions: [
        createSubmission({
          payload: {
            email: "reader@example.com",
            password: "secret",
          },
        }),
      ],
      auditLogs: Array.from({ length: 8 }, (_, index) =>
        createAuditLog({
          id: `old-audit-${index}`,
          createdAt: "2025-01-01T00:00:00.000Z",
        }),
      ),
      now: new Date("2026-05-16T00:00:00.000Z"),
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.sensitiveFieldIssues, 1);
    assert.equal(center.auditRetention.status, "blocked");
    assert.ok(center.nextActions.length > 0);
  });
});

function createProfile(overrides: Partial<AccountProfile> = {}): AccountProfile {
  return {
    id: "user-1",
    name: "Admin",
    email: "admin@mail.com",
    emailVerified: true,
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createSession(
  overrides: Partial<AccountSessionSummary> = {},
): AccountSessionSummary {
  return {
    id: "session-1",
    ipAddress: "127.0.0.1",
    userAgent: "Test",
    expiresAt: "2026-06-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createAuthEmail(
  overrides: Partial<AuthEmailSummary> = {},
): AuthEmailSummary {
  return {
    id: "email-1",
    subject: "Verify email",
    purpose: "email-verification",
    deliveryStatus: "sent",
    previewUrl: null,
    errorMessage: null,
    sentAt: "2026-05-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch design",
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
    updatedAt: "2026-05-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createPublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "publish-1",
    projectId: "project-1",
    projectName: "Launch design",
    slug: "launch",
    title: "Launch site",
    seoTitle: "Launch site",
    seoDescription: "Launch details",
    status: "published",
    publishedAt: "2026-05-16T00:00:00.000Z",
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    viewCount: 12,
    clickCount: 2,
    lastAnalyticsAt: null,
    customDomains: [],
    ...overrides,
  };
}

function createSubmission(
  overrides: Partial<WebsiteFormSubmissionSummary> = {},
): WebsiteFormSubmissionSummary {
  return {
    id: "submission-1",
    publishId: "publish-1",
    projectId: "project-1",
    websiteTitle: "Launch site",
    sectionId: "contact",
    payload: { email: "reader@example.com" },
    createdAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "project.updated",
    targetType: "project",
    targetId: "project-1",
    summary: "Project updated.",
    actorEmail: "admin@mail.com",
    metadata: {},
    createdAt: "2026-05-16T00:00:00.000Z",
    ...overrides,
  };
}
