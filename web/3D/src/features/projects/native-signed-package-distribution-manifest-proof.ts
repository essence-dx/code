import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type NativeSignedPackageDistributionManifestProofStatus = "blocked" | "ready" | "review";
export type NativeSignedPackageDistributionManifestProofFileFormat = "csv" | "json";

export interface NativeSignedPackageDistributionManifestInput {
  artifactFileName: string;
  artifactSha256: string;
  artifactUrl: string;
  attestationSha256: string;
  checksumAttested: boolean;
  manifestSha256: string;
  manifestUrl: string;
  platform: NativeArtifactStorageHandoffPlatform;
  releaseChannel: string;
  updaterManifestReferencesArtifact: boolean;
}

export interface NativeSignedPackageDistributionManifestRow {
  artifactFileName: string;
  artifactHosted: boolean;
  artifactSha256: string;
  artifactUrl: string;
  attestationSha256: string;
  channelReady: boolean;
  checksumAttested: boolean;
  manifestLinked: boolean;
  manifestSha256: string;
  manifestUrl: string;
  nextAction: string;
  platform: NativeArtifactStorageHandoffPlatform;
  proofHash: string;
  releaseChannel: string;
  status: NativeSignedPackageDistributionManifestProofStatus;
  updaterManifestReferencesArtifact: boolean;
}

export interface NativeSignedPackageDistributionManifestProofFile {
  download: string;
  format: NativeSignedPackageDistributionManifestProofFileFormat;
  href: string;
  label: string;
}

export interface NativeSignedPackageDistributionManifestProof {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeSignedPackageDistributionManifestProofFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  requiredReleaseChannel: string;
  rows: NativeSignedPackageDistributionManifestRow[];
  summary: {
    blockedCount: number;
    channelMismatchCount: number;
    nextAction: string;
    proofHash: string;
    proofScore: number;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeSignedPackageDistributionManifestProofStatus;
  };
  workspaceId: string;
}

export interface CreateNativeSignedPackageDistributionManifestProofInput {
  generatedAt?: string;
  manifests: NativeSignedPackageDistributionManifestInput[];
  releaseCandidateId: string;
  requiredPlatforms?: NativeArtifactStorageHandoffPlatform[];
  requiredReleaseChannel: string;
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

function missingManifest(platform: NativeArtifactStorageHandoffPlatform): NativeSignedPackageDistributionManifestInput {
  return {
    artifactFileName: `${platform}-artifact-missing`,
    artifactSha256: "",
    artifactUrl: "",
    attestationSha256: "",
    checksumAttested: false,
    manifestSha256: "",
    manifestUrl: "",
    platform,
    releaseChannel: "missing",
    updaterManifestReferencesArtifact: false,
  };
}

function statusFor(input: {
  artifactHosted: boolean;
  channelReady: boolean;
  checksumAttested: boolean;
  manifestLinked: boolean;
}): NativeSignedPackageDistributionManifestProofStatus {
  if (!input.artifactHosted || !input.manifestLinked || !input.checksumAttested) {
    return "blocked";
  }

  if (!input.channelReady) {
    return "review";
  }

  return "ready";
}

function nextActionFor(row: Pick<NativeSignedPackageDistributionManifestRow, "artifactHosted" | "channelReady" | "checksumAttested" | "manifestLinked" | "platform" | "status">) {
  if (row.status === "blocked") {
    return `Resolve blocked native signed package distribution manifest proof for ${row.platform}.`;
  }

  if (!row.channelReady) {
    return `Move ${row.platform} distribution manifest proof to the required release channel.`;
  }

  if (!row.artifactHosted) {
    return `Attach hosted signed package artifact proof for ${row.platform}.`;
  }

  if (!row.manifestLinked) {
    return `Attach updater manifest linkage proof for ${row.platform}.`;
  }

  if (!row.checksumAttested) {
    return `Attach checksum attestation proof for ${row.platform}.`;
  }

  return `Keep native signed package distribution manifest proof current for ${row.platform}.`;
}

function createRow(input: NativeSignedPackageDistributionManifestInput, requiredReleaseChannel: string): NativeSignedPackageDistributionManifestRow {
  const artifactSha256 = input.artifactSha256.trim() || "missing";
  const artifactUrl = input.artifactUrl.trim();
  const manifestSha256 = input.manifestSha256.trim() || "missing";
  const manifestUrl = input.manifestUrl.trim();
  const attestationSha256 = input.attestationSha256.trim() || "missing";
  const releaseChannel = input.releaseChannel.trim() || "missing";
  const artifactHosted = hasSha256(artifactSha256) && artifactUrl.length > 0;
  const manifestLinked = input.updaterManifestReferencesArtifact && hasSha256(manifestSha256) && manifestUrl.length > 0;
  const checksumAttested = input.checksumAttested && hasSha256(attestationSha256);
  const channelReady = releaseChannel === requiredReleaseChannel;
  const status = statusFor({
    artifactHosted,
    channelReady,
    checksumAttested,
    manifestLinked,
  });
  const rowWithoutHash = {
    artifactFileName: input.artifactFileName.trim() || `${input.platform}-artifact`,
    artifactHosted,
    artifactSha256,
    artifactUrl,
    attestationSha256,
    channelReady,
    checksumAttested,
    manifestLinked,
    manifestSha256,
    manifestUrl,
    nextAction: "",
    platform: input.platform,
    releaseChannel,
    status,
    updaterManifestReferencesArtifact: input.updaterManifestReferencesArtifact,
  } satisfies Omit<NativeSignedPackageDistributionManifestRow, "proofHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    proofHash: sha256(row),
  };
}

function createRows(input: CreateNativeSignedPackageDistributionManifestProofInput) {
  const manifestByPlatform = new Map(input.manifests.map((manifest) => [manifest.platform, manifest]));
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) => createRow(manifestByPlatform.get(platform) ?? missingManifest(platform), input.requiredReleaseChannel))
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function summarize(rows: NativeSignedPackageDistributionManifestRow[]): NativeSignedPackageDistributionManifestProof["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const channelMismatchCount = rows.filter((row) => row.releaseChannel !== "missing" && !row.channelReady).length;
  const status: NativeSignedPackageDistributionManifestProofStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    channelMismatchCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native signed package distribution manifest proof before distribution release."
        : status === "review"
          ? "Review native signed package distribution manifest proof before distribution release."
          : "Native signed package distribution manifest proof is ready for distribution release.",
    proofHash: sha256(rows.map((row) => row.proofHash)),
    proofScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18 - channelMismatchCount * 8))),
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeSignedPackageDistributionManifestRow[]) {
  const header = ["platform", "status", "release_channel", "artifact_hosted", "manifest_linked", "checksum_attested", "channel_ready", "proof_hash", "next_action"];
  const body = rows.map((row) =>
    [row.platform, row.status, row.releaseChannel, row.artifactHosted, row.manifestLinked, row.checksumAttested, row.channelReady, row.proofHash, row.nextAction]
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
}): NativeSignedPackageDistributionManifestProofFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV manifest",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON manifest",
    },
  ];
}

export function createNativeSignedPackageDistributionManifestProof(
  input: CreateNativeSignedPackageDistributionManifestProofInput,
): NativeSignedPackageDistributionManifestProof {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      requiredReleaseChannel: input.requiredReleaseChannel,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-native-signed-package-distribution-manifest-proof-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
    requiredReleaseChannel: input.requiredReleaseChannel,
    rows,
    summary,
    workspaceId,
  };
}
