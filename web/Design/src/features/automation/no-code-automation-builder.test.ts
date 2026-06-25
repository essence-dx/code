import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AutomationRecipeSummary } from "@/features/automation/automation-recipes";
import type { AutomationRunHistoryCenter } from "@/features/automation/automation-run-history";
import type { WorkflowTemplateMarketplaceCenter } from "@/features/automation/workflow-template-marketplace";
import { createNoCodeAutomationBuilderCenter } from "@/features/automation/no-code-automation-builder";

describe("no-code automation builder", () => {
  test("creates typed triggers, conditions, actions, dry-runs, rollback notes, and audit-backed execution plans", () => {
    const center = createNoCodeAutomationBuilderCenter({
      automationRecipes: [
        createRecipe({
          id: "scheduled-export",
          title: "Scheduled export prep",
          targets: [
            {
              id: "project-spring",
              label: "Spring deck",
              helper: "Presentation",
            },
          ],
          metrics: [
            { label: "Missing exports", value: "1" },
            { label: "Server exports", value: "2" },
          ],
        }),
        createRecipe({
          id: "review-nudge",
          title: "Review nudge",
          disabledReason: "No open review tasks need a nudge.",
          targets: [],
          metrics: [{ label: "Open tasks", value: "0" }],
        }),
      ],
      runHistory: createRunHistory(),
      workflowMarketplace: createWorkflowMarketplace(),
      auditLogs: [
        createAuditLog({
          id: "audit-export",
          action: "automation.recipe.applied",
          targetId: "scheduled-export",
          summary: "Queued export automation.",
          metadata: {
            recipeId: "scheduled-export",
            targetId: "project-spring",
          },
        }),
        createAuditLog({
          id: "audit-template",
          action: "workflow_template.installed",
          targetId: "template-campaign",
          summary: "Installed campaign workflow.",
          metadata: {
            templateId: "template-campaign",
          },
        }),
      ],
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.flows, 3);
    assert.equal(center.totals.typedTriggers, 3);
    assert.equal(center.totals.typedConditions, 9);
    assert.equal(center.totals.typedActions, 4);
    assert.equal(center.totals.dryRuns, 3);
    assert.equal(center.totals.rollbackNotes, 5);
    assert.equal(center.totals.executionPlans, 3);
    assert.equal(center.totals.blockedFlows, 1);
    assert.equal(center.totals.auditEvidence, 2);

    const exportFlow = center.flows.find(
      (flow) => flow.id === "builder-recipe-scheduled-export",
    );
    assert.equal(exportFlow?.status, "ready");
    assert.equal(exportFlow?.trigger.kind, "scheduled");
    assert.equal(exportFlow?.conditions[0]?.kind, "target-available");
    assert.equal(exportFlow?.conditions[0]?.status, "ready");
    assert.equal(exportFlow?.actions[0]?.kind, "queue-export");
    assert.equal(exportFlow?.dryRun.status, "ready");
    assert.equal(exportFlow?.dryRun.estimatedArtifacts, 1);
    assert.deepEqual(exportFlow?.auditEvidenceIds, ["audit-export"]);

    const reviewFlow = center.flows.find(
      (flow) => flow.id === "builder-recipe-review-nudge",
    );
    assert.equal(reviewFlow?.status, "blocked");
    assert.ok(
      reviewFlow?.dryRun.blockedReasons.includes(
        "No open review tasks need a nudge.",
      ),
    );

    const templateFlow = center.flows.find(
      (flow) => flow.id === "builder-template-template-campaign",
    );
    assert.equal(templateFlow?.status, "review");
    assert.equal(templateFlow?.actions.length, 2);
    assert.ok(
      templateFlow?.rollbackNotes.some((note) =>
        note.includes("Remove campaign scheduled items"),
      ),
    );
    assert.deepEqual(templateFlow?.auditEvidenceIds, ["audit-template"]);

    const packet = decodePacket(templateFlow?.executionPlan.dataUrl ?? "");
    assert.equal(packet.kind, "essence-studio.no-code-automation-builder");
    assert.equal(packet.flow.id, "builder-template-template-campaign");
    assert.equal(packet.flow.actions.length, 2);
  });
});

function createRecipe(
  overrides: Partial<AutomationRecipeSummary> = {},
): AutomationRecipeSummary {
  return {
    id: "scheduled-export",
    title: "Automation recipe",
    description: "Recipe description.",
    targetLabel: "Design",
    actionLabel: "Run recipe",
    defaultStartAt: "2026-05-20T09:00:00.000Z",
    cadenceDays: null,
    targets: [],
    disabledReason: null,
    metrics: [],
    ...overrides,
  };
}

function createRunHistory(): AutomationRunHistoryCenter {
  return {
    status: "review",
    score: 78,
    runs: [
      {
        id: "run-review",
        recipeId: "review-nudge",
        recipeTitle: "Review nudge",
        targetId: "project-review",
        ownerEmail: "ops@example.com",
        createdAt: "2026-05-19T08:00:00.000Z",
        summary: "Review nudge created no artifacts.",
        createdCount: 0,
        status: "failed",
        retry: {
          available: true,
          recipeId: "review-nudge",
          targetId: "project-review",
          scheduledFor: "2026-05-20T09:00:00.000Z",
          cadenceDays: null,
          label: "Retry review nudge.",
        },
        diagnostics: [
          {
            id: "diagnostic-review",
            severity: "blocked",
            title: "No artifacts created",
            detail: "The review nudge did not create downstream work.",
          },
        ],
        scheduleVisibility: [],
        auditLog: createAuditLog({
          id: "audit-run-review",
          action: "automation.recipe.applied",
          targetId: "review-nudge",
          summary: "Review nudge failed.",
          metadata: {
            recipeId: "review-nudge",
            targetId: "project-review",
          },
        }),
      },
    ],
    recoveryPackets: [
      {
        id: "recovery-review",
        runId: "run-review",
        recipeId: "review-nudge",
        targetId: "project-review",
        status: "failed",
        summary: "Review nudge created no artifacts.",
        auditLogIds: ["audit-run-review"],
        diagnostics: [
          {
            id: "diagnostic-review",
            severity: "blocked",
            title: "No artifacts created",
            detail: "The review nudge did not create downstream work.",
          },
        ],
        retry: {
          available: true,
          recipeId: "review-nudge",
          targetId: "project-review",
          scheduledFor: "2026-05-20T09:00:00.000Z",
          cadenceDays: null,
          label: "Retry review nudge.",
        },
        download: {
          fileName: "review-recovery.json",
          href: "data:application/json,%7B%7D",
          json: "{}",
        },
      },
    ],
    nextActions: ["Review nudge: Retry review nudge."],
    totals: {
      runs: 1,
      failedRuns: 1,
      reviewRuns: 0,
      retryableRuns: 1,
      scheduledItems: 0,
      recoveryPackets: 1,
    },
  };
}

function createWorkflowMarketplace(): WorkflowTemplateMarketplaceCenter {
  return {
    generatedAt: "2026-05-19T10:00:00.000Z",
    status: "review",
    score: 74,
    templates: [
      {
        id: "template-campaign",
        name: "Campaign launch workflow",
        description: "Schedule exports and campaign cadence together.",
        category: "campaign-ops",
        requiredRole: "admin",
        currentVersion: {
          version: "1.0.0",
          releasedAt: "2026-05-18T09:00:00.000Z",
          summary: "Initial campaign automation flow.",
          recipeSteps: [
            {
              id: "step-export",
              recipeId: "scheduled-export",
              title: "Queue campaign export",
              dependencyDetail: "Needs an exportable campaign project.",
              rollbackNote: "Remove queued export jobs created by this flow.",
            },
            {
              id: "step-cadence",
              recipeId: "campaign-cadence",
              title: "Schedule campaign cadence",
              dependencyDetail: "Needs campaign deliverables.",
              rollbackNote: "Remove campaign scheduled items from the planner.",
            },
          ],
        },
        status: "review",
        score: 74,
        dependencyChecks: [
          {
            id: "template-campaign-version",
            templateId: "template-campaign",
            kind: "version",
            status: "ready",
            label: "Version 1.0.0",
            detail: "Template is versioned.",
          },
          {
            id: "template-campaign-workspace",
            templateId: "template-campaign",
            kind: "workspace",
            status: "ready",
            label: "Workspace",
            detail: "Workspace can install.",
          },
        ],
        rollbackPlan: {
          id: "rollback-campaign",
          templateId: "template-campaign",
          fileName: "rollback-campaign.json",
          dataUrl: "data:application/json,%7B%7D",
          notes: [
            "Remove queued export jobs created by this flow.",
            "Remove campaign scheduled items from the planner.",
          ],
          affectedRecipeIds: ["scheduled-export", "campaign-cadence"],
        },
        adoption: {
          installs: 1,
          recipeRuns: 1,
          adoptionRate: 100,
          installedWorkspaceIds: ["workspace-growth"],
          latestInstalledAt: "2026-05-19T08:00:00.000Z",
          latestRunAt: "2026-05-19T09:00:00.000Z",
        },
        installed: true,
        installableWorkspaceIds: ["workspace-growth"],
        installableWorkspaces: [
          {
            id: "workspace-growth",
            name: "Growth team",
            role: "admin",
          },
        ],
        nextAction: "Review campaign launch workflow before rollout.",
      },
    ],
    marketplacePacket: {
      id: "marketplace-packet",
      status: "review",
      generatedAt: "2026-05-19T10:00:00.000Z",
      fileName: "workflow-marketplace.json",
      dataUrl: "data:application/json,%7B%7D",
    },
    nextActions: ["Review campaign launch workflow before rollout."],
    totals: {
      templates: 1,
      readyTemplates: 0,
      reviewTemplates: 1,
      blockedTemplates: 0,
      versions: 1,
      dependencyChecks: 2,
      rollbackNotes: 2,
      installs: 1,
      recipeRuns: 1,
      marketplacePackets: 1,
    },
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    actorEmail: "ops@example.com",
    action: "workspace.updated",
    targetType: "workspace",
    targetId: "workspace-1",
    summary: "Workspace updated.",
    metadata: {},
    createdAt: "2026-05-19T08:00:00.000Z",
    ...overrides,
  };
}

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    flow: {
      id: string;
      actions: unknown[];
    };
  };
}
