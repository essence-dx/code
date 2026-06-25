import { createHash } from "node:crypto";

export type NativeArtifactExecutionReceiptPlatform = "linux" | "macos" | "windows";
export type NativeArtifactExecutionReceiptStatus = "blocked" | "ready" | "review";
export type NativeArtifactExecutionReceiptFileFormat = "csv" | "json";

export interface NativeArtifactExecutionReceiptInput {
  artifactSha256: string | null;
  certificateFingerprint: string | null;
  fileName: string;
  manifestArtifactSha256: string | null;
  manifestFileName: string;
  platform: NativeArtifactExecutionReceiptPlatform;
  releaseChannel: string | null;
  requiredCertificateFingerprint: string | null;
  requiredReleaseChannel: string | null;
  updaterSignature: string | null;
}

export interface NativeArtifactExecutionReceiptValidationRow {
  artifactSha256: string;
  certificateFingerprint: string;
  certificateMatchesExpectation: boolean;
  channelMatchesExpectation: boolean;
  fileName: string;
  manifestArtifactSha256: string;
  manifestFileName: string;
  manifestMatchesArtifact: boolean;
  nextAction: string;
  platform: NativeArtifactExecutionReceiptPlatform;
  receiptId: string;
  releaseChannel: string;
  requiredCertificateFingerprint: string;
  requiredReleaseChannel: string;
  status: NativeArtifactExecutionReceiptStatus;
  updaterSignature: string;
  validationHash: string;
}

export interface NativeArtifactExecutionReceiptValidatorFile {
  download: string;
  format: NativeArtifactExecutionReceiptFileFormat;
  href: string;
  label: string;
}

export interface NativeArtifactExecutionReceiptValidatorReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeArtifactExecutionReceiptValidatorFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: NativeArtifactExecutionReceiptValidationRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeArtifactExecutionReceiptStatus;
    validationHash: string;
    validationScore: number;
  };
  workspaceId: string;
}

export interface CreateNativeArtifactExecutionReceiptValidatorInput {
  generatedAt?: string;
  receipts?: NativeArtifactExecutionReceiptInput[];
  requiredPlatforms?: NativeArtifactExecutionReceiptPlatform[];
  workspaceId?: string;
}

const defaultRequiredPlatforms: NativeArtifactExecutionReceiptPlatform[] = ["windows", "macos", "linux"];

