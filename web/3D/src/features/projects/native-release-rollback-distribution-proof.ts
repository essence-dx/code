import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type NativeReleaseRollbackDistributionProofStatus = "blocked" | "ready" | "review";
export type NativeReleaseRollbackDistributionProofFileFormat = "csv" | "json";

export interface NativeReleaseRollbackDistributionInput {
  channelRestoreCommand: string;
  channelRestoreEvidenceHash: string;
  operator: string;
  platform: NativeArtifactStorageHandoffPlatform;
  postRollbackUpdaterVerified: boolean;
  previousStableArtifactFileName: string;
  previousStableArtifactSha256: string;
  previousStableManifestSha256: string;
  rollbackWindowMinutes: number;
  updaterVerificationHash: string;
}

export interface NativeReleaseRollbackDistributionRow {
  channelRestoreCommand: string;
  channelRestoreCommandReady: boolean;
  channelRestoreEvidenceHash: string;
  nextAction: string;
  operator: string;
  platform: NativeArtifactStorageHandoffPlatform;
  postRollbackUpdaterVerified: boolean;
  previousStableArtifactFileName: string;
  previousStableArtifactLinked: boolean;
  previousStableArtifactSha256: string;
  previousStableManifestSha256: string;
  rollbackHash: string;
  rollbackWindowMinutes: number;
  status: NativeReleaseRollbackDistributionProofStatus;
  updaterVerificationAttached: boolean;
  updaterVerificationHash: string;
}

export interface NativeReleaseRollbackDistributionProofFile {
  download: string;
  format: NativeReleaseRollbackDistributionProofFileFormat;
  href: string;
  label: string;
}

export interface NativeReleaseRollbackDistributionProof {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeReleaseRollbackDistributionProofFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeReleaseRollbackDistributionRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    proofHash: string;
    proofScore: number;
    readyCount: number;
    restoreCommandCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeReleaseRollbackDistributionProofStatus;
  };
  workspaceId: string;
}

