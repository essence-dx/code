import type {
  EditorCommandMacroCategory,
  EditorCommandMacroId,
} from "@/features/editor/types";
import type { ProjectHandoffStatus } from "@/features/projects/project-handoff-packet";
import type { ApprovalStatus } from "@/features/review/approval-status";

export type EditorCommandWorkflowStatus = "ready" | "review" | "blocked";

export type EditorCommandWorkflowStepMode = "dry-run" | "apply";

export type EditorCommandWorkflowPermissionKind =
  | "approval"
  | "share-access"
  | "restore-point";

export type EditorCommandWorkflowRestorePointKind =
  | "handoff-packet"
  | "project-audit"
  | "none";

export type EditorCommandWorkflowStep = {
  id: string;
  macroId: EditorCommandMacroId;
  title: string;
  category: EditorCommandMacroCategory;
  mode: EditorCommandWorkflowStepMode;
  status: EditorCommandWorkflowStatus;
  dryRunPreview: string;
  undoImpact: string;
  permissionRequired: string;
};

export type EditorCommandWorkflowPermissionCheck = {
  id: string;
  kind: EditorCommandWorkflowPermissionKind;
  label: string;
  status: EditorCommandWorkflowStatus;
  detail: string;
};

export type EditorCommandWorkflowUndoSafety = {
  id: string;
  status: EditorCommandWorkflowStatus;
  reversible: boolean;
  restorePointKind: EditorCommandWorkflowRestorePointKind;
  restorePointLabel: string;
  detail: string;
};

export type EditorCommandWorkflowExecutionLog = {
  id: string;
  projectId: string;
  projectName: string;
  macroId: EditorCommandMacroId | null;
  summary: string;
  actorEmail: string | null;
  changedElementIds: string[];
  issueCount: number;
  createdAt: string;
};

export type EditorCommandWorkflowRunbook = {
  id: string;
  projectId: string;
  projectName: string;
  status: EditorCommandWorkflowStatus;
  score: number;
  approvalStatus: ApprovalStatus;
  handoffStatus: ProjectHandoffStatus | "missing";
  auditScore: number | null;
  steps: EditorCommandWorkflowStep[];
  permissionChecks: EditorCommandWorkflowPermissionCheck[];
  undoSafety: EditorCommandWorkflowUndoSafety;
  executionLogs: EditorCommandWorkflowExecutionLog[];
  nextAction: string;
};

export type EditorCommandWorkflowAutomationPacket = {
  id: string;
  status: EditorCommandWorkflowStatus;
  fileName: string;
  dataUrl: string;
  generatedAt: string;
};

export type EditorCommandWorkflowAutomationCenter = {
  generatedAt: string;
  status: EditorCommandWorkflowStatus;
  score: number;
  runbooks: EditorCommandWorkflowRunbook[];
  automationPacket: EditorCommandWorkflowAutomationPacket;
  nextActions: string[];
  totals: {
    runbooks: number;
    readyRunbooks: number;
    blockedRunbooks: number;
    dryRunSteps: number;
    permissionChecks: number;
    undoSafetyLogs: number;
    executionLogs: number;
    automationPackets: number;
  };
};
