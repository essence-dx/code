import { createHash } from "node:crypto";
import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";

export type CadKernelWorkerHealthStatus = "blocked" | "ready" | "review";
export type CadKernelWorkerFixtureResult = "failed" | "not-run" | "passed";

export interface CadKernelWorkerAdapterHealthInput {
  adapterId: CadConversionWorkerAdapterId;
  available: boolean;
  binaryPath: string | null;
  detectedVersion: string | null;
  expectedVersion: string;
  fixtureExecutedAt: string | null;
  fixtureName: string;
  fixtureResult: CadKernelWorkerFixtureResult;
  sandboxMemoryMb: number;
  sandboxTimeoutSeconds: number;
}

export interface CadKernelWorkerHealthRow {
  adapterId: CadConversionWorkerAdapterId;
  binaryPath: string;
  detectedVersion: string;
  expectedVersion: string;
  fixtureExecutedAt: string;
  fixtureName: string;
  fixtureResult: CadKernelWorkerFixtureResult;
  healthHash: string;
  nextAction: string;
  sandboxLimits: string;
  status: CadKernelWorkerHealthStatus;
}

export interface CadKernelWorkerHealthReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: CadKernelWorkerHealthRow[];
  summary: {
    blockedCount: number;
    healthHash: string;
    healthScore: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: CadKernelWorkerHealthStatus;
  };
  workspaceId: string;
}

export interface CreateCadKernelWorkerHealthReportInput {
  adapters?: CadKernelWorkerAdapterHealthInput[];
  generatedAt?: string;
  workspaceId?: string;
}

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

function displayValue(value: string | null, missingLabel: string) {
  return value && value.trim().length > 0 ? value : missingLabel;
}

function hasSafeSandbox(input: Pick<CadKernelWorkerAdapterHealthInput, "sandboxMemoryMb" | "sandboxTimeoutSeconds">) {
  return input.sandboxMemoryMb >= 1024 && input.sandboxTimeoutSeconds >= 60;
}

function statusForAdapter(input: CadKernelWorkerAdapterHealthInput): CadKernelWorkerHealthStatus {
  if (!input.available || !input.binaryPath || input.fixtureResult === "failed" || input.fixtureResult === "not-run") {
    return "blocked";
  }

  if (input.detectedVersion !== input.expectedVersion || !hasSafeSandbox(input)) {
    return "review";
  }

  return "ready";
}

function nextActionFor(input: { adapterId: CadConversionWorkerAdapterId; status: CadKernelWorkerHealthStatus }) {
  if (input.status === "blocked") {
    return `Install or expose blocked CAD kernel workers for ${input.adapterId}.`;
  }

  if (input.status === "review") {
    return `Review CAD kernel worker version drift, sandbox limits, or fixture evidence for ${input.adapterId}.`;
  }

  return `Keep CAD kernel worker health evidence current for ${input.adapterId}.`;
}

function createMissingRow(workspaceId: string): CadKernelWorkerHealthRow {
  const input: CadKernelWorkerAdapterHealthInput = {
    adapterId: "freecad",
    available: false,
    binaryPath: null,
    detectedVersion: null,
    expectedVersion: "1.0.2",
    fixtureExecutedAt: null,
    fixtureName: "bracket_mm.step",
    fixtureResult: "not-run",
    sandboxMemoryMb: 0,
    sandboxTimeoutSeconds: 0,
  };

  return createRow(input, workspaceId);
}

function createRow(input: CadKernelWorkerAdapterHealthInput, workspaceId: string): CadKernelWorkerHealthRow {
  const status = statusForAdapter(input);
  const nextAction = nextActionFor({
    adapterId: input.adapterId,
    status,
  });
  const sandboxLimits = `${input.sandboxMemoryMb}MB memory / ${input.sandboxTimeoutSeconds}s timeout`;
  const row = {
    adapterId: input.adapterId,
    binaryPath: displayValue(input.binaryPath, "missing"),
    detectedVersion: displayValue(input.detectedVersion, "missing"),
    expectedVersion: input.expectedVersion,
    fixtureExecutedAt: displayValue(input.fixtureExecutedAt, "missing"),
    fixtureName: input.fixtureName,
    fixtureResult: input.fixtureResult,
    nextAction,
    sandboxLimits,
    status,
  } satisfies Omit<CadKernelWorkerHealthRow, "healthHash">;

  return {
    ...row,
    healthHash: sha256({
      ...row,
      workspaceId,
    }),
  };
}

function summarize(rows: CadKernelWorkerHealthRow[]): CadKernelWorkerHealthReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: CadKernelWorkerHealthStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const healthScore = Math.max(0, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 35 - blockedCount * 20));

  return {
    blockedCount,
    healthHash: sha256(rows.map((row) => row.healthHash)),
    healthScore,
    nextAction:
      status === "blocked"
        ? "Install or expose blocked CAD kernel workers before native conversion release."
        : status === "review"
          ? "Review CAD kernel worker version drift, sandbox limits, and fixture evidence before release."
          : "CAD kernel worker health is ready.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: CadKernelWorkerHealthRow[]) {
  const header = [
    "adapter_id",
    "status",
    "binary_path",
    "detected_version",
    "expected_version",
    "sandbox_limits",
    "fixture_result",
    "health_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.adapterId,
      row.status,
      row.binaryPath,
      row.detectedVersion,
      row.expectedVersion,
      row.sandboxLimits,
      `${row.fixtureName}:${row.fixtureResult}:${row.fixtureExecutedAt}`,
      row.healthHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: CadKernelWorkerHealthRow[];
  summary: CadKernelWorkerHealthReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createCadKernelWorkerHealthReport(input: CreateCadKernelWorkerHealthReportInput = {}): CadKernelWorkerHealthReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const adapterInputs = input.adapters ?? [];
  const rows = (adapterInputs.length > 0 ? adapterInputs.map((adapter) => createRow(adapter, workspaceId)) : [createMissingRow(workspaceId)]).sort(
    (first, second) => adapterRank[first.adapterId] - adapterRank[second.adapterId],
  );
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-cad-kernel-worker-health-${dateStamp(generatedAt)}`;

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
