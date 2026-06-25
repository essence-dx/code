import { createHash } from "node:crypto";
import type { ReleaseArchiveExplorerId, ReleaseArchiveExplorerReport, ReleaseArchiveExplorerStatus } from "@/features/projects/release-archive-explorer";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import type { WorkspaceRiskDigestReport } from "@/features/projects/workspace-risk-digest";

export type ReviewerHandoffPacketStatus = "blocked" | "ready" | "watch";
export type ReviewerHandoffAttestationStatus = "blocked" | "pending" | "signed";
export type ReviewerHandoffChecksumId = "archive-summary" | "attestations" | "external-summary" | "release-evidence-summary" | "risk-summary";

export interface ReviewerHandoffOwnerAttestationInput {
  ownerHint: string;
  signedBy: string;
  signedOffAt: string;
  sourceId: ReleaseArchiveExplorerId;
}

export interface ReviewerHandoffExternalSummary {
  actionCount: number;
  archiveStatus: ReleaseArchiveExplorerStatus;
  evidenceFileCount: number;
  releaseBlockerCount: number;
  riskLevel: WorkspaceRiskDigestReport["riskLevel"];
  riskScore: number;
  workspaceLabel: string;
}

export interface ReviewerHandoffChecksum {
  contentHash: string;
  id: ReviewerHandoffChecksumId;
  label: string;
  sourceRecordCount: number;
  verified: boolean;
}

export interface ReviewerHandoffAttestation {
  evidence: string;
  label: string;
  nextAction: string;
  ownerHint: string;
  signedBy: string | null;
  signedOffAt: string | null;
  sourceId: ReleaseArchiveExplorerId;
  status: ReviewerHandoffAttestationStatus;
}

export interface ReviewerHandoffPacketReport {
  attestations: ReviewerHandoffAttestation[];
  checksums: ReviewerHandoffChecksum[];
  externalSummary: ReviewerHandoffExternalSummary;
  generatedAt: string;
  packetId: string;
  packetJson: string;
  summary: {
    blockedAttestationCount: number;
    handoffScore: number;
    pendingAttestationCount: number;
    redactionCount: number;
    signedAttestationCount: number;
    status: ReviewerHandoffPacketStatus;
    totalAttestationCount: number;
    verifiedChecksumCount: number;
  };
}

export interface CreateReviewerHandoffPacketReportInput {
  archiveExplorer: ReleaseArchiveExplorerReport;
  generatedAt?: string;
  ownerAttestations?: ReviewerHandoffOwnerAttestationInput[];
  releaseEvidenceBundleSummary: ReleaseEvidenceBundleSummary;
  riskDigest: WorkspaceRiskDigestReport;
}

function canonicalJson(value: unknown) {
  return JSON.stringify(JSON.parse(stableJson(value)), null, 2);
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

  return JSON.stringify(value);
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function shortHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 10);
}

function redactedWorkspaceLabel(workspace: WorkspaceRiskDigestReport["workspace"]) {
  return `Workspace ${shortHash(workspace.id)}`;
}

function createPacketId(workspaceId: string, generatedAt: string) {
  return `reviewer-handoff-${shortHash(workspaceId)}-${generatedAt.slice(0, 10).replaceAll("-", "")}`;
}

function checksum(input: { id: ReviewerHandoffChecksumId; label: string; sourceRecordCount: number; value: unknown }): ReviewerHandoffChecksum {
  const contentHash = sha256(input.value);

  return {
    contentHash,
    id: input.id,
    label: input.label,
    sourceRecordCount: input.sourceRecordCount,
    verified: contentHash === sha256(input.value),
  };
}

function attestationStatus(rowStatus: ReleaseArchiveExplorerStatus, attestation: ReviewerHandoffOwnerAttestationInput | undefined): ReviewerHandoffAttestationStatus {
  if (rowStatus === "blocked") {
    return "blocked";
  }

  return attestation?.signedBy && attestation.signedOffAt ? "signed" : "pending";
}

function createAttestations(input: CreateReviewerHandoffPacketReportInput): ReviewerHandoffAttestation[] {
  return input.archiveExplorer.rows.map((row) => {
    const attestation = input.ownerAttestations?.find((entry) => entry.sourceId === row.id && entry.ownerHint === row.ownerHint);
    const status = attestationStatus(row.status, attestation);

    return {
      evidence: row.evidence,
      label: row.label,
      nextAction:
        status === "blocked"
          ? "Clear blocked archive evidence before this owner can sign off."
          : status === "pending"
            ? `Collect ${row.ownerHint} sign-off before sending the packet outside the workspace.`
            : "Keep this owner attestation with the reviewer packet checksum.",
      ownerHint: row.ownerHint,
      signedBy: status === "signed" ? attestation!.signedBy : null,
      signedOffAt: status === "signed" ? attestation!.signedOffAt : null,
      sourceId: row.id,
      status,
    };
  });
}

function createExternalSummary(input: CreateReviewerHandoffPacketReportInput): ReviewerHandoffExternalSummary {
  return {
    actionCount: input.riskDigest.actionItems.length,
    archiveStatus: input.archiveExplorer.summary.worstStatus,
    evidenceFileCount: input.releaseEvidenceBundleSummary.fileCount,
    releaseBlockerCount: input.releaseEvidenceBundleSummary.releaseBlockerCount,
    riskLevel: input.riskDigest.riskLevel,
    riskScore: input.riskDigest.score,
    workspaceLabel: redactedWorkspaceLabel(input.riskDigest.workspace),
  };
}

