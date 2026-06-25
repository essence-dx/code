import { createHash } from "node:crypto";

export type NativeArtifactSigningExecutionPlatform = "linux" | "macos" | "windows";
export type NativeArtifactSigningExecutionStatus = "blocked" | "ready" | "review";

export interface NativeArtifactSigningExecutionArtifactInput {
  artifactSha256: string | null;
  certificateFingerprint: string | null;
  fileName: string;
  platform: NativeArtifactSigningExecutionPlatform;
  signedAt: string | null;
  signerIdentity: string | null;
  timestampAuthority: string | null;
  timestampedAt: string | null;
  updaterSignature: string | null;
}

export interface NativeArtifactSigningExecutionReceiptRow {
  artifactId: string;
  artifactSha256: string;
  certificateFingerprint: string;
  fileName: string;
  nextAction: string;
  platform: NativeArtifactSigningExecutionPlatform;
  receiptHash: string;
  signedAt: string;
  signerIdentity: string;
  status: NativeArtifactSigningExecutionStatus;
  timestampAuthority: string;
  timestampedAt: string;
  updaterSignature: string;
}

export interface NativeArtifactSigningExecutionReceiptsReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: NativeArtifactSigningExecutionReceiptRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    receiptHash: string;
    receiptScore: number;
    reviewCount: number;
    rowCount: number;
    status: NativeArtifactSigningExecutionStatus;
  };
  workspaceId: string;
}

export interface CreateNativeArtifactSigningExecutionReceiptsInput {
  artifacts?: NativeArtifactSigningExecutionArtifactInput[];
  generatedAt?: string;
  workspaceId?: string;
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

function displayValue(value: string | null, missingLabel: string) {
  return value && value.trim().length > 0 ? value : missingLabel;
}

function statusForArtifact(input: NativeArtifactSigningExecutionArtifactInput): NativeArtifactSigningExecutionStatus {
  if (!input.artifactSha256 || !input.certificateFingerprint || !input.updaterSignature) {
    return "blocked";
  }

  if (!input.timestampAuthority || !input.timestampedAt || !input.signedAt || !input.signerIdentity) {
    return "review";
  }

  return "ready";
}

function nextActionFor(status: NativeArtifactSigningExecutionStatus) {
  if (status === "blocked") {
    return "Ingest signed native desktop artifacts with artifact hash, certificate fingerprint, timestamp evidence, and updater signature.";
  }

  if (status === "review") {
    return "Review native signing execution receipts for missing timestamp or signer evidence before release promotion.";
  }

  return "Keep native artifact signing execution receipts attached to release promotion evidence.";
}

function createMissingRow(workspaceId: string): NativeArtifactSigningExecutionReceiptRow {
  const status: NativeArtifactSigningExecutionStatus = "blocked";
  const nextAction = nextActionFor(status);
  const artifactId = `native-artifact-signing-execution:${slug(workspaceId)}:missing-artifact-receipts`;
  const row = {
    artifactId,
    artifactSha256: "missing",
    certificateFingerprint: "missing",
    fileName: "No signed native artifacts ingested",
    nextAction,
    platform: "windows",
    signedAt: "missing",
    signerIdentity: "missing",
    status,
    timestampAuthority: "missing",
    timestampedAt: "missing",
    updaterSignature: "missing",
  } satisfies Omit<NativeArtifactSigningExecutionReceiptRow, "receiptHash">;

  return {
    ...row,
    receiptHash: sha256(row),
  };
}

function createRow(input: NativeArtifactSigningExecutionArtifactInput, workspaceId: string): NativeArtifactSigningExecutionReceiptRow {
  const status = statusForArtifact(input);
  const nextAction = nextActionFor(status);
  const artifactId = `native-artifact-signing-execution:${slug(workspaceId)}:${slug(input.platform)}:${slug(input.fileName)}`;
  const row = {
    artifactId,
    artifactSha256: displayValue(input.artifactSha256, "missing"),
    certificateFingerprint: displayValue(input.certificateFingerprint, "missing"),
    fileName: input.fileName,
    nextAction,
    platform: input.platform,
    signedAt: displayValue(input.signedAt, "missing"),
    signerIdentity: displayValue(input.signerIdentity, "missing"),
    status,
    timestampAuthority: displayValue(input.timestampAuthority, "missing"),
    timestampedAt: displayValue(input.timestampedAt, "missing"),
    updaterSignature: displayValue(input.updaterSignature, "missing"),
  } satisfies Omit<NativeArtifactSigningExecutionReceiptRow, "receiptHash">;

  return {
    ...row,
    receiptHash: sha256(row),
  };
}

function summarize(rows: NativeArtifactSigningExecutionReceiptRow[]): NativeArtifactSigningExecutionReceiptsReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeArtifactSigningExecutionStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const receiptScore = Math.max(0, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 35 - blockedCount * 20));

  return {
    blockedCount,
    nextAction:
      status === "blocked"
        ? "Ingest signed native desktop artifacts before release promotion."
        : status === "review"
          ? "Review native signing execution receipts before release promotion."
          : "Native artifact signing execution receipts are ready.",
    readyCount,
    receiptHash: sha256(rows.map((row) => row.receiptHash)),
    receiptScore,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeArtifactSigningExecutionReceiptRow[]) {
  const header = [
    "artifact_id",
    "platform",
    "file_name",
    "status",
    "artifact_sha256",
    "certificate_fingerprint",
    "timestamp_authority",
    "updater_signature",
    "receipt_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.artifactId,
      row.platform,
      row.fileName,
      row.status,
      row.artifactSha256,
      row.certificateFingerprint,
      row.timestampAuthority,
      row.updaterSignature,
      row.receiptHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: NativeArtifactSigningExecutionReceiptRow[];
  summary: NativeArtifactSigningExecutionReceiptsReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createNativeArtifactSigningExecutionReceipts(
  input: CreateNativeArtifactSigningExecutionReceiptsInput = {},
): NativeArtifactSigningExecutionReceiptsReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const artifacts = input.artifacts ?? [];
  const rows = artifacts.length > 0 ? artifacts.map((artifact) => createRow(artifact, workspaceId)) : [createMissingRow(workspaceId)];
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-native-artifact-signing-execution-receipts-${dateStamp(generatedAt)}`;

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
