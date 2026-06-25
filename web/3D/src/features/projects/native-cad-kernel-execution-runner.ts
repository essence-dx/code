import { createHash } from "node:crypto";
import {
  completeProjectCadConversionJob,
  failProjectCadConversionJob,
  startProjectCadConversionJob,
  type CadConversionWorkerAdapterId,
  type ProjectCadConversionJobRecord,
} from "@/features/projects/cad-conversion-worker";
import type { CadConversionExecutionQueueReport } from "@/features/projects/cad-conversion-execution-queue";

export type NativeCadKernelExecutionRunnerStatus = "blocked" | "ready" | "review";

export interface NativeCadKernelAdapterConfig {
  adapterId: CadConversionWorkerAdapterId;
  enabled: boolean;
  env?: Record<string, string>;
  executablePath: string;
  outputDirectory: string;
  sandboxCwd: string;
  timeoutMs: number;
}

export interface NativeCadKernelExecutionRequest {
  adapterConfig: NativeCadKernelAdapterConfig;
  expectedOutputFileName: string;
  job: ProjectCadConversionJobRecord;
  runId: string;
}

export interface NativeCadKernelExecutionResult {
  diagnosticFiles?: string[];
  durationMs: number;
  exitCode: number;
  outputPath?: string | null;
  stderr?: string;
  stdout?: string;
}

export type NativeCadKernelExecutor = (request: NativeCadKernelExecutionRequest) => Promise<NativeCadKernelExecutionResult>;

export interface NativeCadKernelExecutionRun {
  adapterId: CadConversionWorkerAdapterId;
  command: string;
  diagnosticFiles: string[];
  diagnosticHash: string;
  durationMs: number | null;
  evidenceHash: string;
  executedAt: string;
  failureReason: string | null;
  jobId: string;
  nextAction: string;
  outputPath: string | null;
  runId: string;
  sandboxCwd: string;
  status: NativeCadKernelExecutionRunnerStatus;
  timeoutMs: number;
}

export interface NativeCadKernelExecutionRunnerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: NativeCadKernelExecutionRun[];
  summary: {
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    runnerHash: string;
    runnerScore: number;
    status: NativeCadKernelExecutionRunnerStatus;
  };
  workspaceId: string;
}

export interface ExecuteNativeCadKernelJobInput {
  adapterConfigs: NativeCadKernelAdapterConfig[];
  executor: NativeCadKernelExecutor;
  generatedAt?: string;
  job: ProjectCadConversionJobRecord;
  runId?: string;
}

