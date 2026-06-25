import { createHash } from "node:crypto";

import type {
  ReleaseAttestationHistoryLedger,
  ReleaseAttestationHistoryRow,
} from "@/features/projects/release-attestation-history-ledger";
import type { ReleaseCertificationExceptionLedger } from "@/features/projects/release-certification-exception-ledger";
import type {
  ReleaseCertificationPacket,
  ReleaseCertificationPacketArea,
} from "@/features/projects/release-certification-packet";
import type { ReleaseCertificationRenewalMonitor } from "@/features/projects/release-certification-renewal-monitor";

export type ReleaseAttestationReplayKind =
  | "certification-packet"
  | "exception-ledger"
  | "renewal-monitor";

export type ReleaseAttestationReplayStatus =
  | "drift"
  | "matched"
  | "missing";

export type ReleaseAttestationReplayFileFormat = "csv" | "json";

export interface ReleaseAttestationReplayVerifierInput {
  readonly attestationHistoryLedger: ReleaseAttestationHistoryLedger;
  readonly certificationPacket: ReleaseCertificationPacket;
  readonly exceptionLedger: ReleaseCertificationExceptionLedger;
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly renewalMonitor: ReleaseCertificationRenewalMonitor;
  readonly workspaceId?: string;
}

export interface ReleaseAttestationReplayRow {
  readonly actualHash: string;
  readonly expectedHash: string;
  readonly id: string;
  readonly kind: ReleaseAttestationReplayKind;
  readonly nextAction: string;
  readonly replayHash: string;
  readonly sourceStatus: string;
  readonly status: ReleaseAttestationReplayStatus;
}

