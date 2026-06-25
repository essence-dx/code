import { createHash } from "node:crypto";

import type { ExternalRuntimeRealityPacket } from "@/features/projects/external-runtime-reality-packet";
import type { NativeReleaseAttachmentApprovalPacket } from "@/features/projects/native-release-attachment-approval-packet";
import type { NativeReleaseCustodyApprovalPacket } from "@/features/projects/native-release-custody-approval-packet";
import type { NativeReleaseEvidenceDrillPacket } from "@/features/projects/native-release-evidence-drill-packet";

export type ReleaseContinuityEvidenceSource =
  | "attachment-approval"
  | "custody-approval"
  | "evidence-drill"
  | "external-runtime-reality";

export type ReleaseContinuityEvidenceIndexStatus =
  | "blocked"
  | "ready"
  | "review";

export type ReleaseContinuityEvidenceIndexFileFormat = "csv" | "json";

export interface ReleaseContinuityEvidenceIndexInput {
  readonly attachmentApproval?: NativeReleaseAttachmentApprovalPacket;
  readonly custodyApproval?: NativeReleaseCustodyApprovalPacket;
  readonly drillPacket?: NativeReleaseEvidenceDrillPacket;
  readonly externalReality?: ExternalRuntimeRealityPacket;
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly workspaceId?: string;
}

export interface ReleaseContinuityEvidenceIndexRow {
  readonly evidenceHash: string;
  readonly evidenceLinked: boolean;
  readonly indexHash: string;
  readonly nextAction: string;
  readonly packetFileNames: readonly string[];
  readonly score: number;
  readonly searchable: boolean;
  readonly searchText: string;
  readonly source: ReleaseContinuityEvidenceSource;
  readonly status: ReleaseContinuityEvidenceIndexStatus;
}

export interface ReleaseContinuityEvidenceIndexFile {
  readonly download: string;
  readonly format: ReleaseContinuityEvidenceIndexFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseContinuityEvidenceIndex {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseContinuityEvidenceIndexFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseContinuityEvidenceIndexRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly continuityScore: number;
    readonly indexHash: string;
    readonly missingEvidenceCount: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: ReleaseContinuityEvidenceIndexStatus;
  };
  readonly workspaceId: string;
}

const sourceRank: Record<ReleaseContinuityEvidenceSource, number> = {
  "custody-approval": 0,
  "attachment-approval": 1,
  "evidence-drill": 2,
  "external-runtime-reality": 3,
};

