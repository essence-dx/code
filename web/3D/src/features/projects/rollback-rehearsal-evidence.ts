import { createHash } from "node:crypto";
import type { NativeReleasePromotionApprovalReport, NativeReleasePromotionApprovalStatus } from "@/features/projects/native-release-promotion-approval";
import type { ProductionParityHistorySnapshotReport } from "@/features/projects/live-production-parity-evidence-dashboard";

export type RollbackRehearsalEvidenceKind =
  | "alias-move-proof"
  | "current-production-alias"
  | "known-good-deployment"
  | "post-rollback-smoke"
  | "release-approval-link";
export type RollbackRehearsalEvidenceStatus = "blocked" | "ready" | "review";

export interface RollbackRehearsalEvidenceRow {
  evidence: string;
  evidenceHash: string;
  id: string;
  kind: RollbackRehearsalEvidenceKind;
  nextAction: string;
  status: RollbackRehearsalEvidenceStatus;
  title: string;
}

export interface RollbackRehearsalEvidenceReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: RollbackRehearsalEvidenceRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    rehearsalHash: string;
    reviewCount: number;
    rollbackScore: number;
    rowCount: number;
    status: RollbackRehearsalEvidenceStatus;
  };
  workspaceId: string;
}

export interface CreateRollbackRehearsalEvidenceReportInput {
  aliasMoveStatus?: RollbackRehearsalEvidenceStatus;
  currentDeploymentId?: string | null;
  generatedAt?: string;
  knownGoodDeploymentId?: string | null;
  parityHistory: ProductionParityHistorySnapshotReport;
  postRollbackSmokeStatus?: RollbackRehearsalEvidenceStatus;
  productionAlias?: string | null;
  releaseApproval: NativeReleasePromotionApprovalReport;
  rollbackCommandHash?: string | null;
  rollbackPlanHash?: string | null;
  workspaceId?: string;
}

