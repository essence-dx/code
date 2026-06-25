import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type NativeSignedArtifactIntakeQueueStatus = "blocked" | "ready" | "review";
export type NativeSignedArtifactIntakeQueueFileFormat = "csv" | "json";
export type NativeSignedArtifactRevocationStatus = "clear" | "revoked" | "unknown";

export interface NativeSignedArtifactIntakeArtifactInput {
  artifactSha256: string;
  fileName: string;
  platform: NativeArtifactStorageHandoffPlatform;
  receivedAt: string;
  revocationCheckedAt: string;
  revocationStatus: NativeSignedArtifactRevocationStatus;
  signerIdentity: string;
  signerKeyFingerprint: string;
  timestampAuthority: string;
  timestampedAt: string;
  uploadOwner: string;
}

export interface NativeSignedArtifactIntakeQueueRow {
  artifactSha256: string;
  checksumReady: boolean;
  fileName: string;
  intakeHash: string;
  nextAction: string;
  ownerReady: boolean;
  platform: NativeArtifactStorageHandoffPlatform;
  receivedAt: string;
  receivedReady: boolean;
  revocationCheckedAt: string;
  revocationReady: boolean;
  revocationStatus: NativeSignedArtifactRevocationStatus;
  signerIdentity: string;
  signerKeyFingerprint: string;
  signerReady: boolean;
  status: NativeSignedArtifactIntakeQueueStatus;
  timestampAuthority: string;
  timestampReady: boolean;
  timestampedAt: string;
  uploadOwner: string;
}

export interface NativeSignedArtifactIntakeQueueFile {
  download: string;
  format: NativeSignedArtifactIntakeQueueFileFormat;
  href: string;
  label: string;
}

export interface NativeSignedArtifactIntakeQueueReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeSignedArtifactIntakeQueueFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeSignedArtifactIntakeQueueRow[];
  summary: {
    blockedCount: number;
    checksumReadyCount: number;
    intakeHash: string;
    intakeScore: number;
    nextAction: string;
    readyCount: number;
    revocationClearCount: number;
    reviewCount: number;
    rowCount: number;
    signerReadyCount: number;
    status: NativeSignedArtifactIntakeQueueStatus;
    timestampReadyCount: number;
  };
  workspaceId: string;
}

