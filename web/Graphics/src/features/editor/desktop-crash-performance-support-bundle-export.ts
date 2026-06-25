import type {
  DesktopCrashPerformanceSupportBundleReport,
  DesktopSupportBundlePacket,
  DesktopSupportBundleRow,
} from "@/features/editor/desktop-crash-performance-support-bundle-types";

export function getDesktopCrashPerformanceSupportBundleCsv(
  report: DesktopCrashPerformanceSupportBundleReport,
  rows: DesktopSupportBundleRow[] = report.rows,
) {
  const rowHeader: Array<keyof DesktopSupportBundleRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "metric",
    "threshold",
    "signalIds",
    "evidenceIds",
    "recommendation",
  ];
  const bundleHeader: Array<keyof DesktopSupportBundlePacket> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "evidenceCount",
  ];

  return [
    [
      "score",
      "status",
      "signals",
      "cold_start",
      "file_open",
      "canvas_resume",
      "plugin_run",
      "memory_pressure",
      "crashes",
      "slow_signals",
      "support_packets",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.signalCount,
      report.coldStartCount,
      report.fileOpenCount,
      report.canvasResumeCount,
      report.pluginRunCount,
      report.memoryPressureCount,
      report.crashCount,
      report.slowSignalCount,
      report.supportPacketCount,
      report.blockedCount,
      report.reviewCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    rowHeader.join(","),
    ...rows.map((row) =>
      rowHeader
        .map((key) =>
          escapeCsvCell(
            Array.isArray(row[key]) ? row[key].join("; ") : row[key],
          ),
        )
        .join(","),
    ),
    "",
    bundleHeader.join(","),
    ...report.bundles.map((bundle) =>
      bundleHeader
        .map((key) => escapeCsvCell(bundle[key]))
        .join(","),
    ),
  ].join("\n");
}

export function getDesktopCrashPerformanceSupportBundleMarkdown(
  report: DesktopCrashPerformanceSupportBundleReport,
  rows: DesktopSupportBundleRow[] = report.rows,
) {
  return [
    "# Desktop Crash And Performance Support Bundle",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Support signals: ${report.signalCount}`,
    `Crash signals: ${report.crashCount}`,
    `Slow signals: ${report.slowSignalCount}`,
    `Support packets: ${report.supportPacketCount}`,
    "",
    "This bundle triages cold-start, file-open, canvas-resume, plugin-run, and memory pressure evidence for desktop support handoff.",
    "",
    "## Review Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Captured Signals",
    ...report.signals.map(
      (signal) =>
        `- ${signal.kind}: ${signal.durationMs}ms, ${signal.memoryMb}MB, ${signal.crashCount} crash signal${signal.crashCount === 1 ? "" : "s"}; ${signal.detail}`,
    ),
    "",
    "## Support Packets",
    ...report.bundles.flatMap((bundle) => [
      `- [${bundle.status}] ${bundle.category} / ${bundle.label}: ${bundle.detail}`,
      ...bundle.evidence.map((item) => `  - ${item}`),
    ]),
  ].join("\n");
}

export function getDesktopCrashPerformanceSupportBundleJson(
  report: DesktopCrashPerformanceSupportBundleReport,
  rows: DesktopSupportBundleRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.desktop-crash-performance-support-bundle",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        score: report.score,
        signalCount: report.signalCount,
        coldStartCount: report.coldStartCount,
        fileOpenCount: report.fileOpenCount,
        canvasResumeCount: report.canvasResumeCount,
        pluginRunCount: report.pluginRunCount,
        memoryPressureCount: report.memoryPressureCount,
        crashCount: report.crashCount,
        slowSignalCount: report.slowSignalCount,
        supportPacketCount: report.supportPacketCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
      },
      rows,
      signals: report.signals,
      bundles: report.bundles,
      sources: {
        performanceRegression: {
          status: report.performanceRegression.status,
          score: report.performanceRegression.score,
          blockedCount: report.performanceRegression.blockedCount,
          reviewCount: report.performanceRegression.reviewCount,
        },
        nativePluginSandbox: {
          status: report.nativePluginSandbox.status,
          score: report.nativePluginSandbox.score,
          crashLikeRunCount: report.nativePluginSandbox.crashLikeRunCount,
          crashIsolationBlockedCount:
            report.nativePluginSandbox.crashIsolationBlockedCount,
        },
      },
    },
    null,
    2,
  );
}

function escapeCsvCell(
  value: boolean | number | string | string[] | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = Array.isArray(value) ? value.join("; ") : String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
