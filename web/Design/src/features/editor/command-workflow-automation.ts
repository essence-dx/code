import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import {
  editorCommandMacroCatalog,
  type EditorCommandMacroDefinition,
} from "@/features/editor/command-macros";
import type {
  EditorCommandMacroCategory,
  EditorCommandMacroId,
  ProjectSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import type {
  EditorCommandWorkflowAutomationCenter,
  EditorCommandWorkflowAutomationPacket,
  EditorCommandWorkflowExecutionLog,
  EditorCommandWorkflowPermissionCheck,
  EditorCommandWorkflowRunbook,
  EditorCommandWorkflowStatus,
  EditorCommandWorkflowStep,
  EditorCommandWorkflowUndoSafety,
} from "@/features/editor/command-workflow-automation-types";

export type {
  EditorCommandWorkflowAutomationCenter,
  EditorCommandWorkflowAutomationPacket,
  EditorCommandWorkflowExecutionLog,
  EditorCommandWorkflowPermissionCheck,
  EditorCommandWorkflowPermissionKind,
  EditorCommandWorkflowRestorePointKind,
  EditorCommandWorkflowRunbook,
  EditorCommandWorkflowStatus,
  EditorCommandWorkflowStep,
  EditorCommandWorkflowStepMode,
  EditorCommandWorkflowUndoSafety,
} from "@/features/editor/command-workflow-automation-types";

const workflowMacroOrder: EditorCommandMacroId[] = [
  "run-qa-checks",
  "setup-publishing",
  "prepare-export",
];

export function createEditorCommandWorkflowAutomationCenter(input: {
  projects: ProjectSummary[];
  projectAudits: ProjectAuditSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date | string;
}): EditorCommandWorkflowAutomationCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const auditByProject = new Map(
    input.projectAudits.map((audit) => [audit.projectId, audit]),
  );
  const packetByProject = new Map(
    input.projectHandoffPackets.map((packet) => [packet.projectId, packet]),
  );
  const runbooks = activeProjects
    .map((project) =>
      createRunbook({
        project,
        audit: auditByProject.get(project.id) ?? null,
        packet: packetByProject.get(project.id) ?? null,
        auditLogs: input.auditLogs.filter(
          (log) =>
            log.targetId === project.id ||
            log.summary.toLowerCase().includes(project.name.toLowerCase()),
        ),
      }),
    )
    .sort(compareRunbooks);
  const status = aggregateStatus(runbooks.map((runbook) => runbook.status));
  const score = average(
    runbooks.map((runbook) => runbook.score),
    100,
  );
  const nextActions = createNextActions(runbooks);

  return {
    generatedAt,
    status,
    score,
    runbooks,
    automationPacket: createAutomationPacket({
      generatedAt,
      status,
      score,
      runbooks,
      nextActions,
    }),
    nextActions,
    totals: {
      runbooks: runbooks.length,
      readyRunbooks: runbooks.filter((runbook) => runbook.status === "ready")
        .length,
      blockedRunbooks: runbooks.filter(
        (runbook) => runbook.status === "blocked",
      ).length,
      dryRunSteps: runbooks.reduce(
        (total, runbook) => total + runbook.steps.length,
        0,
      ),
      permissionChecks: runbooks.reduce(
        (total, runbook) => total + runbook.permissionChecks.length,
        0,
      ),
      undoSafetyLogs: runbooks.length,
      executionLogs: runbooks.reduce(
        (total, runbook) => total + runbook.executionLogs.length,
        0,
      ),
      automationPackets: 1,
    },
  };
}