const kindRank: Record<RollbackRehearsalEvidenceKind, number> = {
  "current-production-alias": 0,
  "known-good-deployment": 1,
  "alias-move-proof": 2,
  "release-approval-link": 3,
  "post-rollback-smoke": 4,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
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

function fromApprovalStatus(status: NativeReleasePromotionApprovalStatus): RollbackRehearsalEvidenceStatus {
  return status;
}

function nextActionFor(input: { kind: RollbackRehearsalEvidenceKind; status: RollbackRehearsalEvidenceStatus }) {
  if (input.status === "blocked") {
    return `Resolve rollback rehearsal blockers for ${input.kind}.`;
  }

  if (input.status === "review") {
    return `Review rollback rehearsal evidence for ${input.kind}.`;
  }

  return `Keep rollback rehearsal evidence current for ${input.kind}.`;
}

function createRow(input: {
  evidence: string;
  id: string;
  kind: RollbackRehearsalEvidenceKind;
  status: RollbackRehearsalEvidenceStatus;
  title: string;
}): RollbackRehearsalEvidenceRow {
  const nextAction = nextActionFor({
    kind: input.kind,
    status: input.status,
  });
  const evidenceHash = sha256({
    evidence: input.evidence,
    id: input.id,
    kind: input.kind,
    nextAction,
    status: input.status,
    title: input.title,
  });

  return {
    ...input,
    evidenceHash,
    nextAction,
  };
}

function statusFromOptionalEvidence(value: string | null | undefined): RollbackRehearsalEvidenceStatus {
  return value?.trim() ? "ready" : "review";
}

function createRows(input: CreateRollbackRehearsalEvidenceReportInput & { workspaceId: string }): RollbackRehearsalEvidenceRow[] {
  const latestSnapshot = input.parityHistory.records.at(-1);
  const rollbackApproval = input.releaseApproval.rows.find((row) => row.kind === "rollback-evidence");
  const approvalStatus = fromApprovalStatus(rollbackApproval?.status ?? input.releaseApproval.summary.status);
  const aliasStatus = input.aliasMoveStatus ?? statusFromOptionalEvidence(input.currentDeploymentId);
  const knownGoodStatus =
    latestSnapshot?.status === "blocked" ? "blocked" : statusFromOptionalEvidence(input.knownGoodDeploymentId ?? latestSnapshot?.parityHash);
  const smokeStatus = input.postRollbackSmokeStatus ?? "review";
  const rollbackPlanHash = input.rollbackPlanHash?.trim() || rollbackApproval?.evidenceHash || "pending";
  const rollbackCommandHash = input.rollbackCommandHash?.trim() || "pending";

  return [
    createRow({
      evidence: `Production alias ${input.productionAlias?.trim() || "pending"} currently points at ${input.currentDeploymentId?.trim() || "pending deployment"}.`,
      id: `rollback-rehearsal-evidence:${slug(input.workspaceId)}:current-production-alias`,
      kind: "current-production-alias",
      status: statusFromOptionalEvidence(input.productionAlias) === "ready" && statusFromOptionalEvidence(input.currentDeploymentId) === "ready" ? aliasStatus : "review",
      title: "Current production alias",
    }),
    createRow({
      evidence: `Known good deployment ${input.knownGoodDeploymentId?.trim() || "derived from parity history"} with latest parity hash ${latestSnapshot?.parityHash ?? input.parityHistory.summary.historyHash}.`,
      id: `rollback-rehearsal-evidence:${slug(input.workspaceId)}:known-good-deployment`,
      kind: "known-good-deployment",
      status: knownGoodStatus,
      title: "Known good deployment",
    }),
    createRow({
      evidence: `Alias move status ${aliasStatus}; rollback command hash ${rollbackCommandHash}; rollback plan hash ${rollbackPlanHash}.`,
      id: `rollback-rehearsal-evidence:${slug(input.workspaceId)}:alias-move-proof`,
      kind: "alias-move-proof",
      status: aliasStatus,
      title: "Alias move proof",
    }),
    createRow({
      evidence: `Release approval ${input.releaseApproval.summary.approvalHash}; rollback approval ${rollbackApproval?.evidenceHash ?? "missing rollback row"}.`,
      id: `rollback-rehearsal-evidence:${slug(input.workspaceId)}:release-approval-link`,
      kind: "release-approval-link",
      status: approvalStatus,
      title: "Release approval link",
    }),
    createRow({
      evidence: `Post-rollback smoke status ${smokeStatus}; parity history ${input.parityHistory.summary.historyHash}.`,
      id: `rollback-rehearsal-evidence:${slug(input.workspaceId)}:post-rollback-smoke`,
      kind: "post-rollback-smoke",
      status: smokeStatus,
      title: "Post-rollback smoke",
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: RollbackRehearsalEvidenceRow[]): RollbackRehearsalEvidenceReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: RollbackRehearsalEvidenceStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const rollbackScore = Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 8 - blockedCount * 20)));

  return {
    blockedCount,
    nextAction:
      status === "blocked"
        ? "Resolve rollback rehearsal blockers before declaring production rollback proof."
        : status === "review"
          ? "Review rollback rehearsal evidence before promotion approval."
          : "Rollback rehearsal evidence is ready.",
    readyCount,
    rehearsalHash: sha256(rows.map((row) => row.evidenceHash)),
    reviewCount,
    rollbackScore,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: RollbackRehearsalEvidenceRow[]) {
  const header = ["rehearsal_id", "kind", "title", "status", "evidence_hash", "next_action"];
  const body = rows.map((row) => [row.id, row.kind, row.title, row.status, row.evidenceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createRollbackRehearsalEvidenceReport(input: CreateRollbackRehearsalEvidenceReportInput): RollbackRehearsalEvidenceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.releaseApproval.workspaceId ?? input.parityHistory.workspaceId ?? "workspace";
  const rows = createRows({
    ...input,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-rollback-rehearsal-evidence-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
