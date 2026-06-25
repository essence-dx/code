import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  AutomationRunHistoryCenter,
  AutomationRecoveryPacket,
} from "@/features/automation/automation-run-history";
import { createAdvancedAdminAutomationCenter } from "@/features/automation/advanced-admin-automation-recipes";
import type { PolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";
import type { ProjectRetentionCenter } from "@/features/projects/project-retention-center";
import type { EnterpriseApprovalAnalyticsCenter } from "@/features/review/enterprise-approval-analytics";

describe("advanced admin automation recipes", () => {
  test("builds remediation, approval follow-up, retention, and audit packet recipes from governance evidence", () => {
    const center = createAdvancedAdminAutomationCenter({
      policyAsCode: createPolicyCenter(),
      approvalAnalytics: createApprovalAnalyticsCenter(),
      projectRetention: createProjectRetentionCenter(),
      automationRunHistory: createAutomationRunHistoryCenter(),
      auditLogs: [
        createAuditLog({
          id: "audit-share",
          action: "approval.updated",
          targetType: "project",
          targetId: "project-launch",
          summary: "Launch page moved back to changes requested",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.recipes, 4);
    assert.equal(center.totals.blockedRecipes, 2);
    assert.equal(center.totals.reviewRecipes, 1);

    const remediation = center.recipes.find(
      (recipe) => recipe.id === "bulk-remediation",
    );
    assert.equal(remediation?.status, "blocked");
    assert.equal(
      remediation?.targets.some((target) =>
        target.label.includes("Launch page"),
      ),
      true,
    );
    assert.equal(
      remediation?.plannedActions.some((action) =>
        action.includes("Downgrade editable share link"),
      ),
      true,
    );

    const followUps = center.recipes.find(
      (recipe) => recipe.id === "approval-follow-ups",
    );
    assert.equal(followUps?.status, "review");
    assert.equal(
      followUps?.targets.some((target) => target.label.includes("Ops Team")),
      true,
    );

    const retention = center.recipes.find(
      (recipe) => recipe.id === "retention-sweep",
    );
    assert.equal(retention?.status, "blocked");
    assert.equal(
      retention?.targets.some((target) =>
        target.label.includes("Archived client board"),
      ),
      true,
    );

    const auditPacket = center.auditPacket;
    assert.equal(
      auditPacket.download.fileName,
      "advanced-admin-automation-audit-packet.json",
    );
    assert.equal(
      auditPacket.download.href.startsWith("data:application/json"),
      true,
    );
    assert.equal(auditPacket.recipeIds.length, 4);
    assert.equal(auditPacket.auditLogIds.includes("audit-share"), true);
    assert.equal(
      center.nextActions.some((action) =>
        action.includes("Downgrade editable share link"),
      ),
      true,
    );
  });

  test("stays ready when admin automation has no remediation work", () => {
    const center = createAdvancedAdminAutomationCenter({
      policyAsCode: createPolicyCenter({
        status: "ready",
        score: 100,
        dryRunReports: [],
        nextActions: [],
        totals: {
          policyDomains: 5,
          rules: 5,
          dryRunReports: 0,
          violations: 0,
          blockedRules: 0,
          reviewRules: 0,
          plannedActions: 0,
          auditEvents: 0,
        },
      }),
      approvalAnalytics: createApprovalAnalyticsCenter({
        status: "ready",
        score: 100,
        bottlenecks: [],
        reviewerForecasts: [],
        nextActions: [],
        totals: {
          workspaces: 1,
          pendingSubjects: 0,
          currentApprovalEvents: 2,
          previousApprovalEvents: 2,
          bottlenecks: 0,
          blockedWorkspaces: 0,
          reviewWorkspaces: 0,
          reviewerForecasts: 0,
          overdueReviewTasks: 0,
        },
      }),
      projectRetention: createProjectRetentionCenter({
        status: "ready",
        score: 100,
        archiveCandidates: [],
        legalHolds: [],
        restorePreviews: [],
        deletionPackets: [],
        nextActions: [],
        totals: {
          projects: 2,
          activeProjects: 2,
          trashedProjects: 0,
          archiveCandidates: 0,
          legalHolds: 0,
          restorePreviews: 0,
          deletionPackets: 0,
          blockedDeletionPackets: 0,
        },
      }),
      automationRunHistory: createAutomationRunHistoryCenter({
        status: "ready",
        score: 100,
        recoveryPackets: [],
        nextActions: [],
        totals: {
          runs: 2,
          failedRuns: 0,
          reviewRuns: 0,
          retryableRuns: 0,
          scheduledItems: 2,
          recoveryPackets: 0,
        },
      }),
      auditLogs: [],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.score, 100);
    assert.equal(center.totals.blockedRecipes, 0);
    assert.equal(center.totals.reviewRecipes, 0);
    assert.deepEqual(center.nextActions, []);
    assert.equal(
      center.recipes.every((recipe) => recipe.status === "ready"),
      true,
    );
  });
});

function createPolicyCenter(
  overrides: Partial<PolicyAsCodeGovernanceCenter> = {},
): PolicyAsCodeGovernanceCenter {
  return {
    status: "blocked",
    score: 52,
    checkedAt: "2026-05-18T10:00:00.000Z",
    rules: [],
    dryRunReports: [
      {
        id: "policy-sharing",
        domain: "sharing",
        title: "Sharing policy",
        status: "blocked",
        score: 40,
        summary: "Editable share link is exposed before approval.",
        affectedItems: [
          {
            id: "project-launch",
            kind: "project",
            name: "Launch page",
            severity: "blocked",
            detail: "editable share link is exposed before approval",
            sourceIds: ["project-launch", "share-edit"],
          },
        ],
        plannedActions: [
          "Downgrade editable share link for Launch page to comment or view until approval is complete.",
        ],
        auditLogIds: ["audit-share"],
      },
    ],
    enforcementPacket: {
      id: "policy-packet",
      status: "blocked",
      generatedAt: "2026-05-18T10:00:00.000Z",
      ruleIds: ["sharing"],
      violationCount: 1,
      plannedActionCount: 1,
      download: {
        fileName: "policy-packet.json",
        href: "data:application/json,%7B%7D",
        json: "{}",
      },
    },
    nextActions: [
      "Downgrade editable share link for Launch page to comment or view until approval is complete.",
    ],
    totals: {
      policyDomains: 5,
      rules: 5,
      dryRunReports: 1,
      violations: 1,
      blockedRules: 1,
      reviewRules: 0,
      plannedActions: 1,
      auditEvents: 1,
    },
    ...overrides,
  };
}

function createApprovalAnalyticsCenter(
  overrides: Partial<EnterpriseApprovalAnalyticsCenter> = {},
): EnterpriseApprovalAnalyticsCenter {
  return {
    status: "review",
    score: 74,
    workspaceAnalytics: [],
    trendBaselines: [],
    bottlenecks: [
      {
        id: "bottleneck-ops",
        workspaceId: "workspace-ops",
        workspaceName: "Ops Team",
        stage: "Reviewer SLA",
        status: "review",
        count: 3,
        overdueTasks: 1,
        ownerLabel: "Avery Reviewer",
        subjectNames: ["Launch page", "Campaign hero"],
        detail: "Ops Team has review work approaching SLA.",
      },
    ],
    reviewerForecasts: [
      {
        id: "forecast-avery",
        workspaceId: "workspace-ops",
        workspaceName: "Ops Team",
        reviewerName: "Avery Reviewer",
        status: "review",
        openTasks: 4,
        overdueTasks: 1,
        dueSoonTasks: 2,
        forecastNext7Days: 6,
        loadScore: 62,
        capacityRisk: "medium",
        projectNames: ["Launch page", "Campaign hero"],
      },
    ],
    executivePacket: {
      id: "approval-packet",
      status: "review",
      workspaceIds: ["workspace-ops"],
      download: {
        fileName: "approval-packet.json",
        href: "data:application/json,%7B%7D",
        json: "{}",
      },
    },
    nextActions: ["Ask Avery Reviewer to clear Launch page review tasks."],
    totals: {
      workspaces: 1,
      pendingSubjects: 2,
      currentApprovalEvents: 1,
      previousApprovalEvents: 0,
      bottlenecks: 1,
      blockedWorkspaces: 0,
      reviewWorkspaces: 1,
      reviewerForecasts: 1,
      overdueReviewTasks: 1,
    },
    ...overrides,
  };
}

function createProjectRetentionCenter(
  overrides: Partial<ProjectRetentionCenter> = {},
): ProjectRetentionCenter {
  return {
    status: "blocked",
    score: 60,
    retentionDays: 30,
    archiveReviewDays: 120,
    archiveCandidates: [
      {
        id: "archive-project-old",
        projectId: "project-old",
        projectName: "Archived client board",
        inactiveDays: 156,
        lastUpdatedAt: "2025-12-01T10:00:00.000Z",
        latestVersionId: "version-old",
        completedExportCount: 0,
        reason: "Archived client board has been inactive for 156 days.",
        recommendedAction:
          "Create a final handoff export before archival review.",
      },
    ],
    legalHolds: [
      {
        id: "hold-project-old",
        projectId: "project-old",
        projectName: "Archived client board",
        caseId: "CASE-7",
        reason: "Client dispute",
        ownerEmail: "legal@example.com",
        enabledAt: "2026-05-17T10:00:00.000Z",
        auditLogId: "audit-hold",
      },
    ],
    restorePreviews: [],
    deletionPackets: [
      {
        id: "delete-project-old",
        projectId: "project-old",
        projectName: "Archived client board",
        status: "blocked",
        deletedAt: "2026-04-01T10:00:00.000Z",
        retentionExpiresAt: "2026-05-01T10:00:00.000Z",
        requiresLegalRelease: true,
        deletionEligible: false,
        reasons: ["Legal hold must be released before permanent deletion."],
        auditLogIds: ["audit-hold"],
        download: {
          fileName: "deletion-packet.json",
          href: "data:application/json,%7B%7D",
          json: "{}",
        },
      },
    ],
    nextActions: [
      "Release the legal hold for Archived client board before deletion.",
    ],
    totals: {
      projects: 2,
      activeProjects: 1,
      trashedProjects: 1,
      archiveCandidates: 1,
      legalHolds: 1,
      restorePreviews: 0,
      deletionPackets: 1,
      blockedDeletionPackets: 1,
    },
    ...overrides,
  };
}

function createAutomationRunHistoryCenter(
  overrides: Partial<AutomationRunHistoryCenter> = {},
): AutomationRunHistoryCenter {
  const recoveryPacket: AutomationRecoveryPacket = {
    id: "recovery-packet",
    runId: "audit-automation",
    recipeId: "scheduled-export",
    targetId: "project-launch",
    status: "failed",
    summary: "Scheduled export failed",
    auditLogIds: ["audit-automation"],
    diagnostics: [
      {
        id: "diagnostic-export",
        severity: "blocked",
        title: "Export failed",
        detail: "Renderer timed out",
      },
    ],
    retry: {
      available: true,
      recipeId: "scheduled-export",
      targetId: "project-launch",
      scheduledFor: "2026-05-19T09:00:00.000Z",
      cadenceDays: null,
      label: "Retry scheduled export for project-launch.",
    },
    download: {
      fileName: "recovery-packet.json",
      href: "data:application/json,%7B%7D",
      json: "{}",
    },
  };

  return {
    status: "blocked",
    score: 58,
    runs: [],
    recoveryPackets: [recoveryPacket],
    nextActions: ["Retry scheduled export for Launch page."],
    totals: {
      runs: 1,
      failedRuns: 1,
      reviewRuns: 0,
      retryableRuns: 1,
      scheduledItems: 0,
      recoveryPackets: 1,
    },
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit",
    action: "approval.updated",
    targetType: "project",
    targetId: "project-launch",
    summary: "Audit event",
    actorEmail: "studio@example.com",
    metadata: {},
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}
