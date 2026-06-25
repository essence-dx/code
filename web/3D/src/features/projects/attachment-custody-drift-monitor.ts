import { createHash } from "node:crypto";

import type { CadRuntimeCustodyLedger } from "@/features/projects/cad-runtime-custody-ledger";
import type {
  NativeReleaseAttachmentApprovalGate,
  NativeReleaseAttachmentApprovalPacket,
} from "@/features/projects/native-release-attachment-approval-packet";
import type { SignedArtifactCustodyLedger } from "@/features/projects/signed-artifact-custody-ledger";

export type AttachmentCustodyDriftMonitorArea =
  | "attachment-approval-packet"
  | "cad-runtime-custody"
  | "signed-artifact-custody";
export type AttachmentCustodyDriftMonitorStatus =
  | "blocked"
  | "ready"
  | "review";
export type AttachmentCustodyDriftMonitorFileFormat = "csv" | "json";

export interface AttachmentCustodyDriftMonitorInput {
  readonly approvalPacket: NativeReleaseAttachmentApprovalPacket;
  readonly cadRuntimeCustody: CadRuntimeCustodyLedger;
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly signedArtifactCustody: SignedArtifactCustodyLedger;
  readonly workspaceId?: string;
}

export interface AttachmentCustodyDriftMonitorRow {
  readonly acceptedEvidenceHash: string;
  readonly approvalEvidenceReady: boolean;
  readonly area: AttachmentCustodyDriftMonitorArea;
  readonly currentCustodyReady: boolean;
  readonly currentEvidenceHash: string;
  readonly changedEvidenceHash: boolean;
  readonly driftHash: string;
  readonly nextAction: string;
  readonly ownerCurrent: boolean;
  readonly retentionCurrent: boolean;
  readonly score: number;
  readonly status: AttachmentCustodyDriftMonitorStatus;
}

export interface AttachmentCustodyDriftMonitorFile {
  readonly download: string;
  readonly format: AttachmentCustodyDriftMonitorFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface AttachmentCustodyDriftMonitor {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: AttachmentCustodyDriftMonitorFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: AttachmentCustodyDriftMonitorRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly changedEvidenceHashCount: number;
    readonly driftHash: string;
    readonly driftScore: number;
    readonly expiredRetentionCount: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly staleOwnerCount: number;
    readonly status: AttachmentCustodyDriftMonitorStatus;
  };
  readonly workspaceId: string;
}

