import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AutomationRunHistoryCenter } from "@/features/automation/automation-run-history";
import type { AdvancedAdminAutomationCenter } from "@/features/automation/advanced-admin-automation-recipes";
import type { PolicyAsCodeGovernanceCenter } from "@/features/governance/policy-as-code-governance";
import type { PublishExportReleaseGateCenter } from "@/features/operations/publish-export-release-gates";
import { createProductionCommandRunnerCenter } from "@/features/operations/production-command-runner";
import type { WorkspaceBackupRestoreCenter } from "@/features/operations/workspace-backup-restore";
import type { MarketplaceCreatorOperationsCenter } from "@/features/templates/marketplace-creator-operations";

describe("production command runner", () => {
  test("creates deterministic dry-run and apply command batches with audit-safe execution reports", () => {
    const center = createProductionCommandRunnerCenter({
      policyAsCode: createPolicyCenter(),
      publishExportReleaseGates: createReleaseGateCenter(),
      automationRunHistory: createAutomationRunHistoryCenter(),
      advancedAdminAutomation: createAdvancedAdminAutomationCenter(),
      workspaceBackupRestore: createWorkspaceBackupRestoreCenter(),
      marketplaceCreatorOperations: createMarketplaceCreatorOperationsCenter(),
      auditLogs: [
        createAuditLog({
          id: "audit-share",
          action: "approval.updated",
          targetId: "project-launch",
          summary: "Launch page approval was moved back to changes requested.",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.generatedAt, "2026-05-18T10:00:00.000Z");
    assert.equal(center.totals.batches >= 5, true);
    assert.equal(center.totals.dryRunCommands > 0, true);
    assert.equal(center.totals.applyReadyCommands >= 1, true);
    assert.equal(center.totals.auditEvidenceLinks >= 3, true);

    const policyCommand = center.commands.find((command) =>
      command.title.includes("Downgrade editable share link"),
    );

    assert.equal(policyCommand?.status, "blocked");
    assert.equal(policyCommand?.mode, "dry-run");
    assert.equal(
      policyCommand?.auditEvidence.auditLogIds.includes("audit-share"),
      true,
    );
    assert.equal(
      policyCommand?.dryRunPlan.some((step) =>
        step.includes("Downgrade editable share link"),
      ),
      true,
    );

    const retryCommand = center.commands.find(
      (command) => command.sourceKind === "automation-recovery",
    );

    assert.equal(retryCommand?.mode, "apply");
    assert.equal(retryCommand?.status, "review");
    assert.equal(
      retryCommand?.applyPlan.some((step) =>
        step.includes("Retry scheduled export"),
      ),
      true,
    );

    assert.equal(
      center.commands.some((command) =>
        command.rollbackNote.toLowerCase().includes("rollback"),
      ),
      true,
    );
    assert.equal(center.executionReports.length, center.batches.length);
    assert.equal(
      center.executionReports.every((report) =>
        report.download.href.startsWith("data:application/json"),
      ),
      true,
    );
    assert.equal(
      center.nextActions.some((action) =>
        action.includes("Dry-run policy command"),
      ),
      true,
    );
  });

  test("stays ready when every source center has no command work", () => {
    const center = createProductionCommandRunnerCenter({
      policyAsCode: createPolicyCenter({
        status: "ready",
        score: 100,
        dryRunReports: [],
        enforcementPacket: createPolicyPacket({ status: "ready" }),
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
      publishExportReleaseGates: createReleaseGateCenter({
        status: "ready",
        score: 100,
        gates: [],
        overrideRequests: [],
        approvalEvidence: [],
        nextActions: [],
        totals: {
          gates: 0,
          blockedGates: 0,
          reviewGates: 0,
          policyExceptions: 0,
          exportJobs: 0,
          completedExports: 0,
          failedExports: 0,
          publishedSurfaces: 0,
          overrideRequests: 0,
          requestedOverrides: 0,
          approvalEvidence: 0,
          auditableApprovals: 0,
        },
      }),
      automationRunHistory: createAutomationRunHistoryCenter({
        status: "ready",
        score: 100,
        recoveryPackets: [],
        nextActions: [],
        totals: {
          runs: 0,
          failedRuns: 0,
          reviewRuns: 0,
          retryableRuns: 0,
          scheduledItems: 0,
          recoveryPackets: 0,
        },
      }),
      advancedAdminAutomation: createAdvancedAdminAutomationCenter({
        status: "ready",
        score: 100,
        recipes: [],
        nextActions: [],
        totals: {
          recipes: 0,
          readyRecipes: 0,
          reviewRecipes: 0,
          blockedRecipes: 0,
          targets: 0,
          plannedActions: 0,
          auditEvents: 0,
          sourcePackets: 0,
          recoveryPackets: 0,
        },
      }),
      workspaceBackupRestore: createWorkspaceBackupRestoreCenter({
        status: "ready",
        score: 100,
        integrityChecks: [],
        dryRun: {
          status: "ready",
          score: 100,
          summary: {
            restorableProjects: 0,
            needsReviewProjects: 0,
            blockedProjects: 0,
            restorableTemplates: 0,
            restorableWebsites: 0,
            restorableCampaigns: 0,
            skippedDeletedProjects: 0,
          },
          projects: [],
          websites: [],
          campaigns: [],
        },
        rollbackPlaybooks: [],
        nextActions: [],
        totals: {
          activeProjects: 0,
          projectSnapshots: 0,
          completedExports: 0,
          restorableProjects: 0,
          blockedChecks: 0,
          rollbackPlaybooks: 0,
        },
      }),
      marketplaceCreatorOperations: createMarketplaceCreatorOperationsCenter({
        status: "ready",
        score: 100,
        moderationRoutes: [],
        nextActions: [],
        totals: {
          versionedSubmissions: 0,
          readySubmissions: 0,
          reviewSubmissions: 0,
          blockedSubmissions: 0,
          trustedCreators: 0,
          licenseReady: 0,
          rollbackReady: 0,
          moderationRoutes: 0,
          operationPackets: 0,
        },
      }),
      auditLogs: [],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.score, 100);
    assert.equal(center.commands.length, 0);
    assert.equal(center.batches.length, 0);
    assert.equal(center.executionReports.length, 0);
    assert.deepEqual(center.nextActions, []);
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
    enforcementPacket: createPolicyPacket(),
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

function createPolicyPacket(
  overrides: Partial<PolicyAsCodeGovernanceCenter["enforcementPacket"]> = {},
): PolicyAsCodeGovernanceCenter["enforcementPacket"] {
  return {
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
    ...overrides,
  };
}

function createReleaseGateCenter(
  overrides: Partial<PublishExportReleaseGateCenter> = {},
): PublishExportReleaseGateCenter {
  return {
    status: "blocked",
    score: 62,
    checkedAt: "2026-05-18T10:00:00.000Z",
    gates: [
      {
        id: "export-readiness",
        title: "Export readiness",
        description: "Release exports must be complete.",
        status: "review",
        score: 72,
        metricLabel: "completed exports",
        metricValue: 1,
        items: [
          {
            id: "export-coverage",
            title: "Release export coverage",
            detail: "Launch page needs a completed server export artifact.",
            status: "review",
            badge: "0/1",
            sourceId: "project-launch",
            sourceKind: "project",
            href: "/editor/project-launch",
            meta: ["Launch page"],
          },
        ],
      },
      {
        id: "publish-readiness",
        title: "Publish readiness",
        description: "Published surfaces must be approved.",
        status: "blocked",
        score: 40,
        metricLabel: "published surfaces",
        metricValue: 1,
        items: [
          {
            id: "published-project-approval",
            title: "Published project approvals",
            detail: "Launch page is published without approval evidence.",
            status: "blocked",
            badge: "1 unapproved",
            sourceId: "project-launch",
            sourceKind: "website-publish",
            href: "/editor/project-launch",
            meta: ["Launch site"],
          },
        ],
      },
    ],
    overrideRequests: [
      {
        id: "override-sharing-project-launch",
        status: "needed",
        severity: "blocked",
        sourcePolicyDomain: "sharing",
        affectedItemId: "project-launch",
        affectedItemKind: "project",
        title: "Sharing policy: Launch page",
        detail: "Editable share link is exposed before approval.",
        sourceIds: ["project-launch"],
        auditLogIds: ["audit-share"],
        requestedAt: null,
        requesterEmail: null,
        approvalRequired: true,
        form: {
          targetType: "project",
          targetId: "project-launch",
          gateId: "policy-decisions",
          policyDomain: "sharing",
          summary: "Request release override for Launch page.",
        },
      },
    ],
    approvalEvidence: [],
    releasePacket: {
      fileName: "release-gates.json",
      dataUrl: "data:application/json,%7B%7D",
      payload: {
        kind: "essence-studio.publish-export-release-gates",
        version: 1,
        generatedAt: "2026-05-18T10:00:00.000Z",
        status: "blocked",
        score: 62,
        gates: [],
        overrideRequests: [],
        approvalEvidence: [],
        nextActions: [],
      },
    },
    nextActions: ["Publish readiness: Published project approvals"],
    totals: {
      gates: 2,
      blockedGates: 1,
      reviewGates: 1,
      policyExceptions: 1,
      exportJobs: 1,
      completedExports: 0,
      failedExports: 0,
      publishedSurfaces: 1,
      overrideRequests: 1,
      requestedOverrides: 0,
      approvalEvidence: 0,
      auditableApprovals: 0,
    },
    ...overrides,
  };
}

function createAutomationRunHistoryCenter(
  overrides: Partial<AutomationRunHistoryCenter> = {},
): AutomationRunHistoryCenter {
  return {
    status: "blocked",
    score: 58,
    runs: [],
    recoveryPackets: [
      {
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
            detail: "Renderer timed out.",
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
      },
    ],
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

function createAdvancedAdminAutomationCenter(
  overrides: Partial<AdvancedAdminAutomationCenter> = {},
): AdvancedAdminAutomationCenter {
  return {
    status: "blocked",
    score: 60,
    generatedAt: "2026-05-18T10:00:00.000Z",
    recipes: [
      {
        id: "bulk-remediation",
        title: "Bulk remediation",
        description: "Resolve blocked policy exceptions.",
        status: "blocked",
        score: 44,
        targetLabel: "1 blocked target",
        actionLabel: "Dry-run remediation",
        targets: [
          {
            id: "project-launch",
            source: "policy",
            label: "Launch page",
            detail: "Editable share link exposed before approval.",
            status: "blocked",
            sourceIds: ["project-launch", "share-edit"],
            ownerLabel: "studio@example.com",
            workspaceName: "Studio",
          },
        ],
        plannedActions: [
          "Downgrade editable share link for Launch page to comment or view until approval is complete.",
        ],
        evidence: ["1 policy exception"],
        auditLogIds: ["audit-share"],
        packetIds: ["policy-packet"],
        disabledReason: "Resolve blocked policy exceptions before applying.",
      },
    ],
    auditPacket: {
      id: "advanced-admin-audit",
      status: "blocked",
      generatedAt: "2026-05-18T10:00:00.000Z",
      recipeIds: ["bulk-remediation"],
      auditLogIds: ["audit-share"],
      packetIds: ["policy-packet"],
      download: {
        fileName: "advanced-admin-audit.json",
        href: "data:application/json,%7B%7D",
        json: "{}",
      },
    },
    nextActions: [
      "Downgrade editable share link for Launch page to comment or view until approval is complete.",
    ],
    totals: {
      recipes: 1,
      readyRecipes: 0,
      reviewRecipes: 0,
      blockedRecipes: 1,
      targets: 1,
      plannedActions: 1,
      auditEvents: 1,
      sourcePackets: 1,
      recoveryPackets: 0,
    },
    ...overrides,
  };
}

function createWorkspaceBackupRestoreCenter(
  overrides: Partial<WorkspaceBackupRestoreCenter> = {},
): WorkspaceBackupRestoreCenter {
  return {
    status: "blocked",
    score: 70,
    manifest: {
      kind: "essence-studio.workspace-backup",
      schemaVersion: 1,
      generatedAt: "2026-05-18T10:00:00.000Z",
      fingerprint: "backup-fingerprint",
      counts: {
        activeProjects: 1,
        deletedProjects: 0,
        templates: 0,
        projectVersions: 0,
        completedExports: 0,
        failedExports: 1,
        websites: 1,
        customDomains: 0,
        formSubmissions: 0,
        campaigns: 0,
        campaignDeliverables: 0,
        assetRecords: 0,
        projectAssetReferences: 0,
        auditLogs: 1,
      },
      projectSnapshots: [],
      templateSnapshots: [],
      websiteSnapshots: [],
      campaignSnapshots: [],
      assetSummary: {
        quotaBytes: 0,
        totalBytes: 0,
        assetCount: 0,
        duplicateCount: 0,
        duplicateBytes: 0,
        projectManifestCount: 0,
        skippedProjectReferenceCount: 0,
      },
      auditSummary: {
        totalLogs: 1,
        latestActivityAt: "2026-05-18T10:00:00.000Z",
        actionKinds: ["approval.updated"],
      },
    },
    manifestDownload: {
      fileName: "workspace-backup.json",
      href: "data:application/json,%7B%7D",
      json: "{}",
    },
    integrityChecks: [
      {
        id: "version-snapshots",
        title: "Version snapshots",
        scope: "Projects",
        status: "blocked",
        affectedCount: 1,
        detail: "Launch page is missing a version snapshot.",
        remediation: "Create a version snapshot before restore operations.",
        affectedNames: ["Launch page"],
      },
    ],
    dryRun: {
      status: "blocked",
      score: 64,
      summary: {
        restorableProjects: 0,
        needsReviewProjects: 0,
        blockedProjects: 1,
        restorableTemplates: 0,
        restorableWebsites: 0,
        restorableCampaigns: 0,
        skippedDeletedProjects: 0,
      },
      projects: [
        {
          projectId: "project-launch",
          name: "Launch page",
          restoreOrder: 1,
          status: "blocked",
          latestVersionId: null,
          latestCompletedExportId: null,
          reason: "Version snapshot is required before restore.",
        },
      ],
      websites: [],
      campaigns: [],
    },
    rollbackPlaybooks: [
      {
        id: "project-version-rollback",
        title: "Project version rollback",
        status: "review",
        detail: "Restore Launch page from the most recent approved snapshot.",
        targets: 1,
        steps: [
          "Snapshot current Launch page state.",
          "Rollback to the latest approved version after owner approval.",
        ],
        nextAction: "Create a fresh snapshot before rollback.",
      },
    ],
    nextActions: ["Create version snapshots before restore operations."],
    totals: {
      activeProjects: 1,
      projectSnapshots: 0,
      completedExports: 0,
      restorableProjects: 0,
      blockedChecks: 1,
      rollbackPlaybooks: 1,
    },
    ...overrides,
  };
}

function createMarketplaceCreatorOperationsCenter(
  overrides: Partial<MarketplaceCreatorOperationsCenter> = {},
): MarketplaceCreatorOperationsCenter {
  return {
    generatedAt: "2026-05-18T10:00:00.000Z",
    status: "review",
    score: 76,
    submissions: [],
    moderationRoutes: [
      {
        id: "route-license-template-launch",
        templateId: "template-launch",
        templateName: "Launch template",
        queue: "license-review",
        queueLabel: "License review",
        priority: "high",
        status: "review",
        owner: "curator",
        reason: "Template source evidence needs curator approval.",
        relatedTaskIds: ["task-license"],
        dueAt: "2026-05-19T09:00:00.000Z",
      },
    ],
    licenseEvidenceQueue: [],
    rollbackPlans: [],
    nextActions: ["Route Launch template to license review."],
    totals: {
      versionedSubmissions: 1,
      readySubmissions: 0,
      reviewSubmissions: 1,
      blockedSubmissions: 0,
      trustedCreators: 1,
      licenseReady: 0,
      rollbackReady: 1,
      moderationRoutes: 1,
      operationPackets: 0,
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
