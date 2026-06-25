import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";
import type { CertificateBackedPackageArtifactRevocationStatus } from "@/features/projects/certificate-backed-package-artifact-reality-verifier";

export type ExternalArtifactEvidenceFreshnessPlatform = NativeArtifactStorageHandoffPlatform | "cross-platform";
export type ExternalArtifactEvidenceFreshnessKind = "cad-transcript" | "download" | "notarization" | "revocation" | "signing";
export type ExternalArtifactEvidenceFreshnessStatus = "blocked" | "fresh" | "watch";
export type ExternalArtifactEvidenceFreshnessSummaryStatus = "blocked" | "ready" | "watch";
export type ExternalArtifactEvidenceFreshnessFileFormat = "csv" | "json";

export interface ExternalArtifactEvidenceFreshnessInput {
  evidenceHash: string;
  evidenceKind: ExternalArtifactEvidenceFreshnessKind;
  evidenceUrl: string;
  expiresAt: string;
  lastVerifiedAt: string;
  owner: string;
  platform: ExternalArtifactEvidenceFreshnessPlatform;
  revocationStatus: CertificateBackedPackageArtifactRevocationStatus;
}

export interface ExternalArtifactEvidenceFreshnessRow {
  daysSinceVerification: number;
  daysUntilExpiry: number;
  evidenceHash: string;
  evidenceKind: ExternalArtifactEvidenceFreshnessKind;
  evidenceLinked: boolean;
  evidenceUrl: string;
  expiresAt: string;
  freshnessHash: string;
  lastVerifiedAt: string;
  nextAction: string;
  owner: string;
  ownerReady: boolean;
  platform: ExternalArtifactEvidenceFreshnessPlatform;
  revocationReady: boolean;
  revocationStatus: CertificateBackedPackageArtifactRevocationStatus;
  status: ExternalArtifactEvidenceFreshnessStatus;
}

export interface ExternalArtifactEvidenceFreshnessFile {
  download: string;
  format: ExternalArtifactEvidenceFreshnessFileFormat;
  href: string;
  label: string;
}

