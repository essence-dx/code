import type { BoardAuditEvidenceAcceptanceWorkflow } from "@/features/projects/board-audit-evidence-acceptance";
import type { BoardAuditEvidenceAttachmentManifest } from "@/features/projects/board-audit-evidence-manifest";
import type { BoardAuditEvidenceReadinessDigest } from "@/features/projects/board-audit-evidence-readiness-digest";
import type { BoardAuditEvidenceVerificationReport } from "@/features/projects/board-audit-evidence-verification";

export type BoardEvidenceCommandStageId = "acceptance" | "manifest" | "readiness" | "verification";
export type BoardEvidenceCommandStatus = "blocked" | "ready" | "watch";
export type BoardEvidenceCommandPriority = "critical" | "high" | "normal";

export interface BoardEvidenceCommandStage {
  blockedCount: number;
  id: BoardEvidenceCommandStageId;
  label: string;
  nextAction: string;
  score: number;
  status: BoardEvidenceCommandStatus;
  taskCount: number;
}

export interface BoardEvidenceCommandAction {
  label: string;
  nextAction: string;
  priority: BoardEvidenceCommandPriority;
  stageId: BoardEvidenceCommandStageId;
}

export interface BoardEvidenceCommandCenter {
  actions: BoardEvidenceCommandAction[];
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  stages: BoardEvidenceCommandStage[];
  summary: {
    actionCount: number;
    blockedStageCount: number;
    commandScore: number;
    nextAction: string;
    readyStageCount: number;
    stageCount: number;
    status: BoardEvidenceCommandStatus;
    watchStageCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardEvidenceCommandCenterInput {
  acceptance: BoardAuditEvidenceAcceptanceWorkflow;
  generatedAt?: string;
  manifest: BoardAuditEvidenceAttachmentManifest;
  readiness: BoardAuditEvidenceReadinessDigest;
  verification: BoardAuditEvidenceVerificationReport;
  workspaceId?: string;
}

const stageRank: Record<BoardEvidenceCommandStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const stageOrder: Record<BoardEvidenceCommandStageId, number> = {
  manifest: 0,
  verification: 1,
  acceptance: 2,
  readiness: 3,
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function toCommandStatus(status: string): BoardEvidenceCommandStatus {
  return status === "blocked" ? "blocked" : status === "watch" ? "watch" : "ready";
}

function boundedScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function createStages(input: CreateBoardEvidenceCommandCenterInput): BoardEvidenceCommandStage[] {
  return [
    {
      blockedCount: input.manifest.summary.missingEvidenceCount,
      id: "manifest",
      label: "Attachment manifest",
      nextAction: input.manifest.summary.nextAction,
      score: input.manifest.summary.manifestScore,
      status: toCommandStatus(input.manifest.summary.status),
      taskCount: input.manifest.summary.taskCount,
    },
    {
      blockedCount: input.verification.summary.missingFileCount + input.verification.summary.unsignedExportCount,
      id: "verification",
      label: "Evidence verification",
      nextAction: input.verification.summary.nextAction,
      score: input.verification.summary.verificationScore,
      status: toCommandStatus(input.verification.summary.status),
      taskCount: input.verification.summary.taskCount,
    },
    {
      blockedCount: input.acceptance.summary.blockedCount + input.acceptance.summary.rejectedCount,
      id: "acceptance",
      label: "Reviewer acceptance",
      nextAction: input.acceptance.summary.nextAction,
      score: input.acceptance.summary.acceptanceScore,
      status: toCommandStatus(input.acceptance.summary.status),
      taskCount: input.acceptance.summary.taskCount,
    },
    {
      blockedCount: input.readiness.summary.unresolvedAttachmentRiskCount,
      id: "readiness",
      label: "Readiness digest",
      nextAction: input.readiness.summary.nextAction,
      score: input.readiness.summary.readinessScore,
      status: toCommandStatus(input.readiness.summary.status),
      taskCount: input.readiness.summary.taskCount,
    },
  ];
}

function actionPriority(stage: BoardEvidenceCommandStage): BoardEvidenceCommandPriority {
  if (stage.status === "blocked" && stage.blockedCount > 0) {
    return "critical";
  }

  return stage.status === "blocked" || stage.status === "watch" ? "high" : "normal";
}

function createActions(stages: BoardEvidenceCommandStage[]): BoardEvidenceCommandAction[] {
  return stages
    .filter((stage) => stage.status !== "ready")
    .map((stage) => ({
      label: `${stage.label} ${stage.status === "blocked" ? "blocker" : "watch item"}`,
      nextAction: stage.nextAction,
      priority: actionPriority(stage),
      stageId: stage.id,
    }))
    .sort(
      (first, second) =>
        stageRank[stages.find((stage) => stage.id === first.stageId)?.status ?? "ready"] -
          stageRank[stages.find((stage) => stage.id === second.stageId)?.status ?? "ready"] || stageOrder[first.stageId] - stageOrder[second.stageId],
    );
}

function createSummary(stages: BoardEvidenceCommandStage[], actions: BoardEvidenceCommandAction[]): BoardEvidenceCommandCenter["summary"] {
  const blockedStageCount = stages.filter((stage) => stage.status === "blocked").length;
  const watchStageCount = stages.filter((stage) => stage.status === "watch").length;
  const readyStageCount = stages.filter((stage) => stage.status === "ready").length;
  const firstAction = actions[0] ?? null;

  return {
    actionCount: actions.length,
    blockedStageCount,
    commandScore: boundedScore(stages.reduce((sum, stage) => sum + stage.score, 0) / Math.max(1, stages.length)),
    nextAction: firstAction?.nextAction ?? "Board evidence command center is ready for packet lock and closeout.",
    readyStageCount,
    stageCount: stages.length,
    status: blockedStageCount > 0 ? "blocked" : watchStageCount > 0 ? "watch" : "ready",
    watchStageCount,
  };
}

function createCsv(stages: BoardEvidenceCommandStage[], actions: BoardEvidenceCommandAction[]) {
  const actionByStage = new Map(actions.map((action) => [action.stageId, action]));
  const header = ["stage_id", "status", "score", "priority", "next_action"];
  const body = stages.map((stage) =>
    [stage.id, stage.status, stage.score, actionByStage.get(stage.id)?.priority ?? "normal", stage.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  actions: BoardEvidenceCommandAction[];
  generatedAt: string;
  stages: BoardEvidenceCommandStage[];
  summary: BoardEvidenceCommandCenter["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      actions: input.actions,
      generatedAt: input.generatedAt,
      stages: input.stages,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardEvidenceCommandCenter(input: CreateBoardEvidenceCommandCenterInput): BoardEvidenceCommandCenter {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.readiness.workspaceId;
  const stages = createStages(input);
  const actions = createActions(stages);
  const summary = createSummary(stages, actions);
  const csvContent = createCsv(stages, actions);
  const jsonContent = createJson({
    actions,
    generatedAt,
    stages,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-evidence-command-center-${dateStamp(generatedAt)}`;

  return {
    actions,
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    stages,
    summary,
    workspaceId,
  };
}
