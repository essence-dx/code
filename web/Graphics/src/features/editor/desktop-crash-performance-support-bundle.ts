import type {
  DesktopCrashPerformanceSupportBundleInput,
  DesktopCrashPerformanceSupportBundleReport,
  DesktopSupportBundlePacket,
  DesktopSupportBundleRow,
  DesktopSupportBundleSignal,
  DesktopSupportBundleSignalKind,
  DesktopSupportBundleStatus,
} from "@/features/editor/desktop-crash-performance-support-bundle-types";

export {
  getDesktopCrashPerformanceSupportBundleCsv,
  getDesktopCrashPerformanceSupportBundleJson,
  getDesktopCrashPerformanceSupportBundleMarkdown,
} from "@/features/editor/desktop-crash-performance-support-bundle-export";
export type {
  DesktopCrashPerformanceSupportBundleInput,
  DesktopCrashPerformanceSupportBundleReport,
  DesktopSupportBundleCategory,
  DesktopSupportBundlePacket,
  DesktopSupportBundleRow,
  DesktopSupportBundleSignal,
  DesktopSupportBundleSignalKind,
  DesktopSupportBundleStatus,
} from "@/features/editor/desktop-crash-performance-support-bundle-types";

const requiredKinds = [
  "cold-start",
  "file-open",
  "canvas-resume",
  "plugin-run",
  "memory-pressure",
] as const satisfies readonly DesktopSupportBundleSignalKind[];

export function getDesktopCrashPerformanceSupportBundleReport({
  generatedAt = new Date().toISOString(),
  nativePluginSandbox,
  performanceRegression,
  signals,
}: DesktopCrashPerformanceSupportBundleInput): DesktopCrashPerformanceSupportBundleReport {
  const normalizedSignals =
    signals && signals.length > 0
      ? signals.map(normalizeSignal)
      : getDefaultSignals({
          generatedAt,
          nativePluginSandbox,
          performanceRegression,
        });
  const crashCount =
    normalizedSignals.reduce((total, signal) => total + signal.crashCount, 0) +
    nativePluginSandbox.crashLikeRunCount;
  const slowSignalCount = normalizedSignals.filter(isSlowSignal).length;
  const rows = [
    ...requiredKinds.map((kind) =>
      getSignalKindRow(kind, normalizedSignals, nativePluginSandbox),
    ),
    getSupportGateRow(performanceRegression, nativePluginSandbox),
  ];
  const bundles = rows.map((row) => getSupportBundle(row, normalizedSignals));
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const score = Math.max(
    0,
    Math.min(performanceRegression.score, nativePluginSandbox.score) -
      blockedCount * 10 -
      reviewCount * 4 -
      Math.min(12, crashCount * 3) -
      Math.min(10, slowSignalCount * 2),
  );

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score,
    signalCount: normalizedSignals.length,
    coldStartCount: getKindCount(normalizedSignals, "cold-start"),
    fileOpenCount: getKindCount(normalizedSignals, "file-open"),
    canvasResumeCount: getKindCount(normalizedSignals, "canvas-resume"),
    pluginRunCount: getKindCount(normalizedSignals, "plugin-run"),
    memoryPressureCount: getKindCount(normalizedSignals, "memory-pressure"),
    crashCount,
    slowSignalCount,
    supportPacketCount: bundles.length,
    readyCount,
    reviewCount,
    blockedCount,
    signals: normalizedSignals,
    rows: rows.sort(sortRows),
    bundles,
    performanceRegression,
    nativePluginSandbox,
  };
}

function getDefaultSignals({
  generatedAt,
  nativePluginSandbox,
  performanceRegression,
}: Required<
  Pick<
    DesktopCrashPerformanceSupportBundleInput,
    "generatedAt" | "nativePluginSandbox" | "performanceRegression"
  >
>): DesktopSupportBundleSignal[] {
  const ready =
    performanceRegression.status === "ready" &&
    nativePluginSandbox.status === "ready";
  const profiler = performanceRegression.canvasInteractionProfiler;
  const commandTelemetry = performanceRegression.commandTelemetry;

  return [
    createDefaultSignal({
      generatedAt,
      kind: "cold-start",
      durationMs: ready ? 1300 : 3600,
      thresholdMs: 2500,
      memoryMb: ready ? 620 : 1280,
    }),
    createDefaultSignal({
      generatedAt,
      kind: "file-open",
      durationMs: ready ? 720 : 2100,
      thresholdMs: 1400,
      memoryMb: ready ? 700 : 1340,
    }),
    createDefaultSignal({
      generatedAt,
      kind: "canvas-resume",
      durationMs: ready
        ? Math.max(420, profiler.panZoomFrameBudgetMs * 24)
        : Math.max(1600, profiler.estimatedSelectionLatencyMs * 48),
      thresholdMs: 1200,
      memoryMb: ready ? 760 : 1550,
    }),
    createDefaultSignal({
      generatedAt,
      kind: "plugin-run",
      durationMs: ready ? 430 : 1900,
      thresholdMs: 1000,
      crashCount: nativePluginSandbox.crashLikeRunCount,
      memoryMb: ready ? 680 : 1480,
    }),
    createDefaultSignal({
      generatedAt,
      kind: "memory-pressure",
      durationMs: ready ? 280 : 720,
      thresholdMs: 500,
      memoryMb:
        ready || commandTelemetry.failedCommandCount === 0 ? 820 : 2300,
    }),
  ];
}

