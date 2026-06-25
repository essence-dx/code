import { createHash } from "node:crypto";
import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";

export type PackagedCadRuntimeExecutionAdapterStatus =
  | "blocked"
  | "ready"
  | "review";

export type PackagedCadRuntimeExecutionAdapterFileFormat = "csv" | "json";

export interface PackagedCadRuntimeExecutionConfig {
  readonly adapterId: CadConversionWorkerAdapterId;
  readonly commandArguments: readonly string[];
  readonly desktopBundleRoot: string;
  readonly executableExists: boolean;
  readonly executableRelativePath: string;
  readonly fixtureInputHash: string;
  readonly fixtureInputPath: string;
  readonly installedVersion: string;
  readonly outputPath: string;
  readonly owner: string;
  readonly packagedLayoutHash: string;
  readonly sandboxProfile: string;
  readonly timeoutMs: number;
}

export interface PackagedCadRuntimeExecutionExecutorRequest {
  readonly command: string;
  readonly resolvedExecutablePath: string;
  readonly runId: string;
  readonly runtime: PackagedCadRuntimeExecutionConfig;
}

export interface PackagedCadRuntimeExecutionExecutorResult {
  readonly durationMs: number;
  readonly exitCode: number;
  readonly finishedAt?: string;
  readonly outputHash: string;
  readonly outputPath: string;
  readonly startedAt?: string;
  readonly stderr: string;
  readonly stdout: string;
}

export type PackagedCadRuntimeExecutionExecutor = (
  request: PackagedCadRuntimeExecutionExecutorRequest,
) => Promise<PackagedCadRuntimeExecutionExecutorResult>;

export interface PackagedCadRuntimeExecutionRow {
  readonly adapterId: CadConversionWorkerAdapterId;
  readonly bundleReady: boolean;
  readonly command: string;
  readonly commandArguments: readonly string[];
  readonly commandReady: boolean;
  readonly desktopBundleRoot: string;
  readonly durationMs: number;
  readonly executableExists: boolean;
  readonly executableRelativePath: string;
  readonly executableResolved: boolean;
  readonly executionHash: string;
  readonly exitCode: number;
  readonly failureReason: string;
  readonly finishedAt: string;
  readonly fixtureInputHash: string;
  readonly fixtureInputPath: string;
  readonly fixtureReady: boolean;
  readonly installedVersion: string;
  readonly nextAction: string;
  readonly outputHash: string;
  readonly outputPath: string;
  readonly outputReady: boolean;
  readonly owner: string;
  readonly ownerReady: boolean;
  readonly packagedLayoutHash: string;
  readonly resolvedExecutablePath: string;
  readonly runId: string;
  readonly sandboxProfile: string;
  readonly sandboxReady: boolean;
  readonly startedAt: string;
  readonly status: PackagedCadRuntimeExecutionAdapterStatus;
  readonly stderrExcerpt: string;
  readonly stderrHash: string;
  readonly stdoutExcerpt: string;
  readonly stdoutHash: string;
  readonly timeoutMs: number;
  readonly transcriptHash: string;
  readonly transcriptReady: boolean;
  readonly versionReady: boolean;
}

export interface PackagedCadRuntimeExecutionFile {
  readonly download: string;
  readonly format: PackagedCadRuntimeExecutionAdapterFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface PackagedCadRuntimeExecutionReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: readonly PackagedCadRuntimeExecutionFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly PackagedCadRuntimeExecutionRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly executionHash: string;
    readonly executionScore: number;
    readonly nextAction: string;
    readonly outputReadyCount: number;
    readonly readyCount: number;
    readonly releaseBlocked: boolean;
    readonly resolvedExecutableCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: PackagedCadRuntimeExecutionAdapterStatus;
    readonly transcriptReadyCount: number;
  };
  readonly workspaceId: string;
}

export interface RunPackagedCadRuntimeExecutionAdapterInput {
  readonly executor: PackagedCadRuntimeExecutionExecutor;
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredAdapters?: readonly CadConversionWorkerAdapterId[];
  readonly runtimes: readonly PackagedCadRuntimeExecutionConfig[];
  readonly workspaceId?: string;
}

