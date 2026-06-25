import { createHash } from "node:crypto";
import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";

export type NativeCadRuntimeProcessEvidenceStatus = "blocked" | "ready" | "review";
export type NativeCadRuntimeProcessEvidenceFileFormat = "csv" | "json";

export interface NativeCadRuntimeProcessTranscriptInput {
  adapterId: CadConversionWorkerAdapterId;
  bundleRoot: string;
  command: string;
  executionDurationMs: number;
  executionExitCode: number;
  fixtureInputHash: string;
  fixtureOutputHash: string;
  processTranscriptHash: string;
  sandboxProfile: string;
  stderrHash: string;
  stdoutHash: string;
  transcriptCapturedAt: string;
  verifierOwner: string;
  workingDirectory: string;
}

export interface NativeCadRuntimeProcessEvidenceRow {
  adapterId: CadConversionWorkerAdapterId;
  bundleReady: boolean;
  bundleRoot: string;
  command: string;
  commandReady: boolean;
  evidenceHash: string;
  executionDurationMs: number;
  executionExitCode: number;
  fixtureInputHash: string;
  fixtureOutputHash: string;
  fixtureReady: boolean;
  nextAction: string;
  ownerReady: boolean;
  processTranscriptHash: string;
  sandboxProfile: string;
  sandboxReady: boolean;
  status: NativeCadRuntimeProcessEvidenceStatus;
  stderrHash: string;
  stdoutHash: string;
  transcriptCapturedAt: string;
  transcriptReady: boolean;
  verifierOwner: string;
  workingDirectory: string;
}

export interface NativeCadRuntimeProcessEvidenceFile {
  download: string;
  format: NativeCadRuntimeProcessEvidenceFileFormat;
  href: string;
  label: string;
}

export interface NativeCadRuntimeProcessEvidenceCollectorReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeCadRuntimeProcessEvidenceFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeCadRuntimeProcessEvidenceRow[];
  summary: {
    blockedCount: number;
    commandReadyCount: number;
    evidenceHash: string;
    evidenceScore: number;
    fixtureReadyCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeCadRuntimeProcessEvidenceStatus;
    transcriptReadyCount: number;
  };
  workspaceId: string;
}

export interface CreateNativeCadRuntimeProcessEvidenceCollectorInput {
  generatedAt?: string;
  releaseCandidateId: string;
  requiredAdapters?: CadConversionWorkerAdapterId[];
  transcripts: NativeCadRuntimeProcessTranscriptInput[];
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

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:");
}

function validDate(value: string) {
  const date = new Date(value.trim());

  return value.trim().length > 0 && !Number.isNaN(date.getTime());
}

function missingTranscript(adapterId: CadConversionWorkerAdapterId): NativeCadRuntimeProcessTranscriptInput {
  return {
    adapterId,
    bundleRoot: "",
    command: "",
    executionDurationMs: 0,
    executionExitCode: 1,
    fixtureInputHash: "",
    fixtureOutputHash: "",
    processTranscriptHash: "",
    sandboxProfile: "",
    stderrHash: "",
    stdoutHash: "",
    transcriptCapturedAt: "",
    verifierOwner: "",
    workingDirectory: "",
  };
}