function createRunbook(input: {
  project: ProjectSummary;
  audit: ProjectAuditSummary | null;
  packet: ProjectHandoffPacket | null;
  auditLogs: WorkspaceAuditLogSummary[];
}): EditorCommandWorkflowRunbook {
  const permissionChecks = createPermissionChecks(input);
  const undoSafety = createUndoSafety(input);
  const steps = workflowMacroOrder.map((macroId, index) =>
    createWorkflowStep({
      macro: getMacro(macroId),
      project: input.project,
      audit: input.audit,
      packet: input.packet,
      permissionChecks,
      undoSafety,
      index,
    }),
  );
  const executionLogs = createExecutionLogs(input);
  const status = aggregateStatus([
    ...steps.map((step) => step.status),
    ...permissionChecks.map((check) => check.status),
    undoSafety.status,
  ]);
  const score = average([
    average(steps.map((step) => statusScore(step.status))),
    average(permissionChecks.map((check) => statusScore(check.status))),
    statusScore(undoSafety.status),
    input.audit?.overallScore ?? 55,
    input.packet?.packetScore ?? 30,
  ]);

  return {
    id: `editor-command-runbook-${input.project.id}`,
    projectId: input.project.id,
    projectName: input.project.name,
    status,
    score,
    approvalStatus: input.project.approvalStatus,
    handoffStatus: input.packet?.status ?? "missing",
    auditScore: input.audit?.overallScore ?? null,
    steps,
    permissionChecks,
    undoSafety,
    executionLogs,
    nextAction: createRunbookNextAction({
      projectName: input.project.name,
      status,
      permissionChecks,
      undoSafety,
      steps,
    }),
  };
}

function createWorkflowStep(input: {
  macro: EditorCommandMacroDefinition;
  project: ProjectSummary;
  audit: ProjectAuditSummary | null;
  packet: ProjectHandoffPacket | null;
  permissionChecks: EditorCommandWorkflowPermissionCheck[];
  undoSafety: EditorCommandWorkflowUndoSafety;
  index: number;
}): EditorCommandWorkflowStep {
  const status = getStepStatus(input);

  return {
    id: `step-${input.project.id}-${input.macro.id}`,
    macroId: input.macro.id,
    title: input.macro.title,
    category: input.macro.category,
    mode: "dry-run",
    status,
    dryRunPreview: createDryRunPreview(input),
    undoImpact:
      input.undoSafety.reversible &&
      input.undoSafety.restorePointKind !== "none"
        ? `Undo-safe: restore from ${input.undoSafety.restorePointLabel}.`
        : "Needs a restore point before apply mode is allowed.",
    permissionRequired: getPermissionLabel(input.macro.category),
  };
}

function createPermissionChecks(input: {
  project: ProjectSummary;
  audit: ProjectAuditSummary | null;
  packet: ProjectHandoffPacket | null;
}): EditorCommandWorkflowPermissionCheck[] {
  return [
    {
      id: `permission-approval-${input.project.id}`,
      kind: "approval",
      label: "Project approval",
      status: mapApprovalStatus(input.project.approvalStatus),
      detail:
        input.project.approvalStatus === "approved"
          ? "Project approval allows macro apply after dry-run review."
          : `${input.project.approvalStatus.replace("-", " ")} approval blocks or slows apply mode.`,
    },
    {
      id: `permission-share-${input.project.id}`,
      kind: "share-access",
      label: "Share access",
      status:
        input.project.editSharePermission === "edit"
          ? "blocked"
          : input.project.editShareId
            ? "ready"
            : "review",
      detail:
        input.project.editSharePermission === "edit"
          ? "External edit-share link can race automation; switch to view or comment before apply."
          : input.project.editShareId
            ? "Reviewer link is view/comment scoped for automation."
            : "No reviewer link is open; confirm stakeholders do not need live review.",
    },
    {
      id: `permission-restore-${input.project.id}`,
      kind: "restore-point",
      label: "Undo restore point",
      status:
        input.packet?.status === "ready"
          ? "ready"
          : input.audit
            ? "review"
            : "blocked",
      detail: input.packet
        ? `${input.packet.status} handoff packet gives a restore checkpoint.`
        : input.audit
          ? "Project audit exists, but create a handoff packet before apply."
          : "No audit or handoff packet exists for undo-safe apply mode.",
    },
  ];
}