function createDefaultSignal({
  crashCount = 0,
  durationMs,
  generatedAt,
  kind,
  memoryMb,
  thresholdMs,
}: {
  crashCount?: number;
  durationMs: number;
  generatedAt: string;
  kind: DesktopSupportBundleSignalKind;
  memoryMb: number;
  thresholdMs: number;
}): DesktopSupportBundleSignal {
  return {
    id: `desktop-support-${kind}`,
    kind,
    label: `${kind} desktop support signal`,
    durationMs,
    thresholdMs,
    crashCount,
    memoryMb,
    detail: `${kind} support evidence synthesized from the active performance and plugin runtime reports.`,
    capturedAt: generatedAt,
    evidenceIds: [`${kind}-trace`, `${kind}-support-log`],
  };
}

function normalizeSignal(
  signal: DesktopSupportBundleSignal,
): DesktopSupportBundleSignal {
  return {
    ...signal,
    label: signal.label.trim() || `${signal.kind} support signal`,
    durationMs: Math.max(0, Math.round(signal.durationMs)),
    thresholdMs: Math.max(1, Math.round(signal.thresholdMs)),
    crashCount: Math.max(0, Math.round(signal.crashCount)),
    memoryMb: Math.max(0, Math.round(signal.memoryMb)),
    detail: signal.detail.trim() || `${signal.kind} support evidence captured.`,
    evidenceIds: signal.evidenceIds.filter(Boolean),
  };
}

function getSignalKindRow(
  kind: DesktopSupportBundleSignalKind,
  signals: DesktopSupportBundleSignal[],
  nativePluginSandbox: DesktopCrashPerformanceSupportBundleInput["nativePluginSandbox"],
): DesktopSupportBundleRow {
  const scopedSignals = signals.filter((signal) => signal.kind === kind);
  const maxDuration = Math.max(0, ...scopedSignals.map((signal) => signal.durationMs));
  const maxThreshold = Math.max(1, ...scopedSignals.map((signal) => signal.thresholdMs));
  const maxMemory = Math.max(0, ...scopedSignals.map((signal) => signal.memoryMb));
  const crashCount = scopedSignals.reduce(
    (total, signal) => total + signal.crashCount,
    0,
  );
  const status = getSignalKindStatus({
    crashCount,
    kind,
    maxDuration,
    maxMemory,
    maxThreshold,
    nativePluginSandbox,
    scopedSignals,
  });
  const metric = kind === "memory-pressure" ? maxMemory : maxDuration;
  const threshold = kind === "memory-pressure" ? 1024 : maxThreshold;

  return {
    id: `desktop-support-${kind}`,
    status,
    category: kind,
    label: getKindLabel(kind),
    detail:
      scopedSignals.length === 0
        ? `${getKindLabel(kind)} evidence is missing from the desktop support bundle.`
        : `${scopedSignals.length} ${kind} support signal${scopedSignals.length === 1 ? "" : "s"} include max ${maxDuration}ms, ${maxMemory}MB memory pressure, and ${crashCount} crash signal${crashCount === 1 ? "" : "s"}.`,
    metric,
    threshold,
    signalIds: scopedSignals.map((signal) => signal.id),
    evidenceIds: scopedSignals.flatMap((signal) => signal.evidenceIds),
    recommendation: getSignalRecommendation(kind, status),
  };
}