export function createAttachmentCustodyDriftMonitor(
  input: AttachmentCustodyDriftMonitorInput,
): AttachmentCustodyDriftMonitor {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? input.approvalPacket.workspaceId;
  const rows = [
    createSignedArtifactRow(input),
    createCadRuntimeRow(input),
    createApprovalPacketRow(input.approvalPacket),
  ];
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
  const baseFileName = `${slug(workspaceId)}-attachment-custody-drift-monitor-${slug(
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
        label: "Attachment custody drift monitor CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Attachment custody drift monitor JSON",
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

function createSignedArtifactRow(
  input: AttachmentCustodyDriftMonitorInput,
): AttachmentCustodyDriftMonitorRow {
  const summary = input.signedArtifactCustody.summary;
  const acceptedEvidenceHash = approvalEvidenceHash(
    input.approvalPacket,
    "signed-artifact-attachments",
  );

  return createRow({
    acceptedEvidenceHash,
    approvalEvidenceReady: approvalEvidenceReady(
      input.approvalPacket,
      "signed-artifact-attachments",
    ),
    area: "signed-artifact-custody",
    currentCustodyReady: summary.status === "ready",
    currentEvidenceHash: summary.ledgerHash,
    ownerCurrent:
      summary.storageOwnerReadyCount === summary.rowCount &&
      summary.certificateCustodyReadyCount === summary.rowCount,
    retentionCurrent:
      summary.retentionReadyCount === summary.rowCount &&
      summary.checksumRenewalReadyCount === summary.rowCount,
  });
}

function createCadRuntimeRow(
  input: AttachmentCustodyDriftMonitorInput,
): AttachmentCustodyDriftMonitorRow {
  const summary = input.cadRuntimeCustody.summary;
  const acceptedEvidenceHash = approvalEvidenceHash(
    input.approvalPacket,
    "cad-runtime-attachments",
  );

  return createRow({
    acceptedEvidenceHash,
    approvalEvidenceReady: approvalEvidenceReady(
      input.approvalPacket,
      "cad-runtime-attachments",
    ),
    area: "cad-runtime-custody",
    currentCustodyReady: summary.status === "ready",
    currentEvidenceHash: summary.ledgerHash,
    ownerCurrent:
      summary.bundleOwnerReadyCount === summary.rowCount &&
      summary.fallbackCustodyReadyCount === summary.rowCount,
    retentionCurrent:
      summary.fixtureRetentionReadyCount === summary.rowCount &&
      summary.outputRenewalReadyCount === summary.rowCount,
  });
}

function createApprovalPacketRow(
  approvalPacket: NativeReleaseAttachmentApprovalPacket,
): AttachmentCustodyDriftMonitorRow {
  return createRow({
    acceptedEvidenceHash: approvalPacket.summary.approvalHash,
    approvalEvidenceReady:
      approvalPacket.summary.status === "ready" &&
      approvalPacket.summary.goNoGoDecision === "go",
    area: "attachment-approval-packet",
    currentCustodyReady: approvalPacket.summary.status === "ready",
    currentEvidenceHash: approvalPacket.summary.approvalHash,
    ownerCurrent: approvalPacket.summary.operatorReady,
    retentionCurrent: approvalPacket.summary.blockedCount === 0,
  });
}

function createRow(
  input: Omit<
    AttachmentCustodyDriftMonitorRow,
    "changedEvidenceHash" | "driftHash" | "nextAction" | "score" | "status"
  >,
): AttachmentCustodyDriftMonitorRow {
  const changedEvidenceHash =
    input.currentEvidenceHash.length === 0 ||
    input.acceptedEvidenceHash.length === 0 ||
    input.currentEvidenceHash !== input.acceptedEvidenceHash;
  const readySignals = [
    input.currentCustodyReady,
    input.approvalEvidenceReady,
    input.ownerCurrent,
    input.retentionCurrent,
    !changedEvidenceHash,
  ].filter(Boolean).length;
  const score = Math.round((readySignals / 5) * 100);
  const status: AttachmentCustodyDriftMonitorStatus =
    score < 80 ? "blocked" : score < 100 ? "review" : "ready";
  const rowWithoutHash = {
    ...input,
    changedEvidenceHash,
    nextAction:
      status === "ready"
        ? `Attachment custody drift is clear for ${input.area}.`
        : `Resolve attachment custody drift for ${input.area}.`,
    score,
    status,
  };

  return {
    ...rowWithoutHash,
    driftHash: sha256(rowWithoutHash),
  };
}

function approvalEvidenceHash(
  approvalPacket: NativeReleaseAttachmentApprovalPacket,
  gate: NativeReleaseAttachmentApprovalGate,
) {
  return (
    approvalPacket.rows.find((row) => row.gate === gate)?.evidenceHash.trim() ??
    ""
  );
}

function approvalEvidenceReady(
  approvalPacket: NativeReleaseAttachmentApprovalPacket,
  gate: NativeReleaseAttachmentApprovalGate,
) {
  const row = approvalPacket.rows.find((entry) => entry.gate === gate);

  return Boolean(
    row?.evidenceLinked && row.releaseApprovalReady && row.status === "ready",
  );
}

function summarize(
  rows: readonly AttachmentCustodyDriftMonitorRow[],
): AttachmentCustodyDriftMonitor["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const staleOwnerCount = rows.filter((row) => !row.ownerCurrent).length;
  const expiredRetentionCount = rows.filter((row) => !row.retentionCurrent).length;
  const changedEvidenceHashCount = rows.filter(
    (row) => row.changedEvidenceHash,
  ).length;
  const status: AttachmentCustodyDriftMonitorStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  const averageScore = Math.round(
    rows.reduce((total, row) => total + row.score, 0) / rows.length,
  );

  return {
    blockedCount,
    changedEvidenceHashCount,
    driftHash: sha256(rows.map((row) => row.driftHash)),
    driftScore: status === "blocked" ? Math.min(averageScore, 60) : averageScore,
    expiredRetentionCount,
    nextAction:
      status === "ready"
        ? "Attachment custody drift monitor is ready for release evidence continuity approval."
        : "Resolve attachment custody drift before release evidence continuity approval.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    staleOwnerCount,
    status,
  };
}

function createCsv(rows: readonly AttachmentCustodyDriftMonitorRow[]) {
  const header = [
    "area",
    "status",
    "owner_current",
    "retention_current",
    "changed_evidence_hash",
    "current_evidence_hash",
    "approval_evidence_hash",
    "drift_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.area,
    row.status,
    String(row.ownerCurrent),
    String(row.retentionCurrent),
    String(row.changedEvidenceHash),
    row.currentEvidenceHash,
    row.acceptedEvidenceHash,
    row.driftHash,
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
