import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type CertificateBackedPackageArtifactRealityStatus = "blocked" | "ready" | "review";
export type CertificateBackedPackageArtifactRealityFileFormat = "csv" | "json";
export type CertificateBackedPackageArtifactRevocationStatus = "clear" | "revoked" | "unknown";
export type CertificateBackedPackageArtifactSignatureKind = "authenticode" | "codesign-notarized" | "gpg" | "sigstore";

export interface CertificateBackedPackageArtifactRealityInput {
  artifactSha256: string;
  artifactUrl: string;
  certificateFingerprint: string;
  certificateSubject: string;
  notarizationTicketHash: string;
  platform: NativeArtifactStorageHandoffPlatform;
  revocationCheckedAt: string;
  revocationStatus: CertificateBackedPackageArtifactRevocationStatus;
  signedAt: string;
  signatureAuthority: string;
  signatureKind: CertificateBackedPackageArtifactSignatureKind;
  transparencyLogUrl: string;
  verificationCommand: string;
  verificationExitCode: number;
  verificationTranscriptHash: string;
  verifierOwner: string;
}

export interface CertificateBackedPackageArtifactRealityRow {
  artifactLinked: boolean;
  artifactSha256: string;
  artifactUrl: string;
  certificateFingerprint: string;
  certificateReady: boolean;
  certificateSubject: string;
  nextAction: string;
  notarizationReady: boolean;
  notarizationTicketHash: string;
  ownerReady: boolean;
  platform: NativeArtifactStorageHandoffPlatform;
  realityHash: string;
  revocationCheckedAt: string;
  revocationReady: boolean;
  revocationStatus: CertificateBackedPackageArtifactRevocationStatus;
  signedAt: string;
  signatureAuthority: string;
  signatureKind: CertificateBackedPackageArtifactSignatureKind;
  signatureKindReady: boolean;
  status: CertificateBackedPackageArtifactRealityStatus;
  transparencyLogUrl: string;
  transparencyReady: boolean;
  verificationCommand: string;
  verificationExitCode: number;
  verificationReady: boolean;
  verificationTranscriptHash: string;
  verifierOwner: string;
}

export interface CertificateBackedPackageArtifactRealityFile {
  download: string;
  format: CertificateBackedPackageArtifactRealityFileFormat;
  href: string;
  label: string;
}

export interface CertificateBackedPackageArtifactRealityVerifierReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: CertificateBackedPackageArtifactRealityFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: CertificateBackedPackageArtifactRealityRow[];
  summary: {
    blockedCount: number;
    certificateReadyCount: number;
    nextAction: string;
    readyCount: number;
    realityHash: string;
    realityScore: number;
    revocationClearCount: number;
    reviewCount: number;
    rowCount: number;
    status: CertificateBackedPackageArtifactRealityStatus;
    verificationReadyCount: number;
  };
  workspaceId: string;
}

