import { createHash } from "node:crypto";

export type NativeArtifactStorageAccessPolicy = "manual" | "private-signed-url" | "public-read";
export type NativeArtifactStorageHandoffFileFormat = "csv" | "json";
export type NativeArtifactStorageHandoffPlatform = "linux" | "macos" | "windows";
export type NativeArtifactStorageHandoffProvider = "manual" | "s3-compatible" | "vercel-blob";
export type NativeArtifactStorageHandoffStatus = "blocked" | "ready" | "review";

export interface NativeArtifactStorageHandoffArtifact {
  accessPolicy: NativeArtifactStorageAccessPolicy;
  artifactFileName: string;
  artifactSha256: string;
  manifestReferencesArtifact: boolean;
  manifestSha256: string;
  manifestUrl: string;
  platform: NativeArtifactStorageHandoffPlatform;
  retentionDays: number;
  storageProvider: NativeArtifactStorageHandoffProvider;
  storageUrl: string;
  uploadedAt: null | string;
}

export interface NativeArtifactStorageHandoffRow {
  accessPolicy: NativeArtifactStorageAccessPolicy;
  artifactFileName: string;
  artifactSha256: string;
  checksumVerified: boolean;
  handoffHash: string;
  manifestSha256: string;
  manifestUrl: string;
  nextAction: string;
  platform: NativeArtifactStorageHandoffPlatform;
  retentionDays: number;
  retentionReady: boolean;
  status: NativeArtifactStorageHandoffStatus;
  storageProvider: NativeArtifactStorageHandoffProvider;
  storageUrl: string;
  uploadedAt: null | string;
  updaterManifestLinked: boolean;
}

export interface NativeArtifactStorageHandoffFile {
  download: string;
  format: NativeArtifactStorageHandoffFileFormat;
  href: string;
  label: string;
}

export interface NativeArtifactStorageHandoffEvidenceReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeArtifactStorageHandoffFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  provider: NativeArtifactStorageHandoffProvider;
  releaseCandidateId: string;
  rows: NativeArtifactStorageHandoffRow[];
  summary: {
    blockedCount: number;
    handoffHash: string;
    handoffScore: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeArtifactStorageHandoffStatus;
  };
  workspaceId: string;
}

export interface CreateNativeArtifactStorageHandoffEvidenceInput {
  artifacts: NativeArtifactStorageHandoffArtifact[];
  generatedAt?: string;
  provider: NativeArtifactStorageHandoffProvider;
  releaseCandidateId: string;
  requiredPlatforms?: NativeArtifactStorageHandoffPlatform[];
  workspaceId?: string;
}

const platformRank: Record<NativeArtifactStorageHandoffPlatform, number> = {
  windows: 0,
  macos: 1,
  linux: 2,
};

const defaultRequiredPlatforms: NativeArtifactStorageHandoffPlatform[] = ["windows", "macos", "linux"];

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

