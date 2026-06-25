import { createHash } from "node:crypto";

import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type NativeReleaseEnforcementStatus = "blocked" | "ready" | "review";
export type NativeReleaseEnforcementFileFormat = "csv" | "json";
export type NativeReleaseEnforcementRevocationStatus =
  | "clear"
  | "revoked"
  | "unknown";

export interface NativeReleaseEnforcementArtifactInput {
  artifactName: string;
  certificateFingerprint: string;
  enforcementOwner: string;
  platform: NativeArtifactStorageHandoffPlatform;
  revocationCheckedAt: string;
  revocationStatus: NativeReleaseEnforcementRevocationStatus;
  signedPackageHash: string;
  timestampAuthority: string;
  timestampProofHash: string;
  timestampedAt: string;
}

export interface NativeReleaseEnforcementRow {
  artifactName: string;
  artifactNameReady: boolean;
  certificateFingerprint: string;
  certificateFingerprintReady: boolean;
  enforcementHash: string;
  enforcementOwner: string;
  nextAction: string;
  ownerReady: boolean;
  platform: NativeArtifactStorageHandoffPlatform;
  releaseBlockingReason: string;
  revocationCheckedAt: string;
  revocationReady: boolean;
  revocationStatus: NativeReleaseEnforcementRevocationStatus;
  signedPackageHash: string;
  signedPackageReady: boolean;
  status: NativeReleaseEnforcementStatus;
  timestampAuthority: string;
  timestampAuthorityReady: boolean;
  timestampProofHash: string;
  timestampedAt: string;
}

export interface NativeReleaseEnforcementFile {
  download: string;
  format: NativeReleaseEnforcementFileFormat;
  href: string;
  label: string;
}

export interface NativeReleaseEnforcementLedger {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeReleaseEnforcementFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeReleaseEnforcementRow[];
  summary: {
    blockedCount: number;
    certificateFingerprintReadyCount: number;
    enforcementHash: string;
    enforcementScore: number;
    nextAction: string;
    readyCount: number;
    releaseBlocked: boolean;
    revocationClearCount: number;
    reviewCount: number;
    rowCount: number;
    signedPackageReadyCount: number;
    status: NativeReleaseEnforcementStatus;
    timestampAuthorityReadyCount: number;
  };
  workspaceId: string;
}

export interface CreateNativeReleaseEnforcementLedgerInput {
  artifacts: NativeReleaseEnforcementArtifactInput[];
  generatedAt?: string;
  releaseCandidateId: string;
  requiredPlatforms?: NativeArtifactStorageHandoffPlatform[];
  workspaceId?: string;
}

const defaultRequiredPlatforms: NativeArtifactStorageHandoffPlatform[] = [
  "windows",
  "macos",
  "linux",
];

const platformRank: Record<NativeArtifactStorageHandoffPlatform, number> = {
  windows: 0,
  macos: 1,
  linux: 2,
};

