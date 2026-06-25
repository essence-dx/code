import type { CommandPaletteCommand } from "@/features/editor/components/command-palette";
import type { DesignActivityEvent } from "@/features/editor/types";
import type {
  CommandAutomationMacro,
  CommandAutomationQaPacket,
  CommandAutomationRecordingRow,
  CommandAutomationTelemetryExport,
  RecordedCommandEvent,
} from "@/features/editor/command-automation-recording-types";

type RecordingRowsInput = {
  commandPaletteCommands: CommandPaletteCommand[];
  failedCommandCount: number;
  macros: CommandAutomationMacro[];
  qaPackets: CommandAutomationQaPacket[];
  recordedEvents: RecordedCommandEvent[];
  slowCommandCount: number;
  telemetryExports: CommandAutomationTelemetryExport[];
  unknownCommandEventCount: number;
};

export function getCommandAutomationRecordingRows({
  commandPaletteCommands,
  failedCommandCount,
  macros,
  qaPackets,
  recordedEvents,
  slowCommandCount,
  telemetryExports,
  unknownCommandEventCount,
}: RecordingRowsInput) {
  return [
    ...getCoverageRows(recordedEvents, commandPaletteCommands, unknownCommandEventCount),
    ...getMacroSafetyRows(macros),
    ...getUndoPreviewRows(macros),
    ...getQaPacketRows(qaPackets),
    ...getTelemetryRows(
      recordedEvents,
      telemetryExports,
      failedCommandCount,
      slowCommandCount,
    ),
  ];
}

function getCoverageRows(
  recordedEvents: RecordedCommandEvent[],
  commands: CommandPaletteCommand[],
  unknownCommandEventCount: number,
): CommandAutomationRecordingRow[] {
  const rows: CommandAutomationRecordingRow[] = [];

  if (commands.length === 0) {
    rows.push({
      id: "command-automation-no-commands",
      status: "blocked",
      category: "recording-coverage",
      label: "Command catalog missing",
      detail: "No command palette entries are available for macro recording.",
      eventIds: [],
      commandIds: [],
      targetIds: [],
      metric: 0,
      threshold: 1,
      recommendation:
        "Create command-palette metadata before recording reusable automation macros.",
    });
  }

  if (recordedEvents.length === 0) {
    rows.push({
      id: "command-automation-no-recordings",
      status: "review",
      category: "recording-coverage",
      label: "Command recording empty",
      detail:
        "No activity events currently map to command-palette actions or command telemetry.",
      eventIds: [],
      commandIds: [],
      targetIds: [],
      metric: 0,
      threshold: 1,
      recommendation:
        "Run canvas, import, export, and collaboration commands before desktop automation release review.",
    });
  }

  if (unknownCommandEventCount > 0) {
    const unknownEvents = recordedEvents.filter((item) => !item.command);

    rows.push({
      id: "command-automation-unknown-commands",
      status: "review",
      category: "recording-coverage",
      label: "Unknown command references",
      detail: `${unknownCommandEventCount} recorded command event${unknownCommandEventCount === 1 ? "" : "s"} do not map to the current command catalog.`,
      eventIds: unknownEvents.map((item) => item.event.id),
      commandIds: unique(unknownEvents.map((item) => item.commandId)),
      targetIds: unique(
        unknownEvents.flatMap((item) =>
          item.event.targetId ? [item.event.targetId] : [],
        ),
      ),
      metric: unknownCommandEventCount,
      threshold: 0,
      recommendation:
        "Keep command ids stable so macro recordings survive command palette refactors.",
    });
  }

  return rows;
}

