import { createHash } from "node:crypto";
import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";

export type CadWorkerArtifactTranscriptIngestionStatus = "blocked" | "ready" | "review";
export type CadWorkerArtifactTranscriptIngestionFileFormat = "csv" | "json";

export interface CadWorkerArtifactTranscriptInput {
  actualRegressionHash: string;
  adapterId: CadConversionWorkerAdapterId;
  command: string;
  diagnosticOutput: string;
  expectedRegressionHash: string;
  exitCode: number | null;
  fixtureName: string;
  outputArtifactHash: string;
  sandboxDiagnostics: string;
  stderr: string;
  stdout: string;
  transcriptId: string;
  workerVersion: null | string;
}

export interface CadWorkerArtifactTranscriptRow {
  actualRegressionHash: string;
  adapterId: CadConversionWorkerAdapterId;
  command: string;
  diagnosticHash: string;
  diagnosticOutput: string;
  expectedRegressionHash: string;
  exitCode: number | "missing";
  fixtureName: string;
  nextAction: string;
  outputArtifactCaptured: boolean;
  outputArtifactHash: string;
  regressionHashMatched: boolean;
  sandboxDiagnostics: string;
  sandboxDiagnosticsCaptured: boolean;
  status: CadWorkerArtifactTranscriptIngestionStatus;
  stderr: string;
  stdout: string;
  transcriptCaptured: boolean;
  transcriptHash: string;
  transcriptId: string;
  workerVersion: string;
}

export interface CadWorkerArtifactTranscriptIngestionFile {
  download: string;
  format: CadWorkerArtifactTranscriptIngestionFileFormat;
  href: string;
  label: string;
}

export interface CadWorkerArtifactTranscriptIngestionReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: CadWorkerArtifactTranscriptIngestionFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: CadWorkerArtifactTranscriptRow[];
  summary: {
    blockedCount: number;
    ingestionHash: string;
    ingestionScore: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: CadWorkerArtifactTranscriptIngestionStatus;
  };
  workspaceId: string;
}

export interface CreateCadWorkerArtifactTranscriptIngestionInput {
  generatedAt?: string;
  releaseCandidateId: string;
  requiredAdapters?: CadConversionWorkerAdapterId[];
  transcripts: CadWorkerArtifactTranscriptInput[];
  workspaceId?: string;
}

const defaultRequiredAdapters: CadConversionWorkerAdapterId[] = ["freecad", "occt"];
const adapterRank: Record<CadConversionWorkerAdapterId, number> = {
  freecad: 0,
  occt: 1,
};

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

