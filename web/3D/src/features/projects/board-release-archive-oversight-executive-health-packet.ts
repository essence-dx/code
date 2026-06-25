import { createHash } from "node:crypto";
import type { BoardReleaseArchiveOversightBoardDistributionDigestReport } from "@/features/projects/board-release-archive-oversight-board-distribution-digest";
import type { BoardReleaseArchiveOversightEvidenceQualityMonitorReport } from "@/features/projects/board-release-archive-oversight-evidence-quality-monitor";
import type { BoardReleaseArchiveOversightExceptionRenewalCalendarReport } from "@/features/projects/board-release-archive-oversight-exception-renewal-calendar";
import type { BoardReleaseArchiveOversightIncidentReplayDrillReport } from "@/features/projects/board-release-archive-oversight-incident-replay-drill";

export type BoardReleaseArchiveOversightExecutiveHealthKind =
  | "board-distribution"
  | "evidence-quality"
  | "exception-renewals"
  | "incident-replay"
  | "release-recommendation";

export type BoardReleaseArchiveOversightExecutiveHealthStatus = "approved" | "blocked" | "watch";

export interface BoardReleaseArchiveOversightExecutiveHealthPacketRow {
  evidenceHash: string;
  healthHash: string;
  id: string;
  kind: BoardReleaseArchiveOversightExecutiveHealthKind;
  nextAction: string;
  score: number;
  status: BoardReleaseArchiveOversightExecutiveHealthStatus;
  title: string;
}