function getMacroSafetyRows(
  macros: CommandAutomationMacro[],
): CommandAutomationRecordingRow[] {
  if (macros.length === 0) {
    return [];
  }

  const blocked = macros.filter((macro) => macro.status === "blocked");
  const review = macros.filter((macro) => macro.status === "review");

  if (blocked.length === 0 && review.length === 0) {
    return [
      {
        id: "command-automation-macro-safety-ready",
        status: "ready",
        category: "macro-safety",
        label: "Macro safety checks clear",
        detail: `${macros.length} macro candidate${macros.length === 1 ? "" : "s"} passed safety checks.`,
        eventIds: macros.flatMap((macro) => macro.eventIds),
        commandIds: unique(macros.flatMap((macro) => macro.commandIds)),
        targetIds: unique(macros.flatMap((macro) => macro.targetIds)),
        metric: macros.length,
        threshold: 1,
        recommendation:
          "Keep macro safety evidence with native desktop release packets.",
      },
    ];
  }

  return [
    ...(blocked.length > 0
      ? [
          {
            id: "command-automation-blocked-macros",
            status: "blocked",
            category: "macro-safety",
            label: "Blocked macro candidates",
            detail: `${blocked.length} macro candidate${blocked.length === 1 ? "" : "s"} include failed commands or hard latency blockers.`,
            eventIds: blocked.flatMap((macro) => macro.eventIds),
            commandIds: unique(blocked.flatMap((macro) => macro.commandIds)),
            targetIds: unique(blocked.flatMap((macro) => macro.targetIds)),
            metric: blocked.length,
            threshold: 0,
            recommendation:
              "Remove failed or hard-slow source commands before enabling macro replay.",
          } satisfies CommandAutomationRecordingRow,
        ]
      : []),
    ...(review.length > 0
      ? [
          {
            id: "command-automation-review-macros",
            status: "review",
            category: "macro-safety",
            label: "Macro candidates need review",
            detail: `${review.length} macro candidate${review.length === 1 ? "" : "s"} need telemetry, scope, or command-catalog review.`,
            eventIds: review.flatMap((macro) => macro.eventIds),
            commandIds: unique(review.flatMap((macro) => macro.commandIds)),
            targetIds: unique(review.flatMap((macro) => macro.targetIds)),
            metric: review.length,
            threshold: 0,
            recommendation:
              "Attach timing evidence and scoped targets before promoting macros to production automation.",
          } satisfies CommandAutomationRecordingRow,
        ]
      : []),
  ];
}

function getUndoPreviewRows(
  macros: CommandAutomationMacro[],
): CommandAutomationRecordingRow[] {
  if (macros.length === 0) {
    return [];
  }

  const unscoped = macros.filter(
    (macro) => macro.undoPreview.scope === "document",
  );

  if (unscoped.length > 0) {
    return [
      {
        id: "command-automation-unscoped-undo",
        status: "review",
        category: "undo-preview",
        label: "Unscoped undo previews",
        detail: `${unscoped.length} macro candidate${unscoped.length === 1 ? "" : "s"} fall back to document-level undo.`,
        eventIds: unscoped.flatMap((macro) => macro.eventIds),
        commandIds: unique(unscoped.flatMap((macro) => macro.commandIds)),
        targetIds: unique(unscoped.flatMap((macro) => macro.targetIds)),
        metric: unscoped.length,
        threshold: 0,
        recommendation:
          "Capture target ids for every mutating command so undo previews are exact.",
      },
    ];
  }

  return [
    {
      id: "command-automation-undo-ready",
      status: "ready",
      category: "undo-preview",
      label: "Undo previews scoped",
      detail: `${macros.length} macro candidate${macros.length === 1 ? "" : "s"} have target-scoped or replay-only undo previews.`,
      eventIds: macros.flatMap((macro) => macro.eventIds),
      commandIds: unique(macros.flatMap((macro) => macro.commandIds)),
      targetIds: unique(macros.flatMap((macro) => macro.targetIds)),
      metric: macros.length,
      threshold: 1,
      recommendation:
        "Keep undo previews visible before allowing one-click macro replay.",
    },
  ];
}

function getQaPacketRows(
  packets: CommandAutomationQaPacket[],
): CommandAutomationRecordingRow[] {
  if (packets.length === 0) {
    return [
      {
        id: "command-automation-qa-packets-missing",
        status: "review",
        category: "replay-qa-packet",
        label: "Replay QA packets missing",
        detail: "No macro QA packets were generated from command recordings.",
        eventIds: [],
        commandIds: [],
        targetIds: [],
        metric: 0,
        threshold: 1,
        recommendation:
          "Generate replayable QA packets before shipping desktop automation recording.",
      },
    ];
  }

  return [
    {
      id: "command-automation-qa-packets-ready",
      status: "ready",
      category: "replay-qa-packet",
      label: "Replay QA packets generated",
      detail: `${packets.length} macro QA packet${packets.length === 1 ? "" : "s"} include replay steps, assertions, undo preview, and telemetry evidence.`,
      eventIds: packets.flatMap((packet) => packet.eventIds),
      commandIds: unique(packets.flatMap((packet) => packet.commandIds)),
      targetIds: unique(packets.flatMap((packet) => packet.undoPreview.targetIds)),
      metric: packets.length,
      threshold: 1,
      recommendation:
        "Export QA packets when a macro is promoted to a reusable command automation.",
    },
  ];
}