export interface CreateNativeCadKernelExecutionRunnerReportInput {
  executionQueue: CadConversionExecutionQueueReport;
  generatedAt?: string;
  runs: NativeCadKernelExecutionRun[];
  workspaceId?: string;
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
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
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

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function jobId(job: ProjectCadConversionJobRecord) {
  return job.id ?? `${job.projectId}:${job.sourceFileName}:${job.queuedAt}`;
}

function isConfigReady(config: NativeCadKernelAdapterConfig | undefined): config is NativeCadKernelAdapterConfig {
  return Boolean(config?.enabled && config.executablePath.trim() && config.outputDirectory.trim() && config.sandboxCwd.trim() && config.timeoutMs > 0);
}

function nextActionFor(status: NativeCadKernelExecutionRunnerStatus) {
  if (status === "blocked") {
    return "Resolve native CAD kernel runner blockers, then rerun the adapter in the controlled worker environment.";
  }

  if (status === "review") {
    return "Review native CAD kernel runner diagnostics before attaching the output to release evidence.";
  }

  return "Keep native CAD kernel runner diagnostics attached to project evidence.";
}

function createRun(input: Omit<NativeCadKernelExecutionRun, "evidenceHash" | "nextAction">): NativeCadKernelExecutionRun {
  const nextAction = nextActionFor(input.status);
  const diagnosticHash = input.diagnosticHash || sha256(input.diagnosticFiles);

  return {
    ...input,
    diagnosticHash,
    evidenceHash: sha256({
      ...input,
      diagnosticHash,
      nextAction,
    }),
    nextAction,
  };
}

export async function executeNativeCadKernelJob(input: ExecuteNativeCadKernelJobInput): Promise<{
  job: ProjectCadConversionJobRecord;
  run: NativeCadKernelExecutionRun;
}> {
  const executedAt = input.generatedAt ?? new Date().toISOString();
  const adapterConfig = input.adapterConfigs.find((config) => config.adapterId === input.job.adapterId);
  const runId = input.runId ?? `${input.job.adapterId}-${slug(input.job.projectId)}-${dateStamp(executedAt)}`;
  const fallbackSandboxCwd = adapterConfig?.sandboxCwd ?? "unconfigured";
  const fallbackTimeoutMs = adapterConfig?.timeoutMs ?? 0;

  if (!isConfigReady(adapterConfig)) {
    const failureReason = `Adapter ${input.job.adapterId} is disabled or incomplete for controlled worker execution.`;
    const failedJob = failProjectCadConversionJob({
      failedAt: executedAt,
      job: startProjectCadConversionJob(input.job, executedAt),
      message: failureReason,
      retryable: false,
    });

    return {
      job: failedJob,
      run: createRun({
        adapterId: input.job.adapterId,
        command: input.job.command,
        diagnosticFiles: [],
        diagnosticHash: sha256({ failureReason, job: jobId(input.job), runId }),
        durationMs: null,
        executedAt,
        failureReason,
        jobId: jobId(input.job),
        outputPath: null,
        runId,
        sandboxCwd: fallbackSandboxCwd,
        status: "blocked",
        timeoutMs: fallbackTimeoutMs,
      }),
    };
  }

  const runningJob = startProjectCadConversionJob(input.job, executedAt);

  try {
    const result = await input.executor({
      adapterConfig,
      expectedOutputFileName: input.job.outputFileName,
      job: runningJob,
      runId,
    });
    const diagnosticFiles = result.diagnosticFiles ?? [];
    const failureReason = result.exitCode === 0 ? null : result.stderr?.trim() || result.stdout?.trim() || `Adapter exited with code ${result.exitCode}.`;
    const status: NativeCadKernelExecutionRunnerStatus = result.exitCode === 0 && result.outputPath ? "ready" : "blocked";
    const diagnosticHash = sha256({
      command: input.job.command,
      diagnosticFiles,
      durationMs: result.durationMs,
      exitCode: result.exitCode,
      outputPath: result.outputPath ?? null,
      stderr: result.stderr ?? "",
      stdout: result.stdout ?? "",
    });
    const run = createRun({
      adapterId: input.job.adapterId,
      command: input.job.command,
      diagnosticFiles,
      diagnosticHash,
      durationMs: result.durationMs,
      executedAt,
      failureReason,
      jobId: jobId(input.job),
      outputPath: result.outputPath ?? null,
      runId,
      sandboxCwd: adapterConfig.sandboxCwd,
      status,
      timeoutMs: adapterConfig.timeoutMs,
    });

    if (status === "ready" && result.outputPath) {
      const completedJob = completeProjectCadConversionJob({
        finishedAt: executedAt,
        job: runningJob,
        resultPath: result.outputPath,
      });

      return {
        job: {
          ...completedJob,
          logs: [...completedJob.logs, { at: executedAt, level: "info", message: `Native CAD kernel execution attached diagnostics ${diagnosticHash}.` }],
        },
        run,
      };
    }

    return {
      job: failProjectCadConversionJob({
        failedAt: executedAt,
        job: runningJob,
        message: failureReason ?? "Native CAD kernel execution did not produce an output path.",
        retryable: false,
      }),
      run,
    };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : "Native CAD kernel executor failed.";

    return {
      job: failProjectCadConversionJob({
        failedAt: executedAt,
        job: runningJob,
        message: failureReason,
        retryable: true,
      }),
      run: createRun({
        adapterId: input.job.adapterId,
        command: input.job.command,
        diagnosticFiles: [],
        diagnosticHash: sha256({ failureReason, job: jobId(input.job), runId }),
        durationMs: null,
        executedAt,
        failureReason,
        jobId: jobId(input.job),
        outputPath: null,
        runId,
        sandboxCwd: adapterConfig.sandboxCwd,
        status: "review",
        timeoutMs: adapterConfig.timeoutMs,
      }),
    };
  }
}

function summarize(rows: NativeCadKernelExecutionRun[]): NativeCadKernelExecutionRunnerReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeCadKernelExecutionRunnerStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const runnerScore = Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 12 - blockedCount * 0)));

  return {
    blockedCount,
    nextAction:
      status === "blocked"
        ? "Resolve native CAD kernel runner blockers before declaring commercial proof complete."
        : status === "review"
          ? "Review native CAD kernel runner diagnostics before release acceptance."
          : "Native CAD kernel execution runner evidence is ready.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    runnerHash: sha256(rows.map((row) => row.evidenceHash)),
    runnerScore,
    status,
  };
}

function createCsv(rows: NativeCadKernelExecutionRun[]) {
  const header = ["run_id", "adapter", "status", "job_id", "output_path", "diagnostic_hash", "failure_reason", "next_action"];
  const body = rows.map((row) =>
    [row.runId, row.adapterId, row.status, row.jobId, row.outputPath, row.diagnosticHash, row.failureReason, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function rowsFromExecutionQueue(input: CadConversionExecutionQueueReport): NativeCadKernelExecutionRun[] {
  return input.rows.map((row) => {
    const status: NativeCadKernelExecutionRunnerStatus = row.status === "succeeded" ? "ready" : row.status === "failed" ? "blocked" : "review";

    return createRun({
      adapterId: row.adapterId,
      command: row.adapterContract,
      diagnosticFiles: [],
      diagnosticHash: row.diagnosticHash,
      durationMs: null,
      executedAt: input.generatedAt,
      failureReason: row.failureReason === "No failure recorded." ? null : row.failureReason,
      jobId: row.jobId,
      outputPath: row.status === "succeeded" ? "attached in CAD conversion evidence" : null,
      runId: `cad-runner:${slug(row.jobId)}`,
      sandboxCwd: "recorded in worker configuration",
      status,
      timeoutMs: 0,
    });
  });
}

export function createNativeCadKernelExecutionRunnerReport(input: CreateNativeCadKernelExecutionRunnerReportInput): NativeCadKernelExecutionRunnerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.executionQueue.workspaceId ?? "workspace";
  const rows = (input.runs.length > 0 ? [...input.runs] : rowsFromExecutionQueue(input.executionQueue)).sort(
    (first, second) => first.adapterId.localeCompare(second.adapterId) || first.runId.localeCompare(second.runId),
  );
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      executionQueueHash: input.executionQueue.summary.executionHash,
      generatedAt,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-native-cad-kernel-execution-runner-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
