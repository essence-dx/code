import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type NativeUpdaterDownloadRehearsalEvidenceStatus = "blocked" | "ready" | "review";
export type NativeUpdaterDownloadRehearsalEvidenceFileFormat = "csv" | "json";

export interface NativeUpdaterDownloadRehearsalInput {
  artifactSha256: string;
  byteRangeResumeVerified: boolean;
  checksumVerified: boolean;
  downloadUrl: string;
  expiredLinkHandled: boolean;
  finalByteCount: number;
  manifestSha256: string;
  platform: NativeArtifactStorageHandoffPlatform;
  rehearsalId: string;
  resumedFromByte: number;
}

export interface NativeUpdaterDownloadRehearsalRow {
  artifactSha256: string;
  byteCountReady: boolean;
  byteRangeResumeVerified: boolean;
  checksumVerified: boolean;
  downloadUrl: string;
  expiredLinkHandled: boolean;
  finalByteCount: number;
  manifestSha256: string;
  nextAction: string;
  platform: NativeArtifactStorageHandoffPlatform;
  rehearsalHash: string;
  rehearsalId: string;
  resumedFromByte: number;
  status: NativeUpdaterDownloadRehearsalEvidenceStatus;
}

export interface NativeUpdaterDownloadRehearsalEvidenceFile {
  download: string;
  format: NativeUpdaterDownloadRehearsalEvidenceFileFormat;
  href: string;
  label: string;
}

export interface NativeUpdaterDownloadRehearsalEvidenceReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeUpdaterDownloadRehearsalEvidenceFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeUpdaterDownloadRehearsalRow[];
  summary: {
    blockedCount: number;
    expiredLinkHandledCount: number;
    nextAction: string;
    readyCount: number;
    rehearsalHash: string;
    rehearsalScore: number;
    reviewCount: number;
    rowCount: number;
    status: NativeUpdaterDownloadRehearsalEvidenceStatus;
  };
  workspaceId: string;
}

export interface CreateNativeUpdaterDownloadRehearsalEvidenceInput {
  generatedAt?: string;
  rehearsals: NativeUpdaterDownloadRehearsalInput[];
  releaseCandidateId: string;
  requiredPlatforms?: NativeArtifactStorageHandoffPlatform[];
  workspaceId?: string;
}

