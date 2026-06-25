import { createHash } from "node:crypto";

export type CertificateBackedNativeArtifactPlatform = "linux" | "macos" | "windows";
export type CertificateBackedNativeArtifactRevocationStatus = "revoked" | "unknown" | "valid";
export type CertificateBackedNativeArtifactStatus = "blocked" | "ready" | "review";

export interface CertificateBackedNativeArtifactInput {
  artifactSha256: string | null;
  certificateFingerprint: string | null;
  fileName: string;
  platform: CertificateBackedNativeArtifactPlatform;
  revocationStatus: CertificateBackedNativeArtifactRevocationStatus;
  signedAt: string | null;
  signerIdentity: string | null;
  timestampAuthority: string | null;
  timestampedAt: string | null;
  uploadedAt: string | null;
  uploader: string | null;
}

export interface CertificateBackedNativeArtifactIngestionRow {
  artifactSha256: string;
  certificateFingerprint: string;
  fileName: string;
  ingestionHash: string;
  ingestionId: string;
  nextAction: string;
  platform: CertificateBackedNativeArtifactPlatform;
  revocationStatus: CertificateBackedNativeArtifactRevocationStatus | "missing";
  signedAt: string;
  signerIdentity: string;
  status: CertificateBackedNativeArtifactStatus;
  timestampAuthority: string;
  timestampedAt: string;
  uploadedAt: string;
  uploader: string;
}

export interface CertificateBackedNativeArtifactIngestionReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: CertificateBackedNativeArtifactIngestionRow[];
  summary: {
    blockedCount: number;
    ingestionHash: string;
    ingestionScore: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: CertificateBackedNativeArtifactStatus;
  };
  workspaceId: string;
}

export interface CreateCertificateBackedNativeArtifactIngestionInput {
  artifacts?: CertificateBackedNativeArtifactInput[];
  generatedAt?: string;
  requiredPlatforms?: CertificateBackedNativeArtifactPlatform[];
  workspaceId?: string;
}

