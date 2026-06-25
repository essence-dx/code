import { createHash } from "node:crypto";

import type { ReleaseAttestationDistributionPacket } from "@/features/projects/release-attestation-distribution-packet";
import type { ReleaseAttestationHistoryLedger } from "@/features/projects/release-attestation-history-ledger";
import type { ReleaseAttestationReplayVerifier } from "@/features/projects/release-attestation-replay-verifier";

export type ReleaseAttestationRevocationStatus =
  | "open"
  | "queued"
  | "resolved";

export type ReleaseAttestationRevocationFileFormat = "csv" | "json";

export interface ReleaseAttestationRevocationEntryInput {
  readonly customerNotificationHash?: string;
  readonly customerNotificationRoute?: string;
  readonly ownerApprovalHash?: string;
  readonly replacementCertificateVersion?: string;
  readonly replacementEvidenceHash?: string;
  readonly revocationOwner?: string;
  readonly revocationReason?: string;
  readonly supersededCertificateVersion: string;
}

export interface ReleaseAttestationRevocationWorkflowInput {
  readonly attestationHistoryLedger: ReleaseAttestationHistoryLedger;
  readonly distributionPacket: ReleaseAttestationDistributionPacket;
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly replayVerifier: ReleaseAttestationReplayVerifier;
  readonly revocations: readonly ReleaseAttestationRevocationEntryInput[];
  readonly workspaceId?: string;
}

export interface ReleaseAttestationRevocationRow
  extends Required<ReleaseAttestationRevocationEntryInput> {
  readonly customerNotificationReady: boolean;
  readonly distributionHash: string;
  readonly distributionReady: boolean;
  readonly historyLedgerHash: string;
  readonly historyReady: boolean;
  readonly id: string;
  readonly nextAction: string;
  readonly ownerApprovalReady: boolean;
  readonly replacementEvidenceReady: boolean;
  readonly replayHash: string;
  readonly replayReady: boolean;
  readonly revocationHash: string;
  readonly status: ReleaseAttestationRevocationStatus;
}