export interface ExternalArtifactEvidenceFreshnessMonitorReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: ExternalArtifactEvidenceFreshnessFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: ExternalArtifactEvidenceFreshnessRow[];
  summary: {
    blockedCount: number;
    freshCount: number;
    freshnessHash: string;
    freshnessScore: number;
    nextAction: string;
    releaseApprovalBlocked: boolean;
    rowCount: number;
    status: ExternalArtifactEvidenceFreshnessSummaryStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateExternalArtifactEvidenceFreshnessMonitorInput {
  evidence: ExternalArtifactEvidenceFreshnessInput[];
  generatedAt?: string;
  releaseCandidateId: string;
  requiredKinds?: ExternalArtifactEvidenceFreshnessKind[];
  workspaceId?: string;
}

const defaultRequiredKinds: ExternalArtifactEvidenceFreshnessKind[] = ["signing", "revocation", "notarization", "download", "cad-transcript"];
const kindRank: Record<ExternalArtifactEvidenceFreshnessKind, number> = {
  signing: 0,
  revocation: 1,
  notarization: 2,
  download: 3,
  "cad-transcript": 4,
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

function toTime(value: string) {
  const time = new Date(value.trim()).getTime();

  return Number.isNaN(time) ? null : time;
}

function dayDiff(later: string, earlier: string) {
  const laterTime = toTime(later);
  const earlierTime = toTime(earlier);

  if (laterTime === null || earlierTime === null) {
    return -999;
  }

  return Math.floor((laterTime - earlierTime) / (24 * 60 * 60 * 1000));
}

function missingEvidence(evidenceKind: ExternalArtifactEvidenceFreshnessKind): ExternalArtifactEvidenceFreshnessInput {
  return {
    evidenceHash: "",
    evidenceKind,
    evidenceUrl: "",
    expiresAt: "",
    lastVerifiedAt: "",
    owner: "",
    platform: evidenceKind === "cad-transcript" ? "cross-platform" : evidenceKind === "notarization" ? "macos" : "windows",
    revocationStatus: "unknown",
  };
}

function statusFor(input: {
  daysSinceVerification: number;
  daysUntilExpiry: number;
  evidenceLinked: boolean;
  ownerReady: boolean;
  revocationReady: boolean;
}) {
  if (!input.evidenceLinked || !input.ownerReady || !input.revocationReady || input.daysUntilExpiry < 0 || input.daysSinceVerification < 0 || input.daysSinceVerification > 14) {
    return "blocked";
  }

  if (input.daysUntilExpiry <= 3 || input.daysSinceVerification > 7) {
    return "watch";
  }

  return "fresh";
}

function nextActionFor(
  row: Pick<
    ExternalArtifactEvidenceFreshnessRow,
    "daysSinceVerification" | "daysUntilExpiry" | "evidenceKind" | "evidenceLinked" | "ownerReady" | "platform" | "revocationReady" | "status"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked external artifact evidence freshness monitor for ${row.evidenceKind}.`;
  }

  if (!row.evidenceLinked) {
    return `Attach fresh external artifact evidence hash and URL for ${row.evidenceKind}.`;
  }

  if (!row.revocationReady) {
    return `Refresh clear revocation evidence before release approval for ${row.platform}.`;
  }

  if (row.daysUntilExpiry < 0) {
    return `Renew expired ${row.evidenceKind} evidence before release approval.`;
  }

  if (row.daysSinceVerification > 14) {
    return `Re-verify ${row.evidenceKind} evidence before release approval.`;
  }

  if (!row.ownerReady) {
    return `Assign owner for ${row.evidenceKind} evidence freshness.`;
  }

  if (row.status === "watch") {
    return `Refresh ${row.evidenceKind} evidence soon; it is inside the release approval watch window.`;
  }

  return `External artifact evidence freshness is ready for ${row.evidenceKind}.`;
}

function createRow(input: ExternalArtifactEvidenceFreshnessInput, generatedAt: string): ExternalArtifactEvidenceFreshnessRow {
  const evidenceHash = input.evidenceHash.trim() || "missing";
  const evidenceUrl = input.evidenceUrl.trim();
  const expiresAt = input.expiresAt.trim();
  const lastVerifiedAt = input.lastVerifiedAt.trim();
  const owner = input.owner.trim();
  const daysSinceVerification = dayDiff(generatedAt, lastVerifiedAt);
  const daysUntilExpiry = dayDiff(expiresAt, generatedAt);
  const evidenceLinked = hasSha256(evidenceHash) && urlReady(evidenceUrl);
  const ownerReady = owner.length > 0;
  const revocationReady = input.revocationStatus === "clear";
  const status = statusFor({
    daysSinceVerification,
    daysUntilExpiry,
    evidenceLinked,
    ownerReady,
    revocationReady,
  });
  const rowWithoutHash = {
    daysSinceVerification,
    daysUntilExpiry,
    evidenceHash,
    evidenceKind: input.evidenceKind,
    evidenceLinked,
    evidenceUrl,
    expiresAt,
    lastVerifiedAt,
    nextAction: "",
    owner,
    ownerReady,
    platform: input.platform,
    revocationReady,
    revocationStatus: input.revocationStatus,
    status,
  } satisfies Omit<ExternalArtifactEvidenceFreshnessRow, "freshnessHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    freshnessHash: sha256(row),
  };
}

function createRows(input: CreateExternalArtifactEvidenceFreshnessMonitorInput, generatedAt: string) {
  const evidenceByKind = new Map(input.evidence.map((entry) => [entry.evidenceKind, entry]));
  const requiredKinds = input.requiredKinds ?? defaultRequiredKinds;

  return requiredKinds
    .map((evidenceKind) => createRow(evidenceByKind.get(evidenceKind) ?? missingEvidence(evidenceKind), generatedAt))
    .sort((first, second) => kindRank[first.evidenceKind] - kindRank[second.evidenceKind]);
}

function summarize(rows: ExternalArtifactEvidenceFreshnessRow[]): ExternalArtifactEvidenceFreshnessMonitorReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const freshCount = rows.filter((row) => row.status === "fresh").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const status: ExternalArtifactEvidenceFreshnessSummaryStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";

  return {
    blockedCount,
    freshCount,
    freshnessHash: sha256(rows.map((row) => row.freshnessHash)),
    freshnessScore: Math.max(0, Math.min(100, Math.round((freshCount / Math.max(1, rows.length)) * 100 + watchCount * 12 - blockedCount * 18))),
    nextAction:
      status === "blocked"
        ? "Resolve blocked external artifact evidence freshness monitor before release approval."
        : status === "watch"
          ? "Refresh watched external artifact evidence before final release approval."
          : "External artifact evidence freshness is ready for release approval.",
    releaseApprovalBlocked: status === "blocked",
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createCsv(rows: ExternalArtifactEvidenceFreshnessRow[]) {
  const header = ["evidence_kind", "platform", "status", "days_until_expiry", "evidence_linked", "owner_ready", "freshness_hash", "next_action"];
  const body = rows.map((row) =>
    [row.evidenceKind, row.platform, row.status, row.daysUntilExpiry, row.evidenceLinked, row.ownerReady, row.freshnessHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: { csvDataUri: string; csvFileName: string; jsonDataUri: string; jsonFileName: string }): ExternalArtifactEvidenceFreshnessFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV freshness",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON freshness",
    },
  ];
}

export function createExternalArtifactEvidenceFreshnessMonitor(input: CreateExternalArtifactEvidenceFreshnessMonitorInput): ExternalArtifactEvidenceFreshnessMonitorReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input, generatedAt);
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
  const fileBase = `${slug(workspaceId)}-external-artifact-evidence-freshness-monitor-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
