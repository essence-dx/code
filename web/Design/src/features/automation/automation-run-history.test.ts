import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ContentScheduleSummary } from "@/db/content-planner";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AutomationRecipeSummary } from "@/features/automation/automation-recipes";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import { createAutomationRunHistoryCenter } from "@/features/automation/automation-run-history";

describe("automation run history", () => {
  test("builds retryable run history with diagnostics, ownership, schedule visibility, and recovery packets", () => {
    const center = createAutomationRunHistoryCenter({
      automationRecipes: [
        createRecipe({
          id: "scheduled-export",
          title: "Scheduled export prep",
          defaultStartAt: "2026-05-19T09:00:00.000Z",
        }),
        createRecipe({
          id: "publishing-reminder",
          title: "Publishing reminder",
          defaultStartAt: "2026-05-20T09:00:00.000Z",
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "audit-run-1",
          targetId: "scheduled-export",
          summary: 'Queued PDF handoff export for "Launch page"',
          actorEmail: "ops@example.com",
          metadata: {
            recipeId: "scheduled-export",
            targetId: "project-launch",
            createdCount: 1,
            startAt: "2026-05-19T09:00:00.000Z",
          },
        }),
      ],
      serverExportJobs: [
        createExportJob({
          id: "export-failed",
          projectId: "project-launch",
          status: "failed",
          failureMessage: "Renderer timed out",
          updatedAt: "2026-05-18T09:30:00.000Z",
        }),
      ],
      contentScheduleItems: [
        createScheduleItem({
          id: "schedule-1",
          projectId: "project-launch",
          title: "Launch page reminder",
          status: "planned",
          scheduledAt: "2026-05-19T09:00:00.000Z",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.runs, 1);
    assert.equal(center.totals.failedRuns, 1);
    assert.equal(center.totals.retryableRuns, 1);

    const run = center.runs[0];
    assert.equal(run?.id, "audit-run-1");
    assert.equal(run?.ownerEmail, "ops@example.com");
    assert.equal(run?.status, "failed");
    assert.equal(run?.retry.available, true);
    assert.equal(run?.retry.recipeId, "scheduled-export");
    assert.equal(run?.retry.targetId, "project-launch");
    assert.equal(
      run?.diagnostics.some((diagnostic) =>
        diagnostic.detail.includes("Renderer timed out"),
      ),
      true,
    );
    assert.equal(run?.scheduleVisibility[0]?.status, "planned");

    const packet = center.recoveryPackets.find(
      (item) => item.runId === "audit-run-1",
    );
    assert.equal(packet?.auditLogIds.includes("audit-run-1"), true);
    assert.equal(
      packet?.download.fileName,
      "automation-recovery-scheduled-export-project-launch.json",
    );
    assert.equal(
      packet?.download.href.startsWith("data:application/json"),
      true,
    );
    assert.equal(
      center.nextActions.some((action) =>
        action.includes("Scheduled export prep"),
      ),
      true,
    );
  });

  test("keeps run history ready when recent automation runs have no diagnostics", () => {
    const center = createAutomationRunHistoryCenter({
      automationRecipes: [createRecipe({ id: "publishing-reminder" })],
      auditLogs: [
        createAuditLog({
          targetId: "publishing-reminder",
          metadata: {
            recipeId: "publishing-reminder",
            targetId: "project-ready",
            createdCount: 1,
            startAt: "2026-05-19T09:00:00.000Z",
          },
        }),
      ],
      serverExportJobs: [createExportJob({ projectId: "project-ready" })],
      contentScheduleItems: [
        createScheduleItem({
          projectId: "project-ready",
          status: "planned",
          scheduledAt: "2026-05-19T09:00:00.000Z",
        }),
      ],
      now: "2026-05-18T10:00:00.000Z",
    });

    assert.equal(center.status, "ready");
    assert.equal(center.totals.failedRuns, 0);
    assert.equal(center.totals.retryableRuns, 0);
    assert.equal(center.recoveryPackets.length, 0);
    assert.deepEqual(center.nextActions, []);
  });
});

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
    targets: [{ id: "project-launch", label: "Launch page", helper: "PDF" }],
    disabledReason: null,
    metrics: [],
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-run",
    action: "automation.recipe.applied",
    targetType: "automation_recipe",
    targetId: "scheduled-export",
    summary: "Automation recipe applied",
    actorEmail: "studio@example.com",
    metadata: {
      recipeId: "scheduled-export",
      targetId: "project-launch",
      createdCount: 1,
    },
    createdAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> = {},
): ServerExportJobSummary {
  return {
    id: "export",
    projectId: "project-launch",
    projectName: "Launch page",
    format: "pdf",
    formatLabel: "PDF",
    fileName: "launch.pdf",
    status: "completed",
    progress: 100,
    artifactName: "launch.pdf",
    artifactMimeType: "application/pdf",
    artifactSizeBytes: 1_200,
    artifactDataUrl: null,
    failureMessage: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    completedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}

function createScheduleItem(
  overrides: Partial<ContentScheduleSummary> = {},
): ContentScheduleSummary {
  return {
    id: "schedule",
    projectId: "project-launch",
    projectName: "Launch page",
    title: "Launch page reminder",
    channel: "Website",
    caption: "Automation reminder",
    status: "planned",
    scheduledAt: "2026-05-19T09:00:00.000Z",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z",
    ...overrides,
  };
}