function csvCell(value: boolean | number | string | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
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

function missingArtifact(platform: NativeArtifactStorageHandoffPlatform): NativeArtifactStorageHandoffArtifact {
  return {
    accessPolicy: "manual",
    artifactFileName: `${platform}-artifact-missing`,
    artifactSha256: "",
    manifestReferencesArtifact: false,
    manifestSha256: "",
    manifestUrl: "",
    platform,
    retentionDays: 0,
    storageProvider: "manual",
    storageUrl: "",
    uploadedAt: null,
  };
}

function statusFor(input: {
  accessPolicy: NativeArtifactStorageAccessPolicy;
  checksumVerified: boolean;
  retentionReady: boolean;
  storageProvider: NativeArtifactStorageHandoffProvider;
  updaterManifestLinked: boolean;
}): NativeArtifactStorageHandoffStatus {
  if (!input.checksumVerified || !input.updaterManifestLinked) {
    return "blocked";
  }

  if (!input.retentionReady || input.accessPolicy === "manual" || input.storageProvider === "manual") {
    return "review";
  }

  return "ready";
}

function nextActionFor(row: Pick<NativeArtifactStorageHandoffRow, "checksumVerified" | "platform" | "retentionReady" | "status" | "updaterManifestLinked">) {
  if (row.status === "blocked") {
    return `Resolve blocked native artifact storage handoff evidence for ${row.platform}.`;
  }

  if (!row.retentionReady) {
    return `Increase native artifact retention evidence for ${row.platform}.`;
  }

  if (!row.checksumVerified) {
    return `Attach checksum and hosted package URL evidence for ${row.platform}.`;
  }

  if (!row.updaterManifestLinked) {
    return `Link updater manifest evidence to hosted package for ${row.platform}.`;
  }

  return `Keep native artifact storage handoff evidence current for ${row.platform}.`;
}

function createRow(artifact: NativeArtifactStorageHandoffArtifact): NativeArtifactStorageHandoffRow {
  const checksumVerified = artifact.artifactSha256.trim().startsWith("sha256:") && artifact.storageUrl.trim().length > 0;
  const retentionReady = artifact.retentionDays >= 30;
  const updaterManifestLinked = artifact.manifestReferencesArtifact && artifact.manifestSha256.trim().startsWith("sha256:") && artifact.manifestUrl.trim().length > 0;
  const status = statusFor({
    accessPolicy: artifact.accessPolicy,
    checksumVerified,
    retentionReady,
    storageProvider: artifact.storageProvider,
    updaterManifestLinked,
  });
  const rowWithoutHash = {
    accessPolicy: artifact.accessPolicy,
    artifactFileName: artifact.artifactFileName,
    artifactSha256: artifact.artifactSha256,
    checksumVerified,
    manifestSha256: artifact.manifestSha256,
    manifestUrl: artifact.manifestUrl,
    nextAction: "",
    platform: artifact.platform,
    retentionDays: artifact.retentionDays,
    retentionReady,
    status,
    storageProvider: artifact.storageProvider,
    storageUrl: artifact.storageUrl,
    uploadedAt: artifact.uploadedAt,
    updaterManifestLinked,
  } satisfies Omit<NativeArtifactStorageHandoffRow, "handoffHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    handoffHash: sha256(row),
  };
}

function createRows(input: CreateNativeArtifactStorageHandoffEvidenceInput) {
  const artifactsByPlatform = new Map(input.artifacts.map((artifact) => [artifact.platform, artifact]));
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) => createRow(artifactsByPlatform.get(platform) ?? missingArtifact(platform)))
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function summarize(rows: NativeArtifactStorageHandoffRow[]): NativeArtifactStorageHandoffEvidenceReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeArtifactStorageHandoffStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    handoffHash: sha256(rows.map((row) => row.handoffHash)),
    handoffScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
    nextAction:
      status === "blocked"
        ? "Resolve blocked native artifact storage handoff evidence before release-candidate fulfillment."
        : status === "review"
          ? "Review native artifact storage handoff evidence before release-candidate fulfillment."
          : "Native artifact storage handoff evidence is ready for release-candidate fulfillment.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeArtifactStorageHandoffRow[]) {
  const header = ["platform", "status", "artifact_file_name", "storage_provider", "checksum_verified", "retention_ready", "updater_manifest_linked", "handoff_hash", "next_action"];
  const body = rows.map((row) =>
    [
      row.platform,
      row.status,
      row.artifactFileName,
      row.storageProvider,
      row.checksumVerified,
      row.retentionReady,
      row.updaterManifestLinked,
      row.handoffHash,
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
}): NativeArtifactStorageHandoffFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV handoff",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON handoff",
    },
  ];
}

export function createNativeArtifactStorageHandoffEvidence(input: CreateNativeArtifactStorageHandoffEvidenceInput): NativeArtifactStorageHandoffEvidenceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      provider: input.provider,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-native-artifact-storage-handoff-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
    provider: input.provider,
    releaseCandidateId: input.releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}
