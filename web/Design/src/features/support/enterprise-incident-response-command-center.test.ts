import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AdvancedAdminAutomationCenter } from "@/features/automation/advanced-admin-automation-recipes";
import type { ProductionObservabilityReport } from "@/features/observability/production-observability";
import type { ReleaseReadinessReport } from "@/features/operations/release-readiness-gates";
import type { ProductionSupportDesk } from "@/features/support/production-support-desk";
import { createEnterpriseIncidentResponseCommandCenter } from "@/features/support/enterprise-incident-response-command-center";

describe("enterprise incident response command center", () => {
  test("routes critical incidents to owners with timeline evidence and recovery playbooks", () => {
    const center = createEnterpriseIncidentResponseCommandCenter({
      observability: createObservabilityReport(),
      supportDesk: createSupportDesk(),
      releaseReadiness: createReleaseReadinessReport(),
      adminAutomation: createAdminAutomationCenter(),
      teamManagement: [createWorkspace()],
      auditLogs: [
        createAuditLog({
          id: "audit-export",
          targetId: "project-launch",
          summary: "PDF export failed for Launch campaign",
          createdAt: "2026-05-18T09:10:00.000Z",
        }),
        createAuditLog({
          id: "audit-domain",
          targetId: "domain-launch",
          action: "website.domain.attached",
          summary: "Domain attach failed for launch.example.com",
          createdAt: "2026-05-18T09:20:00.000Z",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "critical");
    assert.equal(center.totals.incidents, 4);
    assert.equal(center.totals.sev1, 2);
    assert.equal(center.totals.assignedIncidents, 4);

    const exportIncident = center.incidents.find(
      (incident) => incident.id === "support-support-export-failed",
    );
    assert.equal(exportIncident?.severity, "sev1");
    assert.equal(
      exportIncident?.ownerAssignment.ownerEmail,
      "owner@example.com",
    );
    assert.equal(exportIncident?.timeline.length, 3);
    assert.equal(
      exportIncident?.timeline.some(
        (event) => event.auditLogId === "audit-export",
      ),
      true,
    );
    assert.equal(
      exportIncident?.recoveryPlaybook.steps.some((step) =>
        step.includes("Retry durable export"),
      ),
      true,
    );

    const readinessIncident = center.incidents.find(
      (incident) => incident.id === "release-environment",
    );
    assert.equal(readinessIncident?.severity, "sev1");
    assert.equal(readinessIncident?.ownerAssignment.ownerRole, "owner");

    assert.equal(center.responsePacket.incidentIds.length, 4);
    assert.equal(
      center.responsePacket.download.fileName,
      "enterprise-incident-response-packet.json",
    );
    assert.equal(
      center.responsePacket.download.href.startsWith("data:application/json"),
      true,
    );
    assert.equal(
      center.nextActions.some((action) =>
        action.includes("Assign owner@example.com"),
      ),
      true,
    );
  });

  test("stays ready when observability, support, release, and automation inputs are healthy", () => {
    const center = createEnterpriseIncidentResponseCommandCenter({
      observability: createObservabilityReport({
        status: "healthy",
        score: 100,
        groups: [
          {
            id: "exports",
            title: "Export reliability",
            description: "Recent export health.",
            status: "healthy",
            score: 100,
            incidents: [
              {
                id: "exports-healthy",
                title: "No active incidents",
                detail: "Exports are healthy.",
                status: "healthy",
                metric: "0 failures",
              },
            ],
          },
        ],
        totals: {
          incidents: 0,
          critical: 0,
          watch: 0,
        },
      }),
      supportDesk: createSupportDesk({
        status: "ready",
        score: 100,
        views: [],
        resolutionPackets: [],
        nextActions: [],
        totals: {
          openIssues: 0,
          userReportedIssues: 0,
          productionFailures: 0,
          readinessIssues: 0,
          urgentIssues: 0,
          resolutionPackets: 0,
        },
      }),
      releaseReadiness: createReleaseReadinessReport({
        status: "ready",
        score: 100,
        gates: [],
        nextActions: [],
      }),
      adminAutomation: createAdminAutomationCenter({
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
      teamManagement: [createWorkspace()],
      auditLogs: [],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.score, 100);
    assert.equal(center.totals.incidents, 0);
    assert.deepEqual(center.nextActions, []);
  });
});

function createObservabilityReport(
  overrides: Partial<ProductionObservabilityReport> = {},
): ProductionObservabilityReport {
  return {
    status: "critical",
    score: 42,
    checkedAt: "2026-05-18T09:30:00.000Z",
    groups: [
      {
        id: "exports",
        title: "Export reliability",
        description: "Slow, stalled, and failed durable export jobs.",
        status: "critical",
        score: 30,
        incidents: [
          {
            id: "export-failed",
            title: "Failed export: Launch campaign",
            detail: "PDF renderer timed out.",
            status: "critical",
            metric: "PDF",
            href: "/editor/project-launch",
          },
        ],
      },
      {
        id: "publishing",
        title: "Publishing health",
        description: "Website publishing and custom-domain readiness.",
        status: "watch",
        score: 76,
        incidents: [
          {
            id: "domain-watch",
            title: "Domain verification pending: launch.example.com",
            detail: "DNS verification is still pending.",
            status: "watch",
            metric: "launch",
          },
        ],
      },
    ],
    totals: {
      incidents: 2,
      critical: 1,
      watch: 1,
    },
    ...overrides,
  };
}

function createSupportDesk(
  overrides: Partial<ProductionSupportDesk> = {},
): ProductionSupportDesk {
  return {
    status: "urgent",
    score: 38,
    views: [
      {
        id: "production-failures",
        title: "Production failures",
        description: "Export and publishing failures.",
        status: "urgent",
        issues: [
          {
            id: "support-export-failed",
            kind: "export-failure",
            severity: "urgent",
            title: "Failed export: Launch campaign",
            summary: "PDF renderer timed out.",
            affectedProjectId: "project-launch",
            affectedProjectName: "Launch campaign",
            affectedProjectHref: "/editor/project-launch",
            sourceLabel: "PDF",
            reportedBy: null,
            createdAt: "2026-05-18T09:00:00.000Z",
            updatedAt: "2026-05-18T09:25:00.000Z",
            statusLabel: "failed",
            auditContext: [
              createAuditLog({
                id: "audit-export",
                targetId: "project-launch",
                summary: "PDF export failed for Launch campaign",
              }),
            ],
            reproductionNotes: [
              "Open /editor/project-launch.",
              "Run the PDF export path again.",
            ],
            resolutionChecklist: [
              "Retry durable export.",
              "Attach the export result to the support packet.",
            ],
          },
        ],
      },
    ],
    resolutionPackets: [
      {
        id: "packet-support-export-failed",
        issueId: "support-export-failed",
        projectId: "project-launch",
        projectName: "Launch campaign",
        status: "blocked",
        summary: "Failed export: Launch campaign - PDF renderer timed out.",
        auditLogIds: ["audit-export"],
        handoffPacketScore: 48,
        checklist: ["Retry durable export."],
        download: {
          fileName: "support-resolution-project-launch.json",
          href: "data:application/json,%7B%7D",
          json: "{}",
        },
      },
    ],
    nextActions: ["Retry durable export for Launch campaign."],
    totals: {
      openIssues: 1,
      userReportedIssues: 0,
      productionFailures: 1,
      readinessIssues: 0,
      urgentIssues: 1,
      resolutionPackets: 1,
    },
    ...overrides,
  };
}

function createReleaseReadinessReport(
  overrides: Partial<ReleaseReadinessReport> = {},
): ReleaseReadinessReport {
  return {
    generatedAt: "2026-05-18T09:45:00.000Z",
    status: "blocked",
    score: 68,
    gates: [
      {
        id: "environment",
        title: "Environment",
        description: "Required production variables.",
        status: "blocked",
        score: 40,
        metricLabel: "checks",
        metricValue: 1,
        items: [
          {
            id: "missing-app-url",
            title: "NEXT_PUBLIC_APP_URL missing",
            detail: "Production app URL is not configured.",
            status: "blocked",
            badge: "missing",
            meta: ["environment"],
            href: null,
          },
        ],
      },
    ],
    nextActions: ["Set NEXT_PUBLIC_APP_URL before release."],
    packet: {
      fileName: "release-readiness.json",
      dataUrl: "data:application/json,%7B%7D",
      payload: {
        kind: "essence-studio.release-readiness",
        version: 1,
        generatedAt: "2026-05-18T09:45:00.000Z",
        status: "blocked",
        score: 68,
        gates: [],
        nextActions: ["Set NEXT_PUBLIC_APP_URL before release."],
        routeDefinitions: [],
      },
    },
    totals: {
      criticalRoutes: 10,
      coveredCriticalRoutes: 10,
      environmentChecks: 1,
      blockedEnvironmentChecks: 1,
      activeProjects: 1,
      missingSnapshots: 0,
      staleSnapshots: 0,
      verifiedSeededAccounts: 1,
      vercelChecks: 0,
    },
    ...overrides,
  };
}

function createAdminAutomationCenter(
  overrides: Partial<AdvancedAdminAutomationCenter> = {},
): AdvancedAdminAutomationCenter {
  return {
    status: "blocked",
    score: 62,
    generatedAt: "2026-05-18T09:50:00.000Z",
    recipes: [
      {
        id: "retention-sweep",
        title: "Retention sweep",
        description: "Legal hold review.",
        status: "blocked",
        score: 50,
        targetLabel: "Retention records",
        actionLabel: "Prepare sweep",
        targets: [],
        plannedActions: [
          "Confirm legal hold owner for Launch campaign before retention sweep.",
        ],
        evidence: ["1 legal hold"],
        auditLogIds: ["audit-domain"],
        packetIds: ["delete-project-launch"],
        disabledReason: null,
      },
    ],
    auditPacket: {
      id: "admin-packet",
      status: "blocked",
      generatedAt: "2026-05-18T09:50:00.000Z",
      recipeIds: ["retention-sweep"],
      auditLogIds: ["audit-domain"],
      packetIds: ["delete-project-launch"],
      download: {
        fileName: "advanced-admin-automation-audit-packet.json",
        href: "data:application/json,%7B%7D",
        json: "{}",
      },
    },
    nextActions: [
      "Confirm legal hold owner for Launch campaign before retention sweep.",
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

function createWorkspace(
  overrides: Partial<TeamWorkspaceManagementSummary> = {},
): TeamWorkspaceManagementSummary {
  return {
    id: "workspace-ops",
    ownerId: "user-owner",
    name: "Ops Workspace",
    role: "owner",
    pendingInviteCount: 0,
    createdAt: "2026-05-01T09:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    members: [
      {
        id: "member-owner",
        workspaceId: "workspace-ops",
        userId: "user-owner",
        email: "owner@example.com",
        role: "owner",
        createdAt: "2026-05-01T09:00:00.000Z",
        updatedAt: "2026-05-18T09:00:00.000Z",
      },
      {
        id: "member-admin",
        workspaceId: "workspace-ops",
        userId: "user-admin",
        email: "admin@example.com",
        role: "admin",
        createdAt: "2026-05-01T09:00:00.000Z",
        updatedAt: "2026-05-18T09:00:00.000Z",
      },
    ],
    pendingInvites: [],
    recentActivity: [],
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit",
    action: "automation.recipe.applied",
    targetType: "project",
    targetId: "project-launch",
    summary: "Audit event",
    actorEmail: "owner@example.com",
    metadata: {
      projectId: "project-launch",
    },
    createdAt: "2026-05-18T09:10:00.000Z",
    ...overrides,
  };
}