export interface CreateNativeReleaseRollbackDistributionProofInput {
  generatedAt?: string;
  releaseCandidateId: string;
  requiredPlatforms?: NativeArtifactStorageHandoffPlatform[];
  rollbacks: NativeReleaseRollbackDistributionInput[];
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

function missingRollback(platform: NativeArtifactStorageHandoffPlatform): NativeReleaseRollbackDistributionInput {
  return {
    channelRestoreCommand: "",
    channelRestoreEvidenceHash: "",
    operator: "",
    platform,
    postRollbackUpdaterVerified: false,
    previousStableArtifactFileName: "",
    previousStableArtifactSha256: "",
    previousStableManifestSha256: "",
    rollbackWindowMinutes: 0,
    updaterVerificationHash: "",
  };
}

function statusFor(input: {
  channelRestoreCommandReady: boolean;
  operatorReady: boolean;
  postRollbackUpdaterVerified: boolean;
  previousStableArtifactLinked: boolean;
  rollbackWindowMinutes: number;
}): NativeReleaseRollbackDistributionProofStatus {
  if (!input.previousStableArtifactLinked || !input.channelRestoreCommandReady || !input.postRollbackUpdaterVerified) {
    return "blocked";
  }

  if (!input.operatorReady || input.rollbackWindowMinutes > 30) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    NativeReleaseRollbackDistributionRow,
    | "channelRestoreCommandReady"
    | "operator"
    | "platform"
    | "postRollbackUpdaterVerified"
    | "previousStableArtifactLinked"
    | "rollbackWindowMinutes"
    | "status"
    | "updaterVerificationAttached"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native release rollback distribution proof for ${row.platform}.`;
  }

  if (!row.previousStableArtifactLinked) {
    return `Link previous stable native artifact and manifest hashes for ${row.platform}.`;
  }

  if (!row.channelRestoreCommandReady) {
    return `Attach channel restore command and evidence hash for ${row.platform}.`;
  }

  if (!row.updaterVerificationAttached || !row.postRollbackUpdaterVerified) {
    return `Attach post-rollback updater verification for ${row.platform}.`;
  }

  if (!row.operator.trim()) {
    return `Assign rollback operator ownership for ${row.platform}.`;
  }

  if (row.rollbackWindowMinutes > 30) {
    return `Review rollback window duration for ${row.platform}.`;
  }

  return `Keep native release rollback distribution proof current for ${row.platform}.`;
}

function createRow(input: NativeReleaseRollbackDistributionInput): NativeReleaseRollbackDistributionRow {
  const channelRestoreCommand = input.channelRestoreCommand.trim();
  const channelRestoreEvidenceHash = input.channelRestoreEvidenceHash.trim() || "missing";
  const previousStableArtifactFileName = input.previousStableArtifactFileName.trim();
  const previousStableArtifactSha256 = input.previousStableArtifactSha256.trim() || "missing";
  const previousStableManifestSha256 = input.previousStableManifestSha256.trim() || "missing";
  const updaterVerificationHash = input.updaterVerificationHash.trim() || "missing";
  const previousStableArtifactLinked =
    previousStableArtifactFileName.length > 0 && hasSha256(previousStableArtifactSha256) && hasSha256(previousStableManifestSha256);
  const channelRestoreCommandReady = channelRestoreCommand.length > 0 && hasSha256(channelRestoreEvidenceHash);
  const updaterVerificationAttached = hasSha256(updaterVerificationHash);
  const postRollbackUpdaterVerified = input.postRollbackUpdaterVerified && updaterVerificationAttached;
  const status = statusFor({
    channelRestoreCommandReady,
    operatorReady: input.operator.trim().length > 0,
    postRollbackUpdaterVerified,
    previousStableArtifactLinked,
    rollbackWindowMinutes: input.rollbackWindowMinutes,
  });
  const rowWithoutHash = {
    channelRestoreCommand,
    channelRestoreCommandReady,
    channelRestoreEvidenceHash,
    nextAction: "",
    operator: input.operator.trim(),
    platform: input.platform,
    postRollbackUpdaterVerified,
    previousStableArtifactFileName,
    previousStableArtifactLinked,
    previousStableArtifactSha256,
    previousStableManifestSha256,
    rollbackWindowMinutes: input.rollbackWindowMinutes,
    status,
    updaterVerificationAttached,
    updaterVerificationHash,
  } satisfies Omit<NativeReleaseRollbackDistributionRow, "rollbackHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    rollbackHash: sha256(row),
  };
}

function createRows(input: CreateNativeReleaseRollbackDistributionProofInput) {
  const rollbackByPlatform = new Map(input.rollbacks.map((rollback) => [rollback.platform, rollback]));
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) => createRow(rollbackByPlatform.get(platform) ?? missingRollback(platform)))
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function summarize(rows: NativeReleaseRollbackDistributionRow[]): NativeReleaseRollbackDistributionProof["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const restoreCommandCount = rows.filter((row) => row.channelRestoreCommandReady).length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeReleaseRollbackDistributionProofStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native release rollback distribution proof before distribution release."
        : status === "review"
          ? "Review native release rollback distribution proof before distribution release."
          : "Native release rollback distribution proof is ready for distribution release.",
    proofHash: sha256(rows.map((row) => row.rollbackHash)),
    proofScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
    readyCount,
    restoreCommandCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeReleaseRollbackDistributionRow[]) {
  const header = [
    "platform",
    "status",
    "previous_stable_artifact_linked",
    "channel_restore_command_ready",
    "post_rollback_updater_verified",
    "updater_verification_attached",
    "rollback_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.platform,
      row.status,
      row.previousStableArtifactLinked,
      row.channelRestoreCommandReady,
      row.postRollbackUpdaterVerified,
      row.updaterVerificationAttached,
      row.rollbackHash,
      row.nextAction,
    ]
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
}): NativeReleaseRollbackDistributionProofFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV proof",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON proof",
    },
  ];
}

export function createNativeReleaseRollbackDistributionProof(
  input: CreateNativeReleaseRollbackDistributionProofInput,
): NativeReleaseRollbackDistributionProof {
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
  const fileBase = `${slug(workspaceId)}-native-release-rollback-distribution-proof-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