function getSignalKindStatus({
  crashCount,
  kind,
  maxDuration,
  maxMemory,
  maxThreshold,
  nativePluginSandbox,
  scopedSignals,
}: {
  crashCount: number;
  kind: DesktopSupportBundleSignalKind;
  maxDuration: number;
  maxMemory: number;
  maxThreshold: number;
  nativePluginSandbox: DesktopCrashPerformanceSupportBundleInput["nativePluginSandbox"];
  scopedSignals: DesktopSupportBundleSignal[];
}): DesktopSupportBundleStatus {
  if (scopedSignals.length === 0) {
    return "review";
  }

  if (
    crashCount > 0 ||
    maxDuration >= maxThreshold * 1.75 ||
    (kind === "memory-pressure" && maxMemory >= 2048) ||
    (kind === "plugin-run" &&
      nativePluginSandbox.crashIsolationBlockedCount > 0)
  ) {
    return "blocked";
  }

  if (
    maxDuration > maxThreshold ||
    (kind === "memory-pressure" && maxMemory >= 1024) ||
    (kind === "plugin-run" && nativePluginSandbox.crashLikeRunCount > 0)
  ) {
    return "review";
  }

  return "ready";
}

function getSupportGateRow(
  performanceRegression: DesktopCrashPerformanceSupportBundleInput["performanceRegression"],
  nativePluginSandbox: DesktopCrashPerformanceSupportBundleInput["nativePluginSandbox"],
): DesktopSupportBundleRow {
  const status: DesktopSupportBundleStatus =
    performanceRegression.status === "blocked" ||
    nativePluginSandbox.status === "blocked"
      ? "blocked"
      : performanceRegression.status === "review" ||
          nativePluginSandbox.status === "review"
        ? "review"
        : "ready";

  return {
    id: "desktop-support-gate",
    status,
    category: "support-gate",
    label: "Support gate",
    detail: `Performance release bundle is ${performanceRegression.status}; native plugin sandbox is ${nativePluginSandbox.status} with ${nativePluginSandbox.crashLikeRunCount} crash-like run signal${nativePluginSandbox.crashLikeRunCount === 1 ? "" : "s"}.`,
    metric: Math.min(performanceRegression.score, nativePluginSandbox.score),
    threshold: 90,
    signalIds: [],
    evidenceIds: [
      "performance-regression-export",
      "native-plugin-sandbox-operations",
    ],
    recommendation:
      status === "ready"
        ? "Support handoff can include the desktop crash and performance bundle."
        : "Keep support handoff blocked until performance and native plugin runtime blockers are cleared.",
  };
}

function getSupportBundle(
  row: DesktopSupportBundleRow,
  signals: DesktopSupportBundleSignal[],
): DesktopSupportBundlePacket {
  const scopedSignals = signals.filter((signal) =>
    row.signalIds.includes(signal.id),
  );

  return {
    id: `${row.id}-packet`,
    status: row.status,
    category: row.category,
    label: `${row.label} packet`,
    detail: row.detail,
    signalIds: row.signalIds,
    evidence:
      scopedSignals.length > 0
        ? scopedSignals.map(
            (signal) =>
              `${signal.label}: ${signal.durationMs}ms, ${signal.memoryMb}MB, ${signal.crashCount} crash signal${signal.crashCount === 1 ? "" : "s"}.`,
          )
        : row.evidenceIds.map((evidenceId) => `Source evidence: ${evidenceId}.`),
    evidenceCount: Math.max(scopedSignals.length, row.evidenceIds.length),
  };
}

function isSlowSignal(signal: DesktopSupportBundleSignal) {
  return signal.durationMs > signal.thresholdMs;
}

function getKindCount(
  signals: DesktopSupportBundleSignal[],
  kind: DesktopSupportBundleSignalKind,
) {
  return signals.filter((signal) => signal.kind === kind).length;
}

function getKindLabel(kind: DesktopSupportBundleSignalKind) {
  const labels = {
    "canvas-resume": "Canvas resume",
    "cold-start": "Cold start",
    "file-open": "File open",
    "memory-pressure": "Memory pressure",
    "plugin-run": "Plugin run",
  } satisfies Record<DesktopSupportBundleSignalKind, string>;

  return labels[kind];
}

function getSignalRecommendation(
  kind: DesktopSupportBundleSignalKind,
  status: DesktopSupportBundleStatus,
) {
  if (status === "ready") {
    return `${getKindLabel(kind)} support evidence is ready for handoff.`;
  }

  if (kind === "memory-pressure") {
    return "Attach memory snapshots and reduce cache pressure before closing the support bundle.";
  }

  if (kind === "plugin-run") {
    return "Attach plugin run replay and crash isolation logs before support escalation.";
  }

  return `Attach ${kind} trace evidence and optimize the slow path before release support handoff.`;
}

function sortRows(
  left: DesktopSupportBundleRow,
  right: DesktopSupportBundleRow,
) {
  const rank: Record<DesktopSupportBundleStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return rank[left.status] - rank[right.status] || left.id.localeCompare(right.id);
}