function csvCell(value: boolean | number | string) {
  return `"${String(value).replaceAll('"', '""')}"`;
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

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function missingTranscript(adapterId: CadConversionWorkerAdapterId): CadWorkerArtifactTranscriptInput {
  return {
    actualRegressionHash: "",
    adapterId,
    command: "",
    diagnosticOutput: `No ${adapterId} CAD worker artifact transcript recorded.`,
    expectedRegressionHash: "",
    exitCode: null,
    fixtureName: "missing",
    outputArtifactHash: "",
    sandboxDiagnostics: "",
    stderr: "",
    stdout: "",
    transcriptId: `${adapterId}-missing-transcript`,
    workerVersion: null,
  };
}

function statusFor(input: {
  outputArtifactCaptured: boolean;
  regressionHashMatched: boolean;
  sandboxDiagnosticsCaptured: boolean;
  transcriptCaptured: boolean;
  workerVersion: string;
}): CadWorkerArtifactTranscriptIngestionStatus {
  if (!input.outputArtifactCaptured || !input.regressionHashMatched || !input.transcriptCaptured) {
    return "blocked";
  }

  if (!input.sandboxDiagnosticsCaptured || input.workerVersion === "missing") {
    return "review";
  }

  return "ready";
}

function nextActionFor(input: {
  adapterId: CadConversionWorkerAdapterId;
  outputArtifactCaptured: boolean;
  regressionHashMatched: boolean;
  sandboxDiagnosticsCaptured: boolean;
  status: CadWorkerArtifactTranscriptIngestionStatus;
  transcriptCaptured: boolean;
}) {
  if (input.status === "blocked") {
    return `Resolve blocked CAD worker artifact transcript ingestion for ${input.adapterId}.`;
  }

  if (!input.sandboxDiagnosticsCaptured) {
    return `Attach sandbox diagnostics to CAD worker transcript for ${input.adapterId}.`;
  }

  if (!input.outputArtifactCaptured) {
    return `Attach output artifact hash to CAD worker transcript for ${input.adapterId}.`;
  }

  if (!input.regressionHashMatched) {
    return `Review CAD worker regression hash drift for ${input.adapterId}.`;
  }

  if (!input.transcriptCaptured) {
    return `Attach stdout or stderr transcript output for ${input.adapterId}.`;
  }

  return `Keep CAD worker artifact transcript evidence current for ${input.adapterId}.`;
}

function createRow(input: CadWorkerArtifactTranscriptInput): CadWorkerArtifactTranscriptRow {
  const stdout = input.stdout.trim();
  const stderr = input.stderr.trim();
  const diagnosticOutput = input.diagnosticOutput.trim() || "No diagnostic output recorded.";
  const sandboxDiagnostics = input.sandboxDiagnostics.trim();
  const outputArtifactHash = input.outputArtifactHash.trim() || "missing";
  const expectedRegressionHash = input.expectedRegressionHash.trim() || "missing";
  const actualRegressionHash = input.actualRegressionHash.trim() || "missing";
  const workerVersion = input.workerVersion?.trim() || "missing";
  const transcriptCaptured = stdout.length > 0 || stderr.length > 0;
  const sandboxDiagnosticsCaptured = sandboxDiagnostics.length > 0;
  const outputArtifactCaptured = outputArtifactHash.startsWith("sha256:");
  const regressionHashMatched = expectedRegressionHash.startsWith("sha256:") && expectedRegressionHash === actualRegressionHash;
  const status = statusFor({
    outputArtifactCaptured,
    regressionHashMatched,
    sandboxDiagnosticsCaptured,
    transcriptCaptured,
    workerVersion,
  });
  const rowWithoutHashes = {
    actualRegressionHash,
    adapterId: input.adapterId,
    command: input.command.trim() || "missing",
    diagnosticOutput,
    expectedRegressionHash,
    exitCode: input.exitCode ?? "missing",
    fixtureName: input.fixtureName.trim() || "missing",
    nextAction: "",
    outputArtifactCaptured,
    outputArtifactHash,
    regressionHashMatched,
    sandboxDiagnostics: sandboxDiagnostics || "missing",
    sandboxDiagnosticsCaptured,
    status,
    stderr,
    stdout,
    transcriptCaptured,
    transcriptId: input.transcriptId.trim() || `${input.adapterId}-transcript`,
    workerVersion,
  } satisfies Omit<CadWorkerArtifactTranscriptRow, "diagnosticHash" | "transcriptHash">;
  const row = {
    ...rowWithoutHashes,
    nextAction: nextActionFor(rowWithoutHashes),
  };

  return {
    ...row,
    diagnosticHash: sha256({
      diagnosticOutput: row.diagnosticOutput,
      sandboxDiagnostics: row.sandboxDiagnostics,
    }),
    transcriptHash: sha256(row),
  };
}

function createRows(input: CreateCadWorkerArtifactTranscriptIngestionInput) {
  const transcriptByAdapter = new Map(input.transcripts.map((transcript) => [transcript.adapterId, transcript]));
  const requiredAdapters = input.requiredAdapters ?? defaultRequiredAdapters;

  return requiredAdapters
    .map((adapterId) => createRow(transcriptByAdapter.get(adapterId) ?? missingTranscript(adapterId)))
    .sort((first, second) => adapterRank[first.adapterId] - adapterRank[second.adapterId]);
}

function summarize(rows: CadWorkerArtifactTranscriptRow[]): CadWorkerArtifactTranscriptIngestionReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: CadWorkerArtifactTranscriptIngestionStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    ingestionHash: sha256(rows.map((row) => row.transcriptHash)),
    ingestionScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
    nextAction:
      status === "blocked"
        ? "Resolve blocked CAD worker artifact transcript ingestion before release review."
        : status === "review"
          ? "Review CAD worker artifact transcript ingestion before release review."
          : "CAD worker artifact transcript ingestion is ready for release review.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: CadWorkerArtifactTranscriptRow[]) {
  const header = [
    "transcript_id",
    "adapter_id",
    "fixture_name",
    "status",
    "transcript_captured",
    "sandbox_diagnostics_captured",
    "regression_hash_matched",
    "output_artifact_hash",
    "transcript_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.transcriptId,
      row.adapterId,
      row.fixtureName,
      row.status,
      row.transcriptCaptured,
      row.sandboxDiagnosticsCaptured,
      row.regressionHashMatched,
      row.outputArtifactHash,
      row.transcriptHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): CadWorkerArtifactTranscriptIngestionFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV transcripts",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON transcripts",
    },
  ];
}

export function createCadWorkerArtifactTranscriptIngestion(input: CreateCadWorkerArtifactTranscriptIngestionInput): CadWorkerArtifactTranscriptIngestionReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
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
  const fileBase = `${slug(workspaceId)}-cad-worker-artifact-transcript-ingestion-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({
      csvDataUri,
      csvFileName,
      jsonDataUri,
      jsonFileName,
    }),
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
