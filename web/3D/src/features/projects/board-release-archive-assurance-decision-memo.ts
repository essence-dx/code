import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveEvidenceReleaseHandoffDigestReport,
  BoardReleaseArchiveEvidenceReleaseHandoffDigestRow,
} from "@/features/projects/board-release-archive-evidence-release-handoff-digest";

export type BoardReleaseArchiveAssuranceDecisionMemoStatus = "approved" | "blocked" | "conditional";
export type BoardReleaseArchiveAssuranceDecisionMemoRiskLevel = "critical" | "high" | "low" | "medium";

export interface BoardReleaseArchiveAssuranceDecisionMemoOwner {
  dueWindow: string;
  evidenceHash: string;
  id: string;
  nextAction: string;
  ownerRole: string;
  riskLevel: BoardReleaseArchiveAssuranceDecisionMemoRiskLevel;
  sourceArea: BoardReleaseArchiveEvidenceReleaseHandoffDigestRow["area"];
  status: BoardReleaseArchiveAssuranceDecisionMemoStatus;
  title: string;
}

export interface BoardReleaseArchiveAssuranceDecisionMemoReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  executiveMemo: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  owners: BoardReleaseArchiveAssuranceDecisionMemoOwner[];
  summary: {
    approvalRecommendation: string;
    blockedOwnerCount: number;
    conditionalOwnerCount: number;
    memoHash: string;
    memoScore: number;
    nextAction: string;
    ownerCount: number;
    status: BoardReleaseArchiveAssuranceDecisionMemoStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveAssuranceDecisionMemoInput {
  generatedAt?: string;
  handoffDigest: BoardReleaseArchiveEvidenceReleaseHandoffDigestReport;
  workspaceId?: string;
}

const riskRank: Record<BoardReleaseArchiveAssuranceDecisionMemoRiskLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const statusRank: Record<BoardReleaseArchiveAssuranceDecisionMemoStatus, number> = {
  blocked: 0,
  conditional: 1,
  approved: 2,
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

function ownerRoleFor(area: BoardReleaseArchiveEvidenceReleaseHandoffDigestRow["area"]) {
  switch (area) {
    case "diffs":
      return "archive operations owner";
    case "renewals":
      return "board assurance owner";
    case "reviewers":
      return "review coordinator";
    case "vault":
      return "evidence custodian";
  }
}

function dueWindowFor(area: BoardReleaseArchiveEvidenceReleaseHandoffDigestRow["area"], status: BoardReleaseArchiveAssuranceDecisionMemoStatus) {
  if (status === "blocked") {
    return "Before board release approval";
  }

  if (area === "renewals") {
    return "Within 24 hours";
  }

  if (area === "reviewers") {
    return "Within reviewer acknowledgement window";
  }

  return "Before final archive closeout";
}

function riskFor(row: BoardReleaseArchiveEvidenceReleaseHandoffDigestRow): BoardReleaseArchiveAssuranceDecisionMemoRiskLevel {
  if (row.status === "blocked" || row.score < 50) {
    return "critical";
  }

  if (row.score < 75) {
    return "high";
  }

  if (row.status === "watch" || row.score < 90) {
    return "medium";
  }

  return "low";
}

function statusFor(row: BoardReleaseArchiveEvidenceReleaseHandoffDigestRow): BoardReleaseArchiveAssuranceDecisionMemoStatus {
  if (row.status === "blocked") {
    return "blocked";
  }

  return row.status === "watch" ? "conditional" : "approved";
}

function createOwners(input: { generatedAt: string; handoffDigest: BoardReleaseArchiveEvidenceReleaseHandoffDigestReport; workspaceId: string }) {
  return input.handoffDigest.rows
    .filter((row) => row.status !== "ready" || row.score < 90)
    .map((row) => {
      const status = statusFor(row);

      return {
        dueWindow: dueWindowFor(row.area, status),
        evidenceHash: row.evidenceHash,
        id: `archive-assurance-decision-owner:${slug(input.workspaceId)}:${row.area}:${slug(row.metric)}:${dateStamp(input.generatedAt)}`,
        nextAction: row.nextAction,
        ownerRole: ownerRoleFor(row.area),
        riskLevel: riskFor(row),
        sourceArea: row.area,
        status,
        title: row.title,
      } satisfies BoardReleaseArchiveAssuranceDecisionMemoOwner;
    })
    .sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] ||
        riskRank[first.riskLevel] - riskRank[second.riskLevel] ||
        first.title.localeCompare(second.title),
    );
}

