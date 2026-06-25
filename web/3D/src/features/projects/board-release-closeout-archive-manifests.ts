import { createHash } from "node:crypto";
import type { BoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";
import type { BoardReleaseCloseoutOwnerAcknowledgementReport } from "@/features/projects/board-release-closeout-owner-acknowledgements";
import type { BoardReleaseCloseoutReadinessGateReport, BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";
import type { BoardReleaseDistributionReadinessDashboardReport } from "@/features/projects/board-release-distribution-readiness-dashboard";
import type { BoardReleaseObservabilityExecutiveDigestReport } from "@/features/projects/board-release-observability-executive-digest";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";

export type BoardReleaseCloseoutArchiveManifestKind = "distribution" | "evidence" | "observability" | "operations";

export interface BoardReleaseCloseoutArchiveManifest {
  csvFileName: string;
  evidenceHash: string;
  jsonFileName: string;
  manifestHash: string;
  manifestId: string;
  manifestKind: BoardReleaseCloseoutArchiveManifestKind;
  nextAction: string;
  recordCount: number;
  sourceStatus: string;
  status: BoardReleaseCloseoutReadinessGateStatus;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseCloseoutArchiveManifestReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  manifests: BoardReleaseCloseoutArchiveManifest[];
  summary: {
    blockedCount: number;
    bundleHash: string;
    evidenceHash: string;
    manifestCount: number;
    nextAction: string;
    ownerAcknowledgementHash: string;
    readinessGateHash: string;
    readyCount: number;
    status: BoardReleaseCloseoutReadinessGateStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseCloseoutArchiveManifestReportInput {
  distributionReadiness: BoardReleaseDistributionReadinessDashboardReport;
  evidenceArchive: BoardEvidenceReleaseArchiveRecordReport;
  generatedAt?: string;
  observabilityDigest: BoardReleaseObservabilityExecutiveDigestReport;
  operationsExportPackets: BoardReleaseOperationsExportPacketReport;
  ownerAcknowledgements: BoardReleaseCloseoutOwnerAcknowledgementReport;
  readinessGates: BoardReleaseCloseoutReadinessGateReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseCloseoutReadinessGateStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const manifestKindRank: Record<BoardReleaseCloseoutArchiveManifestKind, number> = {
  observability: 0,
  distribution: 1,
  operations: 2,
  evidence: 3,
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

function manifestId(input: {
  generatedAt: string;
  manifestKind: BoardReleaseCloseoutArchiveManifestKind;
  workspaceId: string;
}) {
  return `board-release-closeout-archive:${slug(input.workspaceId)}:${input.manifestKind}:${dateStamp(input.generatedAt)}`;
}

function normalizeStatus(status: string): BoardReleaseCloseoutReadinessGateStatus {
  if (status === "blocked") {
    return "blocked";
  }

  return status === "watch" ? "watch" : "ready";
}

function immutableHash(input: { csvContent: string; jsonContent: string; summary: unknown }) {
  return sha256({
    csvContent: input.csvContent,
    jsonContent: input.jsonContent,
    summary: input.summary,
  });
}

function createManifest(input: {
  csvContent: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonFileName: string;
  manifestKind: BoardReleaseCloseoutArchiveManifestKind;
  nextAction: string;
  recordCount: number;
  sourceStatus: string;
  summary: unknown;
  title: string;
  workspaceId: string;
}): BoardReleaseCloseoutArchiveManifest {
  const status = normalizeStatus(input.sourceStatus);
  const evidenceHash = immutableHash(input);
  const id = manifestId({
    generatedAt: input.generatedAt,
    manifestKind: input.manifestKind,
    workspaceId: input.workspaceId,
  });
  const manifestHash = sha256({
    evidenceHash,
    id,
    manifestKind: input.manifestKind,
    recordCount: input.recordCount,
    sourceStatus: input.sourceStatus,
    workspaceId: input.workspaceId,
  });

  return {
    csvFileName: input.csvFileName,
    evidenceHash,
    jsonFileName: input.jsonFileName,
    manifestHash,
    manifestId: id,
    manifestKind: input.manifestKind,
    nextAction: input.nextAction,
    recordCount: input.recordCount,
    sourceStatus: input.sourceStatus,
    status,
    title: input.title,
    workspaceId: input.workspaceId,
  };
}

function createManifests(input: CreateBoardReleaseCloseoutArchiveManifestReportInput & { generatedAt: string; workspaceId: string }) {
  return [
    createManifest({
      csvContent: input.observabilityDigest.csvContent,
      csvFileName: input.observabilityDigest.csvFileName,
      generatedAt: input.generatedAt,
      jsonContent: input.observabilityDigest.jsonContent,
      jsonFileName: input.observabilityDigest.jsonFileName,
      manifestKind: "observability",
      nextAction: input.observabilityDigest.summary.nextAction,
      recordCount: input.observabilityDigest.rows.length,
      sourceStatus: input.observabilityDigest.summary.status,
      summary: input.observabilityDigest.summary,
      title: "Observability executive digest",
      workspaceId: input.workspaceId,
    }),
    createManifest({
      csvContent: input.distributionReadiness.csvContent,
      csvFileName: input.distributionReadiness.csvFileName,
      generatedAt: input.generatedAt,
      jsonContent: input.distributionReadiness.jsonContent,
      jsonFileName: input.distributionReadiness.jsonFileName,
      manifestKind: "distribution",
      nextAction: input.distributionReadiness.summary.nextAction,
      recordCount: input.distributionReadiness.filters.length,
      sourceStatus: input.distributionReadiness.summary.status,
      summary: input.distributionReadiness.summary,
      title: "Distribution readiness dashboard",
      workspaceId: input.workspaceId,
    }),
    createManifest({
      csvContent: input.operationsExportPackets.csvContent,
      csvFileName: input.operationsExportPackets.csvFileName,
      generatedAt: input.generatedAt,
      jsonContent: input.operationsExportPackets.jsonContent,
      jsonFileName: input.operationsExportPackets.jsonFileName,
      manifestKind: "operations",
      nextAction: input.operationsExportPackets.summary.nextAction,
      recordCount: input.operationsExportPackets.packets.length + input.operationsExportPackets.files.length,
      sourceStatus: input.operationsExportPackets.summary.status,
      summary: input.operationsExportPackets.summary,
      title: "Operations export packets",
      workspaceId: input.workspaceId,
    }),
    createManifest({
      csvContent: input.evidenceArchive.csvContent,
      csvFileName: input.evidenceArchive.csvFileName,
      generatedAt: input.generatedAt,
      jsonContent: input.evidenceArchive.jsonContent,
      jsonFileName: input.evidenceArchive.jsonFileName,
      manifestKind: "evidence",
      nextAction: input.evidenceArchive.summary.nextAction,
      recordCount: input.evidenceArchive.records.length,
      sourceStatus: input.evidenceArchive.summary.status,
      summary: input.evidenceArchive.summary,
      title: "Evidence archive records",
      workspaceId: input.workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      manifestKindRank[first.manifestKind] - manifestKindRank[second.manifestKind],
  );
}

function summarize(input: {
  manifests: BoardReleaseCloseoutArchiveManifest[];
  ownerAcknowledgements: BoardReleaseCloseoutOwnerAcknowledgementReport;
  readinessGates: BoardReleaseCloseoutReadinessGateReport;
}): BoardReleaseCloseoutArchiveManifestReport["summary"] {
  const blockedCount = input.manifests.filter((manifest) => manifest.status === "blocked").length;
  const watchCount = input.manifests.filter((manifest) => manifest.status === "watch").length;
  const firstAttention = input.manifests.find((manifest) => manifest.status === "blocked" || manifest.status === "watch") ?? null;
  const readinessGateHash = sha256(input.readinessGates.jsonContent);
  const ownerAcknowledgementHash = sha256(input.ownerAcknowledgements.jsonContent);
  const evidenceHash = sha256(input.manifests.map((manifest) => manifest.evidenceHash));
  const bundleHash = sha256({
    evidenceHash,
    manifests: input.manifests.map((manifest) => manifest.manifestHash),
    ownerAcknowledgementHash,
    readinessGateHash,
  });

  return {
    blockedCount,
    bundleHash,
    evidenceHash,
    manifestCount: input.manifests.length,
    nextAction: firstAttention?.nextAction ?? "Closeout archive manifests are sealed and ready for variance remediation planning.",
    ownerAcknowledgementHash,
    readinessGateHash,
    readyCount: input.manifests.filter((manifest) => manifest.status === "ready").length,
    status: blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready",
    watchCount,
  };
}

function createCsv(manifests: BoardReleaseCloseoutArchiveManifest[]) {
  const header = [
    "manifest_id",
    "manifest_kind",
    "title",
    "status",
    "source_status",
    "record_count",
    "csv_file_name",
    "json_file_name",
    "evidence_hash",
    "manifest_hash",
    "next_action",
  ];
  const body = manifests.map((manifest) =>
    [
      manifest.manifestId,
      manifest.manifestKind,
      manifest.title,
      manifest.status,
      manifest.sourceStatus,
      manifest.recordCount,
      manifest.csvFileName,
      manifest.jsonFileName,
      manifest.evidenceHash,
      manifest.manifestHash,
      manifest.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  manifests: BoardReleaseCloseoutArchiveManifest[];
  summary: BoardReleaseCloseoutArchiveManifestReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      manifests: input.manifests,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseCloseoutArchiveManifestReport(
  input: CreateBoardReleaseCloseoutArchiveManifestReportInput,
): BoardReleaseCloseoutArchiveManifestReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.readinessGates.workspaceId;
  const manifests = createManifests({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize({
    manifests,
    ownerAcknowledgements: input.ownerAcknowledgements,
    readinessGates: input.readinessGates,
  });
  const csvContent = createCsv(manifests);
  const jsonContent = createJson({
    generatedAt,
    manifests,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-closeout-archive-manifests-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    manifests,
    summary,
    workspaceId,
  };
}