export function createNativeReleaseEnforcementLedger(
  input: CreateNativeReleaseEnforcementLedgerInput,
): NativeReleaseEnforcementLedger {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
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
  const fileBase = `${slug(workspaceId)}-native-release-enforcement-ledger-${slug(
    input.releaseCandidateId,
  )}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
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
        label: "Native release enforcement ledger CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native release enforcement ledger JSON",
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

function createRows(input: CreateNativeReleaseEnforcementLedgerInput) {
  const artifactsByPlatform = new Map(
    input.artifacts.map((artifact) => [artifact.platform, artifact]),
  );
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) =>
      createRow(artifactsByPlatform.get(platform) ?? missingArtifact(platform)),
    )
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function createRow(
  input: NativeReleaseEnforcementArtifactInput,
): NativeReleaseEnforcementRow {
  const artifactName = input.artifactName.trim();
  const certificateFingerprint = input.certificateFingerprint.trim();
  const enforcementOwner = input.enforcementOwner.trim();
  const revocationCheckedAt = input.revocationCheckedAt.trim();
  const signedPackageHash = input.signedPackageHash.trim();
  const timestampAuthority = input.timestampAuthority.trim();
  const timestampProofHash = input.timestampProofHash.trim();
  const timestampedAt = input.timestampedAt.trim();
  const readiness = {
    artifactNameReady: artifactName.length > 0,
    certificateFingerprintReady: hasSha256(certificateFingerprint),
    ownerReady: enforcementOwner.length > 0,
    revocationReady:
      input.revocationStatus === "clear" && validDate(revocationCheckedAt),
    signedPackageReady: hasSha256(signedPackageHash),
    timestampAuthorityReady:
      timestampAuthority.length > 0 &&
      hasSha256(timestampProofHash) &&
      validDate(timestampedAt),
  };
  const status = statusFor(readiness);
  const releaseBlockingReason = releaseBlockingReasonFor({
    ...readiness,
    revocationStatus: input.revocationStatus,
  });
  const rowWithoutHash = {
    artifactName: artifactName || `No ${input.platform} signed package attached`,
    ...readiness,
    certificateFingerprint: certificateFingerprint || "missing",
    enforcementOwner,
    nextAction: "",
    platform: input.platform,
    releaseBlockingReason,
    revocationCheckedAt,
    revocationStatus: input.revocationStatus,
    signedPackageHash: signedPackageHash || "missing",
    status,
    timestampAuthority,
    timestampProofHash: timestampProofHash || "missing",
    timestampedAt,
  } satisfies Omit<NativeReleaseEnforcementRow, "enforcementHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    enforcementHash: sha256(row),
  };
}

function statusFor(input: {
  artifactNameReady: boolean;
  certificateFingerprintReady: boolean;
  ownerReady: boolean;
  revocationReady: boolean;
  signedPackageReady: boolean;
  timestampAuthorityReady: boolean;
}): NativeReleaseEnforcementStatus {
  if (
    !input.artifactNameReady ||
    !input.certificateFingerprintReady ||
    !input.ownerReady ||
    !input.revocationReady ||
    !input.signedPackageReady ||
    !input.timestampAuthorityReady
  ) {
    return "blocked";
  }

  return "ready";
}

function releaseBlockingReasonFor(input: {
  artifactNameReady: boolean;
  certificateFingerprintReady: boolean;
  ownerReady: boolean;
  revocationReady: boolean;
  revocationStatus: NativeReleaseEnforcementRevocationStatus;
  signedPackageReady: boolean;
  timestampAuthorityReady: boolean;
}) {
  if (!input.signedPackageReady) {
    return "Missing signed package hash.";
  }

  if (!input.certificateFingerprintReady) {
    return "Missing certificate fingerprint.";
  }

  if (!input.timestampAuthorityReady) {
    return "Missing timestamp authority proof.";
  }

  if (!input.revocationReady) {
    return input.revocationStatus === "revoked"
      ? "Certificate revocation check is revoked."
      : "Missing clear revocation status.";
  }

  if (!input.ownerReady) {
    return "Missing release enforcement owner.";
  }

  if (!input.artifactNameReady) {
    return "Missing artifact name.";
  }

  return "Ready for native release enforcement.";
}

function nextActionFor(
  row: Omit<NativeReleaseEnforcementRow, "enforcementHash">,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native release enforcement ledger for ${row.platform}.`;
  }

  return `Native release enforcement is ready for ${row.platform}.`;
}

function summarize(
  rows: NativeReleaseEnforcementRow[],
): NativeReleaseEnforcementLedger["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const certificateFingerprintReadyCount = rows.filter(
    (row) => row.certificateFingerprintReady,
  ).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const revocationClearCount = rows.filter((row) => row.revocationReady).length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const signedPackageReadyCount = rows.filter(
    (row) => row.signedPackageReady,
  ).length;
  const timestampAuthorityReadyCount = rows.filter(
    (row) => row.timestampAuthorityReady,
  ).length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.artifactNameReady,
        row.certificateFingerprintReady,
        row.ownerReady,
        row.revocationReady,
        row.signedPackageReady,
        row.timestampAuthorityReady,
      ].filter(Boolean).length,
    0,
  );
  const totalSignals = Math.max(rows.length * 6, 1);
  const status: NativeReleaseEnforcementStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const releaseBlocked = status !== "ready";
  const nextRow = rows.find((row) => row.status !== "ready");
  const summaryWithoutHash = {
    blockedCount,
    certificateFingerprintReadyCount,
    enforcementScore: Math.round((readySignals / totalSignals) * 100),
    nextAction:
      nextRow?.nextAction ??
      "Native release enforcement ledger is ready for release.",
    readyCount,
    releaseBlocked,
    revocationClearCount,
    reviewCount,
    rowCount: rows.length,
    signedPackageReadyCount,
    status,
    timestampAuthorityReadyCount,
  };

  return {
    ...summaryWithoutHash,
    enforcementHash: sha256({
      rows: rows.map((row) => row.enforcementHash),
      summary: summaryWithoutHash,
    }),
  };
}

function createCsv(rows: NativeReleaseEnforcementRow[]) {
  const header = [
    "platform",
    "status",
    "artifact_name",
    "signed_package_ready",
    "certificate_fingerprint_ready",
    "timestamp_authority_ready",
    "revocation_ready",
    "owner_ready",
    "enforcement_hash",
    "next_action",
  ];
  const lines = rows.map((row) =>
    [
      row.platform,
      row.status,
      row.artifactName,
      row.signedPackageReady,
      row.certificateFingerprintReady,
      row.timestampAuthorityReady,
      row.revocationReady,
      row.ownerReady,
      row.enforcementHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

function missingArtifact(
  platform: NativeArtifactStorageHandoffPlatform,
): NativeReleaseEnforcementArtifactInput {
  return {
    artifactName: "",
    certificateFingerprint: "",
    enforcementOwner: "",
    platform,
    revocationCheckedAt: "",
    revocationStatus: "unknown",
    signedPackageHash: "",
    timestampAuthority: "",
    timestampProofHash: "",
    timestampedAt: "",
  };
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

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:");
}

function validDate(value: string) {
  const date = new Date(value.trim());

  return value.trim().length > 0 && !Number.isNaN(date.getTime());
}