const platformRank: Record<NativeArtifactExecutionReceiptPlatform, number> = {
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

function csvCell(value: string | number | boolean) {
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

function displayValue(value: string | null, fallback = "missing") {
  return value?.trim() || fallback;
}

function sameValue(left: string | null, right: string | null) {
  return Boolean(left?.trim() && right?.trim() && left.trim().toLowerCase() === right.trim().toLowerCase());
}

function statusFor(input: {
  artifactSha256: string | null;
  certificateFingerprint: string | null;
  certificateMatchesExpectation: boolean;
  channelMatchesExpectation: boolean;
  manifestArtifactSha256: string | null;
  manifestMatchesArtifact: boolean;
  releaseChannel: string | null;
  requiredCertificateFingerprint: string | null;
  requiredReleaseChannel: string | null;
  updaterSignature: string | null;
}) {
  if (!input.artifactSha256 || !input.manifestArtifactSha256 || !input.updaterSignature || !input.manifestMatchesArtifact) {
    return "blocked";
  }

  if (!input.certificateFingerprint || !input.requiredCertificateFingerprint || !input.certificateMatchesExpectation) {
    return "blocked";
  }

  if (!input.releaseChannel || !input.requiredReleaseChannel || !input.channelMatchesExpectation) {
    return "blocked";
  }

  return "ready";
}

function nextActionFor(status: NativeArtifactExecutionReceiptStatus, platform: NativeArtifactExecutionReceiptPlatform) {
  if (status === "blocked") {
    return `Resolve blocked native artifact execution receipts for ${platform}: manifest hash, certificate fingerprint, release channel, and updater signature must match.`;
  }

  if (status === "review") {
    return `Review native artifact execution receipts for ${platform} before release-channel promotion.`;
  }

  return `Keep native artifact execution receipt validation current for ${platform}.`;
}

function missingRow(workspaceId: string, platform: NativeArtifactExecutionReceiptPlatform): NativeArtifactExecutionReceiptValidationRow {
  const status: NativeArtifactExecutionReceiptStatus = "blocked";
  const row = {
    artifactSha256: "missing",
    certificateFingerprint: "missing",
    certificateMatchesExpectation: false,
    channelMatchesExpectation: false,
    fileName: `No ${platform} artifact receipt uploaded`,
    manifestArtifactSha256: "missing",
    manifestFileName: "missing",
    manifestMatchesArtifact: false,
    nextAction: nextActionFor(status, platform),
    platform,
    receiptId: `native-artifact-execution-receipt-validator:${slug(workspaceId)}:${platform}:missing`,
    releaseChannel: "missing",
    requiredCertificateFingerprint: "missing",
    requiredReleaseChannel: "missing",
    status,
    updaterSignature: "missing",
  } satisfies Omit<NativeArtifactExecutionReceiptValidationRow, "validationHash">;

  return {
    ...row,
    validationHash: sha256(row),
  };
}

function receiptRow(input: NativeArtifactExecutionReceiptInput, workspaceId: string): NativeArtifactExecutionReceiptValidationRow {
  const manifestMatchesArtifact = sameValue(input.artifactSha256, input.manifestArtifactSha256);
  const certificateMatchesExpectation = sameValue(input.certificateFingerprint, input.requiredCertificateFingerprint);
  const channelMatchesExpectation = sameValue(input.releaseChannel, input.requiredReleaseChannel);
  const status = statusFor({
    artifactSha256: input.artifactSha256,
    certificateFingerprint: input.certificateFingerprint,
    certificateMatchesExpectation,
    channelMatchesExpectation,
    manifestArtifactSha256: input.manifestArtifactSha256,
    manifestMatchesArtifact,
    releaseChannel: input.releaseChannel,
    requiredCertificateFingerprint: input.requiredCertificateFingerprint,
    requiredReleaseChannel: input.requiredReleaseChannel,
    updaterSignature: input.updaterSignature,
  });
  const row = {
    artifactSha256: displayValue(input.artifactSha256),
    certificateFingerprint: displayValue(input.certificateFingerprint),
    certificateMatchesExpectation,
    channelMatchesExpectation,
    fileName: input.fileName,
    manifestArtifactSha256: displayValue(input.manifestArtifactSha256),
    manifestFileName: input.manifestFileName,
    manifestMatchesArtifact,
    nextAction: nextActionFor(status, input.platform),
    platform: input.platform,
    receiptId: `native-artifact-execution-receipt-validator:${slug(workspaceId)}:${input.platform}:${slug(input.fileName)}`,
    releaseChannel: displayValue(input.releaseChannel),
    requiredCertificateFingerprint: displayValue(input.requiredCertificateFingerprint),
    requiredReleaseChannel: displayValue(input.requiredReleaseChannel),
    status,
    updaterSignature: displayValue(input.updaterSignature),
  } satisfies Omit<NativeArtifactExecutionReceiptValidationRow, "validationHash">;

  return {
    ...row,
    validationHash: sha256(row),
  };
}

function createRows(input: {
  receipts: NativeArtifactExecutionReceiptInput[];
  requiredPlatforms: NativeArtifactExecutionReceiptPlatform[];
  workspaceId: string;
}) {
  const rows = input.requiredPlatforms.map((platform) => {
    const receipt = input.receipts.find((candidate) => candidate.platform === platform);

    return receipt ? receiptRow(receipt, input.workspaceId) : missingRow(input.workspaceId, platform);
  });
  const extraRows = input.receipts
    .filter((receipt) => !input.requiredPlatforms.includes(receipt.platform))
    .map((receipt) => receiptRow(receipt, input.workspaceId));

  return [...rows, ...extraRows].sort((first, second) => platformRank[first.platform] - platformRank[second.platform] || first.fileName.localeCompare(second.fileName));
}

function summarize(rows: NativeArtifactExecutionReceiptValidationRow[]): NativeArtifactExecutionReceiptValidatorReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeArtifactExecutionReceiptStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native artifact execution receipts before release-channel promotion."
        : status === "review"
          ? "Review native artifact execution receipts before release-channel promotion."
          : "Native artifact execution receipt validation is ready.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
    validationHash: sha256(rows.map((row) => row.validationHash)),
    validationScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
  };
}

function createCsv(rows: NativeArtifactExecutionReceiptValidationRow[]) {
  const header = [
    "receipt_id",
    "platform",
    "file_name",
    "status",
    "manifest_matches_artifact",
    "certificate_matches_expectation",
    "channel_matches_expectation",
    "validation_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.receiptId,
      row.platform,
      row.fileName,
      row.status,
      row.manifestMatchesArtifact,
      row.certificateMatchesExpectation,
      row.channelMatchesExpectation,
      row.validationHash,
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
}): NativeArtifactExecutionReceiptValidatorFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV receipts",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON receipts",
    },
  ];
}

export function createNativeArtifactExecutionReceiptValidator(
  input: CreateNativeArtifactExecutionReceiptValidatorInput = {},
): NativeArtifactExecutionReceiptValidatorReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows({
    receipts: input.receipts ?? [],
    requiredPlatforms: input.requiredPlatforms ?? defaultRequiredPlatforms,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-native-artifact-execution-receipt-validator-${dateStamp(generatedAt)}`;
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
    rows,
    summary,
    workspaceId,
  };
}
