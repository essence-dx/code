import { createHash } from "node:crypto";

import type { ReleaseAttestationHistoryLedger } from "@/features/projects/release-attestation-history-ledger";
import type { ReleaseAttestationReplayVerifier } from "@/features/projects/release-attestation-replay-verifier";

export type ReleaseAttestationDistributionAudience =
  | "customer-success"
  | "external-auditor"
  | "release-owner";

export type ReleaseAttestationDistributionRoute =
  | "auditor-data-room"
  | "customer-success-secure-link"
  | "internal-release-workspace";

export type ReleaseAttestationDistributionStatus =
  | "blocked"
  | "ready"
  | "watch";

export type ReleaseAttestationDistributionFileFormat = "csv" | "json";

export interface ReleaseAttestationDistributionRecipientInput {
  readonly acknowledgementRequired?: boolean;
  readonly acknowledgementWindowHours?: number;
  readonly audience: ReleaseAttestationDistributionAudience;
  readonly recipient?: string;
}

export interface ReleaseAttestationDistributionPacketInput {
  readonly attestationHistoryLedger: ReleaseAttestationHistoryLedger;
  readonly generatedAt?: string;
  readonly recipients: readonly ReleaseAttestationDistributionRecipientInput[];
  readonly releaseCandidateId: string;
  readonly replayVerifier: ReleaseAttestationReplayVerifier;
  readonly workspaceId?: string;
}

export interface ReleaseAttestationDistributionRow
  extends Required<ReleaseAttestationDistributionRecipientInput> {
  readonly acknowledgementDeadline: string;
  readonly acknowledgementReady: boolean;
  readonly distributionHash: string;
  readonly historyLedgerHash: string;
  readonly historyReady: boolean;
  readonly id: string;
  readonly nextAction: string;
  readonly recipientReady: boolean;
  readonly replayHash: string;
  readonly replayReady: boolean;
  readonly route: ReleaseAttestationDistributionRoute;
  readonly routeReady: boolean;
  readonly status: ReleaseAttestationDistributionStatus;
}

export interface ReleaseAttestationDistributionFile {
  readonly download: string;
  readonly format: ReleaseAttestationDistributionFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseAttestationDistributionPacket {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseAttestationDistributionFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseAttestationDistributionRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly currentCertificateVersion: string;
    readonly distributionHash: string;
    readonly distributionScore: number;
    readonly nextAction: string;
    readonly pendingAcknowledgementCount: number;
    readonly readyCount: number;
    readonly recipientCount: number;
    readonly status: ReleaseAttestationDistributionStatus;
    readonly watchCount: number;
  };
  readonly workspaceId: string;
}

const audienceRank: Record<ReleaseAttestationDistributionAudience, number> = {
  "release-owner": 0,
  "customer-success": 1,
  "external-auditor": 2,
};

const statusRank: Record<ReleaseAttestationDistributionStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

