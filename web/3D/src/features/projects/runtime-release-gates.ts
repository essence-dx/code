import { createHash } from "node:crypto";
import type { DeterministicRuntimeReplayReport } from "@/features/editor/runtime/deterministic-runtime-replay";
import type { MaterialPostProcessParityReport } from "@/features/editor/runtime/material-postprocess-parity";
import type { EditorPerformanceBudgetEvidenceReport } from "@/features/editor/utils/editor-performance-budget-evidence";
import type { BrowserRuntimeReleaseEvidenceReport } from "@/features/projects/browser-runtime-release-evidence";

export type RuntimeReleaseGateStatus = "blocked" | "ready";
export type RuntimeReleaseGateId = "browser-screenshots" | "deterministic-replay" | "material-parity" | "performance-budgets";

export interface RuntimeReleaseGate {
  blockerCount: number;
  evidenceHash: string;
  id: RuntimeReleaseGateId;
  label: string;
  nextAction: string;
  status: RuntimeReleaseGateStatus;
}

export interface RuntimeReleaseGatesReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  gates: RuntimeReleaseGate[];
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    blockedCount: number;
    gateCount: number;
    nextAction: string;
    readyCount: number;
    releaseGateHash: string;
    releaseGateScore: number;
    status: RuntimeReleaseGateStatus;
  };
  workspaceId: string;
}

export interface CreateRuntimeReleaseGatesReportInput {
  browserRuntimeEvidenceReport: BrowserRuntimeReleaseEvidenceReport;
  deterministicReplayReport: DeterministicRuntimeReplayReport;
  generatedAt?: string;
  materialParityReport: MaterialPostProcessParityReport;
  performanceBudgetReport: EditorPerformanceBudgetEvidenceReport;
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

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function gate(input: Omit<RuntimeReleaseGate, "status">): RuntimeReleaseGate {
  return {
    ...input,
    status: input.blockerCount > 0 ? "blocked" : "ready",
  };
}

function createPerformanceGate(report: EditorPerformanceBudgetEvidenceReport): RuntimeReleaseGate {
  const blockedRows = report.rows.filter((row) => row.status === "blocked" || row.p95Ms > row.budgetMs);

  return gate({
    blockerCount: blockedRows.length,
    evidenceHash: report.summary.performanceBudgetHash,
    id: "performance-budgets",
    label: "Performance budgets",
    nextAction: blockedRows.length
      ? "Reduce blocked p95 timings below budget before release approval."
      : "Performance p95 budgets are inside release limits.",
  });
}

function createReplayGate(report: DeterministicRuntimeReplayReport): RuntimeReleaseGate {
  const failedCount = report.replayResults.reduce((total, result) => total + result.summary.failedCount, 0);

  return gate({
    blockerCount: failedCount,
    evidenceHash: report.summary.reportHash,
    id: "deterministic-replay",
    label: "Deterministic replay",
    nextAction: failedCount ? "Fix deterministic replay mismatches before release approval." : "Deterministic replay assertions are release-ready.",
  });
}

function createMaterialGate(report: MaterialPostProcessParityReport): RuntimeReleaseGate {
  return gate({
    blockerCount: report.summary.mismatchCount,
    evidenceHash: report.summary.parityHash,
    id: "material-parity",
    label: "Material parity",
    nextAction: report.summary.mismatchCount
      ? "Resolve material or post-process drift before release approval."
      : "Editor and viewer material parity is release-ready.",
  });
}

function createBrowserScreenshotGate(report: BrowserRuntimeReleaseEvidenceReport): RuntimeReleaseGate {
  const missingScreenshotCount = report.rows.filter((row) => !row.screenshotHash).length;

  return gate({
    blockerCount: missingScreenshotCount,
    evidenceHash: report.summary.releaseEvidenceHash,
    id: "browser-screenshots",
    label: "Browser screenshots",
    nextAction: missingScreenshotCount
      ? "Capture missing browser screenshots before release approval."
      : "Browser screenshot evidence is present for release review.",
  });
}

function summarize(gates: RuntimeReleaseGate[]): RuntimeReleaseGatesReport["summary"] {
  const blockedCount = gates.filter((gate) => gate.status === "blocked").length;
  const readyCount = gates.length - blockedCount;
  const status: RuntimeReleaseGateStatus = blockedCount > 0 ? "blocked" : "ready";

  return {
    blockedCount,
    gateCount: gates.length,
    nextAction:
      status === "ready"
        ? "Runtime release gates are clear for performance, replay, material parity, and screenshot evidence."
        : "Resolve blocked runtime release gates before release approval.",
    readyCount,
    releaseGateHash: sha256(gates.map((gate) => `${gate.id}:${gate.status}:${gate.blockerCount}:${gate.evidenceHash}`)),
    releaseGateScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, gates.length)) * 100))),
    status,
  };
}

function createCsv(gates: RuntimeReleaseGate[]) {
  const header = ["gate", "status", "blockers", "evidence_hash", "next_action"];
  const body = gates.map((gate) => [gate.id, gate.status, gate.blockerCount, gate.evidenceHash, gate.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createRuntimeReleaseGatesReport(input: CreateRuntimeReleaseGatesReportInput): RuntimeReleaseGatesReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const gates = [
    createPerformanceGate(input.performanceBudgetReport),
    createReplayGate(input.deterministicReplayReport),
    createMaterialGate(input.materialParityReport),
    createBrowserScreenshotGate(input.browserRuntimeEvidenceReport),
  ];
  const summary = summarize(gates);
  const csvContent = createCsv(gates);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      gates,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-release-gates-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    gates,
    jsonContent,
    jsonDataUri: encodeDataUri("application/json", jsonContent),
    jsonFileName: `${fileBase}.json`,
    summary,
    workspaceId,
  };
}