function createUndoSafety(input: {
  project: ProjectSummary;
  audit: ProjectAuditSummary | null;
  packet: ProjectHandoffPacket | null;
}): EditorCommandWorkflowUndoSafety {
  if (input.packet?.status === "ready") {
    return {
      id: `undo-${input.project.id}`,
      status: "ready",
      reversible: true,
      restorePointKind: "handoff-packet",
      restorePointLabel: `${input.packet.projectName} handoff packet`,
      detail: `Latest packet score ${input.packet.packetScore}/100 can anchor macro rollback.`,
    };
  }

  if (input.audit) {
    return {
      id: `undo-${input.project.id}`,
      status: "review",
      reversible: false,
      restorePointKind: "project-audit",
      restorePointLabel: `${input.audit.projectName} audit snapshot`,
      detail:
        "Audit evidence exists, but apply mode still needs a handoff packet or version restore point.",
    };
  }

  return {
    id: `undo-${input.project.id}`,
    status: "blocked",
    reversible: false,
    restorePointKind: "none",
    restorePointLabel: "No restore point",
    detail:
      "Create a handoff packet before running apply-mode macro automation.",
  };
}

function createExecutionLogs(input: {
  project: ProjectSummary;
  auditLogs: WorkspaceAuditLogSummary[];
}): EditorCommandWorkflowExecutionLog[] {
  return input.auditLogs
    .filter(
      (log) =>
        log.action.includes("command_macro") ||
        log.action.includes("command.macro") ||
        typeof log.metadata.macroId === "string",
    )
    .map((log) => ({
      id: log.id,
      projectId: input.project.id,
      projectName: input.project.name,
      macroId: isMacroId(log.metadata.macroId) ? log.metadata.macroId : null,
      summary: log.summary,
      actorEmail: log.actorEmail,
      changedElementIds: Array.isArray(log.metadata.changedElementIds)
        ? log.metadata.changedElementIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      issueCount:
        typeof log.metadata.issueCount === "number"
          ? log.metadata.issueCount
          : 0,
      createdAt: log.createdAt,
    }))
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )
    .slice(0, 5);
}

function getStepStatus(input: {
  macro: EditorCommandMacroDefinition;
  project: ProjectSummary;
  audit: ProjectAuditSummary | null;
  packet: ProjectHandoffPacket | null;
  permissionChecks: EditorCommandWorkflowPermissionCheck[];
  undoSafety: EditorCommandWorkflowUndoSafety;
}) {
  if (input.permissionChecks.some((check) => check.status === "blocked")) {
    return "blocked";
  }

  if (input.macro.id === "run-qa-checks") {
    return mapAuditStatus(input.audit?.status ?? null);
  }

  if (input.macro.id === "setup-publishing") {
    return input.audit?.status === "fix" ? "blocked" : "ready";
  }

  if (input.macro.id === "prepare-export") {
    if (input.packet?.exportBundle.status === "ready") return "ready";
    if (input.undoSafety.status === "blocked") return "blocked";

    return "review";
  }

  return "review";
}

function createDryRunPreview(input: {
  macro: EditorCommandMacroDefinition;
  project: ProjectSummary;
  audit: ProjectAuditSummary | null;
  packet: ProjectHandoffPacket | null;
  index: number;
}) {
  const sequence = input.index + 1;

  if (input.macro.id === "run-qa-checks") {
    return `${sequence}. Dry-run ${input.project.name} for QA issues using ${input.audit?.overallScore ?? "missing"} audit evidence.`;
  }

  if (input.macro.id === "setup-publishing") {
    return `${sequence}. Preview SEO title, description, and navigation metadata updates without mutating the design.`;
  }

  if (input.macro.id === "prepare-export") {
    const exportStatus = input.packet?.exportBundle.status ?? "missing";

    return `${sequence}. Preview page background, bounds, and image alt-text fixes before export apply; export evidence is ${exportStatus}.`;
  }

  return `${sequence}. Preview ${input.macro.title.toLowerCase()} before apply.`;
}

function createRunbookNextAction(input: {
  projectName: string;
  status: EditorCommandWorkflowStatus;
  permissionChecks: EditorCommandWorkflowPermissionCheck[];
  undoSafety: EditorCommandWorkflowUndoSafety;
  steps: EditorCommandWorkflowStep[];
}) {
  const blockedPermission = input.permissionChecks.find(
    (check) => check.status === "blocked",
  );
  const reviewPermission = input.permissionChecks.find(
    (check) => check.status === "review",
  );
  const blockedStep = input.steps.find((step) => step.status === "blocked");

  if (blockedPermission) {
    return `${input.projectName}: ${blockedPermission.detail}`;
  }

  if (!input.undoSafety.reversible) {
    return `${input.projectName}: ${input.undoSafety.detail}`;
  }

  if (blockedStep) {
    return `${input.projectName}: resolve ${blockedStep.title.toLowerCase()} blockers before apply.`;
  }

  if (reviewPermission) {
    return `${input.projectName}: ${reviewPermission.detail}`;
  }

  if (input.status === "ready") {
    return `${input.projectName}: workflow dry-run is ready for apply mode.`;
  }

  return `${input.projectName}: review macro workflow dry-run before apply.`;
}