const defaultRequiredAdapters: readonly CadConversionWorkerAdapterId[] = [
  "freecad",
  "occt",
];

const adapterRank: Record<CadConversionWorkerAdapterId, number> = {
  freecad: 0,
  occt: 1,
};

export async function runPackagedCadRuntimeExecutionAdapter(
  input: RunPackagedCadRuntimeExecutionAdapterInput,
): Promise<PackagedCadRuntimeExecutionReport> {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const runtimeByAdapter = new Map(
    input.runtimes.map((runtime) => [runtime.adapterId, runtime]),
  );
  const requiredAdapters = input.requiredAdapters ?? defaultRequiredAdapters;
  const rows = await Promise.all(
    requiredAdapters.map((adapterId) =>
      runRuntimeRow({
        adapterId,
        executor: input.executor,
        generatedAt,
        releaseCandidateId: input.releaseCandidateId,
        runtime: runtimeByAdapter.get(adapterId) ?? missingRuntime(adapterId),
      }),
    ),
  );
  const sortedRows = rows.sort(
    (first, second) => adapterRank[first.adapterId] - adapterRank[second.adapterId],
  );

  return createReport({
    generatedAt,
    releaseCandidateId: input.releaseCandidateId,
    rows: sortedRows,
    workspaceId,
  });
}

function missingRuntime(
  adapterId: CadConversionWorkerAdapterId,
): PackagedCadRuntimeExecutionConfig {
  return {
    adapterId,
    commandArguments: [],
    desktopBundleRoot: "",
    executableExists: false,
    executableRelativePath: "",
    fixtureInputHash: "",
    fixtureInputPath: "",
    installedVersion: "",
    outputPath: "",
    owner: "",
    packagedLayoutHash: "",
    sandboxProfile: "",
    timeoutMs: 0,
  };
}

async function runRuntimeRow(input: {
  readonly adapterId: CadConversionWorkerAdapterId;
  readonly executor: PackagedCadRuntimeExecutionExecutor;
  readonly generatedAt: string;
  readonly releaseCandidateId: string;
  readonly runtime: PackagedCadRuntimeExecutionConfig;
}) {
  const runtime = normalizeRuntime(input.runtime);
  const resolvedExecutablePath = resolveExecutablePath(runtime);
  const command = createCommand(resolvedExecutablePath, runtime.commandArguments);
  const runId = `${runtime.adapterId}-${slug(input.releaseCandidateId)}-${dateStamp(
    input.generatedAt,
  )}`;
  const preflight = preflightRuntime({
    command,
    resolvedExecutablePath,
    runtime,
  });

  if (!preflight.ready) {
    return createRow({
      command,
      durationMs: 0,
      exitCode: 1,
      failureReason: preflight.failureReason,
      finishedAt: input.generatedAt,
      outputHash: "missing",
      outputPath: runtime.outputPath,
      resolvedExecutablePath,
      runId,
      runtime,
      startedAt: input.generatedAt,
      stderr: "",
      stdout: "",
    });
  }

  try {
    const result = await input.executor({
      command,
      resolvedExecutablePath,
      runId,
      runtime,
    });
    const failureReason =
      result.exitCode === 0
        ? ""
        : result.stderr.trim() ||
          result.stdout.trim() ||
          `Packaged CAD runtime exited with code ${result.exitCode}.`;

    return createRow({
      command,
      durationMs: Math.max(0, Math.round(result.durationMs)),
      exitCode: result.exitCode,
      failureReason,
      finishedAt: result.finishedAt ?? input.generatedAt,
      outputHash: result.outputHash,
      outputPath: result.outputPath,
      resolvedExecutablePath,
      runId,
      runtime,
      startedAt: result.startedAt ?? input.generatedAt,
      stderr: result.stderr,
      stdout: result.stdout,
    });
  } catch (error) {
    const failureReason =
      error instanceof Error
        ? error.message
        : "Packaged CAD runtime execution adapter failed.";

    return createRow({
      command,
      durationMs: 0,
      exitCode: 1,
      failureReason,
      finishedAt: input.generatedAt,
      outputHash: "missing",
      outputPath: runtime.outputPath,
      resolvedExecutablePath,
      runId,
      runtime,
      startedAt: input.generatedAt,
      stderr: failureReason,
      stdout: "",
    });
  }
}

