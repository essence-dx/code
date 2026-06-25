import { strict as assert } from "node:assert";
import { createPolicyAsCodeReport } from "@/features/projects/policy-as-code-checks";
import { defaultShareSettings, type ShareSettings } from "@/features/projects/share-settings";

const generatedAt = "2026-05-16T09:00:00.000Z";

const approvedShareSettings: ShareSettings = {
  ...defaultShareSettings,
  reviewWorkflow: {
    appPackage: {
      reviewerName: "Release owner",
      status: "approved",
      updatedAt: generatedAt,
    },
    desktopRelease: {
      reviewerName: "Release owner",
      status: "approved",
      updatedAt: generatedAt,
    },
    embed: {
      reviewerName: "Release owner",
      status: "approved",
      updatedAt: generatedAt,
    },
    publicLink: {
      reviewerName: "Release owner",
      status: "approved",
      updatedAt: generatedAt,
    },
  },
};

const mixedReport = createPolicyAsCodeReport({
  generatedAt,
  projects: [
    {
      archivedAt: null,
      id: "project-live",
      name: "Live public scene",
      publishedAt: "2026-05-01T00:00:00.000Z",
      shareId: "share-live",
      shareSettings: defaultShareSettings,
    },
    {
      archivedAt: null,
      id: "project-uncovered",
      name: "Uncovered workspace scene",
      publishedAt: null,
      shareId: null,
      shareSettings: approvedShareSettings,
    },
  ],
  publicSurfaceHealthReport: {
    summary: {
      failCount: 1,
      passCount: 1,
      screenshotDiffCount: 0,
      screenshotPendingCount: 1,
      totalCount: 3,
      warnCount: 1,
    },
  },
  releaseArchiveExplorer: {
    summary: {
      blockedCount: 0,
      governanceScore: 86,
      totalCount: 4,
      watchCount: 1,
      worstStatus: "watch",
    },
  },
  retentionPolicies: [
    {
      auditLogDays: 365,
      commentDays: 180,
      deletedAssetTombstoneDays: 365,
      projectId: "project-live",
      purgeReviewStatus: "requested",
      updatedAt: "2026-01-01T00:00:00.000Z",
      versionDays: 14,
    },
  ],
  reviewerHandoffPacket: {
    summary: {
      blockedAttestationCount: 0,
      handoffScore: 92,
      pendingAttestationCount: 0,
      signedAttestationCount: 4,
      status: "ready",
      totalAttestationCount: 4,
    },
  },
  securityComplianceReport: {
    projectRows: [
      {
        blockedSurfaces: ["Public link", "Embeds", "App packages"],
        id: "project-live",
        name: "Live public scene",
        retentionCovered: true,
        retentionPurgeStatus: "requested",
        risk: "watch",
      },
      {
        blockedSurfaces: [],
        id: "project-uncovered",
        name: "Uncovered workspace scene",
        retentionCovered: false,
        retentionPurgeStatus: null,
        risk: "watch",
      },
    ],
    retention: {
      coveragePercent: 50,
      missingProjectCount: 1,
      purgeApprovalRequestedCount: 1,
      stalePolicyCount: 1,
    },
    reviewSurfaces: [
      {
        blockedCount: 3,
        label: "Public link",
        surface: "publicLink",
      },
    ],
    summary: {
      activeProjectCount: 2,
      projectWithBlockerCount: 2,
      trustScore: 82,
    },
  },
  workspaceRiskDigest: {
    actionItems: [],
    riskLevel: "healthy",
    score: 94,
  },
});

assert.equal(mixedReport.summary.totalCount, 4);
assert.equal(mixedReport.summary.blockedCount, 3);
assert.equal(mixedReport.summary.watchCount, 1);
assert.equal(mixedReport.summary.policyScore, 16);
assert.equal(mixedReport.rows.find((row) => row.id === "publish-permissions")?.status, "blocked");
assert.equal(mixedReport.rows.find((row) => row.id === "retention-windows")?.status, "blocked");
assert.equal(mixedReport.rows.find((row) => row.id === "release-approvals")?.status, "watch");
assert.equal(mixedReport.rows.find((row) => row.id === "public-surface-guardrails")?.status, "blocked");

const readyReport = createPolicyAsCodeReport({
  generatedAt,
  projects: [
    {
      archivedAt: null,
      id: "project-ready",
      name: "Ready public scene",
      publishedAt: "2026-05-15T00:00:00.000Z",
      shareId: "share-ready",
      shareSettings: approvedShareSettings,
    },
  ],
  publicSurfaceHealthReport: {
    summary: {
      failCount: 0,
      passCount: 2,
      screenshotDiffCount: 0,
      screenshotPendingCount: 0,
      totalCount: 2,
      warnCount: 0,
    },
  },
  releaseArchiveExplorer: {
    summary: {
      blockedCount: 0,
      governanceScore: 100,
      totalCount: 4,
      watchCount: 0,
      worstStatus: "ready",
    },
  },
  retentionPolicies: [
    {
      auditLogDays: 730,
      commentDays: 365,
      deletedAssetTombstoneDays: 730,
      projectId: "project-ready",
      purgeReviewStatus: "approved",
      updatedAt: generatedAt,
      versionDays: 180,
    },
  ],
  reviewerHandoffPacket: {
    summary: {
      blockedAttestationCount: 0,
      handoffScore: 100,
      pendingAttestationCount: 0,
      signedAttestationCount: 4,
      status: "ready",
      totalAttestationCount: 4,
    },
  },
  securityComplianceReport: {
    projectRows: [
      {
        blockedSurfaces: [],
        id: "project-ready",
        name: "Ready public scene",
        retentionCovered: true,
        retentionPurgeStatus: "approved",
        risk: "healthy",
      },
    ],
    retention: {
      coveragePercent: 100,
      missingProjectCount: 0,
      purgeApprovalRequestedCount: 0,
      stalePolicyCount: 0,
    },
    reviewSurfaces: [
      {
        blockedCount: 0,
        label: "Public link",
        surface: "publicLink",
      },
    ],
    summary: {
      activeProjectCount: 1,
      projectWithBlockerCount: 0,
      trustScore: 100,
    },
  },
  workspaceRiskDigest: {
    actionItems: [],
    riskLevel: "healthy",
    score: 100,
  },
});

assert.equal(readyReport.summary.policyScore, 100);
assert.equal(readyReport.summary.readyCount, 4);
assert.equal(readyReport.summary.failedRuleCount, 0);
assert.equal(readyReport.summary.warningRuleCount, 0);

console.log("policy-as-code checks smoke passed");