export interface ReleaseAttestationRevocationFile {
  readonly download: string;
  readonly format: ReleaseAttestationRevocationFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseAttestationRevocationWorkflow {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseAttestationRevocationFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseAttestationRevocationRow[];
  readonly summary: {
    readonly currentCertificateVersion: string;
    readonly customerNotificationRouteCount: number;
    readonly nextAction: string;
    readonly openCount: number;
    readonly queuedCount: number;
    readonly replacementEvidenceCount: number;
    readonly resolvedCount: number;
    readonly revocationHash: string;
    readonly revocationScore: number;
    readonly rowCount: number;
    readonly status: ReleaseAttestationRevocationStatus;
    readonly supersededCount: number;
  };
  readonly workspaceId: string;
}

const statusRank: Record<ReleaseAttestationRevocationStatus, number> = {
  open: 0,
  queued: 1,
  resolved: 2,
};

export function createReleaseAttestationRevocationWorkflow(
  input: ReleaseAttestationRevocationWorkflowInput,
): ReleaseAttestationRevocationWorkflow {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId =
    input.workspaceId ?? input.attestationHistoryLedger.workspaceId;
  const rows = input.revocations
    .map((revocation) =>
      createRow({
        attestationHistoryLedger: input.attestationHistoryLedger,
        distributionPacket: input.distributionPacket,
        generatedAt,
        replayVerifier: input.replayVerifier,
        revocation,
        workspaceId,
      }),
    )
    .sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] ||
        first.supersededCertificateVersion.localeCompare(
          second.supersededCertificateVersion,
        ),
    );
  const summary = summarize({
    currentCertificateVersion:
      input.attestationHistoryLedger.summary.currentCertificateVersion,
    rows,
  });
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
  const fileBase = `${slug(workspaceId)}-release-attestation-revocation-workflow-${slug(
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
        label: "Release attestation revocation workflow CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release attestation revocation workflow JSON",
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

function createRow(input: {
  readonly attestationHistoryLedger: ReleaseAttestationHistoryLedger;
  readonly distributionPacket: ReleaseAttestationDistributionPacket;
  readonly generatedAt: string;
  readonly replayVerifier: ReleaseAttestationReplayVerifier;
  readonly revocation: ReleaseAttestationRevocationEntryInput;
  readonly workspaceId: string;
}): ReleaseAttestationRevocationRow {
  const rowInput: Required<ReleaseAttestationRevocationEntryInput> = {
    customerNotificationHash:
      input.revocation.customerNotificationHash?.trim() ?? "",
    customerNotificationRoute:
      input.revocation.customerNotificationRoute?.trim() ?? "",
    ownerApprovalHash: input.revocation.ownerApprovalHash?.trim() ?? "",
    replacementCertificateVersion:
      input.revocation.replacementCertificateVersion?.trim() ?? "",
    replacementEvidenceHash:
      input.revocation.replacementEvidenceHash?.trim() ?? "",
    revocationOwner: input.revocation.revocationOwner?.trim() ?? "",
    revocationReason:
      input.revocation.revocationReason?.trim() ??
      defaultReason(input.revocation),
    supersededCertificateVersion:
      input.revocation.supersededCertificateVersion.trim(),
  };
  const historyLedgerHash = input.attestationHistoryLedger.summary.ledgerHash;
  const replayHash = input.replayVerifier.summary.replayHash;
  const distributionHash = input.distributionPacket.summary.distributionHash;
  const historyReady =
    input.attestationHistoryLedger.summary.status === "current" &&
    hasSha256(historyLedgerHash);
  const replayReady =
    input.replayVerifier.summary.status === "matched" && hasSha256(replayHash);
  const distributionReady =
    input.distributionPacket.summary.status === "ready" &&
    hasSha256(distributionHash);
  const ownerApprovalReady =
    rowInput.revocationOwner.length > 0 && hasSha256(rowInput.ownerApprovalHash);
  const replacementEvidenceReady =
    rowInput.replacementCertificateVersion.length > 0 &&
    hasSha256(rowInput.replacementEvidenceHash);
  const customerNotificationReady =
    rowInput.customerNotificationRoute.length > 0 &&
    hasSha256(rowInput.customerNotificationHash);
  const status = statusFor({
    customerNotificationReady,
    distributionReady,
    historyReady,
    ownerApprovalReady,
    replacementEvidenceReady,
    replayReady,
  });
  const rowWithoutHash = {
    ...rowInput,
    customerNotificationReady,
    distributionHash,
    distributionReady,
    historyLedgerHash,
    historyReady,
    id: `release-attestation-revocation:${slug(input.workspaceId)}:${slug(
      rowInput.supersededCertificateVersion,
    )}:${dateStamp(input.generatedAt)}`,
    nextAction: "",
    ownerApprovalReady,
    replacementEvidenceReady,
    replayHash,
    replayReady,
    status,
  };
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    revocationHash: sha256(row),
  };
}

function defaultReason(input: ReleaseAttestationRevocationEntryInput) {
  return input.replacementCertificateVersion
    ? `${input.supersededCertificateVersion} was superseded by ${input.replacementCertificateVersion}.`
    : `${input.supersededCertificateVersion} needs release attestation revocation review.`;
}

function statusFor(input: {
  readonly customerNotificationReady: boolean;
  readonly distributionReady: boolean;
  readonly historyReady: boolean;
  readonly ownerApprovalReady: boolean;
  readonly replacementEvidenceReady: boolean;
  readonly replayReady: boolean;
}): ReleaseAttestationRevocationStatus {
  if (
    !input.distributionReady ||
    !input.historyReady ||
    !input.ownerApprovalReady ||
    !input.replacementEvidenceReady ||
    !input.replayReady
  ) {
    return "open";
  }

  return input.customerNotificationReady ? "resolved" : "queued";
}

function nextActionFor(
  row: Omit<ReleaseAttestationRevocationRow, "revocationHash">,
) {
  if (!row.ownerApprovalReady) {
    return `Approve revocation owner for ${row.supersededCertificateVersion}.`;
  }

  if (!row.replacementEvidenceReady) {
    return `Attach replacement evidence for ${row.supersededCertificateVersion}.`;
  }

  if (!row.historyReady || !row.replayReady || !row.distributionReady) {
    return `Resolve release attestation source readiness before revoking ${row.supersededCertificateVersion}.`;
  }

  if (!row.customerNotificationReady) {
    return `Notify ${row.customerNotificationRoute || "customer notification route"} before closing revocation for ${row.supersededCertificateVersion}.`;
  }

  return `Keep ${row.supersededCertificateVersion} revoked with replacement evidence retained.`;
}

function summarize(input: {
  readonly currentCertificateVersion: string;
  readonly rows: readonly ReleaseAttestationRevocationRow[];
}): ReleaseAttestationRevocationWorkflow["summary"] {
  const openCount = input.rows.filter((row) => row.status === "open").length;
  const queuedCount = input.rows.filter((row) => row.status === "queued").length;
  const resolvedCount = input.rows.filter(
    (row) => row.status === "resolved",
  ).length;
  const status = input.rows.reduce<ReleaseAttestationRevocationStatus>(
    (worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst),
    "resolved",
  );
  const readySignals = input.rows.reduce(
    (total, row) =>
      total +
      [
        row.customerNotificationReady,
        row.distributionReady,
        row.historyReady,
        row.ownerApprovalReady,
        row.replacementEvidenceReady,
        row.replayReady,
      ].filter(Boolean).length,
    0,
  );
  const nextRow = input.rows.find((row) => row.status !== "resolved") ?? null;

  return {
    currentCertificateVersion: input.currentCertificateVersion,
    customerNotificationRouteCount: input.rows.filter(
      (row) => row.customerNotificationRoute.length > 0,
    ).length,
    nextAction:
      status === "resolved"
        ? "Release attestation revocation workflow is clear."
        : (nextRow?.nextAction ??
          "Review release attestation revocation workflow."),
    openCount,
    queuedCount,
    replacementEvidenceCount: input.rows.filter(
      (row) => row.replacementEvidenceReady,
    ).length,
    resolvedCount,
    revocationHash: sha256(input.rows.map((row) => row.revocationHash)),
    revocationScore:
      input.rows.length === 0
        ? 100
        : Math.round((readySignals / (input.rows.length * 6)) * 100),
    rowCount: input.rows.length,
    status,
    supersededCount: input.rows.length,
  };
}

function createCsv(rows: readonly ReleaseAttestationRevocationRow[]) {
  const header = [
    "revocation_id",
    "superseded_certificate_version",
    "status",
    "revocation_owner",
    "owner_approval_ready",
    "customer_notification_route",
    "replacement_evidence_ready",
    "revocation_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.id,
    row.supersededCertificateVersion,
    row.status,
    row.revocationOwner,
    String(row.ownerApprovalReady),
    row.customerNotificationRoute,
    String(row.replacementEvidenceReady),
    row.revocationHash,
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
