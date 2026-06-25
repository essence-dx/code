import { createHash } from "node:crypto";
import type { BoardReleaseCloseoutArchiveManifestReport } from "@/features/projects/board-release-closeout-archive-manifests";
import type {
  BoardReleaseCloseoutExecutivePacketDecision,
  BoardReleaseCloseoutExecutivePacketReport,
  BoardReleaseCloseoutExecutivePacketSection,
  BoardReleaseCloseoutExecutivePacketSectionKind,
} from "@/features/projects/board-release-closeout-executive-packet";
import type { BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";
import type { BoardReleaseCloseoutVarianceRemediationReport } from "@/features/projects/board-release-closeout-variance-remediation";

export type BoardReleaseArchiveIntelligenceIndexOutcome = "approved" | "deferred" | "held";

export interface BoardReleaseArchiveIntelligenceIndexRow {
  archiveBundleHash: string;
  correlationHash: string;
  executivePacketHash: string;
  finalDecisionHash: string;
  finalDecisionOutcome: BoardReleaseArchiveIntelligenceIndexOutcome;
  indexId: string;
  indexKind: BoardReleaseCloseoutExecutivePacketSectionKind;
  nextAction: string;
  remediationHash: string;
  score: number;
  sectionHash: string;
  sourceEvidenceHash: string;
  status: BoardReleaseCloseoutReadinessGateStatus;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseArchiveIntelligenceIndexReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveIntelligenceIndexRow[];
  summary: {
    approvedCount: number;
    blockedCount: number;
    deferredCount: number;
    heldCount: number;
    indexCount: number;
    intelligenceHash: string;
    nextAction: string;
    readyCount: number;
    status: BoardReleaseCloseoutReadinessGateStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveIntelligenceIndexReportInput {
  archiveManifests: BoardReleaseCloseoutArchiveManifestReport;
  executivePacket: BoardReleaseCloseoutExecutivePacketReport;
  generatedAt?: string;
  remediation: BoardReleaseCloseoutVarianceRemediationReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseCloseoutReadinessGateStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const indexKindRank: Record<BoardReleaseCloseoutExecutivePacketSectionKind, number> = {
  readiness: 0,
  acknowledgements: 1,
  archive: 2,
  remediation: 3,
  decision: 4,
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

function outcome(decision: BoardReleaseCloseoutExecutivePacketDecision): BoardReleaseArchiveIntelligenceIndexOutcome {
  if (decision === "approve") {
    return "approved";
  }

  return decision === "defer" ? "deferred" : "held";
}

function indexId(input: {
  generatedAt: string;
  sectionKind: BoardReleaseCloseoutExecutivePacketSectionKind;
  workspaceId: string;
}) {
  return `board-release-archive-intelligence-index:${slug(input.workspaceId)}:${input.sectionKind}:${dateStamp(input.generatedAt)}`;
}

function createRow(input: {
  archiveBundleHash: string;
  executivePacket: BoardReleaseCloseoutExecutivePacketReport;
  generatedAt: string;
  remediationHash: string;
  section: BoardReleaseCloseoutExecutivePacketSection;
  workspaceId: string;
}): BoardReleaseArchiveIntelligenceIndexRow {
  const id = indexId({
    generatedAt: input.generatedAt,
    sectionKind: input.section.sectionKind,
    workspaceId: input.workspaceId,
  });
  const finalDecisionOutcome = outcome(input.executivePacket.summary.decision);
  const correlationHash = sha256({
    archiveBundleHash: input.archiveBundleHash,
    executivePacketHash: input.executivePacket.summary.packetHash,
    finalDecisionHash: input.executivePacket.summary.finalDecisionHash,
    finalDecisionOutcome,
    id,
    remediationHash: input.remediationHash,
    sectionHash: input.section.sectionHash,
    sourceEvidenceHash: input.section.evidenceHash,
  });

  return {
    archiveBundleHash: input.archiveBundleHash,
    correlationHash,
    executivePacketHash: input.executivePacket.summary.packetHash,
    finalDecisionHash: input.executivePacket.summary.finalDecisionHash,
    finalDecisionOutcome,
    indexId: id,
    indexKind: input.section.sectionKind,
    nextAction: input.section.nextAction,
    remediationHash: input.remediationHash,
    score: input.section.score,
    sectionHash: input.section.sectionHash,
    sourceEvidenceHash: input.section.evidenceHash,
    status: input.section.status,
    title: input.section.title,
    workspaceId: input.workspaceId,
  };
}

function createRows(input: CreateBoardReleaseArchiveIntelligenceIndexReportInput & { generatedAt: string; workspaceId: string }) {
  return input.executivePacket.sections
    .map((section) =>
      createRow({
        archiveBundleHash: input.archiveManifests.summary.bundleHash,
        executivePacket: input.executivePacket,
        generatedAt: input.generatedAt,
        remediationHash: input.remediation.summary.remediationHash,
        section,
        workspaceId: input.workspaceId,
      }),
    )
    .sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] || indexKindRank[first.indexKind] - indexKindRank[second.indexKind],
    );
}

function summarize(rows: BoardReleaseArchiveIntelligenceIndexRow[]): BoardReleaseArchiveIntelligenceIndexReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const firstAttention = rows.find((row) => row.status === "blocked" || row.status === "watch") ?? null;

  return {
    approvedCount: rows.filter((row) => row.finalDecisionOutcome === "approved").length,
    blockedCount,
    deferredCount: rows.filter((row) => row.finalDecisionOutcome === "deferred").length,
    heldCount: rows.filter((row) => row.finalDecisionOutcome === "held").length,
    indexCount: rows.length,
    intelligenceHash: sha256(rows.map((row) => row.correlationHash)),
    nextAction: firstAttention?.nextAction ?? "Archive intelligence index is ready for anomaly review and trend digest generation.",
    readyCount: rows.filter((row) => row.status === "ready").length,
    status: blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready",
    watchCount,
  };
}

function createCsv(rows: BoardReleaseArchiveIntelligenceIndexRow[]) {
  const header = [
    "index_id",
    "index_kind",
    "title",
    "status",
    "score",
    "final_decision_outcome",
    "executive_packet_hash",
    "final_decision_hash",
    "archive_bundle_hash",
    "remediation_hash",
    "section_hash",
    "source_evidence_hash",
    "correlation_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.indexId,
      row.indexKind,
      row.title,
      row.status,
      row.score,
      row.finalDecisionOutcome,
      row.executivePacketHash,
      row.finalDecisionHash,
      row.archiveBundleHash,
      row.remediationHash,
      row.sectionHash,
      row.sourceEvidenceHash,
      row.correlationHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveIntelligenceIndexRow[];
  summary: BoardReleaseArchiveIntelligenceIndexReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      rows: input.rows,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseArchiveIntelligenceIndexReport(
  input: CreateBoardReleaseArchiveIntelligenceIndexReportInput,
): BoardReleaseArchiveIntelligenceIndexReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.executivePacket.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-intelligence-index-${dateStamp(generatedAt)}`;

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