function createChecksums(input: CreateReviewerHandoffPacketReportInput, externalSummary: ReviewerHandoffExternalSummary, attestations: ReviewerHandoffAttestation[]): ReviewerHandoffChecksum[] {
  return [
    checksum({
      id: "external-summary",
      label: "Redacted external summary",
      sourceRecordCount: externalSummary.actionCount + externalSummary.evidenceFileCount,
      value: externalSummary,
    }),
    checksum({
      id: "release-evidence-summary",
      label: "Release evidence summary",
      sourceRecordCount: input.releaseEvidenceBundleSummary.fileCount,
      value: {
        auditEventCount: input.releaseEvidenceBundleSummary.auditEventCount,
        fileCount: input.releaseEvidenceBundleSummary.fileCount,
        releaseBlockerCount: input.releaseEvidenceBundleSummary.releaseBlockerCount,
        riskScore: input.releaseEvidenceBundleSummary.riskScore,
      },
    }),
    checksum({
      id: "archive-summary",
      label: "Release archive summary",
      sourceRecordCount: input.archiveExplorer.summary.evidenceRecordCount,
      value: input.archiveExplorer.summary,
    }),
    checksum({
      id: "risk-summary",
      label: "Workspace risk summary",
      sourceRecordCount: input.riskDigest.audit.totalCount + input.riskDigest.incidents.totalCount + input.riskDigest.runbook.totalCount,
      value: {
        actionCount: input.riskDigest.actionItems.length,
        publicHealth: input.riskDigest.publicHealth,
        riskLevel: input.riskDigest.riskLevel,
        score: input.riskDigest.score,
      },
    }),
    checksum({
      id: "attestations",
      label: "Owner attestations",
      sourceRecordCount: attestations.length,
      value: attestations,
    }),
  ];
}

function createPacketJson(input: {
  attestations: ReviewerHandoffAttestation[];
  checksums: ReviewerHandoffChecksum[];
  externalSummary: ReviewerHandoffExternalSummary;
  generatedAt: string;
  packetId: string;
}) {
  return canonicalJson({
    attestations: input.attestations,
    checksums: input.checksums,
    externalSummary: input.externalSummary,
    generatedAt: input.generatedAt,
    packetId: input.packetId,
    schemaVersion: 1,
  });
}

function summarize(input: {
  archiveExplorer: ReleaseArchiveExplorerReport;
  attestations: ReviewerHandoffAttestation[];
  checksums: ReviewerHandoffChecksum[];
  externalSummary: ReviewerHandoffExternalSummary;
  packetJson: string;
  releaseEvidenceBundleSummary: ReleaseEvidenceBundleSummary;
  riskDigest: WorkspaceRiskDigestReport;
}): ReviewerHandoffPacketReport["summary"] {
  const totalAttestationCount = input.attestations.length;
  const signedAttestationCount = input.attestations.filter((row) => row.status === "signed").length;
  const pendingAttestationCount = input.attestations.filter((row) => row.status === "pending").length;
  const blockedAttestationCount = input.attestations.filter((row) => row.status === "blocked").length;
  const verifiedChecksumCount = input.checksums.filter((entry) => entry.verified).length;
  const attestationScore = totalAttestationCount > 0 ? (signedAttestationCount / totalAttestationCount) * 100 : 100;
  const checksumScore = input.checksums.length > 0 ? (verifiedChecksumCount / input.checksums.length) * 100 : 100;
  const handoffScore = Math.round((input.riskDigest.score + input.archiveExplorer.summary.governanceScore + attestationScore + checksumScore) / 4);
  const status: ReviewerHandoffPacketStatus =
    input.riskDigest.riskLevel === "critical" || input.releaseEvidenceBundleSummary.releaseBlockerCount > 0 || blockedAttestationCount > 0
      ? "blocked"
      : pendingAttestationCount > 0 || input.archiveExplorer.summary.worstStatus === "watch" || input.riskDigest.riskLevel === "watch"
        ? "watch"
        : "ready";

  return {
    blockedAttestationCount,
    handoffScore,
    pendingAttestationCount,
    redactionCount: [
      input.riskDigest.workspace.id,
      input.riskDigest.workspace.name,
      input.riskDigest.packetId,
      ...input.riskDigest.audit.rows.map((row) => row.actorEmail).filter((value): value is string => Boolean(value)),
    ].filter((token) => !input.packetJson.includes(token)).length,
    signedAttestationCount,
    status,
    totalAttestationCount,
    verifiedChecksumCount,
  };
}

export function createReviewerHandoffPacketReport(input: CreateReviewerHandoffPacketReportInput): ReviewerHandoffPacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const packetId = createPacketId(input.riskDigest.workspace.id, generatedAt);
  const externalSummary = createExternalSummary(input);
  const attestations = createAttestations(input);
  const checksums = createChecksums(input, externalSummary, attestations);
  const packetJson = createPacketJson({
    attestations,
    checksums,
    externalSummary,
    generatedAt,
    packetId,
  });

  return {
    attestations,
    checksums,
    externalSummary,
    generatedAt,
    packetId,
    packetJson,
    summary: summarize({
      archiveExplorer: input.archiveExplorer,
      attestations,
      checksums,
      externalSummary,
      packetJson,
      releaseEvidenceBundleSummary: input.releaseEvidenceBundleSummary,
      riskDigest: input.riskDigest,
    }),
  };
}