function createNextActions(runbooks: EditorCommandWorkflowRunbook[]) {
  return runbooks.length
    ? runbooks
        .filter((runbook) => runbook.status !== "ready")
        .concat(runbooks.filter((runbook) => runbook.status === "ready"))
        .slice(0, 6)
        .map((runbook) => runbook.nextAction)
    : ["Create a project before building editor command workflow automation."];
}

function createAutomationPacket(input: {
  generatedAt: string;
  status: EditorCommandWorkflowStatus;
  score: number;
  runbooks: EditorCommandWorkflowRunbook[];
  nextActions: string[];
}): EditorCommandWorkflowAutomationPacket {
  const payload = {
    kind: "essence-studio.editor-command-workflow",
    version: 1,
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    nextActions: input.nextActions,
    runbooks: input.runbooks.map((runbook) => ({
      projectId: runbook.projectId,
      projectName: runbook.projectName,
      status: runbook.status,
      score: runbook.score,
      approvalStatus: runbook.approvalStatus,
      handoffStatus: runbook.handoffStatus,
      steps: runbook.steps.map((step) => ({
        macroId: step.macroId,
        mode: step.mode,
        status: step.status,
        dryRunPreview: step.dryRunPreview,
        undoImpact: step.undoImpact,
      })),
      permissionChecks: runbook.permissionChecks,
      undoSafety: runbook.undoSafety,
      executionLogs: runbook.executionLogs.map((log) => ({
        id: log.id,
        macroId: log.macroId,
        summary: log.summary,
        changedElementIds: log.changedElementIds,
        issueCount: log.issueCount,
        createdAt: log.createdAt,
      })),
    })),
  };

  return {
    id: "editor-command-workflow-automation-packet",
    status: input.status,
    generatedAt: input.generatedAt,
    fileName: "editor-command-workflow-automation.json",
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
  };
}

function getMacro(macroId: EditorCommandMacroId) {
  return (
    editorCommandMacroCatalog.find((macro) => macro.id === macroId) ??
    editorCommandMacroCatalog[0]
  );
}

function mapApprovalStatus(status: ProjectSummary["approvalStatus"]) {
  if (status === "approved") return "ready";
  if (status === "changes-requested") return "blocked";

  return "review";
}

function mapAuditStatus(status: ProjectAuditSummary["status"] | null) {
  if (status === "ready") return "ready";
  if (status === "fix") return "blocked";

  return "review";
}

function getPermissionLabel(category: EditorCommandMacroCategory) {
  if (category === "export") return "Approved project and restore point";
  if (category === "publishing") return "Safe publishing metadata access";
  if (category === "qa") return "Read-only project inspection";

  return "Unlocked layer edit access";
}

function compareRunbooks(
  left: EditorCommandWorkflowRunbook,
  right: EditorCommandWorkflowRunbook,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.score - right.score ||
    left.projectName.localeCompare(right.projectName)
  );
}

function aggregateStatus(statuses: EditorCommandWorkflowStatus[]) {
  if (!statuses.length) return "blocked";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "review")) return "review";

  return "ready";
}

function statusScore(status: EditorCommandWorkflowStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 68;

  return 24;
}

function statusWeight(status: EditorCommandWorkflowStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function average(values: number[], fallback = 0) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function normalizeDate(value: Date | string | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);

  return new Date();
}

function isMacroId(value: unknown): value is EditorCommandMacroId {
  return (
    value === "tidy-selected-layers" ||
    value === "prepare-export" ||
    value === "setup-publishing" ||
    value === "run-qa-checks"
  );
}