export function createReleaseContinuityEvidenceIndex(
  input: ReleaseContinuityEvidenceIndexInput,
): ReleaseContinuityEvidenceIndex {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const rows = [
    createCustodyApprovalRow(input),
    createAttachmentApprovalRow(input),
    createEvidenceDrillRow(input),
    createExternalRealityRow(input),
  ].sort((first, second) => sourceRank[first.source] - sourceRank[second.source]);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const baseFileName = `${slug(workspaceId)}-release-continuity-evidence-index-${slug(
    input.releaseCandidateId,
  )}-${dateStamp(generatedAt)}`;
  const csvFileName = `${baseFileName}.csv`;
  const jsonFileName = `${baseFileName}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: [
      {
        download: csvFileName,
        format: "csv",
        href: csvDataUri,
        label: "Release continuity evidence index CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release continuity evidence index JSON",
      },
    ],
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}

function createCustodyApprovalRow(
  input: ReleaseContinuityEvidenceIndexInput,
): ReleaseContinuityEvidenceIndexRow {
  const packet = input.custodyApproval;

  return createRow({
    evidenceHash: packet?.summary.custodyApprovalHash ?? "",
    fileNames: [packet?.csvFileName, packet?.jsonFileName],
    inputStatus: packet?.summary.status ?? "blocked",
    releaseCandidateId: input.releaseCandidateId,
    score: packet?.summary.approvalScore ?? 0,
    source: "custody-approval",
  });
}

function createAttachmentApprovalRow(
  input: ReleaseContinuityEvidenceIndexInput,
): ReleaseContinuityEvidenceIndexRow {
  const packet = input.attachmentApproval;

  return createRow({
    evidenceHash: packet?.summary.approvalHash ?? "",
    fileNames: [packet?.csvFileName, packet?.jsonFileName],
    inputStatus: packet?.summary.status ?? "blocked",
    releaseCandidateId: input.releaseCandidateId,
    score: packet?.summary.approvalScore ?? 0,
    source: "attachment-approval",
  });
}

function createEvidenceDrillRow(
  input: ReleaseContinuityEvidenceIndexInput,
): ReleaseContinuityEvidenceIndexRow {
  const packet = input.drillPacket;

  return createRow({
    evidenceHash: packet?.summary.packetHash ?? "",
    fileNames: [packet?.csvFileName, packet?.jsonFileName],
    inputStatus: packet?.summary.status ?? "blocked",
    releaseCandidateId: input.releaseCandidateId,
    score: packet?.summary.packetScore ?? 0,
    source: "evidence-drill",
  });
}

function createExternalRealityRow(
  input: ReleaseContinuityEvidenceIndexInput,
): ReleaseContinuityEvidenceIndexRow {
  const packet = input.externalReality;

  return createRow({
    evidenceHash: packet?.summary.packetHash ?? "",
    fileNames: [packet?.csvFileName, packet?.jsonFileName],
    inputStatus: packet?.summary.status ?? "blocked",
    releaseCandidateId: input.releaseCandidateId,
    score: packet?.summary.packetScore ?? 0,
    source: "external-runtime-reality",
  });
}

function createRow(input: {
  readonly evidenceHash: string;
  readonly fileNames: readonly (string | undefined)[];
  readonly inputStatus: ReleaseContinuityEvidenceIndexStatus;
  readonly releaseCandidateId: string;
  readonly score: number;
  readonly source: ReleaseContinuityEvidenceSource;
}): ReleaseContinuityEvidenceIndexRow {
  const evidenceHash = input.evidenceHash.trim();
  const packetFileNames = input.fileNames.filter(
    (fileName): fileName is string => Boolean(fileName?.trim()),
  );
  const evidenceLinked = hasSha256(evidenceHash);
  const searchable = evidenceLinked && packetFileNames.length > 0;
  const score = normalizeScore(input.score);
  const status = statusFor({
    evidenceLinked,
    inputStatus: input.inputStatus,
    score,
    searchable,
  });
  const searchText = [
    input.source,
    input.releaseCandidateId,
    evidenceHash.replace(/^sha256:/, ""),
    ...packetFileNames,
  ]
    .join(" ")
    .toLowerCase();
  const rowWithoutHash = {
    evidenceHash: evidenceHash || "missing",
    evidenceLinked,
    nextAction: "",
    packetFileNames,
    score,
    searchable,
    searchText,
    source: input.source,
    status,
  } satisfies Omit<ReleaseContinuityEvidenceIndexRow, "indexHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    indexHash: sha256(row),
  };
}

function statusFor(input: {
  readonly evidenceLinked: boolean;
  readonly inputStatus: ReleaseContinuityEvidenceIndexStatus;
  readonly score: number;
  readonly searchable: boolean;
}): ReleaseContinuityEvidenceIndexStatus {
  if (
    !input.evidenceLinked ||
    !input.searchable ||
    input.inputStatus === "blocked" ||
    input.score < 60
  ) {
    return "blocked";
  }

  if (input.inputStatus === "review" || input.score < 90) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Omit<ReleaseContinuityEvidenceIndexRow, "indexHash">,
) {
  if (row.status === "blocked") {
    return `Resolve blocked release continuity evidence index for ${row.source}.`;
  }

  if (!row.searchable) {
    return `Attach searchable release continuity evidence files for ${row.source}.`;
  }

  if (row.status === "review") {
    return `Review release continuity evidence index for ${row.source}.`;
  }

  return `Release continuity evidence index is searchable for ${row.source}.`;
}

function summarize(
  rows: readonly ReleaseContinuityEvidenceIndexRow[],
): ReleaseContinuityEvidenceIndex["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const missingEvidenceCount = rows.filter(
    (row) => !row.evidenceLinked || !row.searchable,
  ).length;
  const averageScore = Math.round(
    rows.reduce((total, row) => total + row.score, 0) / rows.length,
  );
  const status: ReleaseContinuityEvidenceIndexStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    continuityScore:
      status === "blocked" ? Math.min(averageScore, 60) : averageScore,
    indexHash: sha256(rows.map((row) => row.indexHash)),
    missingEvidenceCount,
    nextAction:
      status === "ready"
        ? "Release continuity evidence index is ready for regression monitoring."
        : "Resolve blocked release continuity evidence index before regression monitoring.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: readonly ReleaseContinuityEvidenceIndexRow[]) {
  const header = [
    "source",
    "status",
    "score",
    "evidence_linked",
    "searchable",
    "evidence_hash",
    "index_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.source,
    row.status,
    String(row.score),
    String(row.evidenceLinked),
    String(row.searchable),
    row.evidenceHash,
    row.indexHash,
    row.nextAction,
  ]);

  return [header, ...records].map(csvRow).join("\n");
}

function normalizeScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function csvRow(values: readonly string[]) {
  return values
    .map((value) => {
      const escaped = value.replaceAll('"', '""');

      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    })
    .join(",");
}

function hasSha256(value: string) {
  return value.startsWith("sha256:");
}

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
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value))
    .digest("hex")}`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
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

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}
