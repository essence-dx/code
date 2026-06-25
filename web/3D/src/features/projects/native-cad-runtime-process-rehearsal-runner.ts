import { createHash } from "node:crypto";

import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";
import {
  runPackagedCadRuntimeExecutionAdapter,
  type PackagedCadRuntimeExecutionAdapterStatus,
  type PackagedCadRuntimeExecutionConfig,
  type PackagedCadRuntimeExecutionExecutor,
  type PackagedCadRuntimeExecutionRow,
} from "@/features/projects/packaged-cad-runtime-execution-adapter";

export type NativeCadRuntimeProcessRehearsalStatus =
  PackagedCadRuntimeExecutionAdapterStatus;

export type NativeCadRuntimeProcessRehearsalFileFormat = "csv" | "json";

export interface NativeCadRuntimeProcessRehearsalTranscriptStoreRequest {
  readonly adapterId: CadConversionWorkerAdapterId;
  readonly command: string;
  readonly executionHash: string;
  readonly outputHash: string;
  readonly outputPath: string;
  readonly releaseCandidateId: string;
  readonly runId: string;
  readonly status: PackagedCadRuntimeExecutionAdapterStatus;
  readonly stderrHash: string;
  readonly stdoutHash: string;
  readonly transcriptHash: string;
  readonly workspaceId: string;
}

export interface NativeCadRuntimeProcessRehearsalTranscriptStoreResult {
  readonly persisted: boolean;
  readonly persistedAt: string;
  readonly receiptHash: string;
  readonly storagePath: string;
}

export type NativeCadRuntimeProcessRehearsalTranscriptStore = (
  request: NativeCadRuntimeProcessRehearsalTranscriptStoreRequest,
) => Promise<NativeCadRuntimeProcessRehearsalTranscriptStoreResult>;

export interface NativeCadRuntimeProcessRehearsalRow {
  readonly adapterId: CadConversionWorkerAdapterId;
  readonly adapterStatus: PackagedCadRuntimeExecutionAdapterStatus;
  readonly blockerReason: string;
  readonly command: string;
  readonly executionHash: string;
  readonly failureReason: string;
  readonly nextAction: string;
  readonly outputHash: string;
  readonly outputPath: string;
  readonly persistedAt: string;
  readonly processExecuted: boolean;
  readonly receiptHash: string;
  readonly receiptHashAttached: boolean;
  readonly rehearsalHash: string;
  readonly runId: string;
  readonly status: NativeCadRuntimeProcessRehearsalStatus;
  readonly stderrHash: string;
  readonly stdoutHash: string;
  readonly storagePath: string;
  readonly storagePathReady: boolean;
  readonly transcriptHash: string;
  readonly transcriptPersisted: boolean;
  readonly transcriptReady: boolean;
}

export interface NativeCadRuntimeProcessRehearsalFile {
  readonly download: string;
  readonly format: NativeCadRuntimeProcessRehearsalFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface NativeCadRuntimeProcessRehearsalReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: readonly NativeCadRuntimeProcessRehearsalFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly NativeCadRuntimeProcessRehearsalRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly nextAction: string;
    readonly processExecutedCount: number;
    readonly readyCount: number;
    readonly receiptReadyCount: number;
    readonly rehearsalHash: string;
    readonly rehearsalScore: number;
    readonly releaseBlocked: boolean;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: NativeCadRuntimeProcessRehearsalStatus;
    readonly transcriptPersistedCount: number;
    readonly transcriptReadyCount: number;
  };
  readonly workspaceId: string;
}

export interface RunNativeCadRuntimeProcessRehearsalRunnerInput {
  readonly executor: PackagedCadRuntimeExecutionExecutor;
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredAdapters?: readonly CadConversionWorkerAdapterId[];
  readonly runtimes: readonly PackagedCadRuntimeExecutionConfig[];
  readonly transcriptStore: NativeCadRuntimeProcessRehearsalTranscriptStore;
  readonly workspaceId?: string;
}

const defaultWorkspaceId = "Essence Runtime";