function normalizeRuntime(
  runtime: PackagedCadRuntimeExecutionConfig,
): PackagedCadRuntimeExecutionConfig {
  return {
    adapterId: runtime.adapterId,
    commandArguments: runtime.commandArguments.map((argument) => argument.trim()),
    desktopBundleRoot: normalizePath(runtime.desktopBundleRoot),
    executableExists: runtime.executableExists,
    executableRelativePath: normalizePath(runtime.executableRelativePath),
    fixtureInputHash: runtime.fixtureInputHash.trim() || "missing",
    fixtureInputPath: normalizePath(runtime.fixtureInputPath),
    installedVersion: runtime.installedVersion.trim(),
    outputPath: normalizePath(runtime.outputPath),
    owner: runtime.owner.trim(),
    packagedLayoutHash: runtime.packagedLayoutHash.trim() || "missing",
    sandboxProfile: runtime.sandboxProfile.trim(),
    timeoutMs: Math.max(0, Math.round(runtime.timeoutMs)),
  };
}

function preflightRuntime(input: {
  readonly command: string;
  readonly resolvedExecutablePath: string;
  readonly runtime: PackagedCadRuntimeExecutionConfig;
}) {
  if (
    !input.runtime.executableExists ||
    !input.resolvedExecutablePath ||
    !input.runtime.executableRelativePath
  ) {
    return {
      failureReason: `Missing packaged executable for ${input.runtime.adapterId}.`,
      ready: false,
    };
  }

  if (!input.runtime.desktopBundleRoot || !hasSha256(input.runtime.packagedLayoutHash)) {
    return {
      failureReason: `Missing packaged desktop bundle layout evidence for ${input.runtime.adapterId}.`,
      ready: false,
    };
  }

  if (!input.command.includes(input.resolvedExecutablePath)) {
    return {
      failureReason: `Packaged CAD runtime command does not reference resolved executable for ${input.runtime.adapterId}.`,
      ready: false,
    };
  }

  if (!input.runtime.fixtureInputPath || !hasSha256(input.runtime.fixtureInputHash)) {
    return {
      failureReason: `Missing packaged CAD runtime fixture input evidence for ${input.runtime.adapterId}.`,
      ready: false,
    };
  }

  return {
    failureReason: "",
    ready: true,
  };
}

