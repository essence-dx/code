import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { AutomationRecipeSummary } from "@/features/automation/automation-recipes";
import { createWorkflowTemplateMarketplace } from "@/features/automation/workflow-template-marketplace";

describe("workflow template marketplace", () => {
  test("creates versioned internal workflow templates with dependencies, rollback notes, and adoption analytics", () => {
    const center = createWorkflowTemplateMarketplace({
      automationRecipes: [
        createRecipe("scheduled-export"),
        createRecipe("publishing-reminder"),
        createRecipe("campaign-cadence"),
        createRecipe("review-nudge", {
          disabledReason: "No open review tasks need a nudge.",
          targets: [],
        }),
      ],
      teamManagement: [
        createWorkspace({
          id: "workspace-growth",
          name: "Growth team",
          role: "admin",
        }),
        createWorkspace({
          id: "workspace-viewer",
          name: "Viewer team",
          role: "member",
        }),
      ],
      auditLogs: [
        createAuditLog({
          id: "install-1",
          action: "workflow_template.installed",
          targetType: "workflow_template",
          targetId: "launch-control-room",
          summary: "Installed launch workflow.",
          metadata: {
            workflowTemplateId: "launch-control-room",
            workflowTemplateVersion: "2.1.0",
            workspaceId: "workspace-growth",
          },
        }),
        createAuditLog({
          id: "run-1",
          action: "automation.recipe.applied",
          targetType: "automation_recipe",
          targetId: "scheduled-export",
          summary: "Queued export from workflow template.",
          metadata: {
            recipeId: "scheduled-export",
            targetId: "project-launch",
            createdCount: 1,
            workflowTemplateId: "launch-control-room",
            workspaceId: "workspace-growth",
          },
        }),
        createAuditLog({
          id: "run-2",
          action: "automation.recipe.applied",
          targetType: "automation_recipe",
          targetId: "publishing-reminder",
          summary: "Queued reminder from workflow template.",
          metadata: {
            recipeId: "publishing-reminder",
            targetId: "project-launch",
            createdCount: 1,
            workflowTemplateId: "launch-control-room",
            workspaceId: "workspace-growth",
          },
        }),
      ],
      now: "2026-05-19T12:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.templates, 3);
    assert.equal(center.totals.readyTemplates, 1);
    assert.equal(center.totals.blockedTemplates, 1);
    assert.equal(center.totals.installs, 1);
    assert.equal(center.totals.recipeRuns, 2);
    assert.ok(center.totals.dependencyChecks >= 8);
    assert.ok(center.totals.rollbackNotes >= 6);

    const launchTemplate = center.templates.find(
      (template) => template.id === "launch-control-room",
    );
    assert.equal(launchTemplate?.status, "ready");
    assert.equal(launchTemplate?.currentVersion.version, "2.1.0");
    assert.ok(
      launchTemplate?.dependencyChecks.every(
        (dependency) => dependency.status === "ready",
      ),
    );
    assert.equal(launchTemplate?.adoption.installs, 1);
    assert.equal(launchTemplate?.adoption.recipeRuns, 2);
    assert.equal(launchTemplate?.adoption.adoptionRate, 50);
    assert.ok(
      launchTemplate?.rollbackPlan.notes.some((note) =>
        note.includes("content planner"),
      ),
    );

    const reviewTemplate = center.templates.find(
      (template) => template.id === "review-accelerator",
    );
    assert.equal(reviewTemplate?.status, "blocked");
    assert.ok(
      reviewTemplate?.dependencyChecks.some(
        (dependency) =>
          dependency.kind === "recipe" && dependency.status === "blocked",
      ),
    );

    const packet = decodePacket(center.marketplacePacket.dataUrl);
    assert.equal(packet.kind, "essence-studio.workflow-template-marketplace");
    assert.equal(packet.templates.length, 3);
    assert.ok(
      center.nextActions.some((action) =>
        action.includes("Review accelerator"),
      ),
    );
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    templates: unknown[];
  };
}

function createRecipe(
  id: AutomationRecipeSummary["id"],
  overrides: Partial<AutomationRecipeSummary> = {},
): AutomationRecipeSummary {
  return {
    id,
    title: humanize(id),
    description: `${humanize(id)} description.`,
    targetLabel: "Design",
    actionLabel: "Apply",
    defaultStartAt: "2026-05-20T09:00:00.000Z",
    cadenceDays: id === "campaign-cadence" ? 3 : null,
    targets: [
      {
        id: "target-1",
        label: "Launch project",
        helper: "Ready",
      },
    ],
    disabledReason: null,
    metrics: [{ label: "Available", value: "1" }],
    ...overrides,
  };
}

function createWorkspace(
  overrides: Partial<TeamWorkspaceManagementSummary> = {},
): TeamWorkspaceManagementSummary {
  return {
    id: "workspace-growth",
    ownerId: "owner-1",
    name: "Growth team",
    role: "admin",
    pendingInviteCount: 0,
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
    members: [
      {
        id: "member-1",
        workspaceId: "workspace-growth",
        userId: "owner-1",
        email: "owner@example.com",
        role: "owner",
        createdAt: "2026-05-18T10:00:00.000Z",
        updatedAt: "2026-05-19T10:00:00.000Z",
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
    id: "audit-1",
    action: "automation.recipe.applied",
    targetType: "automation_recipe",
    targetId: "scheduled-export",
    summary: "Applied automation recipe.",
    actorEmail: "designer@example.com",
    metadata: {},
    createdAt: "2026-05-19T10:00:00.000Z",
    ...overrides,
  };
}

function humanize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
