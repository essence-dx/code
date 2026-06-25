import { createHash } from "node:crypto";
import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";

export type NativeCadWorkerExecutionEvidenceStatus = "blocked" | "ready" | "review";
export type NativeCadWorkerExecutionEvidenceFileFormat = "csv" | "json";

export interface NativeCadWorkerExecutionEvidenceInput {
  adapterId: CadConversionWorkerAdapterId;
  available: boolean;
  command: string;
  diagnosticOutput: string;
  exitCode: number | null;
  fixtureName: string;
  outputHash: string | null;
  sandboxMemoryMb: number;
  sandboxTimeoutSeconds: number;
  version: string | null;
}

export interface NativeCadWorkerExecutionEvidenceRow {
  adapterId: CadConversionWorkerAdapterId;
  command: string;
  commandAvailable: boolean;
  diagnosticHash: string;
  diagnosticOutput: string;
  evidenceHash: string;
  exitCode: number | "missing";
  fixtureName: string;
  fixturePassed: boolean;
  nextAction: string;
  outputHash: string;
  sandboxLimits: string;
  sandboxReady: boolean;
  status: NativeCadWorkerExecutionEvidenceStatus;
  version: string;
  workerId: string;
}

export interface NativeCadWorkerExecutionEvidenceFile {
  download: string;
  format: NativeCadWorkerExecutionEvidenceFileFormat;
  href: string;
  label: string;
}

export interface NativeCadWorkerExecutionEvidenceReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeCadWorkerExecutionEvidenceFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: NativeCadWorkerExecutionEvidenceRow[];
  summary: {
    blockedCount: number;
    evidenceHash: string;
    evidenceScore: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeCadWorkerExecutionEvidenceStatus;
  };
  workspaceId: string;
}