export interface CreateCertificateBackedPackageArtifactRealityVerifierInput {
  artifacts: CertificateBackedPackageArtifactRealityInput[];
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

const expectedSignatureKind: Record<NativeArtifactStorageHandoffPlatform, CertificateBackedPackageArtifactSignatureKind[]> = {
  windows: ["authenticode"],
  macos: ["codesign-notarized"],
  linux: ["gpg", "sigstore"],
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

function urlReady(value: string) {
  return value.trim().startsWith("https://");
}

function validDate(value: string) {
  const date = new Date(value.trim());

  return value.trim().length > 0 && !Number.isNaN(date.getTime());
}

function missingArtifact(platform: NativeArtifactStorageHandoffPlatform): CertificateBackedPackageArtifactRealityInput {
  return {
    artifactSha256: "",
    artifactUrl: "",
    certificateFingerprint: "",
    certificateSubject: "",
    notarizationTicketHash: "",
    platform,
    revocationCheckedAt: "",
    revocationStatus: "unknown",
    signedAt: "",
    signatureAuthority: "",
    signatureKind: platform === "macos" ? "codesign-notarized" : platform === "linux" ? "sigstore" : "authenticode",
    transparencyLogUrl: "",
    verificationCommand: "",
    verificationExitCode: 1,
    verificationTranscriptHash: "",
    verifierOwner: "",
  };
}

function statusFor(input: {
  artifactLinked: boolean;
  certificateReady: boolean;
  notarizationReady: boolean;
  ownerReady: boolean;
  revocationReady: boolean;
  signatureKindReady: boolean;
  transparencyReady: boolean;
  verificationReady: boolean;
}): CertificateBackedPackageArtifactRealityStatus {
  if (
    !input.artifactLinked ||
    !input.certificateReady ||
    !input.ownerReady ||
    !input.revocationReady ||
    !input.signatureKindReady ||
    !input.verificationReady
  ) {
    return "blocked";
  }

  if (!input.notarizationReady || !input.transparencyReady) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    CertificateBackedPackageArtifactRealityRow,
    | "artifactLinked"
    | "certificateReady"
    | "notarizationReady"
    | "ownerReady"
    | "platform"
    | "revocationReady"
    | "signatureKindReady"
    | "status"
    | "transparencyReady"
    | "verificationReady"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked certificate-backed package artifact reality verifier for ${row.platform}.`;
  }

  if (!row.artifactLinked) {
    return `Attach real signed package artifact location and checksum for ${row.platform}.`;
  }

  if (!row.signatureKindReady) {
    return `Use the required certificate-backed signature verifier for ${row.platform}.`;
  }

  if (!row.certificateReady) {
    return `Attach certificate subject, authority, fingerprint, and signing time for ${row.platform}.`;
  }

  if (!row.revocationReady) {
    return `Attach clear revocation evidence for ${row.platform}.`;
  }

  if (!row.verificationReady) {
    return `Attach command transcript for certificate-backed artifact verification on ${row.platform}.`;
  }

  if (!row.notarizationReady) {
    return `Attach notarization ticket evidence for macOS signed package artifacts.`;
  }

  if (!row.transparencyReady) {
    return `Attach transparency log evidence for Linux signed package artifacts.`;
  }

  if (!row.ownerReady) {
    return `Assign a certificate-backed artifact verification owner for ${row.platform}.`;
  }

  return `Certificate-backed package artifact reality evidence is ready for ${row.platform}.`;
}

function createRow(input: CertificateBackedPackageArtifactRealityInput): CertificateBackedPackageArtifactRealityRow {
  const artifactSha256 = input.artifactSha256.trim() || "missing";
  const artifactUrl = input.artifactUrl.trim();
  const certificateFingerprint = input.certificateFingerprint.trim() || "missing";
  const certificateSubject = input.certificateSubject.trim();
  const notarizationTicketHash = input.notarizationTicketHash.trim() || "missing";
  const revocationCheckedAt = input.revocationCheckedAt.trim();
  const signedAt = input.signedAt.trim();
  const signatureAuthority = input.signatureAuthority.trim();
  const transparencyLogUrl = input.transparencyLogUrl.trim();
  const verificationCommand = input.verificationCommand.trim();
  const verificationTranscriptHash = input.verificationTranscriptHash.trim() || "missing";
  const verifierOwner = input.verifierOwner.trim();
  const artifactLinked = hasSha256(artifactSha256) && urlReady(artifactUrl);
  const certificateReady = certificateSubject.length > 0 && signatureAuthority.length > 0 && hasSha256(certificateFingerprint) && validDate(signedAt);
  const notarizationReady = input.platform !== "macos" || hasSha256(notarizationTicketHash);
  const ownerReady = verifierOwner.length > 0;
  const revocationReady = input.revocationStatus === "clear" && validDate(revocationCheckedAt);
  const signatureKindReady = expectedSignatureKind[input.platform].includes(input.signatureKind);
  const transparencyReady = input.platform !== "linux" || urlReady(transparencyLogUrl);
  const verificationReady = verificationCommand.length > 0 && input.verificationExitCode === 0 && hasSha256(verificationTranscriptHash);
  const status = statusFor({
    artifactLinked,
    certificateReady,
    notarizationReady,
    ownerReady,
    revocationReady,
    signatureKindReady,
    transparencyReady,
    verificationReady,
  });
  const rowWithoutHash = {
    artifactLinked,
    artifactSha256,
    artifactUrl,
    certificateFingerprint,
    certificateReady,
    certificateSubject,
    nextAction: "",
    notarizationReady,
    notarizationTicketHash,
    ownerReady,
    platform: input.platform,
    revocationCheckedAt,
    revocationReady,
    revocationStatus: input.revocationStatus,
    signedAt,
    signatureAuthority,
    signatureKind: input.signatureKind,
    signatureKindReady,
    status,
    transparencyLogUrl,
    transparencyReady,
    verificationCommand,
    verificationExitCode: input.verificationExitCode,
    verificationReady,
    verificationTranscriptHash,
    verifierOwner,
  } satisfies Omit<CertificateBackedPackageArtifactRealityRow, "realityHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    realityHash: sha256(row),
  };
}

function createRows(input: CreateCertificateBackedPackageArtifactRealityVerifierInput) {
  const artifactByPlatform = new Map(input.artifacts.map((artifact) => [artifact.platform, artifact]));
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) => createRow(artifactByPlatform.get(platform) ?? missingArtifact(platform)))
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function summarize(rows: CertificateBackedPackageArtifactRealityRow[]): CertificateBackedPackageArtifactRealityVerifierReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const certificateReadyCount = rows.filter((row) => row.certificateReady).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const revocationClearCount = rows.filter((row) => row.revocationReady).length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: CertificateBackedPackageArtifactRealityStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const verificationReadyCount = rows.filter((row) => row.verificationReady).length;

  return {
    blockedCount,
    certificateReadyCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked certificate-backed package artifact reality verifier before external runtime release."
        : status === "review"
          ? "Review certificate-backed package artifact reality verifier before external runtime release."
          : "Certificate-backed package artifact reality verifier is ready for external runtime release.",
    readyCount,
    realityHash: sha256(rows.map((row) => row.realityHash)),
    realityScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
    revocationClearCount,
    reviewCount,
    rowCount: rows.length,
    status,
    verificationReadyCount,
  };
}

function createCsv(rows: CertificateBackedPackageArtifactRealityRow[]) {
  const header = ["platform", "status", "signature_kind", "artifact_linked", "certificate_ready", "revocation_ready", "verification_ready", "reality_hash", "next_action"];
  const body = rows.map((row) =>
    [
      row.platform,
      row.status,
      row.signatureKind,
      row.artifactLinked,
      row.certificateReady,
      row.revocationReady,
      row.verificationReady,
      row.realityHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: { csvDataUri: string; csvFileName: string; jsonDataUri: string; jsonFileName: string }): CertificateBackedPackageArtifactRealityFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV verifier",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON verifier",
    },
  ];
}

export function createCertificateBackedPackageArtifactRealityVerifier(
  input: CreateCertificateBackedPackageArtifactRealityVerifierInput,
): CertificateBackedPackageArtifactRealityVerifierReport {
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
  const fileBase = `${slug(workspaceId)}-certificate-backed-package-artifact-reality-verifier-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
