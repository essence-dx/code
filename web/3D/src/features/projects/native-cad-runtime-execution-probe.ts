import { createHash } from "node:crypto";
import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";

export type NativeCadRuntimeExecutionProbeStatus =
  | "blocked"
  | "ready"
  | "review";

export type NativeCadRuntimeExecutionProbeFileFormat = "csv" | "json";

export interface NativeCadRuntimeExecutionProbeConfig {
  readonly adapterId: CadConversionWorkerAdapterId;
  readonly bundleRoot: string;
  readonly command: string;
  readonly executablePath: string;
  readonly fixtureInputHash: string;
  readonly fixtureInputPath: string;
  readonly outputPath: string;
  readonly runtimeAvailable: boolean;
  readonly sandboxProfile: string;
  readonly timeoutMs: number;
  readonly verifierOwner: string;
  readonly workingDirectory: string;
}

export interface NativeCadRuntimeExecutionProbeExecutorRequest {
  readonly command: string;
  readonly probe: NativeCadRuntimeExecutionProbeConfig;
  readonly runId: string;
}

export interface NativeCadRuntimeExecutionProbeExecutorResult {
  readonly durationMs: number;
  readonly exitCode: number;
  readonly finishedAt?: string;
  readonly outputHash: string;
  readonly outputPath: string;
  readonly startedAt?: string;
  readonly stderr: string;
  readonly stdout: string;
}

export type NativeCadRuntimeExecutionProbeExecutor = (
  request: NativeCadRuntimeExecutionProbeExecutorRequest,
) => Promise<NativeCadRuntimeExecutionProbeExecutorResult>;

export interface NativeCadRuntimeExecutionProbeRow {
  readonly adapterId: CadConversionWorkerAdapterId;
  readonly bundleRoot: string;
  readonly command: string;
  readonly commandReady: boolean;
  readonly durationMs: number;
  readonly executablePath: string;
  readonly failureReason: string;
  readonly finishedAt: string;
  readonly fixtureInputHash: string;
  readonly fixtureInputPath: string;
  readonly fixtureReady: boolean;
  readonly nextAction: string;
  readonly outputHash: string;
  readonly outputPath: string;
  readonly outputReady: boolean;
  readonly ownerReady: boolean;
  readonly probeHash: string;
  readonly runId: string;
  readonly runtimeAvailable: boolean;
  readonly sandboxProfile: string;
  readonly sandboxReady: boolean;
  readonly startedAt: string;
  readonly status: NativeCadRuntimeExecutionProbeStatus;
  readonly stderrExcerpt: string;
  readonly stderrHash: string;
  readonly stdoutExcerpt: string;
  readonly stdoutHash: string;
  readonly timeoutMs: number;
  readonly transcriptHash: string;
  readonly transcriptReady: boolean;
  readonly verifierOwner: string;
  readonly workingDirectory: string;
}

export interface NativeCadRuntimeExecutionProbeFile {
  readonly download: string;
  readonly format: NativeCadRuntimeExecutionProbeFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface NativeCadRuntimeExecutionProbeReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: NativeCadRuntimeExecutionProbeFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: NativeCadRuntimeExecutionProbeRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly commandReadyCount: number;
    readonly executionScore: number;
    readonly fixtureReadyCount: number;
    readonly nextAction: string;
    readonly outputReadyCount: number;
    readonly probeHash: string;
    readonly readyCount: number;
    readonly releaseBlocked: boolean;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly runtimeAvailableCount: number;
    readonly status: NativeCadRuntimeExecutionProbeStatus;
    readonly transcriptReadyCount: number;
  };
  readonly workspaceId: string;
}

