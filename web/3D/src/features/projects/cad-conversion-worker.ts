import { analyzeCadImportFile } from "@/features/editor/utils/cad-import-preflight";
import type { CadConversionTarget, CadConversionValidationReport, CadSourceKind } from "@/features/editor/utils/cad-conversion-validation";

export const cadConversionWorkerAdapterIds = ["freecad", "occt"] as const;
export const cadConversionWorkerStatuses = ["failed", "queued", "retryable-failed", "running", "succeeded"] as const;

export type CadConversionWorkerAdapterId = (typeof cadConversionWorkerAdapterIds)[number];
export type ProjectCadConversionJobStatus = (typeof cadConversionWorkerStatuses)[number];
export type ProjectCadConversionJobLogLevel = "error" | "info" | "warning";
export type ProjectCadConversionJobMetadata = Record<string, boolean | number | string | null>;

export interface ProjectCadConversionJobLogEntry {
  at: string;
  level: ProjectCadConversionJobLogLevel;
  message: string;
}

export interface ProjectCadConversionJobRecord {
  adapterId: CadConversionWorkerAdapterId;
  attempts: number;
  command: string;
  diagnostics: CadConversionValidationReport;
  errorMessage: string | null;
  finishedAt: string | null;
  id?: string;
  logs: ProjectCadConversionJobLogEntry[];
  maxAttempts: number;
  metadata: ProjectCadConversionJobMetadata | null;
  nextAttemptAt: string | null;
  outputFileName: string;
  projectId: string;
  projectName: string;
  queuedAt: string;
  resultPath: string | null;
  sourceBytes: number;
  sourceFileName: string;
  sourceKind: Extract<CadSourceKind, "exchange" | "native-cad">;
  startedAt: string | null;
  status: ProjectCadConversionJobStatus;
  target: CadConversionTarget;
  updatedAt: string;
  workspaceId: string | null;
}

export interface CreateProjectCadConversionJobInput {
  adapterId?: CadConversionWorkerAdapterId;
  generatedAt?: string;
  maxAttempts?: number;
  metadata?: ProjectCadConversionJobMetadata | null;
  projectId: string;
  projectName?: string;
  sourceBytes: number;
  sourceFileName: string;
  target?: CadConversionTarget;
  workspaceId?: string | null;
}

export interface ProjectCadConversionQueueReport {
  generatedAt: string;
  jobs: ProjectCadConversionJobRecord[];
  summary: {
    failedCount: number;
    queuedCount: number;
    retryableCount: number;
    runningCount: number;
    succeededCount: number;
    totalCount: number;
  };
}

function getOutputStem(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/u, "").trim() || "cad-model";

  return baseName.replace(/[^\w.-]+/gu, "-").replace(/^-+|-+$/gu, "") || "cad-model";
}

function quoteCommandValue(value: string) {
  return JSON.stringify(value);
}

function outputExtension(target: CadConversionTarget) {
  return target === "glb" ? "glb" : target === "obj" ? "obj" : "stl";
}

function getNativeCadSourceKind(fileName: string): Extract<CadSourceKind, "exchange" | "native-cad"> | null {
  const preflight = analyzeCadImportFile({ name: fileName, size: 1 });

  return preflight.status === "native-cad" && preflight.validation ? (preflight.extension === "fbx" || preflight.extension === "dae" ? "exchange" : preflight.validation.meshDiagnostics.externalAssetRisk ? "exchange" : "native-cad") : null;
}

function commandForFreeCad(input: {
  outputFileName: string;
  sourceFileName: string;
  target: CadConversionTarget;
  validation: CadConversionValidationReport;
}) {
  const linearDeflection = input.validation.tessellationBudget.linearDeflection;
  const angularDeflection = input.validation.tessellationBudget.angularDeflection;

  return `freecadcmd .\\scripts\\cad\\freecad-mesh-export.py ${quoteCommandValue(input.sourceFileName)} ${quoteCommandValue(input.outputFileName)} --linear-deflection ${linearDeflection} --angular-deflection ${angularDeflection}`;
}

function commandForOcct(input: {
  outputFileName: string;
  sourceFileName: string;
  target: CadConversionTarget;
  validation: CadConversionValidationReport;
}) {
  const scaleToMeters = input.validation.unitMetadata.scaleToMeters;
  const linearDeflection = input.validation.tessellationBudget.linearDeflection;
  const angularDeflection = input.validation.tessellationBudget.angularDeflection;

  return `essence-occt-convert --input ${quoteCommandValue(input.sourceFileName)} --output ${quoteCommandValue(input.outputFileName)} --target ${input.target} --scale-to-meters ${scaleToMeters} --linear-deflection ${linearDeflection} --angular-deflection ${angularDeflection}`;
}

function createAdapterCommand(input: {
  adapterId: CadConversionWorkerAdapterId;
  outputFileName: string;
  sourceFileName: string;
  target: CadConversionTarget;
  validation: CadConversionValidationReport;
}) {
  if (input.adapterId === "occt") {
    return commandForOcct(input);
  }

  return commandForFreeCad(input);
}

function logEntry(at: string, level: ProjectCadConversionJobLogLevel, message: string): ProjectCadConversionJobLogEntry {
  return { at, level, message };
}

function retryDelayMs(attempts: number) {
  return Math.min(60 * 60 * 1000, 5 * 60 * 1000 * Math.max(1, attempts));
}