const defaultRequiredPlatforms: NativeArtifactStorageHandoffPlatform[] = ["windows", "macos", "linux"];
const platformRank: Record<NativeArtifactStorageHandoffPlatform, number> = {
  windows: 0,
  macos: 1,
  linux: 2,
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

function csvCell(value: boolean | number | string) {
  return `"${String(value).replaceAll('"', '""')}"`;
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

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:");
}

function missingRehearsal(platform: NativeArtifactStorageHandoffPlatform): NativeUpdaterDownloadRehearsalInput {
  return {
    artifactSha256: "",
    byteRangeResumeVerified: false,
    checksumVerified: false,
    downloadUrl: "",
    expiredLinkHandled: false,
    finalByteCount: 0,
    manifestSha256: "",
    platform,
    rehearsalId: `${platform}-updater-download-missing`,
    resumedFromByte: 0,
  };
}

function statusFor(input: {
  byteCountReady: boolean;
  byteRangeResumeVerified: boolean;
  checksumVerified: boolean;
  downloadUrlReady: boolean;
  expiredLinkHandled: boolean;
}) {
  if (!input.checksumVerified || !input.downloadUrlReady || !input.byteCountReady) {
    return "blocked";
  }

  if (!input.byteRangeResumeVerified || !input.expiredLinkHandled) {
    return "review";
  }

  return "ready";
}

function nextActionFor(row: Pick<NativeUpdaterDownloadRehearsalRow, "byteCountReady" | "byteRangeResumeVerified" | "checksumVerified" | "downloadUrl" | "expiredLinkHandled" | "platform" | "status">) {
  if (row.status === "blocked") {
    return `Resolve blocked native updater download rehearsal evidence for ${row.platform}.`;
  }

  if (!row.byteRangeResumeVerified) {
    return `Rehearse byte-range resume for native updater download on ${row.platform}.`;
  }

  if (!row.expiredLinkHandled) {
    return `Rehearse expired-link handling for native updater download on ${row.platform}.`;
  }

  if (!row.checksumVerified) {
    return `Attach checksum verification for native updater download on ${row.platform}.`;
  }

  if (!row.byteCountReady) {
    return `Attach final byte-count evidence for native updater download on ${row.platform}.`;
  }

  if (!row.downloadUrl) {
    return `Attach native updater download URL evidence for ${row.platform}.`;
  }

  return `Keep native updater download rehearsal evidence current for ${row.platform}.`;
}

function createRow(input: NativeUpdaterDownloadRehearsalInput): NativeUpdaterDownloadRehearsalRow {
  const artifactSha256 = input.artifactSha256.trim() || "missing";
  const manifestSha256 = input.manifestSha256.trim() || "missing";
  const downloadUrl = input.downloadUrl.trim();
  const byteCountReady = input.finalByteCount > 0 && input.resumedFromByte > 0 && input.resumedFromByte < input.finalByteCount;
  const checksumVerified = input.checksumVerified && hasSha256(artifactSha256) && hasSha256(manifestSha256);
  const status = statusFor({
    byteCountReady,
    byteRangeResumeVerified: input.byteRangeResumeVerified,
    checksumVerified,
    downloadUrlReady: downloadUrl.length > 0,
    expiredLinkHandled: input.expiredLinkHandled,
  });
  const rowWithoutHash = {
    artifactSha256,
    byteCountReady,
    byteRangeResumeVerified: input.byteRangeResumeVerified,
    checksumVerified,
    downloadUrl,
    expiredLinkHandled: input.expiredLinkHandled,
    finalByteCount: input.finalByteCount,
    manifestSha256,
    nextAction: "",
    platform: input.platform,
    rehearsalId: input.rehearsalId.trim() || `${input.platform}-updater-download`,
    resumedFromByte: input.resumedFromByte,
    status,
  } satisfies Omit<NativeUpdaterDownloadRehearsalRow, "rehearsalHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    rehearsalHash: sha256(row),
  };
}

function createRows(input: CreateNativeUpdaterDownloadRehearsalEvidenceInput) {
  const rehearsalByPlatform = new Map(input.rehearsals.map((rehearsal) => [rehearsal.platform, rehearsal]));
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) => createRow(rehearsalByPlatform.get(platform) ?? missingRehearsal(platform)))
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function summarize(rows: NativeUpdaterDownloadRehearsalRow[]): NativeUpdaterDownloadRehearsalEvidenceReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const expiredLinkHandledCount = rows.filter((row) => row.expiredLinkHandled).length;
  const status: NativeUpdaterDownloadRehearsalEvidenceStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    expiredLinkHandledCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native updater download rehearsal evidence before distribution release."
        : status === "review"
          ? "Review native updater download rehearsal evidence before distribution release."
          : "Native updater download rehearsal evidence is ready for distribution release.",
    readyCount,
    rehearsalHash: sha256(rows.map((row) => row.rehearsalHash)),
    rehearsalScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeUpdaterDownloadRehearsalRow[]) {
  const header = ["platform", "status", "byte_range_resume_verified", "checksum_verified", "expired_link_handled", "byte_count_ready", "rehearsal_hash", "next_action"];
  const body = rows.map((row) =>
    [row.platform, row.status, row.byteRangeResumeVerified, row.checksumVerified, row.expiredLinkHandled, row.byteCountReady, row.rehearsalHash, row.nextAction]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): NativeUpdaterDownloadRehearsalEvidenceFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV rehearsal",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON rehearsal",
    },
  ];
}

export function createNativeUpdaterDownloadRehearsalEvidence(input: CreateNativeUpdaterDownloadRehearsalEvidenceInput): NativeUpdaterDownloadRehearsalEvidenceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
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
  const fileBase = `${slug(workspaceId)}-native-updater-download-rehearsal-evidence-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({
      csvDataUri,
      csvFileName,
      jsonDataUri,
      jsonFileName,
    }),
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
