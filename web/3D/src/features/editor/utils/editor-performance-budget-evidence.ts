import { createHash } from "node:crypto";
import type { SceneDocument } from "@/features/editor/types";
import { profileScenePerformance } from "@/features/editor/utils/scene-performance-profiler";

export type EditorPerformanceBudgetOperation = "large-scene-selection" | "published-viewer-startup" | "timeline-scrubbing" | "transform";
export type EditorPerformanceBudgetStatus = "blocked" | "ready";

export interface EditorPerformanceBudgetRow {
  averageMs: number;
  budgetMs: number;
  maxMs: number;
  minMs: number;
  nextAction: string;
  operation: EditorPerformanceBudgetOperation;
  p95Ms: number;
  performanceBudgetHash: string;
  sampleCount: number;
  sceneObjectCount: number;
  sceneScore: number;
  status: EditorPerformanceBudgetStatus;
}

export interface EditorPerformanceBudgetEvidenceReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: EditorPerformanceBudgetRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    operationCount: number;
    performanceBudgetHash: string;
    readyCount: number;
    runtimeBudgetScore: number;
    status: EditorPerformanceBudgetStatus;
  };
  workspaceId: string;
}

export interface CreateEditorPerformanceBudgetEvidenceRowsInput {
  document: SceneDocument;
  operationSamples: Partial<Record<EditorPerformanceBudgetOperation, number[]>>;
}

export interface CreateEditorPerformanceBudgetEvidenceReportInput {
  generatedAt?: string;
  rows: EditorPerformanceBudgetRow[];
  workspaceId?: string;
}

const operationOrder = ["large-scene-selection", "transform", "timeline-scrubbing", "published-viewer-startup"] as const satisfies readonly EditorPerformanceBudgetOperation[];

const budgetByOperation: Record<EditorPerformanceBudgetOperation, number> = {
  "large-scene-selection": 16,
  "published-viewer-startup": 1200,
  "timeline-scrubbing": 16,
  transform: 16,
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

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
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

function percentile95(samples: number[]) {
  if (!samples.length) {
    return 0;
  }

  const sorted = [...samples].sort((first, second) => first - second);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

  return sorted[index] ?? 0;
}

function normalizeSamples(samples: number[] | undefined) {
  return (samples ?? []).filter((sample) => Number.isFinite(sample) && sample >= 0);
}

function nextActionFor(operation: EditorPerformanceBudgetOperation, status: EditorPerformanceBudgetStatus, sampleCount: number) {
  const label = operation === "large-scene-selection" ? "large-scene selection" : operation.replaceAll("-", " ");

  if (!sampleCount) {
    return `Capture ${label} timing samples before accepting editor performance budget evidence.`;
  }

  if (status === "blocked") {
    return `Reduce ${label} p95 timing below the runtime budget before accepting editor performance evidence.`;
  }

  return `${label} is inside the editor runtime performance budget.`;
}

function createRow(input: {
  document: SceneDocument;
  operation: EditorPerformanceBudgetOperation;
  samples: number[];
}): EditorPerformanceBudgetRow {
  const profile = profileScenePerformance(input.document);
  const budgetMs = budgetByOperation[input.operation];
  const sampleCount = input.samples.length;
  const totalMs = input.samples.reduce((total, sample) => total + sample, 0);
  const p95Ms = roundMs(percentile95(input.samples));
  const status: EditorPerformanceBudgetStatus = sampleCount > 0 && p95Ms <= budgetMs ? "ready" : "blocked";
  const base = {
    averageMs: roundMs(sampleCount ? totalMs / sampleCount : 0),
    budgetMs,
    maxMs: roundMs(sampleCount ? Math.max(...input.samples) : 0),
    minMs: roundMs(sampleCount ? Math.min(...input.samples) : 0),
    nextAction: nextActionFor(input.operation, status, sampleCount),
    operation: input.operation,
    p95Ms,
    sampleCount,
    sceneObjectCount: input.document.objects.length,
    sceneScore: profile.score,
    status,
  };

  return {
    ...base,
    performanceBudgetHash: sha256(base),
  };
}

export function createEditorPerformanceBudgetEvidenceRows(input: CreateEditorPerformanceBudgetEvidenceRowsInput): EditorPerformanceBudgetRow[] {
  return operationOrder.map((operation) =>
    createRow({
      document: input.document,
      operation,
      samples: normalizeSamples(input.operationSamples[operation]),
    }),
  );
}

function summarize(rows: EditorPerformanceBudgetRow[]): EditorPerformanceBudgetEvidenceReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: EditorPerformanceBudgetStatus = blockedCount > 0 ? "blocked" : "ready";

  return {
    blockedCount,
    nextAction:
      status === "ready"
        ? "Editor performance budget evidence is ready for large-scene selection, transform, timeline scrubbing, and viewer startup."
        : "Fix blocked editor performance budget rows before calling runtime fidelity complete.",
    operationCount: rows.length,
    performanceBudgetHash: sha256(rows.map((row) => row.performanceBudgetHash)),
    readyCount,
    runtimeBudgetScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100))),
    status,
  };
}

function createCsv(rows: EditorPerformanceBudgetRow[]) {
  const header = ["operation", "status", "budget_ms", "p95_ms", "average_ms", "sample_count", "performance_budget_hash", "next_action"];
  const body = rows.map((row) =>
    [row.operation, row.status, row.budgetMs, row.p95Ms, row.averageMs, row.sampleCount, row.performanceBudgetHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createEditorPerformanceBudgetEvidenceReport(input: CreateEditorPerformanceBudgetEvidenceReportInput): EditorPerformanceBudgetEvidenceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = [...input.rows].sort((first, second) => operationOrder.indexOf(first.operation) - operationOrder.indexOf(second.operation));
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-editor-performance-budget-evidence-${dateStamp(generatedAt)}`;

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
