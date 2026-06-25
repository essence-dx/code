import { createHash } from "node:crypto";
import type { CadConversionWorkerAdapterId, ProjectCadConversionJobRecord, ProjectCadConversionJobStatus } from "@/features/projects/cad-conversion-worker";

export interface CadConversionExecutionQueueRow {
  adapterContract: string;
  adapterId: CadConversionWorkerAdapterId;
  diagnosticHash: string;
  failureReason: string;
  jobId: string;
  nextAction: string;
  retryState: string;
  sourceFileName: string;
  status: ProjectCadConversionJobStatus;
}

export interface CadConversionExecutionQueueReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: CadConversionExecutionQueueRow[];
  summary: {
    blockedCount: number;
    executionHash: string;
    executionScore: number;
    nextAction: string;
    retryableCount: number;
    rowCount: number;
    runningCount: number;
    status: "blocked" | "ready" | "review";
    succeededCount: number;
  };
  workspaceId: string;
}

export interface CreateCadConversionExecutionQueueInput {
  generatedAt?: string;
  jobs: ProjectCadConversionJobRecord[];
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

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
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

function adapterContractFor(job: ProjectCadConversionJobRecord) {
  const adapterLabel = job.adapterId.toUpperCase();
  const unit = job.diagnostics.unitMetadata.sourceUnit;
  const target = job.target.toUpperCase();

  return `${adapterLabel} must convert ${job.sourceKind} source to ${target} with ${unit} unit normalization, bounded tessellation, and persisted output diagnostics.`;
}

function retryStateFor(job: ProjectCadConversionJobRecord) {
  if (job.status === "retryable-failed") {
    return `retryable after ${job.nextAttemptAt ?? "operator scheduling"} (${job.attempts}/${job.maxAttempts} attempts used)`;
  }

  if (job.status === "failed") {
    return `blocked after ${job.attempts}/${job.maxAttempts} attempts`;
  }

  if (job.status === "running") {
    return `running attempt ${job.attempts}/${job.maxAttempts}`;
  }

  if (job.status === "queued") {
    return `queued with ${job.maxAttempts - job.attempts} attempts remaining`;
  }

  return `completed after ${job.attempts}/${job.maxAttempts} attempts`;
}

function failureReasonFor(job: ProjectCadConversionJobRecord) {
  if (job.errorMessage) {
    return job.errorMessage;
  }

  const latestWarning = [...job.logs].reverse().find((entry) => entry.level !== "info");

  return latestWarning?.message ?? "No failure recorded.";
}

function nextActionFor(job: ProjectCadConversionJobRecord) {
  if (job.status === "failed") {
    return "Resolve blocked CAD conversion, attach diagnostics, and require operator acknowledgement before release parity.";
  }

  if (job.status === "retryable-failed") {
    return "Retry CAD conversion after reviewing diagnostic hash and adapter logs.";
  }

  if (job.status === "running") {
    return "Monitor active CAD conversion until an output path or failure reason is recorded.";
  }

  if (job.status === "queued") {
    return "Assign CAD conversion worker and preserve adapter contract before execution.";
  }

  return "Keep CAD conversion output diagnostics attached to release evidence.";
}

function createRow(job: ProjectCadConversionJobRecord): CadConversionExecutionQueueRow {
  const adapterContract = adapterContractFor(job);
  const retryState = retryStateFor(job);
  const failureReason = failureReasonFor(job);
  const nextAction = nextActionFor(job);
  const diagnosticHash = sha256({
    adapterContract,
    command: job.command,
    diagnostics: job.diagnostics,
    failureReason,
    resultPath: job.resultPath,
    retryState,
    status: job.status,
  });

  return {
    adapterContract,
    adapterId: job.adapterId,
    diagnosticHash,
    failureReason,
    jobId: job.id ?? `${job.projectId}:${job.sourceFileName}:${job.queuedAt}`,
    nextAction,
    retryState,
    sourceFileName: job.sourceFileName,
    status: job.status,
  };
}

function summarize(rows: CadConversionExecutionQueueRow[]): CadConversionExecutionQueueReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "failed").length;
  const retryableCount = rows.filter((row) => row.status === "retryable-failed").length;
  const runningCount = rows.filter((row) => row.status === "running").length;
  const succeededCount = rows.filter((row) => row.status === "succeeded").length;
  const status = blockedCount > 0 ? "blocked" : retryableCount > 0 || runningCount > 0 ? "review" : "ready";
  const executionScore = Math.max(0, Math.round((succeededCount / Math.max(1, rows.length)) * 100 + retryableCount * 20 + runningCount * 14 - blockedCount * 0));

  return {
    blockedCount,
    executionHash: sha256(rows.map((row) => row.diagnosticHash)),
    executionScore,
    nextAction:
      status === "blocked"
        ? "Resolve blocked CAD conversions before accepting native runtime parity."
        : status === "review"
          ? "Review retryable or running CAD conversions before release acceptance."
          : "CAD conversion execution queue is ready.",
    retryableCount,
    rowCount: rows.length,
    runningCount,
    status,
    succeededCount,
  };
}

function createCsv(rows: CadConversionExecutionQueueRow[]) {
  const header = ["job_id", "source_file", "status", "adapter_contract", "retry_state", "diagnostic_hash", "failure_reason", "next_action"];
  const body = rows.map((row) =>
    [row.jobId, row.sourceFileName, row.status, row.adapterContract, row.retryState, row.diagnosticHash, row.failureReason, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: CadConversionExecutionQueueRow[];
  summary: CadConversionExecutionQueueReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createCadConversionExecutionQueue(input: CreateCadConversionExecutionQueueInput): CadConversionExecutionQueueReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = input.jobs
    .map(createRow)
    .sort((first, second) => first.status.localeCompare(second.status) || first.sourceFileName.localeCompare(second.sourceFileName));
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-cad-conversion-execution-queue-${dateStamp(generatedAt)}`;

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
