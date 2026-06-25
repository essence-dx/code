import { createHash } from "node:crypto";

import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type SignedArtifactCustodyLedgerStatus = "blocked" | "ready" | "review";
export type SignedArtifactCustodyLedgerFileFormat = "csv" | "json";

export interface SignedArtifactCustodyInput {
  readonly artifactSha256?: string;
  readonly certificateCustodyOwner?: string;
  readonly certificateEvidenceUrl?: string;
  readonly checksumRenewalAt?: string;
  readonly checksumRenewalHash?: string;
  readonly platform: NativeArtifactStorageHandoffPlatform;
  readonly retentionExpiresAt?: string;
  readonly storageOwner?: string;
  readonly storageUrl?: string;
}

export interface SignedArtifactCustodyLedgerInput {
  readonly artifacts: readonly SignedArtifactCustodyInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredPlatforms?: readonly NativeArtifactStorageHandoffPlatform[];
  readonly workspaceId?: string;
}

export interface SignedArtifactCustodyLedgerRow
  extends Required<SignedArtifactCustodyInput> {
  readonly certificateCustodyReady: boolean;
  readonly checksumRenewalReady: boolean;
  readonly ledgerHash: string;
  readonly nextAction: string;
  readonly retentionReady: boolean;
  readonly status: SignedArtifactCustodyLedgerStatus;
  readonly storageOwnerReady: boolean;
}

export interface SignedArtifactCustodyLedgerFile {
  readonly download: string;
  readonly format: SignedArtifactCustodyLedgerFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface SignedArtifactCustodyLedger {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: SignedArtifactCustodyLedgerFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: SignedArtifactCustodyLedgerRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly certificateCustodyReadyCount: number;
    readonly checksumRenewalReadyCount: number;
    readonly custodyScore: number;
    readonly ledgerHash: string;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly retentionReadyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: SignedArtifactCustodyLedgerStatus;
    readonly storageOwnerReadyCount: number;
  };
  readonly workspaceId: string;
}

const defaultRequiredPlatforms: readonly NativeArtifactStorageHandoffPlatform[] =
  ["windows", "macos", "linux"];

const platformRank: Record<NativeArtifactStorageHandoffPlatform, number> = {
  windows: 0,
  macos: 1,
  linux: 2,
};

export function createSignedArtifactCustodyLedger(
  input: SignedArtifactCustodyLedgerInput,
): SignedArtifactCustodyLedger {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const artifactsByPlatform = new Map(
    input.artifacts.map((artifact) => [artifact.platform, artifact]),
  );
  const rows = [...(input.requiredPlatforms ?? defaultRequiredPlatforms)]
    .sort((first, second) => platformRank[first] - platformRank[second])
    .map((platform) =>
      createRow(artifactsByPlatform.get(platform) ?? missingArtifact(platform)),
    );
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
  const baseFileName = `${slug(workspaceId)}-signed-artifact-custody-ledger-${slug(
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
        label: "Signed artifact custody ledger CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Signed artifact custody ledger JSON",
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

function missingArtifact(
  platform: NativeArtifactStorageHandoffPlatform,
): Required<SignedArtifactCustodyInput> {
  return {
    artifactSha256: "",
    certificateCustodyOwner: "",
    certificateEvidenceUrl: "",
    checksumRenewalAt: "",
    checksumRenewalHash: "",
    platform,
    retentionExpiresAt: "",
    storageOwner: "",
    storageUrl: "",
  };
}

function createRow(
  input: SignedArtifactCustodyInput,
): SignedArtifactCustodyLedgerRow {
  const rowInput: Required<SignedArtifactCustodyInput> = {
    artifactSha256: input.artifactSha256?.trim() ?? "",
    certificateCustodyOwner: input.certificateCustodyOwner?.trim() ?? "",
    certificateEvidenceUrl: input.certificateEvidenceUrl?.trim() ?? "",
    checksumRenewalAt: input.checksumRenewalAt?.trim() ?? "",
    checksumRenewalHash: input.checksumRenewalHash?.trim() ?? "",
    platform: input.platform,
    retentionExpiresAt: input.retentionExpiresAt?.trim() ?? "",
    storageOwner: input.storageOwner?.trim() ?? "",
    storageUrl: input.storageUrl?.trim() ?? "",
  };
  const storageOwnerReady =
    rowInput.storageOwner.length > 0 &&
    rowInput.storageUrl.startsWith("https://") &&
    hasSha256(rowInput.artifactSha256);
  const retentionReady =
    Number.isFinite(Date.parse(rowInput.retentionExpiresAt)) &&
    new Date(rowInput.retentionExpiresAt).getTime() > Date.now();
  const checksumRenewalReady =
    hasSha256(rowInput.checksumRenewalHash) &&
    Number.isFinite(Date.parse(rowInput.checksumRenewalAt));
  const certificateCustodyReady =
    rowInput.certificateCustodyOwner.length > 0 &&
    rowInput.certificateEvidenceUrl.startsWith("https://");
  const status: SignedArtifactCustodyLedgerStatus =
    storageOwnerReady &&
    retentionReady &&
    checksumRenewalReady &&
    certificateCustodyReady
      ? "ready"
      : "blocked";
  const rowWithoutHash = {
    ...rowInput,
    certificateCustodyReady,
    checksumRenewalReady,
    nextAction:
      status === "ready"
        ? `Signed artifact custody is ready for ${rowInput.platform}.`
        : `Resolve blocked signed artifact custody ledger for ${rowInput.platform}.`,
    retentionReady,
    status,
    storageOwnerReady,
  };

  return {
    ...rowWithoutHash,
    ledgerHash: sha256(rowWithoutHash),
  };
}

function summarize(
  rows: readonly SignedArtifactCustodyLedgerRow[],
): SignedArtifactCustodyLedger["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const storageOwnerReadyCount = rows.filter(
    (row) => row.storageOwnerReady,
  ).length;
  const retentionReadyCount = rows.filter((row) => row.retentionReady).length;
  const checksumRenewalReadyCount = rows.filter(
    (row) => row.checksumRenewalReady,
  ).length;
  const certificateCustodyReadyCount = rows.filter(
    (row) => row.certificateCustodyReady,
  ).length;
  const readySignals =
    storageOwnerReadyCount +
    retentionReadyCount +
    checksumRenewalReadyCount +
    certificateCustodyReadyCount;
  const status: SignedArtifactCustodyLedgerStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    certificateCustodyReadyCount,
    checksumRenewalReadyCount,
    custodyScore: Math.round((readySignals / (rows.length * 4)) * 100),
    ledgerHash: sha256(rows.map((row) => row.ledgerHash)),
    nextAction:
      status === "ready"
        ? "Signed artifact custody ledger is ready for release evidence continuity."
        : "Resolve blocked signed artifact custody ledger before release evidence continuity approval.",
    readyCount,
    retentionReadyCount,
    reviewCount,
    rowCount: rows.length,
    status,
    storageOwnerReadyCount,
  };
}

function createCsv(rows: readonly SignedArtifactCustodyLedgerRow[]) {
  const header = [
    "platform",
    "status",
    "storage_owner_ready",
    "retention_ready",
    "checksum_renewal_ready",
    "certificate_custody_ready",
    "ledger_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.platform,
    row.status,
    String(row.storageOwnerReady),
    String(row.retentionReady),
    String(row.checksumRenewalReady),
    String(row.certificateCustodyReady),
    row.ledgerHash,
    row.nextAction,
  ]);

  return [header, ...records].map(csvRow).join("\n");
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