export function createReleaseAttestationDistributionPacket(
  input: ReleaseAttestationDistributionPacketInput,
): ReleaseAttestationDistributionPacket {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId =
    input.workspaceId ?? input.attestationHistoryLedger.workspaceId;
  const rows = input.recipients
    .map((recipient) =>
      createRow({
        attestationHistoryLedger: input.attestationHistoryLedger,
        generatedAt,
        recipient,
        replayVerifier: input.replayVerifier,
        workspaceId,
      }),
    )
    .sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] ||
        audienceRank[first.audience] - audienceRank[second.audience] ||
        first.recipient.localeCompare(second.recipient),
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
  const fileBase = `${slug(workspaceId)}-release-attestation-distribution-packet-${slug(
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
        label: "Release attestation distribution packet CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release attestation distribution packet JSON",
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
  readonly generatedAt: string;
  readonly recipient: ReleaseAttestationDistributionRecipientInput;
  readonly replayVerifier: ReleaseAttestationReplayVerifier;
  readonly workspaceId: string;
}): ReleaseAttestationDistributionRow {
  const recipient = input.recipient.recipient?.trim() ?? "";
  const acknowledgementRequired =
    input.recipient.acknowledgementRequired ?? true;
  const acknowledgementWindowHours =
    input.recipient.acknowledgementWindowHours ?? 24;
  const route = routeFor(input.recipient.audience);
  const historyLedgerHash = input.attestationHistoryLedger.summary.ledgerHash;
  const replayHash = input.replayVerifier.summary.replayHash;
  const historyReady =
    input.attestationHistoryLedger.summary.status === "current" &&
    hasSha256(historyLedgerHash);
  const replayReady =
    input.replayVerifier.summary.status === "matched" && hasSha256(replayHash);
  const routeReady = route.length > 0;
  const recipientReady = recipient.length > 0;
  const acknowledgementReady =
    !acknowledgementRequired || acknowledgementWindowHours > 0;
  const acknowledgementDeadline = acknowledgementRequired
    ? addHours(input.generatedAt, acknowledgementWindowHours)
    : "";
  const status = statusFor({
    acknowledgementReady,
    historyReady,
    recipientReady,
    replayReady,
    routeReady,
  });
  const rowWithoutHash = {
    acknowledgementDeadline,
    acknowledgementRequired,
    acknowledgementReady,
    acknowledgementWindowHours,
    audience: input.recipient.audience,
    historyLedgerHash,
    historyReady,
    id: `release-attestation-distribution:${slug(input.workspaceId)}:${input.recipient.audience}:${dateStamp(
      input.generatedAt,
    )}`,
    nextAction: "",
    recipient,
    recipientReady,
    replayHash,
    replayReady,
    route,
    routeReady,
    status,
  };
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    distributionHash: sha256(row),
  };
}

function routeFor(
  audience: ReleaseAttestationDistributionAudience,
): ReleaseAttestationDistributionRoute {
  switch (audience) {
    case "customer-success":
      return "customer-success-secure-link";
    case "external-auditor":
      return "auditor-data-room";
    case "release-owner":
      return "internal-release-workspace";
  }
}

function statusFor(input: {
  readonly acknowledgementReady: boolean;
  readonly historyReady: boolean;
  readonly recipientReady: boolean;
  readonly replayReady: boolean;
  readonly routeReady: boolean;
}): ReleaseAttestationDistributionStatus {
  if (
    !input.historyReady ||
    !input.replayReady ||
    !input.recipientReady ||
    !input.routeReady
  ) {
    return "blocked";
  }

  return input.acknowledgementReady ? "ready" : "watch";
}

function nextActionFor(
  row: Omit<ReleaseAttestationDistributionRow, "distributionHash">,
) {
  if (row.status === "blocked") {
    return `Resolve blocked release attestation distribution for ${row.audience}.`;
  }

  if (row.status === "watch") {
    return `Review acknowledgement window before distributing release attestation to ${row.audience}.`;
  }

  return `Distribute release attestation to ${row.audience} through ${row.route}.`;
}

function summarize(input: {
  readonly currentCertificateVersion: string;
  readonly rows: readonly ReleaseAttestationDistributionRow[];
}): ReleaseAttestationDistributionPacket["summary"] {
  const blockedCount = input.rows.filter((row) => row.status === "blocked").length;
  const readyCount = input.rows.filter((row) => row.status === "ready").length;
  const watchCount = input.rows.filter((row) => row.status === "watch").length;
  const pendingAcknowledgementCount = input.rows.filter(
    (row) => row.acknowledgementRequired && row.status !== "blocked",
  ).length;
  const readySignals = input.rows.reduce(
    (total, row) =>
      total +
      [
        row.acknowledgementReady,
        row.historyReady,
        row.recipientReady,
        row.replayReady,
        row.routeReady,
      ].filter(Boolean).length,
    0,
  );
  const status: ReleaseAttestationDistributionStatus =
    blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = input.rows.find((row) => row.status !== "ready") ?? null;

  return {
    blockedCount,
    currentCertificateVersion: input.currentCertificateVersion,
    distributionHash: sha256(input.rows.map((row) => row.distributionHash)),
    distributionScore:
      input.rows.length === 0
        ? 100
        : Math.round((readySignals / (input.rows.length * 5)) * 100),
    nextAction:
      status === "ready"
        ? "Release attestation distribution packet is ready to send."
        : (nextRow?.nextAction ??
          "Resolve blocked release attestation distribution before sending."),
    pendingAcknowledgementCount,
    readyCount,
    recipientCount: input.rows.length,
    status,
    watchCount,
  };
}

function createCsv(rows: readonly ReleaseAttestationDistributionRow[]) {
  const header = [
    "distribution_id",
    "audience",
    "status",
    "recipient",
    "route",
    "acknowledgement_required",
    "acknowledgement_deadline",
    "history_ledger_hash",
    "replay_hash",
    "distribution_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.id,
    row.audience,
    row.status,
    row.recipient,
    row.route,
    String(row.acknowledgementRequired),
    row.acknowledgementDeadline,
    row.historyLedgerHash,
    row.replayHash,
    row.distributionHash,
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

function addHours(value: string, hours: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setUTCHours(date.getUTCHours() + hours);

  return date.toISOString();
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