export interface ReleaseAttestationReplayFile {
  readonly download: string;
  readonly format: ReleaseAttestationReplayFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseAttestationReplayVerifier {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseAttestationReplayFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseAttestationReplayRow[];
  readonly summary: {
    readonly currentCertificateVersion: string;
    readonly driftCount: number;
    readonly matchedCount: number;
    readonly missingCount: number;
    readonly nextAction: string;
    readonly replayHash: string;
    readonly replayScore: number;
    readonly rowCount: number;
    readonly status: ReleaseAttestationReplayStatus;
  };
  readonly workspaceId: string;
}

const kindRank: Record<ReleaseAttestationReplayKind, number> = {
  "certification-packet": 0,
  "renewal-monitor": 1,
  "exception-ledger": 2,
};

const statusRank: Record<ReleaseAttestationReplayStatus, number> = {
  missing: 0,
  drift: 1,
  matched: 2,
};

export function createReleaseAttestationReplayVerifier(
  input: ReleaseAttestationReplayVerifierInput,
): ReleaseAttestationReplayVerifier {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId =
    input.workspaceId ?? input.attestationHistoryLedger.workspaceId;
  const currentRow = findCurrentAttestation(input.attestationHistoryLedger);
  const rows = createRows({
    ...input,
    currentRow,
    generatedAt,
    workspaceId,
  }).sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      kindRank[first.kind] - kindRank[second.kind],
  );
  const summary = summarize({
    currentCertificateVersion:
      currentRow?.certificateVersion ??
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
  const fileBase = `${slug(workspaceId)}-release-attestation-replay-verifier-${slug(
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
        label: "Release attestation replay verifier CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release attestation replay verifier JSON",
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

function createRows(
  input: ReleaseAttestationReplayVerifierInput & {
    readonly currentRow: ReleaseAttestationHistoryRow | null;
    readonly generatedAt: string;
    readonly workspaceId: string;
  },
) {
  return [
    createRow({
      actualHash: input.certificationPacket.summary.packetHash,
      expectedHash: input.currentRow?.certificationPacketHash ?? "",
      generatedAt: input.generatedAt,
      kind: "certification-packet",
      sourceStatus: input.certificationPacket.summary.status,
      workspaceId: input.workspaceId,
    }),
    createRow({
      actualHash: input.renewalMonitor.summary.monitorHash,
      expectedHash: input.currentRow?.renewalMonitorHash ?? "",
      generatedAt: input.generatedAt,
      kind: "renewal-monitor",
      sourceStatus: input.renewalMonitor.summary.status,
      workspaceId: input.workspaceId,
    }),
    createRow({
      actualHash: input.exceptionLedger.summary.ledgerHash,
      expectedHash:
        findCertificationPacketEvidenceHash(
          input.certificationPacket,
          "exception-posture",
        ) ?? "",
      generatedAt: input.generatedAt,
      kind: "exception-ledger",
      sourceStatus: input.exceptionLedger.summary.status,
      workspaceId: input.workspaceId,
    }),
  ];
}

function createRow(input: {
  readonly actualHash: string;
  readonly expectedHash: string;
  readonly generatedAt: string;
  readonly kind: ReleaseAttestationReplayKind;
  readonly sourceStatus: string;
  readonly workspaceId: string;
}): ReleaseAttestationReplayRow {
  const actualHash = input.actualHash.trim();
  const expectedHash = input.expectedHash.trim();
  const status = statusFor({ actualHash, expectedHash });
  const rowWithoutHash = {
    actualHash,
    expectedHash,
    id: `release-attestation-replay:${slug(input.workspaceId)}:${input.kind}:${dateStamp(
      input.generatedAt,
    )}`,
    kind: input.kind,
    nextAction: nextActionFor({ kind: input.kind, status }),
    sourceStatus: input.sourceStatus,
    status,
  };

  return {
    ...rowWithoutHash,
    replayHash: sha256(rowWithoutHash),
  };
}

function statusFor(input: {
  readonly actualHash: string;
  readonly expectedHash: string;
}): ReleaseAttestationReplayStatus {
  if (!hasSha256(input.actualHash) || !hasSha256(input.expectedHash)) {
    return "missing";
  }

  return input.actualHash === input.expectedHash ? "matched" : "drift";
}

function nextActionFor(input: {
  readonly kind: ReleaseAttestationReplayKind;
  readonly status: ReleaseAttestationReplayStatus;
}) {
  if (input.status === "missing") {
    return `Attach missing ${input.kind} hash before release attestation distribution.`;
  }

  if (input.status === "drift") {
    return `Review ${input.kind} replay drift before release attestation distribution.`;
  }

  return `Keep ${input.kind} replay hash matched for release attestation.`;
}

function summarize(input: {
  readonly currentCertificateVersion: string;
  readonly rows: readonly ReleaseAttestationReplayRow[];
}): ReleaseAttestationReplayVerifier["summary"] {
  const driftCount = input.rows.filter((row) => row.status === "drift").length;
  const matchedCount = input.rows.filter(
    (row) => row.status === "matched",
  ).length;
  const missingCount = input.rows.filter(
    (row) => row.status === "missing",
  ).length;
  const status = input.rows.reduce<ReleaseAttestationReplayStatus>(
    (worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst),
    "matched",
  );
  const nextRow = input.rows.find((row) => row.status !== "matched") ?? null;

  return {
    currentCertificateVersion: input.currentCertificateVersion,
    driftCount,
    matchedCount,
    missingCount,
    nextAction:
      status === "matched"
        ? "Release attestation replay verifier is clean for distribution."
        : (nextRow?.nextAction ??
          "Run release attestation replay verifier before distribution."),
    replayHash: sha256(input.rows.map((row) => row.replayHash)),
    replayScore:
      input.rows.length === 0
        ? 100
        : Math.max(
            0,
            Math.round((matchedCount / input.rows.length) * 100) -
              driftCount * 18 -
              missingCount * 24,
          ),
    rowCount: input.rows.length,
    status,
  };
}

function findCurrentAttestation(
  ledger: ReleaseAttestationHistoryLedger,
): ReleaseAttestationHistoryRow | null {
  return (
    ledger.rows.find(
      (row) =>
        row.status === "current" &&
        row.certificateVersion === ledger.summary.currentCertificateVersion,
    ) ??
    ledger.rows.find((row) => row.status === "current") ??
    null
  );
}

function findCertificationPacketEvidenceHash(
  packet: ReleaseCertificationPacket,
  area: ReleaseCertificationPacketArea,
) {
  return packet.rows.find((row) => row.area === area)?.evidenceHash ?? null;
}

function createCsv(rows: readonly ReleaseAttestationReplayRow[]) {
  const header = [
    "replay_id",
    "kind",
    "status",
    "source_status",
    "actual_hash",
    "expected_hash",
    "replay_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.id,
    row.kind,
    row.status,
    row.sourceStatus,
    row.actualHash,
    row.expectedHash,
    row.replayHash,
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
