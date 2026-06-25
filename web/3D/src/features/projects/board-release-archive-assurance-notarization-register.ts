import { createHash } from "node:crypto";
import type { BoardReleaseArchiveAssuranceDecisionMemoReport } from "@/features/projects/board-release-archive-assurance-decision-memo";
import type { BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport } from "@/features/projects/board-release-archive-evidence-exception-renewal-scheduler";
import type { BoardReleaseArchiveEvidenceReleaseHandoffDigestReport } from "@/features/projects/board-release-archive-evidence-release-handoff-digest";
import type { BoardReleaseArchiveEvidenceReviewerPacketReport } from "@/features/projects/board-release-archive-evidence-reviewer-packets";

export type BoardReleaseArchiveAssuranceNotarizationKind = "decision-memo" | "handoff-digest" | "renewal-register" | "reviewer-packets";
export type BoardReleaseArchiveAssuranceNotarizationStatus = "blocked" | "notarized" | "watch";

export interface BoardReleaseArchiveAssuranceNotarizationEntry {
  exportFileName: string;
  exportManifestHash: string;
  id: string;
  kind: BoardReleaseArchiveAssuranceNotarizationKind;
  nextAction: string;
  notarizationHash: string;
  recordCount: number;
  sourceHash: string;
  sourceStatus: string;
  status: BoardReleaseArchiveAssuranceNotarizationStatus;
  title: string;
}

