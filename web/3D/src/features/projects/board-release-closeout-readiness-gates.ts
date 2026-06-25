import { createHash } from "node:crypto";
import type { BoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";
import type { BoardReleaseDistributionReadinessDashboardReport } from "@/features/projects/board-release-distribution-readiness-dashboard";
import type { BoardReleaseObservabilityExecutiveDigestReport } from "@/features/projects/board-release-observability-executive-digest";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";

export type BoardReleaseCloseoutReadinessGateStatus = "blocked" | "ready" | "watch";
export type BoardReleaseCloseoutReadinessGateKind = "distribution-readiness" | "evidence-archive" | "observability-digest" | "signed-export-packets";

export interface BoardReleaseCloseoutReadinessGate {
  evidenceHash: string | null;
  gateHash: string;
  gateId: string;
  gateKind: BoardReleaseCloseoutReadinessGateKind;
  metric: string;
  nextAction: string;
  score: number;
  status: BoardReleaseCloseoutReadinessGateStatus;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseCloseoutReadinessGateReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  gates: BoardReleaseCloseoutReadinessGate[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    blockedCount: number;
    gateCount: number;
    nextAction: string;
    readyCount: number;
    readinessScore: number;
    status: BoardReleaseCloseoutReadinessGateStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseCloseoutReadinessGateReportInput {
  archiveRecords: BoardEvidenceReleaseArchiveRecordReport;
  distributionReadiness: BoardReleaseDistributionReadinessDashboardReport;
  exportPackets: BoardReleaseOperationsExportPacketReport;
  generatedAt?: string;
  observabilityDigest: BoardReleaseObservabilityExecutiveDigestReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseCloseoutReadinessGateStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const gateRank: Record<BoardReleaseCloseoutReadinessGateKind, number> = {
  "observability-digest": 0,
  "distribution-readiness": 1,
  "signed-export-packets": 2,
  "evidence-archive": 3,
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
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function closeoutStatus(status: "blocked" | "ready" | "watch"): BoardReleaseCloseoutReadinessGateStatus {
  return status;
}

function gate(input: Omit<BoardReleaseCloseoutReadinessGate, "gateHash" | "gateId">): BoardReleaseCloseoutReadinessGate {
  const gateId = `board-release-closeout-readiness:${slug(input.workspaceId)}:${input.gateKind}`;
  const gateHash = sha256({
    evidenceHash: input.evidenceHash,
    gateKind: input.gateKind,
    metric: input.metric,
    score: input.score,
    status: input.status,
    workspaceId: input.workspaceId,
  });

  return {
    ...input,
    gateHash,
    gateId,
  };
}

function observabilityGate(report: BoardReleaseObservabilityExecutiveDigestReport, workspaceId: string) {
  return gate({
    evidenceHash: sha256(report.jsonContent),
    gateKind: "observability-digest",
    metric: `${report.summary.digestScore}/100 digest`,
    nextAction: report.summary.nextAction,
    score: report.summary.digestScore,
    status: closeoutStatus(report.summary.status),
    title: "Observability executive digest",
    workspaceId,
  });
}

function distributionGate(report: BoardReleaseDistributionReadinessDashboardReport, workspaceId: string) {
  return gate({
    evidenceHash: sha256(report.jsonContent),
    gateKind: "distribution-readiness",
    metric: `${report.summary.readinessScore}/100 distribution`,
    nextAction: report.summary.nextAction,
    score: report.summary.readinessScore,
    status: report.summary.status === "ready" ? "ready" : report.summary.status,
    title: "Distribution readiness",
    workspaceId,
  });
}

function exportPacketGate(report: BoardReleaseOperationsExportPacketReport, workspaceId: string) {
  const signedCount = report.summary.signedPacketCount;
  const score = Math.max(0, Math.min(100, Math.round((signedCount / Math.max(report.summary.packetCount, 1)) * 100) - report.summary.blockedCount * 20 - report.summary.watchCount * 8));

  return gate({
    evidenceHash: report.packets[0]?.packetHash ?? sha256(report.jsonContent),
    gateKind: "signed-export-packets",
    metric: `${signedCount}/${report.summary.packetCount} signed`,
    nextAction: report.summary.nextAction,
    score,
    status: report.summary.status,
    title: "Signed export packets",
    workspaceId,
  });
}

function archiveGate(report: BoardEvidenceReleaseArchiveRecordReport, workspaceId: string) {
  return gate({
    evidenceHash: report.summary.latestArchiveHash,
    gateKind: "evidence-archive",
    metric: `${report.summary.archiveCount} archive${report.summary.archiveCount === 1 ? "" : "s"}`,
    nextAction: report.summary.nextAction,
    score: report.summary.status === "archived" ? 100 : 35,
    status: report.summary.status === "archived" ? "ready" : "blocked",
    title: "Evidence archive state",
    workspaceId,
  });
}

function createGates(input: CreateBoardReleaseCloseoutReadinessGateReportInput & { workspaceId: string }) {
  return [
    observabilityGate(input.observabilityDigest, input.workspaceId),
    distributionGate(input.distributionReadiness, input.workspaceId),
    exportPacketGate(input.exportPackets, input.workspaceId),
    archiveGate(input.archiveRecords, input.workspaceId),
  ].sort((first, second) => statusRank[first.status] - statusRank[second.status] || gateRank[first.gateKind] - gateRank[second.gateKind]);
}

function summarize(gates: BoardReleaseCloseoutReadinessGate[]): BoardReleaseCloseoutReadinessGateReport["summary"] {
  const blockedCount = gates.filter((gate) => gate.status === "blocked").length;
  const watchCount = gates.filter((gate) => gate.status === "watch").length;
  const firstAttention = gates.find((gate) => gate.status === "blocked" || gate.status === "watch") ?? null;

  return {
    blockedCount,
    gateCount: gates.length,
    nextAction: firstAttention?.nextAction ?? "Board release closeout readiness gates are ready for owner acknowledgement.",
    readinessScore: gates.length > 0 ? Math.round(gates.reduce((sum, gate) => sum + gate.score, 0) / gates.length) : 100,
    readyCount: gates.filter((gate) => gate.status === "ready").length,
    status: gates.reduce<BoardReleaseCloseoutReadinessGateStatus>((worst, gate) => (statusRank[gate.status] < statusRank[worst] ? gate.status : worst), "ready"),
    watchCount,
  };
}

function createCsv(gates: BoardReleaseCloseoutReadinessGate[]) {
  const header = ["gate_id", "gate_kind", "title", "status", "score", "metric", "evidence_hash", "gate_hash", "next_action"];
  const body = gates.map((gate) =>
    [gate.gateId, gate.gateKind, gate.title, gate.status, gate.score, gate.metric, gate.evidenceHash, gate.gateHash, gate.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  gates: BoardReleaseCloseoutReadinessGate[];
  generatedAt: string;
  summary: BoardReleaseCloseoutReadinessGateReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      gates: input.gates,
      generatedAt: input.generatedAt,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseCloseoutReadinessGateReport(
  input: CreateBoardReleaseCloseoutReadinessGateReportInput,
): BoardReleaseCloseoutReadinessGateReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.observabilityDigest.workspaceId;
  const gates = createGates({
    ...input,
    workspaceId,
  });
  const summary = summarize(gates);
  const csvContent = createCsv(gates);
  const jsonContent = createJson({
    gates,
    generatedAt,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-closeout-readiness-gates-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    gates,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    summary,
    workspaceId,
  };
}