export interface BoardReleaseArchiveOversightExecutiveHealthPacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveOversightExecutiveHealthPacketRow[];
  summary: {
    approvedCount: number;
    blockedCount: number;
    healthPacketHash: string;
    healthScore: number;
    nextAction: string;
    releaseRecommendation: string;
    rowCount: number;
    status: BoardReleaseArchiveOversightExecutiveHealthStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveOversightExecutiveHealthPacketInput {
  boardDistributionDigest: BoardReleaseArchiveOversightBoardDistributionDigestReport;
  evidenceQualityMonitor: BoardReleaseArchiveOversightEvidenceQualityMonitorReport;
  exceptionRenewalCalendar: BoardReleaseArchiveOversightExceptionRenewalCalendarReport;
  generatedAt?: string;
  incidentReplayDrill: BoardReleaseArchiveOversightIncidentReplayDrillReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveOversightExecutiveHealthKind, number> = {
  "exception-renewals": 0,
  "evidence-quality": 1,
  "board-distribution": 2,
  "incident-replay": 3,
  "release-recommendation": 4,
};

const statusRank: Record<BoardReleaseArchiveOversightExecutiveHealthStatus, number> = {
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

function mapStatus(status: "blocked" | "healthy" | "passed" | "ready" | "scheduled" | "watch") {
  if (status === "blocked") {
    return "blocked" satisfies BoardReleaseArchiveOversightExecutiveHealthStatus;
  }

  return status === "watch" ? "watch" : "approved";
}

function row(input: {
  evidenceHash: string;
  kind: BoardReleaseArchiveOversightExecutiveHealthKind;
  nextAction: string;
  score: number;
  status: BoardReleaseArchiveOversightExecutiveHealthStatus;
  title: string;
  workspaceId: string;
}) {
  const healthHash = sha256({
    evidenceHash: input.evidenceHash,
    kind: input.kind,
    score: input.score,
    status: input.status,
    title: input.title,
  });

  return {
    evidenceHash: input.evidenceHash,
    healthHash,
    id: `archive-oversight-executive-health:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction: input.nextAction,
    score: input.score,
    status: input.status,
    title: input.title,
  } satisfies BoardReleaseArchiveOversightExecutiveHealthPacketRow;
}

function recommendation(input: {
  componentRows: BoardReleaseArchiveOversightExecutiveHealthPacketRow[];
  workspaceId: string;
}) {
  const blocked = input.componentRows.filter((entry) => entry.status === "blocked");
  const watch = input.componentRows.filter((entry) => entry.status === "watch");
  const score = Math.round(input.componentRows.reduce((total, entry) => total + entry.score, 0) / Math.max(1, input.componentRows.length));
  const status: BoardReleaseArchiveOversightExecutiveHealthStatus = blocked.length > 0 ? "blocked" : watch.length > 0 ? "watch" : "approved";
  const nextAction =
    status === "blocked"
      ? `Resolve ${blocked[0]?.title ?? "blocked archive oversight evidence"} before release recommendation.`
      : status === "watch"
        ? `Monitor ${watch[0]?.title ?? "watch archive oversight evidence"} before final release recommendation.`
        : "Approve archive oversight health packet for release governance.";

  return row({
    evidenceHash: sha256(input.componentRows.map((entry) => entry.healthHash)),
    kind: "release-recommendation",
    nextAction,
    score,
    status,
    title: "Archive oversight release recommendation",
    workspaceId: input.workspaceId,
  });
}

function createRows(input: CreateBoardReleaseArchiveOversightExecutiveHealthPacketInput & { workspaceId: string }) {
  const componentRows = [
    row({
      evidenceHash: input.exceptionRenewalCalendar.summary.renewalCalendarHash,
      kind: "exception-renewals",
      nextAction: input.exceptionRenewalCalendar.summary.nextAction,
      score: input.exceptionRenewalCalendar.summary.renewalScore,
      status: mapStatus(input.exceptionRenewalCalendar.summary.status),
      title: "Exception renewal calendar",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.evidenceQualityMonitor.summary.qualityMonitorHash,
      kind: "evidence-quality",
      nextAction: input.evidenceQualityMonitor.summary.nextAction,
      score: input.evidenceQualityMonitor.summary.qualityScore,
      status: mapStatus(input.evidenceQualityMonitor.summary.status),
      title: "Evidence quality monitor",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.boardDistributionDigest.summary.distributionDigestHash,
      kind: "board-distribution",
      nextAction: input.boardDistributionDigest.summary.nextAction,
      score: input.boardDistributionDigest.summary.distributionScore,
      status: mapStatus(input.boardDistributionDigest.summary.status),
      title: "Board distribution digest",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.incidentReplayDrill.summary.drillHash,
      kind: "incident-replay",
      nextAction: input.incidentReplayDrill.summary.nextAction,
      score: input.incidentReplayDrill.summary.drillScore,
      status: mapStatus(input.incidentReplayDrill.summary.status),
      title: "Incident replay drill",
      workspaceId: input.workspaceId,
    }),
  ];

  return [...componentRows, recommendation({ componentRows, workspaceId: input.workspaceId })].sort(
    (first, second) => kindRank[first.kind] - kindRank[second.kind] || statusRank[first.status] - statusRank[second.status] || first.title.localeCompare(second.title),
  );
}

function releaseRecommendationFor(input: {
  blockedCount: number;
  healthScore: number;
  watchCount: number;
}) {
  if (input.blockedCount > 0) {
    return `BLOCK archive oversight health packet until blocked renewal, quality, distribution, or replay evidence is repaired. Current score: ${input.healthScore}/100.`;
  }

  if (input.watchCount > 0) {
    return `WATCH archive oversight health packet and complete executive monitoring before final release recommendation. Current score: ${input.healthScore}/100.`;
  }

  return `APPROVE archive oversight health packet with renewals, evidence quality, board distribution, and incident replay evidence ready. Current score: ${input.healthScore}/100.`;
}

function summarize(rows: BoardReleaseArchiveOversightExecutiveHealthPacketRow[]): BoardReleaseArchiveOversightExecutiveHealthPacketReport["summary"] {
  const approvedCount = rows.filter((entry) => entry.status === "approved").length;
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveOversightExecutiveHealthStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "approved";
  const healthScore = rows.length > 0 ? Math.max(0, Math.round(rows.reduce((total, entry) => total + entry.score, 0) / rows.length - blockedCount * 12 - watchCount * 5)) : 100;
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows.find((entry) => entry.kind === "release-recommendation") ?? null;

  return {
    approvedCount,
    blockedCount,
    healthPacketHash: sha256(rows.map((entry) => entry.healthHash)),
    healthScore,
    nextAction: nextRow?.nextAction ?? "Review archive oversight executive health packet.",
    releaseRecommendation: releaseRecommendationFor({
      blockedCount,
      healthScore,
      watchCount,
    }),
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createCsv(rows: BoardReleaseArchiveOversightExecutiveHealthPacketRow[]) {
  const header = ["health_id", "kind", "title", "status", "score", "evidence_hash", "health_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.score, entry.evidenceHash, entry.healthHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveOversightExecutiveHealthPacketRow[];
  summary: BoardReleaseArchiveOversightExecutiveHealthPacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveOversightExecutiveHealthPacket(
  input: CreateBoardReleaseArchiveOversightExecutiveHealthPacketInput,
): BoardReleaseArchiveOversightExecutiveHealthPacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.exceptionRenewalCalendar.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-oversight-executive-health-packet-${dateStamp(generatedAt)}`;

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