export interface BoardReleaseArchiveAssuranceNotarizationRegisterReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveAssuranceNotarizationEntry[];
  summary: {
    blockedCount: number;
    nextAction: string;
    notarizedCount: number;
    notarizationHash: string;
    notarizationScore: number;
    rowCount: number;
    status: BoardReleaseArchiveAssuranceNotarizationStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveAssuranceNotarizationRegisterInput {
  decisionMemo: BoardReleaseArchiveAssuranceDecisionMemoReport;
  exceptionRenewals: BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport;
  generatedAt?: string;
  handoffDigest: BoardReleaseArchiveEvidenceReleaseHandoffDigestReport;
  reviewerPackets: BoardReleaseArchiveEvidenceReviewerPacketReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveAssuranceNotarizationKind, number> = {
  "handoff-digest": 0,
  "decision-memo": 1,
  "reviewer-packets": 2,
  "renewal-register": 3,
};

const statusRank: Record<BoardReleaseArchiveAssuranceNotarizationStatus, number> = {
  blocked: 0,
  watch: 1,
  notarized: 2,
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

function statusFrom(sourceStatus: string): BoardReleaseArchiveAssuranceNotarizationStatus {
  if (sourceStatus === "blocked" || sourceStatus === "overdue") {
    return "blocked";
  }

  return sourceStatus === "approved" || sourceStatus === "ready" || sourceStatus === "scheduled" ? "notarized" : "watch";
}

function nextActionFor(input: { status: BoardReleaseArchiveAssuranceNotarizationStatus; title: string }) {
  if (input.status === "blocked") {
    return `Resolve source blockers before notarizing ${input.title}.`;
  }

  if (input.status === "watch") {
    return `Retain ${input.title} with conditional assurance notes and owner follow-up.`;
  }

  return `Keep ${input.title} sealed in the archive assurance notarization register.`;
}

function entry(input: {
  exportFileName: string;
  generatedAt: string;
  kind: BoardReleaseArchiveAssuranceNotarizationKind;
  recordCount: number;
  sourceHash: string;
  sourceStatus: string;
  title: string;
  workspaceId: string;
}) {
  const status = statusFrom(input.sourceStatus);
  const id = `archive-assurance-notarization:${slug(input.workspaceId)}:${input.kind}:${dateStamp(input.generatedAt)}`;
  const exportManifestHash = sha256({
    exportFileName: input.exportFileName,
    kind: input.kind,
    recordCount: input.recordCount,
    sourceHash: input.sourceHash,
    title: input.title,
  });
  const notarizationHash = sha256({
    exportManifestHash,
    id,
    sourceStatus: input.sourceStatus,
    status,
  });

  return {
    exportFileName: input.exportFileName,
    exportManifestHash,
    id,
    kind: input.kind,
    nextAction: nextActionFor({ status, title: input.title }),
    notarizationHash,
    recordCount: input.recordCount,
    sourceHash: input.sourceHash,
    sourceStatus: input.sourceStatus,
    status,
    title: input.title,
  } satisfies BoardReleaseArchiveAssuranceNotarizationEntry;
}

function createRows(input: CreateBoardReleaseArchiveAssuranceNotarizationRegisterInput & { generatedAt: string; workspaceId: string }) {
  return [
    entry({
      exportFileName: input.handoffDigest.jsonFileName,
      generatedAt: input.generatedAt,
      kind: "handoff-digest",
      recordCount: input.handoffDigest.summary.rowCount,
      sourceHash: input.handoffDigest.summary.digestHash,
      sourceStatus: input.handoffDigest.summary.status,
      title: "Archive evidence handoff digest",
      workspaceId: input.workspaceId,
    }),
    entry({
      exportFileName: input.decisionMemo.jsonFileName,
      generatedAt: input.generatedAt,
      kind: "decision-memo",
      recordCount: input.decisionMemo.summary.ownerCount,
      sourceHash: input.decisionMemo.summary.memoHash,
      sourceStatus: input.decisionMemo.summary.status,
      title: "Archive assurance decision memo",
      workspaceId: input.workspaceId,
    }),
    entry({
      exportFileName: input.reviewerPackets.jsonFileName,
      generatedAt: input.generatedAt,
      kind: "reviewer-packets",
      recordCount: input.reviewerPackets.summary.packetCount,
      sourceHash: input.reviewerPackets.summary.reviewerPacketHash,
      sourceStatus: input.reviewerPackets.summary.status,
      title: "Archive assurance reviewer packets",
      workspaceId: input.workspaceId,
    }),
    entry({
      exportFileName: input.exceptionRenewals.jsonFileName,
      generatedAt: input.generatedAt,
      kind: "renewal-register",
      recordCount: input.exceptionRenewals.summary.rowCount,
      sourceHash: input.exceptionRenewals.summary.renewalHash,
      sourceStatus: input.exceptionRenewals.summary.status,
      title: "Archive assurance renewal register",
      workspaceId: input.workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.title.localeCompare(second.title),
  );
}

function createCsv(rows: BoardReleaseArchiveAssuranceNotarizationEntry[]) {
  const header = [
    "notarization_id",
    "kind",
    "title",
    "status",
    "source_status",
    "record_count",
    "export_file_name",
    "source_hash",
    "export_manifest_hash",
    "notarization_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.id,
      row.kind,
      row.title,
      row.status,
      row.sourceStatus,
      row.recordCount,
      row.exportFileName,
      row.sourceHash,
      row.exportManifestHash,
      row.notarizationHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveAssuranceNotarizationEntry[]): BoardReleaseArchiveAssuranceNotarizationRegisterReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const notarizedCount = rows.filter((row) => row.status === "notarized").length;
  const status = rows.reduce<BoardReleaseArchiveAssuranceNotarizationStatus>(
    (worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst),
    "notarized",
  );
  const nextRow = rows.find((row) => row.status !== "notarized") ?? rows[0] ?? null;

  return {
    blockedCount,
    nextAction: status === "notarized" ? "Archive assurance notarization register is sealed." : (nextRow?.nextAction ?? "Review archive assurance notarization register."),
    notarizedCount,
    notarizationHash: sha256(rows.map((row) => row.notarizationHash)),
    notarizationScore: rows.length > 0 ? Math.max(0, Math.round((notarizedCount / rows.length) * 100 - blockedCount * 16 - watchCount * 4)) : 100,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveAssuranceNotarizationEntry[];
  summary: BoardReleaseArchiveAssuranceNotarizationRegisterReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveAssuranceNotarizationRegister(
  input: CreateBoardReleaseArchiveAssuranceNotarizationRegisterInput,
): BoardReleaseArchiveAssuranceNotarizationRegisterReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.decisionMemo.workspaceId;
  const rows = createRows({
    ...input,
    generatedAt,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-assurance-notarization-register-${dateStamp(generatedAt)}`;

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
