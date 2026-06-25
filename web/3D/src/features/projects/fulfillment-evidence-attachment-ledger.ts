import { createHash } from "node:crypto";

import type { CustomerFacingNativeFulfillmentStatusPacket } from "@/features/projects/customer-facing-native-fulfillment-status-packet";
import type { NativeCadRuntimeProcessRehearsalReport } from "@/features/projects/native-cad-runtime-process-rehearsal-runner";
import type { NativeExportFulfillmentRehearsalReport } from "@/features/projects/native-export-fulfillment-rehearsal";
import type { SignedPackageFilesystemVerificationRunPacket } from "@/features/projects/signed-package-filesystem-verification-run-packet";

export type FulfillmentEvidenceAttachmentLedgerSource =
  | "cad-process-transcripts"
  | "customer-status"
  | "filesystem-package-verification"
  | "launch-rehearsal";

export type FulfillmentEvidenceAttachmentLedgerStatus =
  | "blocked"
  | "ready"
  | "review";

export type FulfillmentEvidenceAttachmentLedgerFileFormat = "csv" | "json";

export interface FulfillmentEvidenceAttachmentInput {
  readonly attachedAt: string;
  readonly attachmentOwner: string;
  readonly packetHash: string;
  readonly source: FulfillmentEvidenceAttachmentLedgerSource;
  readonly storagePath: string;
}

export interface FulfillmentEvidenceAttachmentLedgerRow {
  readonly attachedAt: string;
  readonly attachmentOwner: string;
  readonly attachmentReady: boolean;
  readonly blockerReason: string;
  readonly filesReady: boolean;
  readonly hashMatches: boolean;
  readonly ledgerHash: string;
  readonly nextAction: string;
  readonly packetHash: string;
  readonly releaseCandidateMatches: boolean;
  readonly source: FulfillmentEvidenceAttachmentLedgerSource;
  readonly sourceAttached: boolean;
  readonly sourceHash: string;
  readonly sourceReleaseBlocked: boolean;
  readonly sourceScore: number;
  readonly sourceStatus: FulfillmentEvidenceAttachmentLedgerStatus;
  readonly status: FulfillmentEvidenceAttachmentLedgerStatus;
  readonly storagePath: string;
  readonly storagePathReady: boolean;
}