function createRow(input: {
  readonly command: string;
  readonly durationMs: number;
  readonly exitCode: number;
  readonly failureReason: string;
  readonly finishedAt: string;
  readonly outputHash: string;
  readonly outputPath: string;
  readonly resolvedExecutablePath: string;
  readonly runId: string;
  readonly runtime: PackagedCadRuntimeExecutionConfig;
  readonly startedAt: string;
  readonly stderr: string;
  readonly stdout: string;
}): PackagedCadRuntimeExecutionRow {
  const outputHash = input.outputHash.trim() || "missing";
  const outputPath = normalizePath(input.outputPath);
  const stdoutHash = sha256(input.stdout);
  const stderrHash = sha256(input.stderr);
  const transcriptHash = sha256({
    command: input.command,
    exitCode: input.exitCode,
    finishedAt: input.finishedAt,
    stderrHash,
    stdoutHash,
  });
  const bundleReady =
    input.runtime.desktopBundleRoot.length > 0 &&
    hasSha256(input.runtime.packagedLayoutHash);
  const executableResolved =
    input.runtime.executableExists &&
    input.resolvedExecutablePath.length > 0 &&
    input.resolvedExecutablePath.startsWith(input.runtime.desktopBundleRoot);
  const commandReady =
    input.command.length > 0 &&
    input.command.includes(input.resolvedExecutablePath) &&
    input.runtime.commandArguments.length > 0;
  const fixtureReady =
    input.runtime.fixtureInputPath.length > 0 &&
    hasSha256(input.runtime.fixtureInputHash);
  const outputReady =
    input.exitCode === 0 &&
    outputPath.length > 0 &&
    hasSha256(outputHash);
  const ownerReady = input.runtime.owner.length > 0;
  const sandboxReady =
    input.runtime.sandboxProfile.length >= 20 &&
    input.runtime.timeoutMs >= 30_000;
  const versionReady = input.runtime.installedVersion.length > 0;
  const transcriptReady =
    validDate(input.startedAt) &&
    validDate(input.finishedAt) &&
    dateOrderReady(input.startedAt, input.finishedAt) &&
    hasSha256(stdoutHash) &&
    hasSha256(stderrHash) &&
    hasSha256(transcriptHash);
  const status = statusFor({
    bundleReady,
    commandReady,
    executableResolved,
    fixtureReady,
    outputReady,
    ownerReady,
    sandboxReady,
    transcriptReady,
    versionReady,
  });
  const rowWithoutHash = {
    adapterId: input.runtime.adapterId,
    bundleReady,
    command: input.command,
    commandArguments: input.runtime.commandArguments,
    commandReady,
    desktopBundleRoot: input.runtime.desktopBundleRoot,
    durationMs: input.durationMs,
    executableExists: input.runtime.executableExists,
    executableRelativePath: input.runtime.executableRelativePath,
    executableResolved,
    exitCode: input.exitCode,
    failureReason: input.failureReason,
    finishedAt: input.finishedAt,
    fixtureInputHash: input.runtime.fixtureInputHash,
    fixtureInputPath: input.runtime.fixtureInputPath,
    fixtureReady,
    installedVersion: input.runtime.installedVersion,
    nextAction: "",
    outputHash,
    outputPath,
    outputReady,
    owner: input.runtime.owner,
    ownerReady,
    packagedLayoutHash: input.runtime.packagedLayoutHash,
    resolvedExecutablePath: input.resolvedExecutablePath,
    runId: input.runId,
    sandboxProfile: input.runtime.sandboxProfile,
    sandboxReady,
    startedAt: input.startedAt,
    status,
    stderrExcerpt: excerpt(input.stderr),
    stderrHash,
    stdoutExcerpt: excerpt(input.stdout),
    stdoutHash,
    timeoutMs: input.runtime.timeoutMs,
    transcriptHash,
    transcriptReady,
    versionReady,
  } satisfies Omit<PackagedCadRuntimeExecutionRow, "executionHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    executionHash: sha256(row),
  };
}

function statusFor(input: {
  readonly bundleReady: boolean;
  readonly commandReady: boolean;
  readonly executableResolved: boolean;
  readonly fixtureReady: boolean;
  readonly outputReady: boolean;
  readonly ownerReady: boolean;
  readonly sandboxReady: boolean;
  readonly transcriptReady: boolean;
  readonly versionReady: boolean;
}): PackagedCadRuntimeExecutionAdapterStatus {
  if (
    !input.bundleReady ||
    !input.executableResolved ||
    !input.commandReady ||
    !input.fixtureReady ||
    !input.outputReady ||
    !input.transcriptReady
  ) {
    return "blocked";
  }

  if (!input.ownerReady || !input.sandboxReady || !input.versionReady) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    PackagedCadRuntimeExecutionRow,
    | "adapterId"
    | "bundleReady"
    | "commandReady"
    | "executableResolved"
    | "fixtureReady"
    | "outputReady"
    | "ownerReady"
    | "sandboxReady"
    | "status"
    | "transcriptReady"
    | "versionReady"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked packaged CAD runtime execution adapter for ${row.adapterId}.`;
  }

  if (!row.bundleReady) {
    return `Attach packaged desktop CAD runtime layout evidence for ${row.adapterId}.`;
  }

  if (!row.executableResolved) {
    return `Resolve packaged executable path for ${row.adapterId}.`;
  }

  if (!row.commandReady) {
    return `Record packaged CAD runtime command for ${row.adapterId}.`;
  }

  if (!row.fixtureReady) {
    return `Attach packaged CAD runtime fixture input evidence for ${row.adapterId}.`;
  }

  if (!row.outputReady) {
    return `Attach packaged CAD runtime fixture output proof for ${row.adapterId}.`;
  }

  if (!row.transcriptReady) {
    return `Attach packaged CAD runtime process transcript for ${row.adapterId}.`;
  }

  if (!row.sandboxReady) {
    return `Review packaged CAD runtime sandbox profile for ${row.adapterId}.`;
  }

  if (!row.versionReady) {
    return `Attach packaged CAD runtime version evidence for ${row.adapterId}.`;
  }

  if (!row.ownerReady) {
    return `Assign packaged CAD runtime owner for ${row.adapterId}.`;
  }

  return `Packaged CAD runtime execution adapter is ready for ${row.adapterId}.`;
}

function createReport(input: {
  readonly generatedAt: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly PackagedCadRuntimeExecutionRow[];
  readonly workspaceId: string;
}): PackagedCadRuntimeExecutionReport {
  const summary = summarize(input.rows);
  const csvContent = createCsv(input.rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt: input.generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows: input.rows,
      summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(input.workspaceId)}-packaged-cad-runtime-execution-adapter-${slug(
    input.releaseCandidateId,
  )}-${dateStamp(input.generatedAt)}`;
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
        label: "Packaged CAD runtime execution adapter CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Packaged CAD runtime execution adapter JSON",
      },
    ],
    generatedAt: input.generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    rows: [...input.rows],
    summary,
    workspaceId: input.workspaceId,
  };
}