export async function runNativeCadRuntimeProcessRehearsalRunner(
  input: RunNativeCadRuntimeProcessRehearsalRunnerInput,
): Promise<NativeCadRuntimeProcessRehearsalReport> {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? defaultWorkspaceId;
  const adapterReport = await runPackagedCadRuntimeExecutionAdapter({
    executor: input.executor,
    generatedAt,
    releaseCandidateId: input.releaseCandidateId,
    requiredAdapters: input.requiredAdapters,
    runtimes: input.runtimes,
    workspaceId,
  });
  const rows = await Promise.all(
    adapterReport.rows.map((executionRow) =>
      createRow({
        executionRow,
        releaseCandidateId: input.releaseCandidateId,
        transcriptStore: input.transcriptStore,
        workspaceId,
      }),
    ),
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
  const fileBase = `${slug(workspaceId)}-native-cad-runtime-process-rehearsal-runner-${slug(
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
        label: "Native CAD runtime process rehearsal runner CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native CAD runtime process rehearsal runner JSON",
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

async function createRow(input: {
  readonly executionRow: PackagedCadRuntimeExecutionRow;
  readonly releaseCandidateId: string;
  readonly transcriptStore: NativeCadRuntimeProcessRehearsalTranscriptStore;
  readonly workspaceId: string;
}): Promise<NativeCadRuntimeProcessRehearsalRow> {
  const executionRow = input.executionRow;
  const processExecuted =
    executionRow.exitCode === 0 &&
    executionRow.executableResolved &&
    executionRow.commandReady &&
    executionRow.outputReady;
  const transcriptReady = processExecuted && executionRow.transcriptReady;
  const persistence = transcriptReady
    ? await persistTranscript({
        executionRow,
        releaseCandidateId: input.releaseCandidateId,
        transcriptStore: input.transcriptStore,
        workspaceId: input.workspaceId,
      })
    : missingPersistence();
  const receiptHash = persistence.receiptHash.trim() || "missing";
  const storagePath = normalizePath(persistence.storagePath);
  const receiptHashAttached = hasSha256(receiptHash);
  const storagePathReady = storagePath.length > 0;
  const transcriptPersisted =
    persistence.persisted &&
    validDate(persistence.persistedAt) &&
    receiptHashAttached &&
    storagePathReady;
  const status = statusFor({
    adapterStatus: executionRow.status,
    processExecuted,
    receiptHashAttached,
    storagePathReady,
    transcriptPersisted,
    transcriptReady,
  });
  const blockerReason = blockerReasonFor({
    adapterFailureReason: executionRow.failureReason,
    adapterId: executionRow.adapterId,
    processExecuted,
    receiptHashAttached,
    storagePathReady,
    transcriptPersisted,
    transcriptReady,
  });
  const rowWithoutHash = {
    adapterId: executionRow.adapterId,
    adapterStatus: executionRow.status,
    blockerReason,
    command: executionRow.command,
    executionHash: executionRow.executionHash,
    failureReason: executionRow.failureReason,
    nextAction: "",
    outputHash: executionRow.outputHash,
    outputPath: executionRow.outputPath,
    persistedAt: persistence.persistedAt.trim(),
    processExecuted,
    receiptHash,
    receiptHashAttached,
    runId: executionRow.runId,
    status,
    stderrHash: executionRow.stderrHash,
    stdoutHash: executionRow.stdoutHash,
    storagePath,
    storagePathReady,
    transcriptHash: executionRow.transcriptHash,
    transcriptPersisted,
    transcriptReady,
  } satisfies Omit<NativeCadRuntimeProcessRehearsalRow, "rehearsalHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    rehearsalHash: sha256(row),
  };
}

async function persistTranscript(input: {
  readonly executionRow: PackagedCadRuntimeExecutionRow;
  readonly releaseCandidateId: string;
  readonly transcriptStore: NativeCadRuntimeProcessRehearsalTranscriptStore;
  readonly workspaceId: string;
}): Promise<NativeCadRuntimeProcessRehearsalTranscriptStoreResult> {
  try {
    return await input.transcriptStore({
      adapterId: input.executionRow.adapterId,
      command: input.executionRow.command,
      executionHash: input.executionRow.executionHash,
      outputHash: input.executionRow.outputHash,
      outputPath: input.executionRow.outputPath,
      releaseCandidateId: input.releaseCandidateId,
      runId: input.executionRow.runId,
      status: input.executionRow.status,
      stderrHash: input.executionRow.stderrHash,
      stdoutHash: input.executionRow.stdoutHash,
      transcriptHash: input.executionRow.transcriptHash,
      workspaceId: input.workspaceId,
    });
  } catch {
    return missingPersistence();
  }
}

function missingPersistence(): NativeCadRuntimeProcessRehearsalTranscriptStoreResult {
  return {
    persisted: false,
    persistedAt: "",
    receiptHash: "missing",
    storagePath: "",
  };
}

function statusFor(input: {
  readonly adapterStatus: PackagedCadRuntimeExecutionAdapterStatus;
  readonly processExecuted: boolean;
  readonly receiptHashAttached: boolean;
  readonly storagePathReady: boolean;
  readonly transcriptPersisted: boolean;
  readonly transcriptReady: boolean;
}): NativeCadRuntimeProcessRehearsalStatus {
  if (
    input.adapterStatus === "blocked" ||
    !input.processExecuted ||
    !input.transcriptReady ||
    !input.transcriptPersisted ||
    !input.receiptHashAttached ||
    !input.storagePathReady
  ) {
    return "blocked";
  }

  if (input.adapterStatus === "review") {
    return "review";
  }

  return "ready";
}

function blockerReasonFor(input: {
  readonly adapterFailureReason: string;
  readonly adapterId: CadConversionWorkerAdapterId;
  readonly processExecuted: boolean;
  readonly receiptHashAttached: boolean;
  readonly storagePathReady: boolean;
  readonly transcriptPersisted: boolean;
  readonly transcriptReady: boolean;
}) {
  const blockers = [
    !input.processExecuted
      ? `CAD runtime process did not execute successfully for ${input.adapterId}`
      : "",
    !input.transcriptReady
      ? `CAD runtime transcript is not ready for ${input.adapterId}`
      : "",
    !input.transcriptPersisted
      ? `CAD runtime transcript persistence is missing for ${input.adapterId}`
      : "",
    !input.receiptHashAttached
      ? `CAD runtime transcript receipt hash is missing for ${input.adapterId}`
      : "",
    !input.storagePathReady
      ? `CAD runtime transcript storage path is missing for ${input.adapterId}`
      : "",
    input.adapterFailureReason,
  ].filter(Boolean);

  return blockers.join("; ");
}

function nextActionFor(
  row: Pick<
    NativeCadRuntimeProcessRehearsalRow,
    | "adapterId"
    | "blockerReason"
    | "processExecuted"
    | "receiptHashAttached"
    | "status"
    | "storagePathReady"
    | "transcriptPersisted"
    | "transcriptReady"
  >,
) {
  if (row.status === "ready") {
    return `Native CAD runtime process rehearsal runner is ready for ${row.adapterId}.`;
  }

  if (row.status === "review") {
    return `Review native CAD runtime process rehearsal runner for ${row.adapterId}.`;
  }

  if (!row.processExecuted) {
    return `Resolve blocked native CAD runtime process rehearsal runner for ${row.adapterId}: ${row.blockerReason}.`;
  }

  if (!row.transcriptReady) {
    return `Attach native CAD runtime transcript evidence for ${row.adapterId}.`;
  }

  if (!row.transcriptPersisted || !row.receiptHashAttached || !row.storagePathReady) {
    return `Persist native CAD runtime transcript evidence for ${row.adapterId}.`;
  }

  return `Resolve blocked native CAD runtime process rehearsal runner for ${row.adapterId}.`;
}

function summarize(
  rows: readonly NativeCadRuntimeProcessRehearsalRow[],
): NativeCadRuntimeProcessRehearsalReport["summary"] {
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const processExecutedCount = rows.filter((row) => row.processExecuted).length;
  const transcriptReadyCount = rows.filter((row) => row.transcriptReady).length;
  const transcriptPersistedCount = rows.filter(
    (row) => row.transcriptPersisted,
  ).length;
  const receiptReadyCount = rows.filter(
    (row) => row.receiptHashAttached && row.storagePathReady,
  ).length;
  const status: NativeCadRuntimeProcessRehearsalStatus =
    rows.length === 0 || blockedCount > 0
      ? "blocked"
      : reviewCount > 0
        ? "review"
        : "ready";
  const rehearsalScore =
    rows.length === 0
      ? 0
      : Math.round(
          ((processExecutedCount +
            transcriptReadyCount +
            transcriptPersistedCount +
            receiptReadyCount) /
            (rows.length * 4)) *
            100,
        );
  const blockers = rows
    .filter((row) => row.status !== "ready")
    .map((row) => row.blockerReason)
    .filter(Boolean);
  const summaryWithoutHash = {
    blockedCount,
    nextAction:
      status === "ready"
        ? "Native CAD runtime process rehearsal runner is ready for runtime integration."
        : `Resolve blocked native CAD runtime process rehearsal runner: ${blockers.join(
            "; ",
          )}`,
    processExecutedCount,
    readyCount,
    receiptReadyCount,
    rehearsalScore,
    releaseBlocked: status === "blocked",
    reviewCount,
    rowCount: rows.length,
    status,
    transcriptPersistedCount,
    transcriptReadyCount,
  };

  return {
    ...summaryWithoutHash,
    rehearsalHash: sha256({
      rowHashes: rows.map((row) => row.rehearsalHash),
      summary: summaryWithoutHash,
    }),
  };
}

function createCsv(rows: readonly NativeCadRuntimeProcessRehearsalRow[]) {
  const headers = [
    "adapter_id",
    "status",
    "process_executed",
    "transcript_ready",
    "transcript_persisted",
    "receipt_hash_attached",
    "rehearsal_hash",
    "next_action",
  ];
  const lines = rows.map((row) =>
    [
      row.adapterId,
      row.status,
      String(row.processExecuted),
      String(row.transcriptReady),
      String(row.transcriptPersisted),
      String(row.receiptHashAttached),
      row.rehearsalHash,
      row.nextAction,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
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