function statusFor(input: {
  bundleReady: boolean;
  commandReady: boolean;
  fixtureReady: boolean;
  ownerReady: boolean;
  sandboxReady: boolean;
  transcriptReady: boolean;
}) {
  if (!input.bundleReady || !input.commandReady || !input.fixtureReady || !input.transcriptReady) {
    return "blocked";
  }

  if (!input.ownerReady || !input.sandboxReady) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    NativeCadRuntimeProcessEvidenceRow,
    "adapterId" | "bundleReady" | "commandReady" | "fixtureReady" | "ownerReady" | "sandboxReady" | "status" | "transcriptReady"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native CAD runtime process evidence collector for ${row.adapterId}.`;
  }

  if (!row.bundleReady) {
    return `Attach packaged CAD runtime bundle root evidence for ${row.adapterId}.`;
  }

  if (!row.commandReady) {
    return `Attach successful packaged CAD command execution evidence for ${row.adapterId}.`;
  }

  if (!row.fixtureReady) {
    return `Attach packaged CAD fixture input and output hashes for ${row.adapterId}.`;
  }

  if (!row.transcriptReady) {
    return `Attach stdout, stderr, and process transcript hashes for ${row.adapterId}.`;
  }

  if (!row.sandboxReady) {
    return `Review packaged CAD sandbox profile for ${row.adapterId}.`;
  }

  if (!row.ownerReady) {
    return `Assign CAD runtime process evidence owner for ${row.adapterId}.`;
  }

  return `Native CAD runtime process evidence is ready for ${row.adapterId}.`;
}

function createRow(input: NativeCadRuntimeProcessTranscriptInput): NativeCadRuntimeProcessEvidenceRow {
  const bundleRoot = input.bundleRoot.trim();
  const command = input.command.trim();
  const fixtureInputHash = input.fixtureInputHash.trim() || "missing";
  const fixtureOutputHash = input.fixtureOutputHash.trim() || "missing";
  const processTranscriptHash = input.processTranscriptHash.trim() || "missing";
  const sandboxProfile = input.sandboxProfile.trim();
  const stderrHash = input.stderrHash.trim() || "missing";
  const stdoutHash = input.stdoutHash.trim() || "missing";
  const transcriptCapturedAt = input.transcriptCapturedAt.trim();
  const verifierOwner = input.verifierOwner.trim();
  const workingDirectory = input.workingDirectory.trim();
  const bundleReady = bundleRoot.length > 0 && workingDirectory.length > 0;
  const commandReady = command.startsWith(bundleRoot) && input.executionExitCode === 0 && input.executionDurationMs > 0;
  const fixtureReady = hasSha256(fixtureInputHash) && hasSha256(fixtureOutputHash);
  const ownerReady = verifierOwner.length > 0;
  const sandboxReady = sandboxProfile.length >= 20;
  const transcriptReady = hasSha256(processTranscriptHash) && hasSha256(stdoutHash) && hasSha256(stderrHash) && validDate(transcriptCapturedAt);
  const status = statusFor({
    bundleReady,
    commandReady,
    fixtureReady,
    ownerReady,
    sandboxReady,
    transcriptReady,
  });
  const rowWithoutHash = {
    adapterId: input.adapterId,
    bundleReady,
    bundleRoot,
    command,
    commandReady,
    executionDurationMs: Math.max(0, Math.round(input.executionDurationMs)),
    executionExitCode: input.executionExitCode,
    fixtureInputHash,
    fixtureOutputHash,
    fixtureReady,
    nextAction: "",
    ownerReady,
    processTranscriptHash,
    sandboxProfile,
    sandboxReady,
    status,
    stderrHash,
    stdoutHash,
    transcriptCapturedAt,
    transcriptReady,
    verifierOwner,
    workingDirectory,
  } satisfies Omit<NativeCadRuntimeProcessEvidenceRow, "evidenceHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    evidenceHash: sha256(row),
  };
}

function createRows(input: CreateNativeCadRuntimeProcessEvidenceCollectorInput) {
  const transcriptByAdapter = new Map(input.transcripts.map((transcript) => [transcript.adapterId, transcript]));
  const requiredAdapters = input.requiredAdapters ?? defaultRequiredAdapters;

  return requiredAdapters
    .map((adapterId) => createRow(transcriptByAdapter.get(adapterId) ?? missingTranscript(adapterId)))
    .sort((first, second) => adapterRank[first.adapterId] - adapterRank[second.adapterId]);
}

function summarize(rows: NativeCadRuntimeProcessEvidenceRow[]): NativeCadRuntimeProcessEvidenceCollectorReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const commandReadyCount = rows.filter((row) => row.commandReady).length;
  const fixtureReadyCount = rows.filter((row) => row.fixtureReady).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeCadRuntimeProcessEvidenceStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const transcriptReadyCount = rows.filter((row) => row.transcriptReady).length;

  return {
    blockedCount,
    commandReadyCount,
    evidenceHash: sha256(rows.map((row) => row.evidenceHash)),
    evidenceScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
    fixtureReadyCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native CAD runtime process evidence collector before external runtime release."
        : status === "review"
          ? "Review native CAD runtime process evidence collector before external runtime release."
          : "Native CAD runtime process evidence collector is ready for external runtime release.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
    transcriptReadyCount,
  };
}

function createCsv(rows: NativeCadRuntimeProcessEvidenceRow[]) {
  const header = ["adapter_id", "status", "bundle_ready", "command_ready", "fixture_ready", "transcript_ready", "evidence_hash", "next_action"];
  const body = rows.map((row) =>
    [row.adapterId, row.status, row.bundleReady, row.commandReady, row.fixtureReady, row.transcriptReady, row.evidenceHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: { csvDataUri: string; csvFileName: string; jsonDataUri: string; jsonFileName: string }): NativeCadRuntimeProcessEvidenceFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV process evidence",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON process evidence",
    },
  ];
}

export function createNativeCadRuntimeProcessEvidenceCollector(input: CreateNativeCadRuntimeProcessEvidenceCollectorInput): NativeCadRuntimeProcessEvidenceCollectorReport {
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
  const fileBase = `${slug(workspaceId)}-native-cad-runtime-process-evidence-collector-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({ csvDataUri, csvFileName, jsonDataUri, jsonFileName }),
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
