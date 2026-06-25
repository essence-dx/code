import { readFileSync } from "node:fs";
import type { NativePluginSandboxOperationsReport } from "../src/features/editor/native-plugin-sandbox-operations";
import type { PerformanceRegressionExport } from "../src/features/editor/performance-regression-export";
import {
  getDesktopCrashPerformanceSupportBundleCsv,
  getDesktopCrashPerformanceSupportBundleJson,
  getDesktopCrashPerformanceSupportBundleMarkdown,
  getDesktopCrashPerformanceSupportBundleReport,
  type DesktopSupportBundleSignal,
} from "../src/features/editor/desktop-crash-performance-support-bundle";

const generatedAt = "2026-05-20T00:00:00.000Z";

const blockedReport = getDesktopCrashPerformanceSupportBundleReport({
  generatedAt,
  nativePluginSandbox: nativePluginSandbox({
    crashIsolationBlockedCount: 1,
    crashLikeRunCount: 2,
    score: 70,
    status: "blocked",
  }),
  performanceRegression: performanceRegression({
    score: 68,
    status: "blocked",
  }),
  signals: [
    signal({ kind: "cold-start", durationMs: 4200, thresholdMs: 2500 }),
    signal({ kind: "file-open", durationMs: 2600, thresholdMs: 1400 }),
    signal({ kind: "canvas-resume", durationMs: 1900, thresholdMs: 1200 }),
    signal({
      crashCount: 2,
      detail: "Plugin worker timed out while replaying widget resize.",
      kind: "plugin-run",
      durationMs: 2400,
      thresholdMs: 1000,
    }),
    signal({
      kind: "memory-pressure",
      durationMs: 600,
      memoryMb: 2380,
      thresholdMs: 500,
    }),
  ],
});
const readyReport = getDesktopCrashPerformanceSupportBundleReport({
  generatedAt,
  nativePluginSandbox: nativePluginSandbox({
    score: 97,
    status: "ready",
  }),
  performanceRegression: performanceRegression({
    score: 95,
    status: "ready",
  }),
  signals: [
    signal({ kind: "cold-start", durationMs: 1200, thresholdMs: 2500 }),
    signal({ kind: "file-open", durationMs: 620, thresholdMs: 1400 }),
    signal({ kind: "canvas-resume", durationMs: 480, thresholdMs: 1200 }),
    signal({ kind: "plugin-run", durationMs: 390, thresholdMs: 1000 }),
    signal({
      kind: "memory-pressure",
      durationMs: 240,
      memoryMb: 640,
      thresholdMs: 500,
    }),
  ],
});

