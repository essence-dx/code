import type {
  CommandAutomationRecordingReport,
  CommandAutomationRecordingRow,
} from "@/features/editor/command-automation-recording-types";

export function getCommandAutomationRecordingCsv(
  report: CommandAutomationRecordingReport,
  rows: CommandAutomationRecordingRow[] = report.rows,
) {
  const header: Array<keyof CommandAutomationRecordingRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "eventIds",
    "commandIds",
    "targetIds",
    "metric",
    "threshold",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "commands",
      "enabled_commands",
      "recorded_events",
      "macros",
      "safe_macros",
      "blocked_macros",
      "undo_previews",
      "unscoped_undo_previews",
      "qa_packets",
      "telemetry_exports",
      "replay_artifacts",
      "failed_commands",
      "slow_commands",
    ].join(","),
    [
      report.score,
      report.status,
      report.commandCount,
      report.enabledCommandCount,
      report.recordedCommandEventCount,
      report.macroCandidateCount,
      report.safeMacroCount,
      report.blockedMacroCount,
      report.undoPreviewCount,
      report.unscopedUndoPreviewCount,
      report.replayQaPacketCount,
      report.telemetryExportCount,
      report.replayArtifactCount,
      report.failedCommandCount,
      report.slowCommandCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) =>
      header
        .map((key) =>
          escapeCsvCell(
            Array.isArray(row[key]) ? row[key].join("; ") : row[key],
          ),
        )
        .join(","),
    ),
    "",
    "telemetry_event_id,command_id,area,duration_ms,threshold_ms,status,detail,captured_at",
    ...report.telemetryExports.map((row) =>
      [
        row.eventId,
        row.commandId,
        row.area,
        row.durationMs,
        row.thresholdMs,
        row.status,
        row.detail,
        row.capturedAt,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getCommandAutomationRecordingMarkdown(
  report: CommandAutomationRecordingReport,
  rows: CommandAutomationRecordingRow[] = report.rows,
) {
  return [
    "# Command Automation Recording",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Commands: ${report.commandCount}`,
    `Recorded command events: ${report.recordedCommandEventCount}`,
    `Macro candidates: ${report.macroCandidateCount}`,
    `Safe macros: ${report.safeMacroCount}`,
    `Blocked macros: ${report.blockedMacroCount}`,
    `Undo previews: ${report.undoPreviewCount}`,
    `Replay QA packets: ${report.replayQaPacketCount}`,
    `Telemetry exports: ${report.telemetryExportCount}`,
    `Replay artifacts: ${report.replayArtifactCount}`,
    "",
    "## Review Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Macros",
    ...(report.macros.length > 0
      ? report.macros.map(
          (macro) =>
            `- [${macro.status}] ${macro.label}: ${macro.stepCount} steps, ${macro.undoPreview.scope} undo, ${macro.telemetryDurationMs}ms telemetry. ${macro.recommendation}`,
        )
      : ["- No command macros recorded."]),
    "",
    "## Replay QA Packets",
    ...(report.qaPackets.length > 0
      ? report.qaPackets.flatMap((packet) => [
          `- [${packet.status}] ${packet.label}: ${packet.steps.length} replay steps, ${packet.telemetryEvidenceCount} telemetry evidence rows, export ${packet.exportFileName}`,
          ...packet.assertions.map((assertion) => `  - ${assertion}`),
        ])
      : ["- No replay QA packets generated."]),
  ].join("\n");
}

export function getCommandAutomationRecordingJson(
  report: CommandAutomationRecordingReport,
  rows: CommandAutomationRecordingRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.command-automation-recording",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        score: report.score,
        commandCount: report.commandCount,
        enabledCommandCount: report.enabledCommandCount,
        disabledCommandCount: report.disabledCommandCount,
        eventCount: report.eventCount,
        recordedCommandEventCount: report.recordedCommandEventCount,
        unknownCommandEventCount: report.unknownCommandEventCount,
        macroCandidateCount: report.macroCandidateCount,
        safeMacroCount: report.safeMacroCount,
        blockedMacroCount: report.blockedMacroCount,
        undoPreviewCount: report.undoPreviewCount,
        unscopedUndoPreviewCount: report.unscopedUndoPreviewCount,
        replayQaPacketCount: report.replayQaPacketCount,
        telemetryExportCount: report.telemetryExportCount,
        replayArtifactCount: report.replayArtifactCount,
        failedCommandCount: report.failedCommandCount,
        slowCommandCount: report.slowCommandCount,
        missingTelemetryCount: report.missingTelemetryCount,
        blockedCount: report.blockedCount,
        reviewCount: report.reviewCount,
        readyCount: report.readyCount,
      },
      rows,
      macros: report.macros,
      qaPackets: report.qaPackets,
      telemetryExports: report.telemetryExports,
    },
    null,
    2,
  );
}

function escapeCsvCell(
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
