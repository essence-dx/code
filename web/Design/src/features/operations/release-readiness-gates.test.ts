import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { AccountProfile } from "@/db/account-settings";
import type { AuthEmailSummary } from "@/db/auth-emails";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { OperationalHealthReport } from "@/features/operations/operational-health";
import { createReleaseReadinessReport } from "@/features/operations/release-readiness-gates";

describe("release readiness gates", () => {
  test("returns ready when routes, health, snapshots, seed account, and Vercel signals are covered", () => {
    const project = createProject();
    const report = createReleaseReadinessReport({
      now: new Date("2026-05-16T10:00:00.000Z"),
      accountProfile: createAccountProfile(),
      adminUsers: [createAccountProfile()],
      projects: [project],
      templates: [createTemplate()],
      projectVersions: [createVersion({ projectId: project.id })],
      serverExportJobs: [createExportJob({ projectId: project.id })],
      authEmails: [createAuthEmail()],
      auditLogs: [createAuditLog()],
      websitePublishes: [createWebsitePublish({ projectId: project.id })],
      health: createHealthReport(),
    });

    assert.equal(report.status, "ready");
    assert.equal(report.totals.coveredCriticalRoutes, report.totals.criticalRoutes);
    assert.equal(report.totals.missingSnapshots, 0);
    assert.equal(report.totals.verifiedSeededAccounts, 2);
    assert.equal(report.nextActions.length, 0);
    assert.ok(
      report.packet.dataUrl.startsWith("data:application/json;charset=utf-8"),
    );
  });

  test("surfaces blocked release work when route seed data and account verification are missing", () => {
    const report = createReleaseReadinessReport({
      now: new Date("2026-05-16T10:00:00.000Z"),
      accountProfile: createAccountProfile({
        email: "maker@example.com",
        emailVerified: false,
      }),
      adminUsers: [],
      projects: [],
      templates: [],
      projectVersions: [],
      serverExportJobs: [],
      authEmails: [],
      auditLogs: [],
      websitePublishes: [],
      health: null,
    });

    assert.equal(report.status, "blocked");
    assert.ok(report.score < 85);
    assert.ok(report.nextActions.length > 0);
    assert.equal(
      report.gates.find((gate) => gate.id === "route-coverage")?.status,
      "blocked",
    );
    assert.equal(
      report.gates.find((gate) => gate.id === "seeded-account")?.status,
      "blocked",
    );
  });
});

function createAccountProfile(
  overrides: Partial<AccountProfile> = {},
): AccountProfile {
  return {
    id: "admin-user",
    name: "Admin",
    email: "admin@mail.com",
    emailVerified: true,
    createdAt: "2026-05-15T10:00:00.000Z",
    updatedAt: "2026-05-16T10:00:00.000Z",
    ...overrides,
  };
}

function createProject(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "project-1",
    name: "Launch Kit",
    width: 1080,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: "public-share-1",
    editShareId: "edit-share-1",
    editSharePermission: "edit",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    updatedAt: "2026-05-16T09:00:00.000Z",
    createdAt: "2026-05-15T10:00:00.000Z",
    ...overrides,
  };
}

function createTemplate(
  overrides: Partial<DesignTemplateSummary> = {},
): DesignTemplateSummary {
  return {
    id: "template-1",
    name: "Launch Template",
    creatorName: "Admin",
    creatorEmail: "admin@mail.com",
    width: 1080,
    height: 1080,
    thumbnail: null,
    isBrandTemplate: true,
    isTeamTemplate: true,
    approvalStatus: "approved",
    marketplaceStatus: "published",
    marketplaceCollection: "Launch",
    marketplaceSeason: "Evergreen",
    marketplaceReviewNote: "",
    marketplacePublishedAt: "2026-05-16T09:00:00.000Z",
    marketplaceUseCount: 4,
    marketplaceViewCount: 20,
    createdAt: "2026-05-15T10:00:00.000Z",
    updatedAt: "2026-05-16T09:00:00.000Z",
    ...overrides,
  };
}

function createVersion(
  overrides: Partial<ProjectVersionSummary> = {},
): ProjectVersionSummary {
  return {
    id: "version-1",
    projectId: "project-1",
    name: "Release snapshot",
    thumbnail: null,
    createdAt: "2026-05-16T09:05:00.000Z",
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export-1",
    projectId: "project-1",
    projectName: "Launch Kit",
    format: "png",
    formatLabel: "PNG",
    fileName: "launch-kit.png",
    status: "completed",
    progress: 100,
    artifactName: "launch-kit.png",
    artifactMimeType: "image/png",
    artifactSizeBytes: 2048,
    artifactDataUrl: "data:image/png;base64,aGVsbG8=",
    failureMessage: null,
    createdAt: "2026-05-16T09:00:00.000Z",
    updatedAt: "2026-05-16T09:06:00.000Z",
    completedAt: "2026-05-16T09:06:00.000Z",
    ...overrides,
  };
}

function createAuthEmail(
  overrides: Partial<AuthEmailSummary> = {},
): AuthEmailSummary {
  return {
    id: "email-1",
    subject: "Verify your Essence Studio email",
    purpose: "email-verification",
    deliveryStatus: "sent",
    previewUrl: null,
    errorMessage: null,
    sentAt: "2026-05-16T09:00:00.000Z",
    createdAt: "2026-05-16T09:00:00.000Z",
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "project.version.created",
    targetType: "project",
    targetId: "project-1",
    summary: "Created a release snapshot.",
    actorEmail: "admin@mail.com",
    metadata: {},
    createdAt: "2026-05-16T09:05:00.000Z",
    ...overrides,
  };
}

function createWebsitePublish(
  overrides: Partial<WebsitePublishSummary> = {},
): WebsitePublishSummary {
  return {
    id: "site-1",
    projectId: "project-1",
    projectName: "Launch Kit",
    slug: "launch-kit",
    title: "Launch Kit",
    seoTitle: "Launch Kit",
    seoDescription: "Launch Kit",
    status: "published",
    publishedAt: "2026-05-16T09:10:00.000Z",
    createdAt: "2026-05-16T09:00:00.000Z",
    updatedAt: "2026-05-16T09:10:00.000Z",
    viewCount: 0,
    clickCount: 0,
    lastAnalyticsAt: null,
    customDomains: [],
    ...overrides,
  };
}

function createHealthReport(
  overrides: Partial<OperationalHealthReport> = {},
): OperationalHealthReport {
  return {
    checkedAt: "2026-05-16T09:00:00.000Z",
    status: "healthy",
    groups: [
      createHealthGroup("database", "Database"),
      createHealthGroup("auth", "Auth"),
      createHealthGroup("email", "Email"),
      createHealthGroup("storage", "Storage"),
      createHealthGroup("vercel", "Vercel"),
      createHealthGroup("tauri", "Tauri"),
    ],
    ...overrides,
  };
}

function createHealthGroup(id: string, title: string) {
  return {
    id,
    title,
    description: `${title} readiness`,
    status: "healthy" as const,
    checks: [
      {
        id: `${id}-check`,
        label: `${title} check`,
        status: "healthy" as const,
        detail: `${title} is ready.`,
        metric: "ready",
      },
    ],
  };
}
