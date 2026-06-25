import { strict as assert } from "node:assert";
import type { ProjectAuditSearchRow } from "@/features/projects/project-audit-search";
import type { ProjectIncidentHistory } from "@/features/projects/project-incident-history";
import type { ProjectPublicSurfaceHealthReport } from "@/features/projects/public-surface-health";
import type { WorkspaceSecurityComplianceReport } from "@/features/projects/workspace-security-compliance";
import {
  createWorkspaceRiskDigest,
  createWorkspaceRiskDigestCsv,
  createWorkspaceRiskDigestExportBody,
  createWorkspaceRiskDigestFileName,
  createWorkspaceRiskDigestJson,
} from "@/features/projects/workspace-risk-digest";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

const generatedAt = "2026-05-16T22:00:00.000Z";
const auditRows: ProjectAuditSearchRow[] = [
  {
    action: "project.publish_blocked",
    actorEmail: "owner@example.com",
    actorName: "Owner",
    category: "publishing",
    description: "Public link review gate blocked publish.",
    eventId: "audit-1",
    id: "project-risk:audit-1",
    occurredAt: "2026-05-16T21:55:00.000Z",
    projectId: "project-risk",
    projectName: "Risk Scene",
    resourceId: "project-risk",
    resourceType: "project",
    status: "danger",
    title: "Publish blocked",
  },
  {
    action: "export.review",
    actorEmail: null,
    actorName: null,
    category: "exports",
    description: "GLB export needs review.",
    eventId: "audit-2",
    id: "project-risk:audit-2",
    occurredAt: "2026-05-16T21:50:00.000Z",
    projectId: "project-risk",
    projectName: "Risk Scene",
    resourceId: "manifest",
    resourceType: "exportManifest",
    status: "warning",
    title: "Export review needed",
  },
];
const trust: WorkspaceSecurityComplianceReport = {
  generatedAt,
  grants: {
    directProjectGrantCount: 1,
    folderGrantCount: 0,
    roleCounts: { admin: 0, editor: 1, viewer: 0 },
    totalGrantCount: 1,
  },
  projectRows: [
    {
      artifactBlockedCount: 1,
      artifactCertificateRequiredCount: 1,
      blockedSurfaces: ["Public link"],
      exportBlockedCount: 1,
      exportDraftCount: 0,
      id: "project-risk",
      name: "Risk Scene",
      retentionCovered: false,
      retentionPurgeStatus: null,
      risk: "blocked",
    },
  ],
  retention: {
    coveragePercent: 0,
    coveredProjectCount: 0,
    missingProjectCount: 1,
    missingProjects: [{ id: "project-risk", name: "Risk Scene" }],
    purgeApprovalRequestedCount: 0,
    purgeApprovedCount: 0,
    stalePolicyCount: 0,
  },
  reviewSurfaces: [{ blockedCount: 1, label: "Public link", surface: "publicLink" }],
  roles: [{ count: 1, label: "Owners", role: "owner" }],
  summary: {
    activeProjectCount: 1,
    artifactBlockedCount: 1,
    exportBlockedCount: 1,
    exportDraftCount: 0,
    memberCount: 1,
    projectWithBlockerCount: 1,
    signedBundleCertificateRequiredCount: 1,
    totalProjectCount: 1,
    trustScore: 62,
  },
  workspace: {
    id: "workspace-risk",
    name: "Risk Workspace",
    role: "owner",
  },
};
const publicHealth: ProjectPublicSurfaceHealthReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recentBatches: [
      {
        batchId: "batch-risk",
        checkedAt: generatedAt,
        failCount: 1,
        passCount: 1,
        screenshotPendingCount: 1,
        totalCount: 3,
        warnCount: 1,
      },
    ],
    snapshotCount: 3,
  },
  snapshots: [
    {
      batchId: "batch-risk",
      checkedAt: generatedAt,
      issues: ["Viewer returned 500."],
      label: "Public viewer",
      latencyMs: null,
      path: "/share/risk",
      projectId: "project-risk",
      projectName: "Risk Scene",
      screenshotArtifactId: null,
      screenshotByteSize: null,
      screenshotCapturedAt: null,
      screenshotDiffScore: null,
      screenshotDiffSummary: null,
      screenshotHash: null,
      screenshotHeight: null,
      screenshotPath: null,
      screenshotState: "unavailable",
      screenshotWidth: null,
      sourceKey: "project-risk:public-viewer",
      sourceVersionId: "version-risk",
      status: "fail",
      statusCode: 500,
      surface: "public-viewer",
      url: "https://example.test/share/risk",
    },
  ],
  summary: {
    apiPayloadCount: 0,
    appPackageCount: 0,
    embedCount: 0,
    failCount: 1,
    passCount: 1,
    publicViewerCount: 1,
    screenshotCapturedCount: 0,
    screenshotDiffCount: 0,
    screenshotPendingCount: 1,
    totalCount: 3,
    warnCount: 1,
  },
};
const runbook: WorkspaceReleaseRunbookReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recordCount: 1,
  },
  records: [
    {
      auditLogHref: "/projects?workspaceId=workspace-risk#audit",
      attachments: [],
      batchId: "runbook-risk",
      blockerCount: 2,
      checklistEvidence: ["Public viewer failed.", "Review gate blocked."],
      comments: [],
      completedAt: null,
      detail: "Release cannot proceed until viewer and review gate recover.",
      dueAt: "2026-05-17T00:00:00.000Z",
      milestoneId: "milestone-risk",
      ownerEmail: "owner@example.com",
      ownerName: "Owner",
      ownerUserId: "owner",
      projectId: "project-risk",
      projectName: "Risk Scene",
      sourceKey: "review-gate:project-risk",
      status: "blocked",
      title: "Release handoff",
      transitionHistory: [],
      workspaceId: "workspace-risk",
    },
  ],
  summary: {
    blockedCount: 1,
    completeCount: 0,
    inProgressCount: 0,
    nextDueAt: "2026-05-17T00:00:00.000Z",
    ownerCount: 1,
    scheduledCount: 0,
    totalCount: 1,
  },
};
const incidents: ProjectIncidentHistory = {
  generatedAt,
  incidents: [
    {
      actionLabel: "Run deploy smoke",
      count: 1,
      details: ["Public viewer returned 500."],
      id: "project-risk:post-deploy-failure",
      kind: "post-deploy-failure",
      message: "Public viewer failed after deployment.",
      occurredAt: generatedAt,
      projectId: "project-risk",
      projectName: "Risk Scene",
      severity: "critical",
      source: "post-deploy-smoke",
      title: "Post-deploy smoke failed",
    },
  ],
  summary: {
    blockedReviewCount: 0,
    criticalCount: 1,
    failedExportCount: 0,
    impactedProjectCount: 1,
    postDeployFailureCount: 1,
    totalCount: 1,
    warningCount: 0,
  },
};

const digest = createWorkspaceRiskDigest({
  auditRows,
  generatedAt,
  incidents,
  publicHealth,
  runbook,
  trust,
  workspace: trust.workspace,
});

assert.equal(digest.schemaVersion, 1);
assert.equal(digest.packetId, "risk-digest-workspace-risk-20260516");
assert.equal(digest.riskLevel, "critical");
assert.ok(digest.score < trust.summary.trustScore);
assert.equal(digest.actionItems.some((item) => item.id === "blocked-runbook-records"), true);
assert.equal(digest.actionItems.some((item) => item.id === "public-surface-failures"), true);

const json = createWorkspaceRiskDigestJson(digest);
const csv = createWorkspaceRiskDigestCsv(digest);

assert.match(json, /"schemaVersion": 1/);
assert.match(csv, /workspace,riskLevel,critical/);
assert.equal(createWorkspaceRiskDigestExportBody(digest, "json"), json);
assert.equal(createWorkspaceRiskDigestExportBody(digest, "csv"), csv);
assert.equal(createWorkspaceRiskDigestFileName(digest, "json"), "risk-digest-workspace-risk-20260516.json");

console.log("workspace risk digest smoke passed");