function summarize(
  handoffDigest: BoardReleaseArchiveEvidenceReleaseHandoffDigestReport,
  owners: BoardReleaseArchiveAssuranceDecisionMemoOwner[],
): BoardReleaseArchiveAssuranceDecisionMemoReport["summary"] {
  const blockedOwnerCount = owners.filter((owner) => owner.status === "blocked").length;
  const conditionalOwnerCount = owners.filter((owner) => owner.status === "conditional").length;
  const status: BoardReleaseArchiveAssuranceDecisionMemoStatus =
    handoffDigest.summary.status === "blocked" || blockedOwnerCount > 0 ? "blocked" : conditionalOwnerCount > 0 || handoffDigest.summary.status === "watch" ? "conditional" : "approved";
  const approvalRecommendation =
    status === "approved"
      ? "Approve archive release closeout."
      : status === "conditional"
        ? "Approve archive release closeout conditionally after listed owner follow-up."
        : "Do not approve archive release closeout until blocked assurance owners resolve their evidence gaps.";

  return {
    approvalRecommendation,
    blockedOwnerCount,
    conditionalOwnerCount,
    memoHash: sha256({
      digestHash: handoffDigest.summary.digestHash,
      owners,
      recommendation: approvalRecommendation,
      status,
    }),
    memoScore: Math.max(0, Math.round(handoffDigest.summary.digestScore - blockedOwnerCount * 16 - conditionalOwnerCount * 5)),
    nextAction: owners[0]?.nextAction ?? "Archive assurance decision memo is ready for board review.",
    ownerCount: owners.length,
    status,
  };
}

function executiveMemo(summary: BoardReleaseArchiveAssuranceDecisionMemoReport["summary"], handoffDigest: BoardReleaseArchiveEvidenceReleaseHandoffDigestReport) {
  return `${summary.status.toUpperCase()} archive assurance decision: ${summary.approvalRecommendation} Handoff score ${handoffDigest.summary.digestScore}/100, memo score ${summary.memoScore}/100, ${summary.ownerCount} residual owner rows.`;
}

function createCsv(owners: BoardReleaseArchiveAssuranceDecisionMemoOwner[]) {
  const header = ["owner_id", "source_area", "title", "status", "risk_level", "owner_role", "due_window", "evidence_hash", "next_action"];
  const body = owners.map((owner) =>
    [owner.id, owner.sourceArea, owner.title, owner.status, owner.riskLevel, owner.ownerRole, owner.dueWindow, owner.evidenceHash, owner.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  executiveMemo: string;
  generatedAt: string;
  owners: BoardReleaseArchiveAssuranceDecisionMemoOwner[];
  summary: BoardReleaseArchiveAssuranceDecisionMemoReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveAssuranceDecisionMemo(
  input: CreateBoardReleaseArchiveAssuranceDecisionMemoInput,
): BoardReleaseArchiveAssuranceDecisionMemoReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.handoffDigest.workspaceId;
  const owners = createOwners({
    generatedAt,
    handoffDigest: input.handoffDigest,
    workspaceId,
  });
  const summary = summarize(input.handoffDigest, owners);
  const memo = executiveMemo(summary, input.handoffDigest);
  const csvContent = createCsv(owners);
  const jsonContent = createJson({
    executiveMemo: memo,
    generatedAt,
    owners,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-assurance-decision-memo-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    executiveMemo: memo,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    owners,
    summary,
    workspaceId,
  };
}