function summarize(
  rows: readonly PackagedCadRuntimeExecutionRow[],
): PackagedCadRuntimeExecutionReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.bundleReady,
        row.executableResolved,
        row.commandReady,
        row.fixtureReady,
        row.outputReady,
        row.transcriptReady,
        row.ownerReady,
        row.sandboxReady,
        row.versionReady,
      ].filter(Boolean).length,
    0,
  );
  const status: PackagedCadRuntimeExecutionAdapterStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    executionHash: sha256(rows.map((row) => row.executionHash)),
    executionScore: Math.round((readySignals / (rows.length * 9)) * 100),
    nextAction:
      status === "ready"
        ? "Packaged CAD runtime execution adapter is ready for native fulfillment execution reality."
        : "Resolve blocked packaged CAD runtime execution adapter before native fulfillment execution reality.",
    outputReadyCount: rows.filter((row) => row.outputReady).length,
    readyCount,
    releaseBlocked: blockedCount > 0,
    resolvedExecutableCount: rows.filter((row) => row.executableResolved).length,
    reviewCount,
    rowCount: rows.length,
    status,
    transcriptReadyCount: rows.filter((row) => row.transcriptReady).length,
  };
}

function createCsv(rows: readonly PackagedCadRuntimeExecutionRow[]) {
  const header = [
    "adapter_id",
    "status",
    "resolved_executable_path",
    "bundle_ready",
    "executable_resolved",
    "command_ready",
    "transcript_ready",
    "output_ready",
    "execution_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.adapterId,
      row.status,
      row.resolvedExecutablePath,
      row.bundleReady,
      row.executableResolved,
      row.commandReady,
      row.transcriptReady,
      row.outputReady,
      row.executionHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
}

function resolveExecutablePath(runtime: PackagedCadRuntimeExecutionConfig) {
  if (!runtime.desktopBundleRoot || !runtime.executableRelativePath) {
    return "";
  }

  return `${runtime.desktopBundleRoot.replace(/\/+$/, "")}/${runtime.executableRelativePath.replace(/^\/+/, "")}`;
}

function createCommand(
  resolvedExecutablePath: string,
  commandArguments: readonly string[],
) {
  if (!resolvedExecutablePath) {
    return "";
  }

  return [quoteCommandPath(resolvedExecutablePath), ...commandArguments.map(quoteArgument)].join(" ");
}

function quoteCommandPath(value: string) {
  return /\s/.test(value) ? `"${value}"` : value;
}

function quoteArgument(value: string) {
  return /\s/.test(value) ? `"${value}"` : value;
}

function normalizePath(value: string) {
  return value.trim().replaceAll("\\", "/");
}

function hasSha256(value: string) {
  return value.startsWith("sha256:");
}

function validDate(value: string) {
  const date = new Date(value.trim());

  return value.trim().length > 0 && !Number.isNaN(date.getTime());
}

function dateOrderReady(startedAt: string, finishedAt: string) {
  return new Date(finishedAt).getTime() >= new Date(startedAt).getTime();
}

function csvCell(value: boolean | number | string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function excerpt(value: string) {
  return value.trim().slice(0, 500);
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