function getTelemetryRows(
  recordedEvents: RecordedCommandEvent[],
  telemetryExports: CommandAutomationTelemetryExport[],
  failedCommandCount: number,
  slowCommandCount: number,
): CommandAutomationRecordingRow[] {
  const rows: CommandAutomationRecordingRow[] = [];
  const missingTelemetry = recordedEvents.filter((item) => !item.event.telemetry);

  if (failedCommandCount > 0) {
    const failedEvents = recordedEvents.filter(
      (item) => item.event.telemetry?.status === "failed",
    );

    rows.push({
      id: "command-automation-failed-telemetry",
      status: "blocked",
      category: "telemetry-export",
      label: "Failed command telemetry",
      detail: `${failedCommandCount} command${failedCommandCount === 1 ? "" : "s"} failed during recording.`,
      eventIds: failedEvents.map((item) => item.event.id),
      commandIds: unique(failedEvents.map((item) => item.commandId)),
      targetIds: unique(
        failedEvents.flatMap((item) =>
          item.event.targetId ? [item.event.targetId] : [],
        ),
      ),
      metric: failedCommandCount,
      threshold: 0,
      recommendation:
        "Fix failing source commands before exporting automation telemetry.",
    });
  }

  if (slowCommandCount > 0) {
    const slowEvents = recordedEvents.filter((item) =>
      isSlowTelemetry(item.event),
    );

    rows.push({
      id: "command-automation-slow-telemetry",
      status: slowEvents.some((item) => isBlockedSlowTelemetry(item.event))
        ? "blocked"
        : "review",
      category: "telemetry-export",
      label: "Slow command telemetry",
      detail: `${slowCommandCount} command${slowCommandCount === 1 ? "" : "s"} exceeded the latency budget.`,
      eventIds: slowEvents.map((item) => item.event.id),
      commandIds: unique(slowEvents.map((item) => item.commandId)),
      targetIds: unique(
        slowEvents.flatMap((item) =>
          item.event.targetId ? [item.event.targetId] : [],
        ),
      ),
      metric: Math.max(
        ...slowEvents.map((item) => item.event.telemetry?.durationMs ?? 0),
      ),
      threshold: Math.max(
        ...slowEvents.map((item) => item.event.telemetry?.thresholdMs ?? 0),
      ),
      recommendation:
        "Review slow macro source commands before relying on replay timings.",
    });
  }

  if (missingTelemetry.length > 0) {
    rows.push({
      id: "command-automation-telemetry-gaps",
      status: "review",
      category: "telemetry-export",
      label: "Command telemetry gaps",
      detail: `${missingTelemetry.length} recorded command${missingTelemetry.length === 1 ? "" : "s"} lack exportable timing evidence.`,
      eventIds: missingTelemetry.map((item) => item.event.id),
      commandIds: unique(missingTelemetry.map((item) => item.commandId)),
      targetIds: unique(
        missingTelemetry.flatMap((item) =>
          item.event.targetId ? [item.event.targetId] : [],
        ),
      ),
      metric: missingTelemetry.length,
      threshold: 0,
      recommendation:
        "Attach command telemetry to every recorded macro step before release automation.",
    });
  }

  if (telemetryExports.length > 0) {
    rows.push({
      id: "command-automation-telemetry-export-ready",
      status: "ready",
      category: "telemetry-export",
      label: "Telemetry export rows generated",
      detail: `${telemetryExports.length} command telemetry row${telemetryExports.length === 1 ? "" : "s"} are export-ready.`,
      eventIds: telemetryExports.map((row) => row.eventId),
      commandIds: unique(telemetryExports.map((row) => row.commandId)),
      targetIds: [],
      metric: telemetryExports.length,
      threshold: 1,
      recommendation:
        "Include telemetry exports with macro QA packets for release review.",
    });
  }

  return rows;
}

function isSlowTelemetry(event: DesignActivityEvent) {
  const telemetry = event.telemetry;

  return Boolean(telemetry && telemetry.durationMs > telemetry.thresholdMs);
}

function isBlockedSlowTelemetry(event: DesignActivityEvent) {
  const telemetry = event.telemetry;

  return Boolean(
    telemetry && telemetry.durationMs > Math.max(telemetry.thresholdMs * 2, 250),
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
