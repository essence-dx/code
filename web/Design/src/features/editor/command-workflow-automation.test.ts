import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { createEditorCommandWorkflowAutomationCenter } from "@/features/editor/command-workflow-automation";

describe("editor command workflow automation", () => {
  test("creates repeatable dry-run workflows with permission checks and undo-safe execution logs", () => {
    const readyProject = createProject();
    const riskyProject = createProject({
      id: "project-risky",
      name: "Risky launch page",
      approvalStatus: "changes-requested",
      editSharePermission: "edit",
    });
    const center = createEditorCommandWorkflowAutomationCenter({
      projects: [readyProject, riskyProject],
      projectAudits: [
        createAudit({
          projectId: readyProject.id,
          projectName: readyProject.name,
        }),
        createAudit({
          projectId: riskyProject.id,
          projectName: riskyProject.name,
          status: "fix",
          overallScore: 44,
        }),
      ],
      projectHandoffPackets: [createPacket()],
      auditLogs: [
        createAuditLog({
          targetId: readyProject.id,
          summary: "Ran prepare pages for export macro.",
          metadata: {
            macroId: "prepare-export",
            changedElementIds: ["image-1"],
            issueCount: 0,
          },
        }),
      ],
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.runbooks, 2);
    assert.equal(center.totals.permissionChecks, 6);
    assert.equal(center.totals.dryRunSteps, 6);
    assert.equal(center.totals.undoSafetyLogs, 2);
    assert.equal(center.totals.executionLogs, 1);
    assert.equal(center.totals.automationPackets, 1);

    const readyRunbook = center.runbooks.find(
      (runbook) => runbook.projectId === readyProject.id,
    );
    assert.equal(readyRunbook?.status, "ready");
    assert.deepEqual(
      readyRunbook?.steps.map((step) => step.macroId),
      ["run-qa-checks", "setup-publishing", "prepare-export"],
    );
    assert.ok(readyRunbook?.steps.every((step) => step.mode === "dry-run"));
    assert.equal(readyRunbook?.undoSafety.reversible, true);
    assert.equal(readyRunbook?.undoSafety.restorePointKind, "handoff-packet");

    const riskyRunbook = center.runbooks.find(
      (runbook) => runbook.projectId === riskyProject.id,
    );
    assert.equal(riskyRunbook?.status, "blocked");
    assert.ok(
      riskyRunbook?.permissionChecks.some(
        (check) =>
          check.status === "blocked" &&
          check.detail.includes("edit-share link"),
      ),
    );

    const packetPayload = decodePacket(center.automationPacket.dataUrl);
    assert.equal(packetPayload.kind, "essence-studio.editor-command-workflow");
    assert.equal(packetPayload.runbooks.length, 2);
    assert.ok(
      center.nextActions.some((action) => action.includes("Risky launch page")),
    );
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    runbooks: unknown[];
  };
}

function createProject(
  overrides: Partial<ProjectSummary> = {},
): ProjectSummary {
  return {
    id: "project-ready",
    name: "Ready launch page",
    width: 1440,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: null,
    publicShareId: null,
    editShareId: "review-link",
    editSharePermission: "comment",
    approvalStatus: "approved",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}

function createAudit(
  overrides: Partial<ProjectAuditSummary> = {},
): ProjectAuditSummary {
  return {
    projectId: "project-ready",
    projectName: "Ready launch page",
    updatedAt: "2026-05-19T09:00:00.000Z",
    overallScore: 94,
    status: "ready",
    dimensions: [
      {
        id: "accessibility",
        label: "Accessibility",
        status: "ready",
        score: 94,
        detail: "Ready.",
      },
    ],
    ...overrides,
  };
}

function createPacket(
  overrides: Partial<ProjectHandoffPacket> = {},
): ProjectHandoffPacket {
  return {
    projectId: "project-ready",
    projectName: "Ready launch page",
    updatedAt: "2026-05-19T09:20:00.000Z",
    approvalStatus: "approved",
    packetScore: 96,
    status: "ready",
    nextAction: "Ready for handoff.",
    readinessReport: {
      score: 96,
      status: "ready",
      dimensions: [],
    },
    exportBundle: {
      status: "ready",
      completedCount: 2,
      storedArtifactCount: 2,
      failedCount: 0,
      latestFormatLabel: "PDF",
      latestArtifactName: "ready-launch-page.pdf",
      latestCompletedAt: "2026-05-19T09:20:00.000Z",
      totalStoredBytes: 4800,
    },
    stakeholderNotes: {
      totalCount: 0,
      unresolvedCount: 0,
      openTaskCount: 0,
      overdueTaskCount: 0,
      latestNoteAt: null,
    },
    approvalHistory: [],
    checklist: [
      {
        id: "readiness",
        label: "Readiness",
        complete: true,
        detail: "Ready.",
      },
      {
        id: "exports",
        label: "Exports",
        complete: true,
        detail: "Ready.",
      },
      {
        id: "notes",
        label: "Notes",
        complete: true,
        detail: "Ready.",
      },
      {
        id: "approval",
        label: "Approval",
        complete: true,
        detail: "Ready.",
      },
    ],
    ...overrides,
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "editor.command_macro.completed",
    targetType: "project",
    targetId: "project-ready",
    summary: "Ran command macro.",
    actorEmail: "designer@example.com",
    metadata: {},
    createdAt: "2026-05-19T09:30:00.000Z",
    ...overrides,
  };
}