export function createProjectCadConversionJob(input: CreateProjectCadConversionJobInput): { error: string } | { job: ProjectCadConversionJobRecord } {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const preflight = analyzeCadImportFile({
    name: input.sourceFileName,
    size: input.sourceBytes,
  });

  if (preflight.status !== "native-cad" || !preflight.conversionPlan || !preflight.validation) {
    return { error: "Only native CAD and exchange sources can be queued for conversion." };
  }

  const sourceKind = getNativeCadSourceKind(input.sourceFileName) ?? "native-cad";
  const adapterId = input.adapterId ?? "freecad";
  const target = input.target ?? preflight.conversionPlan.preferredTarget;

  if (sourceKind === "exchange") {
    return { error: "Exchange-file conversion is still handled by the Blender preflight path; queue native CAD sources for FreeCAD or OCCT." };
  }

  if (adapterId === "freecad" && target === "glb") {
    return { error: "FreeCAD adapter supports STL and OBJ mesh targets for native CAD sources." };
  }

  const outputFileName = `${getOutputStem(input.sourceFileName)}.${outputExtension(target)}`;
  const command = createAdapterCommand({
    adapterId,
    outputFileName,
    sourceFileName: input.sourceFileName,
    target,
    validation: preflight.validation,
  });

  return {
    job: {
      adapterId,
      attempts: 0,
      command,
      diagnostics: preflight.validation,
      errorMessage: null,
      finishedAt: null,
      logs: [logEntry(generatedAt, "info", `Queued ${adapterId.toUpperCase()} conversion to ${target.toUpperCase()}.`)],
      maxAttempts: input.maxAttempts ?? 3,
      metadata: input.metadata ?? null,
      nextAttemptAt: null,
      outputFileName,
      projectId: input.projectId,
      projectName: input.projectName ?? "Untitled project",
      queuedAt: generatedAt,
      resultPath: null,
      sourceBytes: input.sourceBytes,
      sourceFileName: input.sourceFileName,
      sourceKind,
      startedAt: null,
      status: "queued",
      target,
      updatedAt: generatedAt,
      workspaceId: input.workspaceId ?? null,
    },
  };
}

export function startProjectCadConversionJob(job: ProjectCadConversionJobRecord, startedAt = new Date().toISOString()): ProjectCadConversionJobRecord {
  return {
    ...job,
    attempts: job.attempts + 1,
    errorMessage: null,
    logs: [...job.logs, logEntry(startedAt, "info", `Started attempt ${job.attempts + 1}/${job.maxAttempts}.`)],
    nextAttemptAt: null,
    startedAt,
    status: "running",
    updatedAt: startedAt,
  };
}

export function completeProjectCadConversionJob(input: {
  finishedAt?: string;
  job: ProjectCadConversionJobRecord;
  resultPath: string;
}): ProjectCadConversionJobRecord {
  const finishedAt = input.finishedAt ?? new Date().toISOString();

  return {
    ...input.job,
    errorMessage: null,
    finishedAt,
    logs: [...input.job.logs, logEntry(finishedAt, "info", `Conversion succeeded: ${input.resultPath}`)],
    resultPath: input.resultPath,
    status: "succeeded",
    updatedAt: finishedAt,
  };
}

export function failProjectCadConversionJob(input: {
  failedAt?: string;
  job: ProjectCadConversionJobRecord;
  message: string;
  retryable: boolean;
}): ProjectCadConversionJobRecord {
  const failedAt = input.failedAt ?? new Date().toISOString();
  const retriesAvailable = input.retryable && input.job.attempts < input.job.maxAttempts;
  const nextAttemptAt = retriesAvailable ? new Date(new Date(failedAt).getTime() + retryDelayMs(input.job.attempts)).toISOString() : null;

  return {
    ...input.job,
    errorMessage: input.message,
    finishedAt: retriesAvailable ? null : failedAt,
    logs: [...input.job.logs, logEntry(failedAt, retriesAvailable ? "warning" : "error", input.message)],
    nextAttemptAt,
    status: retriesAvailable ? "retryable-failed" : "failed",
    updatedAt: failedAt,
  };
}

export function retryProjectCadConversionJob(job: ProjectCadConversionJobRecord, queuedAt = new Date().toISOString()): ProjectCadConversionJobRecord {
  if (job.status !== "retryable-failed") {
    return job;
  }

  return {
    ...job,
    errorMessage: null,
    logs: [...job.logs, logEntry(queuedAt, "info", "Job returned to the queue for another worker attempt.")],
    nextAttemptAt: null,
    status: "queued",
    updatedAt: queuedAt,
  };
}

export function createProjectCadConversionQueueReport(jobs: ProjectCadConversionJobRecord[], generatedAt = new Date().toISOString()): ProjectCadConversionQueueReport {
  const sortedJobs = [...jobs].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt) || first.sourceFileName.localeCompare(second.sourceFileName));

  return {
    generatedAt,
    jobs: sortedJobs,
    summary: {
      failedCount: sortedJobs.filter((job) => job.status === "failed").length,
      queuedCount: sortedJobs.filter((job) => job.status === "queued").length,
      retryableCount: sortedJobs.filter((job) => job.status === "retryable-failed").length,
      runningCount: sortedJobs.filter((job) => job.status === "running").length,
      succeededCount: sortedJobs.filter((job) => job.status === "succeeded").length,
      totalCount: sortedJobs.length,
    },
  };
}
