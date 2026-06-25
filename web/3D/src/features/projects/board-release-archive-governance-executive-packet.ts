import { createHash } from "node:crypto";
import type { BoardReleaseArchiveGovernanceControlOwnerMatrixReport } from "@/features/projects/board-release-archive-governance-control-owner-matrix";
import type { BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport } from "@/features/projects/board-release-archive-governance-exception-quorum-tracker";
import type { BoardReleaseArchiveGovernancePolicyCharterReport } from "@/features/projects/board-release-archive-governance-policy-charter";
import type { BoardReleaseArchiveGovernancePolicyDriftMonitorReport } from "@/features/projects/board-release-archive-governance-policy-drift-monitor";

export type BoardReleaseArchiveGovernanceExecutivePacketKind =
  | "control-owner-matrix"
  | "exception-quorum"
  | "policy-charter"
  | "policy-drift"
  | "release-recommendation";

export type BoardReleaseArchiveGovernanceExecutivePacketStatus = "approved" | "blocked" | "watch";

export interface BoardReleaseArchiveGovernanceExecutivePacketRow {
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveGovernanceExecutivePacketKind;
  nextAction: string;
  packetHash: string;
  score: number;
  status: BoardReleaseArchiveGovernanceExecutivePacketStatus;
  title: string;
}