export interface CreateNativeCadWorkerExecutionEvidenceInput {
  generatedAt?: string;
  requiredAdapters?: CadConversionWorkerAdapterId[];
  workers?: NativeCadWorkerExecutionEvidenceInput[];
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

function sandboxLimits(input: Pick<NativeCadWorkerExecutionEvidenceInput, "sandboxMemoryMb" | "sandboxTimeoutSeconds">) {
  return `${input.sandboxMemoryMb}MB memory / ${input.sandboxTimeoutSeconds}s timeout`;
}

function hasSafeSandbox(input: Pick<NativeCadWorkerExecutionEvidenceInput, "sandboxMemoryMb" | "sandboxTimeoutSeconds">) {
  return input.sandboxMemoryMb >= 1024 && input.sandboxTimeoutSeconds >= 60;
}

function statusFor(input: {
  commandAvailable: boolean;
  fixturePassed: boolean;
  sandboxReady: boolean;
  version: string;
}): NativeCadWorkerExecutionEvidenceStatus {
  if (!input.commandAvailable || !input.fixturePassed) {
    return "blocked";
  }

  if (!input.sandboxReady || input.version === "missing") {
    return "review";
  }

  return "ready";
}

function nextActionFor(input: { adapterId: CadConversionWorkerAdapterId; status: NativeCadWorkerExecutionEvidenceStatus }) {
  if (input.status === "blocked") {
    return `Resolve blocked native CAD worker execution evidence for ${input.adapterId}.`;
  }

  if (input.status === "review") {
    return `Review native CAD worker sandbox limits, version evidence, or fixture diagnostics for ${input.adapterId}.`;
  }

  return `Keep native CAD worker execution evidence fresh for ${input.adapterId}.`;
}

function createMissingInput(adapterId: CadConversionWorkerAdapterId): NativeCadWorkerExecutionEvidenceInput {
  return {
    adapterId,
    available: false,
    command: "",
    diagnosticOutput: `No ${adapterId} worker execution evidence recorded.`,
    exitCode: null,
    fixtureName: "missing",
    outputHash: null,
    sandboxMemoryMb: 0,
    sandboxTimeoutSeconds: 0,
    version: null,
  };
}

function createRow(input: NativeCadWorkerExecutionEvidenceInput, workspaceId: string): NativeCadWorkerExecutionEvidenceRow {
  const command = input.command.trim() || "missing";
  const commandAvailable = input.available && command !== "missing";
  const outputHash = input.outputHash?.trim() || "missing";
  const fixturePassed = input.exitCode === 0 && outputHash !== "missing";
  const sandboxReady = hasSafeSandbox(input);
  const version = input.version?.trim() || "missing";
  const status = statusFor({
    commandAvailable,
    fixturePassed,
    sandboxReady,
    version,
  });
  const rowWithoutHashes = {
    adapterId: input.adapterId,
    command,
    commandAvailable,
    diagnosticOutput: input.diagnosticOutput.trim() || "No diagnostic output recorded.",
    exitCode: input.exitCode ?? "missing",
    fixtureName: input.fixtureName.trim() || "missing",
    fixturePassed,
    nextAction: nextActionFor({
      adapterId: input.adapterId,
      status,
    }),
    outputHash,
    sandboxLimits: sandboxLimits(input),
    sandboxReady,
    status,
    version,
    workerId: `${workspaceId}:${input.adapterId}`,
  } satisfies Omit<NativeCadWorkerExecutionEvidenceRow, "diagnosticHash" | "evidenceHash">;
  const diagnosticHash = sha256(rowWithoutHashes.diagnosticOutput);

  return {
    ...rowWithoutHashes,
    diagnosticHash,
    evidenceHash: sha256({
      ...rowWithoutHashes,
      diagnosticHash,
      workspaceId,
    }),
  };
}

function createRows(input: Required<Pick<CreateNativeCadWorkerExecutionEvidenceInput, "requiredAdapters" | "workers">>, workspaceId: string) {
  const workerByAdapter = new Map(input.workers.map((worker) => [worker.adapterId, worker]));
  const rows = input.requiredAdapters.map((adapterId) => createRow(workerByAdapter.get(adapterId) ?? createMissingInput(adapterId), workspaceId));

  return rows.sort((first, second) => adapterRank[first.adapterId] - adapterRank[second.adapterId]);
}

function summarize(rows: NativeCadWorkerExecutionEvidenceRow[]): NativeCadWorkerExecutionEvidenceReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeCadWorkerExecutionEvidenceStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const evidenceScore = Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18)));

  return {
    blockedCount,
    evidenceHash: sha256(rows.map((row) => row.evidenceHash)),
    evidenceScore,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native CAD worker execution evidence before desktop CAD release."
        : status === "review"
          ? "Review native CAD worker sandbox or version evidence before release."
          : "Native CAD worker execution evidence is ready.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeCadWorkerExecutionEvidenceRow[]) {
  const header = [
    "worker_id",
    "adapter_id",
    "status",
    "command_available",
    "fixture_passed",
    "sandbox_ready",
    "output_hash",
    "evidence_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.workerId,
      row.adapterId,
      row.status,
      row.commandAvailable,
      row.fixturePassed,
      row.sandboxReady,
      row.outputHash,
      row.evidenceHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: NativeCadWorkerExecutionEvidenceRow[];
  summary: NativeCadWorkerExecutionEvidenceReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createNativeCadWorkerExecutionEvidence(
  input: CreateNativeCadWorkerExecutionEvidenceInput = {},
): NativeCadWorkerExecutionEvidenceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(
    {
      requiredAdapters: input.requiredAdapters ?? defaultRequiredAdapters,
      workers: input.workers ?? [],
    },
    workspaceId,
  );
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-native-cad-worker-execution-evidence-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeCsvDataUri(csvContent);
  const jsonDataUri = encodeJsonDataUri(jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: [
      {
        download: csvFileName,
        format: "csv",
        href: csvDataUri,
        label: "CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "JSON",
      },
    ],
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    rows,
    summary,
    workspaceId,
  };
}