export interface CreateNativeSignedArtifactIntakeQueueInput {
  artifacts: NativeSignedArtifactIntakeArtifactInput[];
  generatedAt?: string;
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

function validDate(value: string) {
  const date = new Date(value.trim());

  return value.trim().length > 0 && !Number.isNaN(date.getTime());
}

function hasFingerprint(value: string) {
  return value.trim().toLowerCase().startsWith("sha256:");
}

function missingArtifact(platform: NativeArtifactStorageHandoffPlatform): NativeSignedArtifactIntakeArtifactInput {
  return {
    artifactSha256: "",
    fileName: "",
    platform,
    receivedAt: "",
    revocationCheckedAt: "",
    revocationStatus: "unknown",
    signerIdentity: "",
    signerKeyFingerprint: "",
    timestampAuthority: "",
    timestampedAt: "",
    uploadOwner: "",
  };
}

function statusFor(input: {
  checksumReady: boolean;
  ownerReady: boolean;
  receivedReady: boolean;
  revocationReady: boolean;
  signerReady: boolean;
  timestampReady: boolean;
}): NativeSignedArtifactIntakeQueueStatus {
  if (!input.checksumReady || !input.ownerReady || !input.receivedReady || !input.revocationReady || !input.signerReady || !input.timestampReady) {
    return "blocked";
  }

  return "ready";
}

function nextActionFor(row: Pick<NativeSignedArtifactIntakeQueueRow, "checksumReady" | "ownerReady" | "platform" | "receivedReady" | "revocationReady" | "signerReady" | "status" | "timestampReady">) {
  if (row.status === "blocked") {
    return `Resolve blocked native signed artifact intake queue for ${row.platform}.`;
  }

  if (!row.checksumReady) {
    return `Attach signed native artifact checksum evidence for ${row.platform}.`;
  }

  if (!row.signerReady) {
    return `Attach signer identity and fingerprint evidence for ${row.platform}.`;
  }

  if (!row.timestampReady) {
    return `Attach timestamp authority evidence for ${row.platform}.`;
  }

  if (!row.revocationReady) {
    return `Attach clear revocation evidence for ${row.platform}.`;
  }

  if (!row.ownerReady) {
    return `Assign native signed artifact intake owner for ${row.platform}.`;
  }

  if (!row.receivedReady) {
    return `Record native signed artifact receipt time for ${row.platform}.`;
  }

  return `Native signed artifact intake evidence is ready for ${row.platform}.`;
}

function createRow(input: NativeSignedArtifactIntakeArtifactInput): NativeSignedArtifactIntakeQueueRow {
  const artifactSha256 = input.artifactSha256.trim() || "missing";
  const fileName = input.fileName.trim() || `No ${input.platform} signed artifact uploaded`;
  const receivedAt = input.receivedAt.trim();
  const revocationCheckedAt = input.revocationCheckedAt.trim();
  const signerIdentity = input.signerIdentity.trim();
  const signerKeyFingerprint = input.signerKeyFingerprint.trim();
  const timestampAuthority = input.timestampAuthority.trim();
  const timestampedAt = input.timestampedAt.trim();
  const uploadOwner = input.uploadOwner.trim();
  const rowWithoutStatus = {
    artifactSha256,
    checksumReady: hasSha256(artifactSha256),
    fileName,
    nextAction: "",
    ownerReady: uploadOwner.length > 0,
    platform: input.platform,
    receivedAt,
    receivedReady: validDate(receivedAt),
    revocationCheckedAt,
    revocationReady: input.revocationStatus === "clear" && validDate(revocationCheckedAt),
    revocationStatus: input.revocationStatus,
    signerIdentity,
    signerKeyFingerprint,
    signerReady: signerIdentity.length > 0 && hasFingerprint(signerKeyFingerprint),
    status: "blocked",
    timestampAuthority,
    timestampReady: timestampAuthority.length > 0 && validDate(timestampedAt),
    timestampedAt,
    uploadOwner,
  } satisfies Omit<NativeSignedArtifactIntakeQueueRow, "intakeHash">;
  const status = statusFor(rowWithoutStatus);
  const row = {
    ...rowWithoutStatus,
    nextAction: nextActionFor({ ...rowWithoutStatus, status }),
    status,
  };

  return {
    ...row,
    intakeHash: sha256(row),
  };
}

function createRows(input: CreateNativeSignedArtifactIntakeQueueInput) {
  const artifactsByPlatform = new Map(input.artifacts.map((artifact) => [artifact.platform, artifact]));
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) => createRow(artifactsByPlatform.get(platform) ?? missingArtifact(platform)))
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function summarize(rows: NativeSignedArtifactIntakeQueueRow[]): NativeSignedArtifactIntakeQueueReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const checksumReadyCount = rows.filter((row) => row.checksumReady).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const revocationClearCount = rows.filter((row) => row.revocationReady).length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const signerReadyCount = rows.filter((row) => row.signerReady).length;
  const status: NativeSignedArtifactIntakeQueueStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const timestampReadyCount = rows.filter((row) => row.timestampReady).length;

  return {
    blockedCount,
    checksumReadyCount,
    intakeHash: sha256(rows.map((row) => row.intakeHash)),
    intakeScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
    nextAction:
      status === "blocked"
        ? "Resolve blocked native signed artifact intake queue before fulfillment release."
        : status === "review"
          ? "Review native signed artifact intake queue before fulfillment release."
          : "Native signed artifact intake queue is ready for fulfillment release.",
    readyCount,
    revocationClearCount,
    reviewCount,
    rowCount: rows.length,
    signerReadyCount,
    status,
    timestampReadyCount,
  };
}

function createCsv(rows: NativeSignedArtifactIntakeQueueRow[]) {
  const header = ["platform", "status", "file_name", "checksum_ready", "signer_ready", "timestamp_ready", "revocation_ready", "intake_hash", "next_action"];
  const body = rows.map((row) =>
    [row.platform, row.status, row.fileName, row.checksumReady, row.signerReady, row.timestampReady, row.revocationReady, row.intakeHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: { csvDataUri: string; csvFileName: string; jsonDataUri: string; jsonFileName: string }): NativeSignedArtifactIntakeQueueFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV intake",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON intake",
    },
  ];
}

export function createNativeSignedArtifactIntakeQueue(input: CreateNativeSignedArtifactIntakeQueueInput): NativeSignedArtifactIntakeQueueReport {
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
  const fileBase = `${slug(workspaceId)}-native-signed-artifact-intake-queue-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({ csvDataUri, csvFileName, jsonDataUri, jsonFileName }),
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