export interface RunNativeCadRuntimeExecutionProbeInput {
  readonly executor: NativeCadRuntimeExecutionProbeExecutor;
  readonly generatedAt?: string;
  readonly probes: readonly NativeCadRuntimeExecutionProbeConfig[];
  readonly releaseCandidateId: string;
  readonly requiredAdapters?: readonly CadConversionWorkerAdapterId[];
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

export async function runNativeCadRuntimeExecutionProbe(
  input: RunNativeCadRuntimeExecutionProbeInput,
): Promise<NativeCadRuntimeExecutionProbeReport> {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const probeByAdapter = new Map(
    input.probes.map((probe) => [probe.adapterId, probe]),
  );
  const requiredAdapters = input.requiredAdapters ?? defaultRequiredAdapters;
  const rows = await Promise.all(
    requiredAdapters.map(async (adapterId) =>
      runProbeRow({
        adapterId,
        executor: input.executor,
        generatedAt,
        probe: probeByAdapter.get(adapterId) ?? missingProbe(adapterId),
        releaseCandidateId: input.releaseCandidateId,
        workspaceId,
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

function missingProbe(
  adapterId: CadConversionWorkerAdapterId,
): NativeCadRuntimeExecutionProbeConfig {
  return {
    adapterId,
    bundleRoot: "",
    command: "",
    executablePath: "",
    fixtureInputHash: "",
    fixtureInputPath: "",
    outputPath: "",
    runtimeAvailable: false,
    sandboxProfile: "",
    timeoutMs: 0,
    verifierOwner: "",
    workingDirectory: "",
  };
}

async function runProbeRow(input: {
  readonly adapterId: CadConversionWorkerAdapterId;
  readonly executor: NativeCadRuntimeExecutionProbeExecutor;
  readonly generatedAt: string;
  readonly probe: NativeCadRuntimeExecutionProbeConfig;
  readonly releaseCandidateId: string;
  readonly workspaceId: string;
}) {
  const probe = normalizeProbe(input.probe);
  const runId = `${probe.adapterId}-${slug(input.releaseCandidateId)}-${dateStamp(
    input.generatedAt,
  )}`;
  const preflight = preflightProbe(probe);

  if (!preflight.ready) {
    return createRow({
      durationMs: 0,
      failureReason: preflight.failureReason,
      finishedAt: input.generatedAt,
      outputHash: "missing",
      outputPath: probe.outputPath,
      probe,
      runId,
      startedAt: input.generatedAt,
      stderr: "",
      stdout: "",
    });
  }

  try {
    const result = await input.executor({
      command: probe.command,
      probe,
      runId,
    });
    const failureReason =
      result.exitCode === 0
        ? ""
        : result.stderr.trim() ||
          result.stdout.trim() ||
          `CAD runtime probe exited with code ${result.exitCode}.`;

    return createRow({
      durationMs: Math.max(0, Math.round(result.durationMs)),
      exitCode: result.exitCode,
      failureReason,
      finishedAt: result.finishedAt ?? input.generatedAt,
      outputHash: result.outputHash,
      outputPath: result.outputPath,
      probe,
      runId,
      startedAt: result.startedAt ?? input.generatedAt,
      stderr: result.stderr,
      stdout: result.stdout,
    });
  } catch (error) {
    const failureReason =
      error instanceof Error
        ? error.message
        : "CAD runtime execution probe executor failed.";

    return createRow({
      durationMs: 0,
      failureReason,
      finishedAt: input.generatedAt,
      outputHash: "missing",
      outputPath: probe.outputPath,
      probe,
      runId,
      startedAt: input.generatedAt,
      stderr: failureReason,
      stdout: "",
    });
  }
}

function normalizeProbe(
  probe: NativeCadRuntimeExecutionProbeConfig,
): NativeCadRuntimeExecutionProbeConfig {
  return {
    adapterId: probe.adapterId,
    bundleRoot: probe.bundleRoot.trim(),
    command: probe.command.trim(),
    executablePath: probe.executablePath.trim(),
    fixtureInputHash: probe.fixtureInputHash.trim() || "missing",
    fixtureInputPath: probe.fixtureInputPath.trim(),
    outputPath: probe.outputPath.trim(),
    runtimeAvailable: probe.runtimeAvailable,
    sandboxProfile: probe.sandboxProfile.trim(),
    timeoutMs: Math.max(0, Math.round(probe.timeoutMs)),
    verifierOwner: probe.verifierOwner.trim(),
    workingDirectory: probe.workingDirectory.trim(),
  };
}

function preflightProbe(probe: NativeCadRuntimeExecutionProbeConfig) {
  if (!probe.runtimeAvailable || !probe.executablePath) {
    return {
      failureReason: `CAD runtime ${probe.adapterId} is unavailable or missing executable path.`,
      ready: false,
    };
  }

  if (!probe.command || !probe.command.includes(probe.executablePath)) {
    return {
      failureReason: `CAD runtime ${probe.adapterId} command does not reference the configured executable.`,
      ready: false,
    };
  }

  if (!probe.fixtureInputPath || !hasSha256(probe.fixtureInputHash)) {
    return {
      failureReason: `CAD runtime ${probe.adapterId} is missing fixture input evidence.`,
      ready: false,
    };
  }

  return {
    failureReason: "",
    ready: true,
  };
}

function createRow(input: {
  readonly durationMs: number;
  readonly exitCode?: number;
  readonly failureReason: string;
  readonly finishedAt: string;
  readonly outputHash: string;
  readonly outputPath: string;
  readonly probe: NativeCadRuntimeExecutionProbeConfig;
  readonly runId: string;
  readonly startedAt: string;
  readonly stderr: string;
  readonly stdout: string;
}): NativeCadRuntimeExecutionProbeRow {
  const outputHash = input.outputHash.trim() || "missing";
  const outputPath = input.outputPath.trim();
  const stdoutHash = sha256(input.stdout);
  const stderrHash = sha256(input.stderr);
  const transcriptHash = sha256({
    command: input.probe.command,
    exitCode: input.exitCode ?? 1,
    finishedAt: input.finishedAt,
    stderrHash,
    stdoutHash,
  });
  const runtimeAvailable =
    input.probe.runtimeAvailable && input.probe.executablePath.length > 0;
  const commandReady =
    input.probe.command.length > 0 &&
    input.probe.executablePath.length > 0 &&
    input.probe.command.includes(input.probe.executablePath);
  const fixtureReady =
    input.probe.fixtureInputPath.length > 0 &&
    hasSha256(input.probe.fixtureInputHash);
  const outputReady =
    (input.exitCode ?? 1) === 0 &&
    outputPath.length > 0 &&
    hasSha256(outputHash);
  const ownerReady = input.probe.verifierOwner.length > 0;
  const sandboxReady =
    input.probe.sandboxProfile.length >= 20 &&
    input.probe.timeoutMs >= 30_000 &&
    input.probe.workingDirectory.length > 0;
  const transcriptReady =
    validDate(input.startedAt) &&
    validDate(input.finishedAt) &&
    dateOrderReady(input.startedAt, input.finishedAt) &&
    hasSha256(stdoutHash) &&
    hasSha256(stderrHash) &&
    hasSha256(transcriptHash);
  const status = statusFor({
    commandReady,
    fixtureReady,
    outputReady,
    ownerReady,
    runtimeAvailable,
    sandboxReady,
    transcriptReady,
  });
  const rowWithoutHash = {
    adapterId: input.probe.adapterId,
    bundleRoot: input.probe.bundleRoot,
    command: input.probe.command,
    commandReady,
    durationMs: input.durationMs,
    executablePath: input.probe.executablePath,
    failureReason: input.failureReason,
    finishedAt: input.finishedAt,
    fixtureInputHash: input.probe.fixtureInputHash,
    fixtureInputPath: input.probe.fixtureInputPath,
    fixtureReady,
    nextAction: "",
    outputHash,
    outputPath,
    outputReady,
    ownerReady,
    runId: input.runId,
    runtimeAvailable,
    sandboxProfile: input.probe.sandboxProfile,
    sandboxReady,
    startedAt: input.startedAt,
    status,
    stderrExcerpt: excerpt(input.stderr),
    stderrHash,
    stdoutExcerpt: excerpt(input.stdout),
    stdoutHash,
    timeoutMs: input.probe.timeoutMs,
    transcriptHash,
    transcriptReady,
    verifierOwner: input.probe.verifierOwner,
    workingDirectory: input.probe.workingDirectory,
  } satisfies Omit<NativeCadRuntimeExecutionProbeRow, "probeHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    probeHash: sha256(row),
  };
}

function statusFor(input: {
  readonly commandReady: boolean;
  readonly fixtureReady: boolean;
  readonly outputReady: boolean;
  readonly ownerReady: boolean;
  readonly runtimeAvailable: boolean;
  readonly sandboxReady: boolean;
  readonly transcriptReady: boolean;
}): NativeCadRuntimeExecutionProbeStatus {
  if (
    !input.runtimeAvailable ||
    !input.commandReady ||
    !input.fixtureReady ||
    !input.outputReady ||
    !input.transcriptReady
  ) {
    return "blocked";
  }

  if (!input.ownerReady || !input.sandboxReady) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    NativeCadRuntimeExecutionProbeRow,
    | "adapterId"
    | "commandReady"
    | "fixtureReady"
    | "outputReady"
    | "ownerReady"
    | "runtimeAvailable"
    | "sandboxReady"
    | "status"
    | "transcriptReady"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native CAD runtime execution probe for ${row.adapterId}.`;
  }

  if (!row.runtimeAvailable) {
    return `Install or expose native CAD runtime executable for ${row.adapterId}.`;
  }

  if (!row.commandReady) {
    return `Record executable-backed CAD fixture command for ${row.adapterId}.`;
  }

  if (!row.fixtureReady) {
    return `Attach CAD runtime fixture input evidence for ${row.adapterId}.`;
  }

  if (!row.outputReady) {
    return `Attach successful CAD runtime fixture output evidence for ${row.adapterId}.`;
  }

  if (!row.transcriptReady) {
    return `Attach stdout, stderr, and transcript hashes for ${row.adapterId}.`;
  }

  if (!row.sandboxReady) {
    return `Review CAD runtime sandbox profile, timeout, and working directory for ${row.adapterId}.`;
  }

  if (!row.ownerReady) {
    return `Assign CAD runtime execution probe owner for ${row.adapterId}.`;
  }

  return `Native CAD runtime execution probe is ready for ${row.adapterId}.`;
}

function createReport(input: {
  readonly generatedAt: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly NativeCadRuntimeExecutionProbeRow[];
  readonly workspaceId: string;
}): NativeCadRuntimeExecutionProbeReport {
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
  const fileBase = `${slug(input.workspaceId)}-native-cad-runtime-execution-probe-${slug(
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
        label: "Native CAD runtime execution probe CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native CAD runtime execution probe JSON",
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
  rows: readonly NativeCadRuntimeExecutionProbeRow[],
): NativeCadRuntimeExecutionProbeReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.runtimeAvailable,
        row.commandReady,
        row.fixtureReady,
        row.outputReady,
        row.transcriptReady,
        row.ownerReady,
        row.sandboxReady,
      ].filter(Boolean).length,
    0,
  );
  const status: NativeCadRuntimeExecutionProbeStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    commandReadyCount: rows.filter((row) => row.commandReady).length,
    executionScore: Math.round((readySignals / (rows.length * 7)) * 100),
    fixtureReadyCount: rows.filter((row) => row.fixtureReady).length,
    nextAction:
      status === "ready"
        ? "Native CAD runtime execution probe is ready for runtime execution proof."
        : "Resolve blocked native CAD runtime execution probe before runtime execution proof.",
    outputReadyCount: rows.filter((row) => row.outputReady).length,
    probeHash: sha256(rows.map((row) => row.probeHash)),
    readyCount,
    releaseBlocked: blockedCount > 0,
    reviewCount,
    rowCount: rows.length,
    runtimeAvailableCount: rows.filter((row) => row.runtimeAvailable).length,
    status,
    transcriptReadyCount: rows.filter((row) => row.transcriptReady).length,
  };
}

function createCsv(rows: readonly NativeCadRuntimeExecutionProbeRow[]) {
  const header = [
    "adapter_id",
    "status",
    "runtime_available",
    "command_ready",
    "fixture_ready",
    "output_ready",
    "transcript_ready",
    "probe_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.adapterId,
      row.status,
      row.runtimeAvailable,
      row.commandReady,
      row.fixtureReady,
      row.outputReady,
      row.transcriptReady,
      row.probeHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
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
