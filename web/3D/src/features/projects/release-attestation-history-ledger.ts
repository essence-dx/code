import { createHash } from "node:crypto";

import type { ReleaseCertificationPacket } from "@/features/projects/release-certification-packet";
import type { ReleaseCertificationRenewalMonitor } from "@/features/projects/release-certification-renewal-monitor";

export type ReleaseAttestationHistoryStatus =
  | "blocked"
  | "current"
  | "historical";

export type ReleaseAttestationHistoryFileFormat = "csv" | "json";

export interface ReleaseAttestationHistoryEntryInput {
  readonly attestationHash?: string;
  readonly attestationOwner?: string;
  readonly certificateVersion?: string;
  readonly issuedAt?: string;
  readonly lineageHash?: string;
  readonly parentCertificateVersion?: string;
  readonly status?: ReleaseAttestationHistoryStatus;
}

export interface ReleaseAttestationHistoryLedgerInput {
  readonly attestations: readonly ReleaseAttestationHistoryEntryInput[];
  readonly certificationPacket: ReleaseCertificationPacket;
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly renewalMonitor: ReleaseCertificationRenewalMonitor;
  readonly workspaceId?: string;
}

export interface ReleaseAttestationHistoryRow
  extends Required<ReleaseAttestationHistoryEntryInput> {
  readonly attestationHashReady: boolean;
  readonly attestationOwnerReady: boolean;
  readonly certificateLineageReady: boolean;
  readonly certificationPacketHash: string;
  readonly certificationPacketReady: boolean;
  readonly ledgerHash: string;
  readonly nextAction: string;
  readonly renewalMonitorHash: string;
  readonly renewalMonitorReady: boolean;
}

export interface ReleaseAttestationHistoryFile {
  readonly download: string;
  readonly format: ReleaseAttestationHistoryFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseAttestationHistoryLedger {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseAttestationHistoryFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseAttestationHistoryRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly currentCertificateVersion: string;
    readonly currentCount: number;
    readonly historicalCount: number;
    readonly ledgerHash: string;
    readonly ledgerScore: number;
    readonly nextAction: string;
    readonly rowCount: number;
    readonly status: ReleaseAttestationHistoryStatus;
  };
  readonly workspaceId: string;
}

