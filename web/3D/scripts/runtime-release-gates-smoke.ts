import { strict as assert } from "node:assert";
import type { BrowserRuntimeReleaseEvidenceReport } from "@/features/projects/browser-runtime-release-evidence";
import type { DeterministicRuntimeReplayReport } from "@/features/editor/runtime/deterministic-runtime-replay";
import type { MaterialPostProcessParityReport } from "@/features/editor/runtime/material-postprocess-parity";
import type { EditorPerformanceBudgetEvidenceReport } from "@/features/editor/utils/editor-performance-budget-evidence";
import { createRuntimeReleaseGatesReport } from "@/features/projects/runtime-release-gates";

const performanceBudgetReport = {
  rows: [
    {
      budgetMs: 16,
      operation: "transform",
      p95Ms: 22,
      performanceBudgetHash: "sha256:perf-transform",
      status: "blocked",
    },
    {
      budgetMs: 1200,
      operation: "published-viewer-startup",
      p95Ms: 900,
      performanceBudgetHash: "sha256:perf-startup",
      status: "ready",
    },
  ],
  summary: {
    performanceBudgetHash: "sha256:perf",
  },
} as EditorPerformanceBudgetEvidenceReport;

const deterministicReplayReport = {
  replayResults: [
    {
      id: "select-cube",
      replayHash: "sha256:replay-select",
      summary: {
        failedCount: 1,
        status: "blocked",
      },
    },
    {
      id: "toggle-play",
      replayHash: "sha256:replay-play",
      summary: {
        failedCount: 0,
        status: "ready",
      },
    },
  ],
  summary: {
    reportHash: "sha256:replay",
  },
} as DeterministicRuntimeReplayReport;

const materialParityReport = {
  summary: {
    mismatchCount: 2,
    parityHash: "sha256:material",
    status: "blocked",
  },
} as MaterialPostProcessParityReport;

const browserRuntimeEvidenceReport = {
  rows: [
    {
      evidenceHash: "sha256:browser-editor",
      screenshotHash: null,
      status: "blocked",
      surface: "editor",
    },
    {
      evidenceHash: "sha256:browser-viewer",
      screenshotHash: "sha256:screenshot",
      status: "ready",
      surface: "public-viewer",
    },
  ],
  summary: {
    releaseEvidenceHash: "sha256:browser",
  },
} as BrowserRuntimeReleaseEvidenceReport;

const report = createRuntimeReleaseGatesReport({
  browserRuntimeEvidenceReport,
  deterministicReplayReport,
  generatedAt: "2026-05-17T08:00:00.000Z",
  materialParityReport,
  performanceBudgetReport,
  workspaceId: "Essence Runtime",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.gateCount, 4);
assert.equal(report.summary.blockedCount, 4);
assert.equal(report.summary.readyCount, 0);
assert.equal(report.summary.releaseGateScore, 0);
assert.ok(report.summary.releaseGateHash.startsWith("sha256:"));
assert.deepEqual(
  report.gates.map((gate) => gate.id),
  ["performance-budgets", "deterministic-replay", "material-parity", "browser-screenshots"],
);
assert.equal(report.gates.find((gate) => gate.id === "performance-budgets")?.blockerCount, 1);
assert.equal(report.gates.find((gate) => gate.id === "deterministic-replay")?.blockerCount, 1);
assert.equal(report.gates.find((gate) => gate.id === "material-parity")?.blockerCount, 2);
assert.equal(report.gates.find((gate) => gate.id === "browser-screenshots")?.blockerCount, 1);
assert.ok(report.csvContent.includes("performance-budgets"));
assert.ok(report.jsonContent.includes("browser-screenshots"));
assert.ok(report.csvDataUri.startsWith("data:text/csv"));
assert.ok(report.jsonDataUri.startsWith("data:application/json"));

const readyReport = createRuntimeReleaseGatesReport({
  browserRuntimeEvidenceReport: {
    ...browserRuntimeEvidenceReport,
    rows: browserRuntimeEvidenceReport.rows.map((row) => ({
      ...row,
      screenshotHash: row.screenshotHash ?? "sha256:editor-shot",
      status: "ready",
    })),
  },
  deterministicReplayReport: {
    ...deterministicReplayReport,
    replayResults: deterministicReplayReport.replayResults.map((result) => ({
      ...result,
      summary: {
        ...result.summary,
        failedCount: 0,
        status: "ready",
      },
    })),
  },
  materialParityReport: {
    ...materialParityReport,
    summary: {
      ...materialParityReport.summary,
      mismatchCount: 0,
      status: "ready",
    },
  },
  performanceBudgetReport: {
    ...performanceBudgetReport,
    rows: performanceBudgetReport.rows.map((row) => ({
      ...row,
      p95Ms: Math.min(row.p95Ms, row.budgetMs),
      status: "ready",
    })),
  },
});

assert.equal(readyReport.summary.status, "ready");
assert.equal(readyReport.summary.releaseGateScore, 100);
assert.ok(readyReport.gates.every((gate) => gate.status === "ready"));

console.log("runtime release gates smoke passed");