export interface BoardReleaseArchiveGovernanceExecutivePacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveGovernanceExecutivePacketRow[];
  summary: {
    approvedCount: number;
    blockedCount: number;
    governancePacketHash: string;
    governanceScore: number;
    nextAction: string;
    releaseRecommendation: string;
    rowCount: number;
    status: BoardReleaseArchiveGovernanceExecutivePacketStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveGovernanceExecutivePacketInput {
  controlOwnerMatrix: BoardReleaseArchiveGovernanceControlOwnerMatrixReport;
  exceptionQuorumTracker: BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport;
  generatedAt?: string;
  policyCharter: BoardReleaseArchiveGovernancePolicyCharterReport;
  policyDriftMonitor: BoardReleaseArchiveGovernancePolicyDriftMonitorReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveGovernanceExecutivePacketKind, number> = {
  "policy-charter": 0,
  "control-owner-matrix": 1,
  "exception-quorum": 2,
  "policy-drift": 3,
  "release-recommendation": 4,
};

const statusRank: Record<BoardReleaseArchiveGovernanceExecutivePacketStatus, number> = {
  blocked: 0,
  watch: 1,
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

function mapStatus(status: "aligned" | "approved" | "blocked" | "ratified" | "ready" | "watch") {
  if (status === "blocked") {
    return "blocked" satisfies BoardReleaseArchiveGovernanceExecutivePacketStatus;
  }

  return status === "watch" ? "watch" : "approved";
}

function row(input: {
  evidenceHash: string;
  kind: BoardReleaseArchiveGovernanceExecutivePacketKind;
  nextAction: string;
  score: number;
  status: BoardReleaseArchiveGovernanceExecutivePacketStatus;
  title: string;
  workspaceId: string;
}) {
  const packetHash = sha256({
    evidenceHash: input.evidenceHash,
    kind: input.kind,
    score: input.score,
    status: input.status,
    title: input.title,
  });

  return {
    evidenceHash: input.evidenceHash,
    id: `archive-governance-executive-packet:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction: input.nextAction,
    packetHash,
    score: input.score,
    status: input.status,
    title: input.title,
  } satisfies BoardReleaseArchiveGovernanceExecutivePacketRow;
}

function recommendation(input: {
  componentRows: BoardReleaseArchiveGovernanceExecutivePacketRow[];
  workspaceId: string;
}) {
  const blocked = input.componentRows.filter((entry) => entry.status === "blocked");
  const watch = input.componentRows.filter((entry) => entry.status === "watch");
  const score = Math.round(input.componentRows.reduce((total, entry) => total + entry.score, 0) / Math.max(1, input.componentRows.length));
  const status: BoardReleaseArchiveGovernanceExecutivePacketStatus = blocked.length > 0 ? "blocked" : watch.length > 0 ? "watch" : "approved";
  const nextAction =
    status === "blocked"
      ? `Resolve ${blocked[0]?.title ?? "blocked archive governance evidence"} before release governance recommendation.`
      : status === "watch"
        ? `Monitor ${watch[0]?.title ?? "watch archive governance evidence"} before final release governance recommendation.`
        : "Approve archive governance packet for release archive governance.";

  return row({
    evidenceHash: sha256(input.componentRows.map((entry) => entry.packetHash)),
    kind: "release-recommendation",
    nextAction,
    score,
    status,
    title: "Archive governance release recommendation",
    workspaceId: input.workspaceId,
  });
}

function createRows(input: CreateBoardReleaseArchiveGovernanceExecutivePacketInput & { workspaceId: string }) {
  const componentRows = [
    row({
      evidenceHash: input.policyCharter.summary.charterHash,
      kind: "policy-charter",
      nextAction: input.policyCharter.summary.nextAction,
      score: input.policyCharter.summary.charterScore,
      status: mapStatus(input.policyCharter.summary.status),
      title: "Policy charter",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.controlOwnerMatrix.summary.matrixHash,
      kind: "control-owner-matrix",
      nextAction: input.controlOwnerMatrix.summary.nextAction,
      score: input.controlOwnerMatrix.summary.matrixScore,
      status: mapStatus(input.controlOwnerMatrix.summary.status),
      title: "Control owner matrix",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.exceptionQuorumTracker.summary.quorumHash,
      kind: "exception-quorum",
      nextAction: input.exceptionQuorumTracker.summary.nextAction,
      score: input.exceptionQuorumTracker.summary.quorumScore,
      status: mapStatus(input.exceptionQuorumTracker.summary.status),
      title: "Exception quorum tracker",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.policyDriftMonitor.summary.driftHash,
      kind: "policy-drift",
      nextAction: input.policyDriftMonitor.summary.nextAction,
      score: input.policyDriftMonitor.summary.driftScore,
      status: mapStatus(input.policyDriftMonitor.summary.status),
      title: "Policy drift monitor",
      workspaceId: input.workspaceId,
    }),
  ];

  return [...componentRows, recommendation({ componentRows, workspaceId: input.workspaceId })].sort(
    (first, second) => kindRank[first.kind] - kindRank[second.kind] || statusRank[first.status] - statusRank[second.status] || first.title.localeCompare(second.title),
  );
}

function releaseRecommendationFor(input: {
  blockedCount: number;
  governanceScore: number;
  watchCount: number;
}) {
  if (input.blockedCount > 0) {
    return `BLOCK archive governance packet until blocked charter, ownership, quorum, or policy drift evidence is repaired. Current score: ${input.governanceScore}/100.`;
  }

  if (input.watchCount > 0) {
    return `WATCH archive governance packet and complete executive monitoring before final release governance recommendation. Current score: ${input.governanceScore}/100.`;
  }

  return `APPROVE archive governance packet with charter, owner matrix, quorum tracker, and policy drift monitor ready. Current score: ${input.governanceScore}/100.`;
}

function summarize(rows: BoardReleaseArchiveGovernanceExecutivePacketRow[]): BoardReleaseArchiveGovernanceExecutivePacketReport["summary"] {
  const approvedCount = rows.filter((entry) => entry.status === "approved").length;
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveGovernanceExecutivePacketStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "approved";
  const governanceScore = rows.length > 0 ? Math.max(0, Math.round(rows.reduce((total, entry) => total + entry.score, 0) / rows.length - blockedCount * 12 - watchCount * 5)) : 100;
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows.find((entry) => entry.kind === "release-recommendation") ?? null;

  return {
    approvedCount,
    blockedCount,
    governancePacketHash: sha256(rows.map((entry) => entry.packetHash)),
    governanceScore,
    nextAction: nextRow?.nextAction ?? "Review archive governance executive packet.",
    releaseRecommendation: releaseRecommendationFor({
      blockedCount,
      governanceScore,
      watchCount,
    }),
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createCsv(rows: BoardReleaseArchiveGovernanceExecutivePacketRow[]) {
  const header = ["packet_id", "kind", "title", "status", "score", "evidence_hash", "packet_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.score, entry.evidenceHash, entry.packetHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveGovernanceExecutivePacketRow[];
  summary: BoardReleaseArchiveGovernanceExecutivePacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveGovernanceExecutivePacket(
  input: CreateBoardReleaseArchiveGovernanceExecutivePacketInput,
): BoardReleaseArchiveGovernanceExecutivePacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.policyCharter.workspaceId;
  const rows = createRows({
    ...input,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-governance-executive-packet-${dateStamp(generatedAt)}`;

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