export function createReleaseAttestationHistoryLedger(
  input: ReleaseAttestationHistoryLedgerInput,
): ReleaseAttestationHistoryLedger {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? input.certificationPacket.workspaceId;
  const rows = input.attestations
    .map((attestation) =>
      createRow({
        attestation,
        certificationPacket: input.certificationPacket,
        renewalMonitor: input.renewalMonitor,
      }),
    )
    .sort((first, second) =>
      first.certificateVersion.localeCompare(second.certificateVersion),
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
  const fileBase = `${slug(workspaceId)}-release-attestation-history-ledger-${slug(
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
        label: "Release attestation history ledger CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release attestation history ledger JSON",
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
  readonly attestation: ReleaseAttestationHistoryEntryInput;
  readonly certificationPacket: ReleaseCertificationPacket;
  readonly renewalMonitor: ReleaseCertificationRenewalMonitor;
}): ReleaseAttestationHistoryRow {
  const rowInput: Required<ReleaseAttestationHistoryEntryInput> = {
    attestationHash: input.attestation.attestationHash?.trim() ?? "",
    attestationOwner: input.attestation.attestationOwner?.trim() ?? "",
    certificateVersion: input.attestation.certificateVersion?.trim() ?? "",
    issuedAt: input.attestation.issuedAt?.trim() ?? "",
    lineageHash: input.attestation.lineageHash?.trim() ?? "",
    parentCertificateVersion:
      input.attestation.parentCertificateVersion?.trim() ?? "",
    status: input.attestation.status ?? "current",
  };
  const certificationPacketHash =
    input.certificationPacket.summary.packetHash.trim();
  const renewalMonitorHash = input.renewalMonitor.summary.monitorHash.trim();
  const certificationPacketReady =
    hasSha256(certificationPacketHash) &&
    input.certificationPacket.summary.status === "ready" &&
    input.certificationPacket.summary.goNoGoDecision === "go";
  const renewalMonitorReady =
    hasSha256(renewalMonitorHash) &&
    input.renewalMonitor.summary.status === "ready" &&
    !input.renewalMonitor.summary.releaseCertificationBlocked;
  const attestationHashReady = hasSha256(rowInput.attestationHash);
  const attestationOwnerReady = rowInput.attestationOwner.length > 0;
  const certificateLineageReady =
    rowInput.certificateVersion.length > 0 && hasSha256(rowInput.lineageHash);
  const status = statusFor({
    attestationHashReady,
    attestationOwnerReady,
    certificateLineageReady,
    certificationPacketReady,
    inputStatus: rowInput.status,
    renewalMonitorReady,
  });
  const rowWithoutHash = {
    ...rowInput,
    attestationHashReady,
    attestationOwnerReady,
    certificateLineageReady,
    certificationPacketHash,
    certificationPacketReady,
    nextAction: "",
    renewalMonitorHash,
    renewalMonitorReady,
    status,
  };
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    ledgerHash: sha256(row),
  };
}

function statusFor(input: {
  readonly attestationHashReady: boolean;
  readonly attestationOwnerReady: boolean;
  readonly certificateLineageReady: boolean;
  readonly certificationPacketReady: boolean;
  readonly inputStatus: ReleaseAttestationHistoryStatus;
  readonly renewalMonitorReady: boolean;
}): ReleaseAttestationHistoryStatus {
  if (
    !input.attestationHashReady ||
    !input.attestationOwnerReady ||
    !input.certificateLineageReady ||
    !input.certificationPacketReady ||
    !input.renewalMonitorReady ||
    input.inputStatus === "blocked"
  ) {
    return "blocked";
  }

  if (input.inputStatus === "historical") {
    return "historical";
  }

  return "current";
}

function nextActionFor(
  row: Omit<ReleaseAttestationHistoryRow, "ledgerHash">,
) {
  if (row.status === "blocked") {
    return `Resolve blocked release attestation history ledger for ${row.certificateVersion || "unversioned certificate"}.`;
  }

  if (row.status === "historical") {
    return `Retain ${row.certificateVersion} as immutable release attestation history.`;
  }

  return `Keep ${row.certificateVersion} current until replay verification or revocation supersedes it.`;
}

function summarize(
  rows: readonly ReleaseAttestationHistoryRow[],
): ReleaseAttestationHistoryLedger["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const currentCount = rows.filter((row) => row.status === "current").length;
  const historicalCount = rows.filter(
    (row) => row.status === "historical",
  ).length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.attestationHashReady,
        row.attestationOwnerReady,
        row.certificateLineageReady,
        row.certificationPacketReady,
        row.renewalMonitorReady,
      ].filter(Boolean).length,
    0,
  );
  const status: ReleaseAttestationHistoryStatus =
    blockedCount > 0 ? "blocked" : currentCount > 0 ? "current" : "historical";
  const current = rows.find((row) => row.status === "current");

  return {
    blockedCount,
    currentCertificateVersion: current?.certificateVersion ?? "",
    currentCount,
    historicalCount,
    ledgerHash: sha256(rows.map((row) => row.ledgerHash)),
    ledgerScore:
      rows.length === 0
        ? 100
        : Math.round((readySignals / (rows.length * 5)) * 100),
    nextAction:
      status === "blocked"
        ? "Resolve blocked release attestation history ledger before attestation replay."
        : status === "current"
          ? "Release attestation history ledger is current for replay verification."
          : "Release attestation history ledger has historical attestations only.",
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: readonly ReleaseAttestationHistoryRow[]) {
  const header = [
    "certificate_version",
    "status",
    "attestation_owner",
    "certification_packet_ready",
    "renewal_monitor_ready",
    "certificate_lineage_ready",
    "ledger_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.certificateVersion,
    row.status,
    row.attestationOwner,
    String(row.certificationPacketReady),
    String(row.renewalMonitorReady),
    String(row.certificateLineageReady),
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