const markdown = getDesktopCrashPerformanceSupportBundleMarkdown(blockedReport);
const csv = getDesktopCrashPerformanceSupportBundleCsv(blockedReport);
const json = JSON.parse(
  getDesktopCrashPerformanceSupportBundleJson(blockedReport),
) as {
  bundles: unknown[];
  rows: unknown[];
  summary: {
    crashCount: number;
    memoryPressureCount: number;
    slowSignalCount: number;
    status: string;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);

assert(blockedReport.status === "blocked", "Crashes, slow startup/open/resume, and memory pressure should block support triage.");
assert(blockedReport.signalCount === 5, "All five support signal kinds should be represented.");
assert(blockedReport.coldStartCount === 1, "Cold-start signal should be counted.");
assert(blockedReport.fileOpenCount === 1, "File-open signal should be counted.");
assert(blockedReport.canvasResumeCount === 1, "Canvas-resume signal should be counted.");
assert(blockedReport.pluginRunCount === 1, "Plugin-run signal should be counted.");
assert(blockedReport.memoryPressureCount === 1, "Memory-pressure signal should be counted.");
assert(blockedReport.crashCount === 4, "Crash count should include signal crashes and native plugin crash-like runs.");
assert(blockedReport.slowSignalCount >= 4, "Slow support signals should be counted.");
assert(blockedReport.supportPacketCount >= 5, "Support packets should be available for handoff.");
assert(blockedReport.rows.some((row) => row.category === "cold-start"), "Rows should include cold-start triage.");
assert(blockedReport.rows.some((row) => row.category === "file-open"), "Rows should include file-open triage.");
assert(blockedReport.rows.some((row) => row.category === "canvas-resume"), "Rows should include canvas-resume triage.");
assert(blockedReport.rows.some((row) => row.category === "plugin-run"), "Rows should include plugin-run triage.");
assert(blockedReport.rows.some((row) => row.category === "memory-pressure"), "Rows should include memory-pressure triage.");
assert(blockedReport.rows.some((row) => row.category === "support-gate"), "Rows should include support gate triage.");
assert(readyReport.status === "ready", "Healthy support signals should pass.");
assert(readyReport.score === 95, "Ready score should honor the weakest source score.");
assert(readyReport.crashCount === 0, "Ready support bundles should have no crash count.");
assert(readyReport.memoryPressureCount === 1, "Ready support bundles should still preserve memory pressure signal coverage.");
assert(readyReport.slowSignalCount === 0, "Ready support bundles should have no slow signals.");
assert(markdown.includes("Desktop Crash And Performance Support Bundle"), "Markdown should include a clear title.");
assert(markdown.includes("cold-start"), "Markdown should include cold-start evidence.");
assert(markdown.includes("memory pressure"), "Markdown should include memory pressure language.");
assert(csv.includes("plugin-run"), "CSV should include plugin-run rows.");
assert(json.bundles.length === blockedReport.bundles.length, "JSON should preserve support bundles.");
assert(json.rows.length === blockedReport.rows.length, "JSON should preserve support rows.");
assert(json.summary.status === blockedReport.status, "JSON should preserve status.");
assert(json.summary.crashCount === blockedReport.crashCount, "JSON should preserve crash count.");
assert(json.summary.slowSignalCount === blockedReport.slowSignalCount, "JSON should preserve slow signal count.");
assert(json.summary.memoryPressureCount === blockedReport.memoryPressureCount, "JSON should preserve memory pressure count.");
assert(
  /DesktopCrashPerformanceSupportBundlePanel/.test(extensionsSource) &&
    /getDesktopCrashPerformanceSupportBundleReport/.test(extensionsSource),
  "Extensions should wire the desktop crash/performance support bundle panel and report.",
);
assert(
  packageJson.scripts[
    "editor:desktop-crash-performance-support-bundle-smoke"
  ]?.includes("desktop-crash-performance-support-bundle-smoke"),
  "Targeted desktop crash/performance support bundle smoke command should be listed.",
);

console.log(
  `Desktop crash/performance support bundle smoke passed: ${blockedReport.status}, ${blockedReport.crashCount} crash signals.`,
);

function signal(
  patch: Partial<DesktopSupportBundleSignal> & {
    kind: DesktopSupportBundleSignal["kind"];
  },
): DesktopSupportBundleSignal {
  return {
    id: `${patch.kind}-support-signal`,
    kind: patch.kind,
    label: `${patch.kind} desktop support signal`,
    durationMs: patch.durationMs ?? 100,
    thresholdMs: patch.thresholdMs ?? 500,
    crashCount: patch.crashCount ?? 0,
    memoryMb: patch.memoryMb ?? 512,
    detail: patch.detail ?? `${patch.kind} support evidence captured.`,
    capturedAt: patch.capturedAt ?? generatedAt,
    evidenceIds: patch.evidenceIds ?? [
      `${patch.kind}-trace`,
      `${patch.kind}-support-log`,
    ],
  };
}

function performanceRegression(
  patch: Partial<PerformanceRegressionExport>,
): PerformanceRegressionExport {
  const status = patch.status ?? "ready";

  return {
    generatedAt,
    status,
    score: patch.score ?? 100,
    blockedCount: status === "blocked" ? 2 : 0,
    reviewCount: status === "review" ? 2 : 0,
    activePageName: "Canvas",
    documentPerformance: sourceReport("Document performance", patch.score ?? 100, status),
    layerIndex: sourceReport("Layer index", 100, "ready"),
    canvasRenderBudget: sourceReport("Canvas render budget", patch.score ?? 100, status),
    canvasInteractionProfiler: {
      ...sourceReport("Canvas interaction profiler", patch.score ?? 100, status),
      estimatedSelectionLatencyMs: status === "ready" ? 8 : 36,
      panZoomFrameBudgetMs: status === "ready" ? 12 : 32,
      hitTestHotspotCount: status === "ready" ? 0 : 3,
    },
    canvasViewportIntelligence: sourceReport("Canvas viewport intelligence", 96, "ready"),
    largeDocumentSafeMode: sourceReport("Large document safe mode", 98, "ready"),
    runtimeObservability: sourceReport("Runtime observability", status === "ready" ? 100 : 70, status),
    commandTelemetry: {
      ...sourceReport("Command telemetry", patch.score ?? 100, status),
      failedCommandCount: status === "ready" ? 0 : 1,
      slowCommandCount: status === "ready" ? 0 : 3,
    },
    performanceBaseline: sourceReport("Performance baseline", 95, "ready"),
    collaborationSyncReplay: sourceReport("Collaboration replay", 97, "ready"),
    productionDeploySmoke: sourceReport("Deploy smoke", 96, "ready"),
    responsiveConstraints: sourceReport("Responsive constraints", 99, "ready"),
    releaseNotes: ["Performance release bundle is available for support triage."],
    ...patch,
  } as PerformanceRegressionExport;
}

function nativePluginSandbox(
  patch: Partial<NativePluginSandboxOperationsReport>,
): NativePluginSandboxOperationsReport {
  const status = patch.status ?? "ready";

  return {
    generatedAt,
    status,
    score: patch.score ?? 100,
    manifestCount: 2,
    widgetManifestCount: 1,
    permissionPromptCount: 4,
    permissionPromptBlockedCount: 0,
    offlinePolicyReadyCount: 2,
    offlinePolicyBlockedCount: 0,
    crashIsolationReadyCount: status === "ready" ? 2 : 1,
    crashIsolationBlockedCount: patch.crashIsolationBlockedCount ?? 0,
    replayEvidenceReadyCount: 2,
    replayEvidenceBlockedCount: 0,
    crashLikeRunCount: patch.crashLikeRunCount ?? 0,
    blockedRunCount: 0,
    operatorEvidenceCount: 5,
    readyCount: status === "ready" ? 6 : 3,
    reviewCount: status === "review" ? 1 : 0,
    blockedCount: status === "blocked" ? 1 : 0,
    permissionPrompts: [],
    offlinePolicies: [],
    crashIsolation: [],
    replayEvidence: [],
    rows: [],
    operationPackets: [
      {
        id: "crash-isolation-packet",
        kind: "crash-isolation-rehearsal",
        status,
        label: "Crash isolation rehearsal",
        detail: "Plugin crash isolation support bundle is available.",
        pluginIds: ["widget-runner"],
        steps: ["Replay blocked run.", "Attach crash isolation log."],
        evidenceCount: 2,
      },
    ],
    operatorEvidence: [
      "Attach crash isolation rehearsal evidence.",
      "Attach blocked plugin run trace.",
      "Attach replay mismatch evidence.",
    ],
    ...patch,
  };
}

function sourceReport(label: string, score: number, status: string) {
  return {
    label,
    status,
    score,
    blockedCount: status === "blocked" ? 1 : 0,
    reviewCount: status === "review" ? 1 : 0,
    readyCount: status === "ready" ? 1 : 0,
    rows: [],
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