const defaultRequiredPlatforms: CertificateBackedNativeArtifactPlatform[] = ["windows", "macos", "linux"];
const platformRank: Record<CertificateBackedNativeArtifactPlatform, number> = {
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

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
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

function displayValue(value: string | null, missingLabel = "missing") {
  return value && value.trim().length > 0 ? value : missingLabel;
}

function statusForArtifact(input: CertificateBackedNativeArtifactInput): CertificateBackedNativeArtifactStatus {
  if (!input.artifactSha256 || !input.certificateFingerprint || input.revocationStatus === "revoked") {
    return "blocked";
  }

  if (!input.timestampAuthority || !input.timestampedAt || !input.signedAt || !input.signerIdentity || !input.uploadedAt || input.revocationStatus === "unknown") {
    return "review";
  }

  return "ready";
}

function nextActionFor(input: {
  platform: CertificateBackedNativeArtifactPlatform;
  revocationStatus: CertificateBackedNativeArtifactRevocationStatus | "missing";
  status: CertificateBackedNativeArtifactStatus;
}) {
  if (input.revocationStatus === "revoked") {
    return `Replace revoked certificate evidence for ${input.platform} before commercial release proof.`;
  }

  if (input.status === "blocked") {
    return `Upload certificate-backed native artifacts for ${input.platform} with artifact hash, certificate fingerprint, timestamp evidence, and signer identity.`;
  }

  if (input.status === "review") {
    return `Review certificate-backed native artifact ingestion for ${input.platform}; timestamp, signer, upload, or revocation evidence is incomplete.`;
  }

  return `Keep certificate-backed native artifact ingestion current for ${input.platform}.`;
}

function createMissingRow(workspaceId: string, platform: CertificateBackedNativeArtifactPlatform): CertificateBackedNativeArtifactIngestionRow {
  const status: CertificateBackedNativeArtifactStatus = "blocked";
  const row = {
    artifactSha256: "missing",
    certificateFingerprint: "missing",
    fileName: `No ${platform} native artifact uploaded`,
    ingestionId: `certificate-backed-native-artifact-ingestion:${slug(workspaceId)}:${platform}:missing`,
    nextAction: nextActionFor({
      platform,
      revocationStatus: "missing",
      status,
    }),
    platform,
    revocationStatus: "missing",
    signedAt: "missing",
    signerIdentity: "missing",
    status,
    timestampAuthority: "missing",
    timestampedAt: "missing",
    uploadedAt: "missing",
    uploader: "missing",
  } satisfies Omit<CertificateBackedNativeArtifactIngestionRow, "ingestionHash">;

  return {
    ...row,
    ingestionHash: sha256(row),
  };
}

function createRow(input: CertificateBackedNativeArtifactInput, workspaceId: string): CertificateBackedNativeArtifactIngestionRow {
  const status = statusForArtifact(input);
  const row = {
    artifactSha256: displayValue(input.artifactSha256),
    certificateFingerprint: displayValue(input.certificateFingerprint),
    fileName: input.fileName,
    ingestionId: `certificate-backed-native-artifact-ingestion:${slug(workspaceId)}:${input.platform}:${slug(input.fileName)}`,
    nextAction: nextActionFor({
      platform: input.platform,
      revocationStatus: input.revocationStatus,
      status,
    }),
    platform: input.platform,
    revocationStatus: input.revocationStatus,
    signedAt: displayValue(input.signedAt),
    signerIdentity: displayValue(input.signerIdentity),
    status,
    timestampAuthority: displayValue(input.timestampAuthority),
    timestampedAt: displayValue(input.timestampedAt),
    uploadedAt: displayValue(input.uploadedAt),
    uploader: displayValue(input.uploader),
  } satisfies Omit<CertificateBackedNativeArtifactIngestionRow, "ingestionHash">;

  return {
    ...row,
    ingestionHash: sha256(row),
  };
}

function createRows(input: {
  artifacts: CertificateBackedNativeArtifactInput[];
  requiredPlatforms: CertificateBackedNativeArtifactPlatform[];
  workspaceId: string;
}) {
  const rows = input.requiredPlatforms.map((platform) => {
    const artifact = input.artifacts.find((candidate) => candidate.platform === platform);

    return artifact ? createRow(artifact, input.workspaceId) : createMissingRow(input.workspaceId, platform);
  });

  const extraRows = input.artifacts
    .filter((artifact) => !input.requiredPlatforms.includes(artifact.platform))
    .map((artifact) => createRow(artifact, input.workspaceId));

  return [...rows, ...extraRows].sort((first, second) => platformRank[first.platform] - platformRank[second.platform] || first.fileName.localeCompare(second.fileName));
}

function summarize(rows: CertificateBackedNativeArtifactIngestionRow[]): CertificateBackedNativeArtifactIngestionReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: CertificateBackedNativeArtifactStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const ingestionScore = Math.max(0, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18));

  return {
    blockedCount,
    ingestionHash: sha256(rows.map((row) => row.ingestionHash)),
    ingestionScore,
    nextAction:
      status === "blocked"
        ? "Upload certificate-backed native artifacts before claiming commercial native package proof."
        : status === "review"
          ? "Review certificate-backed native artifact ingestion before commercial native package proof."
          : "Certificate-backed native artifact ingestion is ready.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: CertificateBackedNativeArtifactIngestionRow[]) {
  const header = [
    "ingestion_id",
    "platform",
    "file_name",
    "status",
    "artifact_sha256",
    "certificate_fingerprint",
    "revocation_status",
    "timestamp_authority",
    "ingestion_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.ingestionId,
      row.platform,
      row.fileName,
      row.status,
      row.artifactSha256,
      row.certificateFingerprint,
      row.revocationStatus,
      row.timestampAuthority,
      row.ingestionHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: CertificateBackedNativeArtifactIngestionRow[];
  summary: CertificateBackedNativeArtifactIngestionReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createCertificateBackedNativeArtifactIngestion(
  input: CreateCertificateBackedNativeArtifactIngestionInput = {},
): CertificateBackedNativeArtifactIngestionReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows({
    artifacts: input.artifacts ?? [],
    requiredPlatforms: input.requiredPlatforms ?? defaultRequiredPlatforms,
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
  const fileBase = `${slug(workspaceId)}-certificate-backed-native-artifact-ingestion-${dateStamp(generatedAt)}`;

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