export interface FulfillmentEvidenceAttachmentLedgerFile {
  readonly download: string;
  readonly format: FulfillmentEvidenceAttachmentLedgerFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface FulfillmentEvidenceAttachmentLedger {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: readonly FulfillmentEvidenceAttachmentLedgerFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly FulfillmentEvidenceAttachmentLedgerRow[];
  readonly summary: {
    readonly attachmentReadyCount: number;
    readonly blockedCount: number;
    readonly fileReadyCount: number;
    readonly hashMatchCount: number;
    readonly ledgerHash: string;
    readonly ledgerScore: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly releaseBlocked: boolean;
    readonly releaseCandidateMatchCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: FulfillmentEvidenceAttachmentLedgerStatus;
  };
  readonly workspaceId: string;
}

export interface CreateFulfillmentEvidenceAttachmentLedgerInput {
  readonly attachments: readonly FulfillmentEvidenceAttachmentInput[];
  readonly cadProcessRehearsal?: NativeCadRuntimeProcessRehearsalReport;
  readonly customerStatus?: CustomerFacingNativeFulfillmentStatusPacket;
  readonly filesystemVerification?: SignedPackageFilesystemVerificationRunPacket;
  readonly generatedAt?: string;
  readonly launchRehearsal?: NativeExportFulfillmentRehearsalReport;
  readonly releaseCandidateId: string;
  readonly workspaceId?: string;
}

interface SourceConfig {
  readonly hashKey: string;
  readonly label: string;
  readonly scoreKey: string;
  readonly source: FulfillmentEvidenceAttachmentLedgerSource;
}

interface SourceSnapshot {
  readonly filesReady: boolean;
  readonly releaseCandidateMatches: boolean;
  readonly sourceAttached: boolean;
  readonly sourceHash: string;
  readonly sourceReleaseBlocked: boolean;
  readonly sourceScore: number;
  readonly sourceStatus: FulfillmentEvidenceAttachmentLedgerStatus;
}

interface EvidencePacket {
  readonly files?: readonly {
    readonly download?: string;
    readonly format?: string;
    readonly href?: string;
  }[];
  readonly releaseCandidateId?: string;
  readonly summary?: Record<string, unknown>;
}

const sourceConfigs: readonly SourceConfig[] = [
  {
    hashKey: "verificationHash",
    label: "filesystem package verification",
    scoreKey: "verificationScore",
    source: "filesystem-package-verification",
  },
  {
    hashKey: "rehearsalHash",
    label: "CAD process transcript rehearsal",
    scoreKey: "rehearsalScore",
    source: "cad-process-transcripts",
  },
  {
    hashKey: "rehearsalHash",
    label: "launch rehearsal",
    scoreKey: "rehearsalScore",
    source: "launch-rehearsal",
  },
  {
    hashKey: "statusHash",
    label: "customer status packet",
    scoreKey: "statusScore",
    source: "customer-status",
  },
];

export function createFulfillmentEvidenceAttachmentLedger(
  input: CreateFulfillmentEvidenceAttachmentLedgerInput,
): FulfillmentEvidenceAttachmentLedger {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const attachmentsBySource = new Map(
    input.attachments.map((attachment) => [
      attachment.source,
      normalizeAttachment(attachment),
    ]),
  );
  const packets = packetsBySource(input);
  const rows = sourceConfigs.map((config) =>
    createRow({
      attachment: attachmentsBySource.get(config.source),
      config,
      releaseCandidateId: input.releaseCandidateId,
      sourcePacket: packets.get(config.source),
    }),
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
  const fileBase = `${slug(workspaceId)}-fulfillment-evidence-attachment-ledger-${slug(
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
        label: "Fulfillment evidence attachment ledger CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Fulfillment evidence attachment ledger JSON",
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

function packetsBySource(input: CreateFulfillmentEvidenceAttachmentLedgerInput) {
  return new Map<FulfillmentEvidenceAttachmentLedgerSource, EvidencePacket | undefined>(
    [
      ["filesystem-package-verification", input.filesystemVerification],
      ["cad-process-transcripts", input.cadProcessRehearsal],
      ["launch-rehearsal", input.launchRehearsal],
      ["customer-status", input.customerStatus],
    ],
  );
}

function createRow(input: {
  readonly attachment: FulfillmentEvidenceAttachmentInput | undefined;
  readonly config: SourceConfig;
  readonly releaseCandidateId: string;
  readonly sourcePacket: EvidencePacket | undefined;
}): FulfillmentEvidenceAttachmentLedgerRow {
  const snapshot = sourceSnapshot({
    config: input.config,
    releaseCandidateId: input.releaseCandidateId,
    sourcePacket: input.sourcePacket,
  });
  const attachment = input.attachment ?? missingAttachment(input.config.source);
  const storagePathReady = storagePathReadyFor(attachment.storagePath);
  const attachmentReady =
    validDate(attachment.attachedAt) &&
    attachment.attachmentOwner.length > 0 &&
    hasSha256(attachment.packetHash) &&
    storagePathReady;
  const hashMatches =
    hasSha256(snapshot.sourceHash) && attachment.packetHash === snapshot.sourceHash;
  const status = statusFor({
    attachmentReady,
    filesReady: snapshot.filesReady,
    hashMatches,
    releaseCandidateMatches: snapshot.releaseCandidateMatches,
    sourceAttached: snapshot.sourceAttached,
    sourceReleaseBlocked: snapshot.sourceReleaseBlocked,
    sourceStatus: snapshot.sourceStatus,
  });
  const blockerReason = blockerReasonFor({
    attachmentReady,
    config: input.config,
    filesReady: snapshot.filesReady,
    hashMatches,
    releaseCandidateMatches: snapshot.releaseCandidateMatches,
    sourceAttached: snapshot.sourceAttached,
    sourceReleaseBlocked: snapshot.sourceReleaseBlocked,
    storagePathReady,
  });
  const rowWithoutHash = {
    attachedAt: attachment.attachedAt,
    attachmentOwner: attachment.attachmentOwner,
    attachmentReady,
    blockerReason,
    filesReady: snapshot.filesReady,
    hashMatches,
    nextAction: "",
    packetHash: attachment.packetHash || "missing",
    releaseCandidateMatches: snapshot.releaseCandidateMatches,
    source: input.config.source,
    sourceAttached: snapshot.sourceAttached,
    sourceHash: snapshot.sourceHash,
    sourceReleaseBlocked: snapshot.sourceReleaseBlocked,
    sourceScore: snapshot.sourceScore,
    sourceStatus: snapshot.sourceStatus,
    status,
    storagePath: attachment.storagePath,
    storagePathReady,
  } satisfies Omit<FulfillmentEvidenceAttachmentLedgerRow, "ledgerHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    ledgerHash: sha256(row),
  };
}

function sourceSnapshot(input: {
  readonly config: SourceConfig;
  readonly releaseCandidateId: string;
  readonly sourcePacket: EvidencePacket | undefined;
}): SourceSnapshot {
  const packet = input.sourcePacket;
  const summary = packet?.summary;
  const sourceAttached = Boolean(packet && summary);
  const sourceHash = stringValue(summary?.[input.config.hashKey]) || "missing";
  const sourceStatus = statusValue(summary?.status);

  return {
    filesReady: filesReady(packet?.files),
    releaseCandidateMatches:
      sourceAttached && packet?.releaseCandidateId === input.releaseCandidateId,
    sourceAttached,
    sourceHash,
    sourceReleaseBlocked: Boolean(summary?.releaseBlocked),
    sourceScore: numberValue(summary?.[input.config.scoreKey]),
    sourceStatus,
  };
}

function normalizeAttachment(
  attachment: FulfillmentEvidenceAttachmentInput,
): FulfillmentEvidenceAttachmentInput {
  return {
    attachedAt: attachment.attachedAt.trim(),
    attachmentOwner: attachment.attachmentOwner.trim(),
    packetHash: attachment.packetHash.trim(),
    source: attachment.source,
    storagePath: normalizePath(attachment.storagePath),
  };
}

function missingAttachment(
  source: FulfillmentEvidenceAttachmentLedgerSource,
): FulfillmentEvidenceAttachmentInput {
  return {
    attachedAt: "",
    attachmentOwner: "",
    packetHash: "",
    source,
    storagePath: "",
  };
}

function statusFor(input: {
  readonly attachmentReady: boolean;
  readonly filesReady: boolean;
  readonly hashMatches: boolean;
  readonly releaseCandidateMatches: boolean;
  readonly sourceAttached: boolean;
  readonly sourceReleaseBlocked: boolean;
  readonly sourceStatus: FulfillmentEvidenceAttachmentLedgerStatus;
}): FulfillmentEvidenceAttachmentLedgerStatus {
  if (
    !input.sourceAttached ||
    input.sourceStatus === "blocked" ||
    input.sourceReleaseBlocked ||
    !input.releaseCandidateMatches ||
    !input.filesReady ||
    !input.attachmentReady ||
    !input.hashMatches
  ) {
    return "blocked";
  }

  if (input.sourceStatus === "review") {
    return "review";
  }

  return "ready";
}

function blockerReasonFor(input: {
  readonly attachmentReady: boolean;
  readonly config: SourceConfig;
  readonly filesReady: boolean;
  readonly hashMatches: boolean;
  readonly releaseCandidateMatches: boolean;
  readonly sourceAttached: boolean;
  readonly sourceReleaseBlocked: boolean;
  readonly storagePathReady: boolean;
}) {
  const label = input.config.label;
  const blockers = [
    !input.sourceAttached ? `Missing ${label} source packet` : "",
    input.sourceReleaseBlocked ? `${label} source packet is release-blocking` : "",
    !input.releaseCandidateMatches
      ? `${label} release candidate does not match this ledger`
      : "",
    !input.filesReady ? `${label} CSV/JSON evidence files are incomplete` : "",
    !input.attachmentReady ? `${label} attachment receipt is incomplete` : "",
    !input.storagePathReady ? `${label} storage path is missing` : "",
    !input.hashMatches ? `${label} attachment hash does not match source hash` : "",
  ].filter(Boolean);

  return blockers.join("; ");
}

function nextActionFor(
  row: Pick<
    FulfillmentEvidenceAttachmentLedgerRow,
    | "blockerReason"
    | "source"
    | "status"
  >,
) {
  if (row.status === "ready") {
    return `${row.source} is attached to the fulfillment evidence ledger.`;
  }

  if (row.status === "review") {
    return `Review fulfillment evidence attachment ledger for ${row.source}.`;
  }

  return `Resolve blocked fulfillment evidence attachment ledger for ${row.source}: ${row.blockerReason}.`;
}

function summarize(
  rows: readonly FulfillmentEvidenceAttachmentLedgerRow[],
): FulfillmentEvidenceAttachmentLedger["summary"] {
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const attachmentReadyCount = rows.filter((row) => row.attachmentReady).length;
  const fileReadyCount = rows.filter((row) => row.filesReady).length;
  const hashMatchCount = rows.filter((row) => row.hashMatches).length;
  const releaseCandidateMatchCount = rows.filter(
    (row) => row.releaseCandidateMatches,
  ).length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.sourceAttached,
        row.sourceStatus !== "blocked",
        !row.sourceReleaseBlocked,
        row.releaseCandidateMatches,
        row.filesReady,
        row.attachmentReady,
        row.hashMatches,
      ].filter(Boolean).length,
    0,
  );
  const status: FulfillmentEvidenceAttachmentLedgerStatus =
    rows.length === 0 || blockedCount > 0
      ? "blocked"
      : reviewCount > 0
        ? "review"
        : "ready";
  const blockers = rows
    .filter((row) => row.status !== "ready")
    .map((row) => row.blockerReason)
    .filter(Boolean);
  const summaryWithoutHash = {
    attachmentReadyCount,
    blockedCount,
    fileReadyCount,
    hashMatchCount,
    ledgerScore:
      rows.length === 0
        ? 0
        : Math.round((readySignals / (rows.length * 7)) * 100),
    nextAction:
      status === "ready"
        ? "Fulfillment evidence attachment ledger is ready for release-candidate review."
        : `Resolve blocked fulfillment evidence attachment ledger: ${blockers.join(
            "; ",
          )}`,
    readyCount,
    releaseBlocked: status === "blocked" || rows.some((row) => row.sourceReleaseBlocked),
    releaseCandidateMatchCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };

  return {
    ...summaryWithoutHash,
    ledgerHash: sha256({
      rowHashes: rows.map((row) => row.ledgerHash),
      summary: summaryWithoutHash,
    }),
  };
}

function createCsv(rows: readonly FulfillmentEvidenceAttachmentLedgerRow[]) {
  const headers = [
    "source",
    "status",
    "source_status",
    "release_candidate_matches",
    "files_ready",
    "attachment_ready",
    "hash_matches",
    "ledger_hash",
    "next_action",
  ];
  const lines = rows.map((row) =>
    [
      row.source,
      row.status,
      row.sourceStatus,
      String(row.releaseCandidateMatches),
      String(row.filesReady),
      String(row.attachmentReady),
      String(row.hashMatches),
      row.ledgerHash,
      row.nextAction,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

function filesReady(files: EvidencePacket["files"]) {
  const csv = files?.some(
    (file) =>
      file.format === "csv" &&
      Boolean(file.download?.endsWith(".csv")) &&
      Boolean(file.href?.startsWith("data:text/csv")),
  );
  const json = files?.some(
    (file) =>
      file.format === "json" &&
      Boolean(file.download?.endsWith(".json")) &&
      Boolean(file.href?.startsWith("data:application/json")),
  );

  return Boolean(csv && json);
}

function statusValue(value: unknown): FulfillmentEvidenceAttachmentLedgerStatus {
  return value === "ready" || value === "review" ? value : "blocked";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;
}

function storagePathReadyFor(value: string) {
  return value.length > 0 && !value.endsWith("/");
}

function normalizePath(value: string) {
  return value.trim().replaceAll("\\", "/");
}

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:") && value.trim().length > "sha256:".length;
}

function validDate(value: string) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp);
}

function csvEscape(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
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

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}
