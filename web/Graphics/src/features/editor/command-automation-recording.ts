import { getCommandActionReplayReport } from "@/features/editor/command-action-replay";
import { getCommandAutomationRecordingRows } from "@/features/editor/command-automation-recording-rows";
import type { CommandPaletteCommand } from "@/features/editor/components/command-palette";
import type {
  DesignActivityEvent,
  DesignActivityKind,
} from "@/features/editor/types";
import type {
  CommandAutomationMacro,
  CommandAutomationQaPacket,
  CommandAutomationRecordingInput,
  CommandAutomationRecordingReport,
  CommandAutomationRecordingRow,
  CommandAutomationRecordingStatus,
  CommandAutomationSafetyCheck,
  CommandAutomationTelemetryExport,
  CommandAutomationUndoPreview,
  CommandLookup,
  RecordedCommandEvent,
} from "@/features/editor/command-automation-recording-types";

export {
  getCommandAutomationRecordingCsv,
  getCommandAutomationRecordingJson,
  getCommandAutomationRecordingMarkdown,
} from "@/features/editor/command-automation-recording-export";
export type {
  CommandAutomationMacro,
  CommandAutomationQaPacket,
  CommandAutomationRecordingCategory,
  CommandAutomationRecordingReport,
  CommandAutomationRecordingRow,
  CommandAutomationRecordingStatus,
  CommandAutomationSafetyCheck,
  CommandAutomationTelemetryExport,
  CommandAutomationUndoPreview,
} from "@/features/editor/command-automation-recording-types";

const mutatingKinds = new Set<DesignActivityKind>([
  "branch",
  "comment",
  "component",
  "extension",
  "import",
  "library",
  "page",
  "version",
]);
const maxMacroEvents = 10;

export function getCommandAutomationRecordingReport({
  commandPaletteCommands,
  document,
  generatedAt = new Date().toISOString(),
}: CommandAutomationRecordingInput): CommandAutomationRecordingReport {
  const events = document.activityEvents ?? [];
  const lookup = createCommandLookup(commandPaletteCommands);
  const recordedEvents = getRecordedCommandEvents(events, lookup);
  const macros = getMacros(recordedEvents, lookup);
  const qaPackets = macros.map(getQaPacket);
  const telemetryExports = getTelemetryExports(recordedEvents);
  const actionReplay = getCommandActionReplayReport(events);
  const unknownCommandEventCount = recordedEvents.filter(
    (item) => !item.command,
  ).length;
  const failedCommandCount = recordedEvents.filter(
    (item) => item.event.telemetry?.status === "failed",
  ).length;
  const slowCommandCount = recordedEvents.filter((item) =>
    isSlowTelemetry(item.event),
  ).length;
  const rows = getCommandAutomationRecordingRows({
    commandPaletteCommands,
    failedCommandCount,
    macros,
    qaPackets,
    recordedEvents,
    slowCommandCount,
    telemetryExports,
    unknownCommandEventCount,
  });
  const finalRows =
    rows.length > 0
      ? rows
      : [
          {
            id: "command-automation-recording-ready",
            status: "ready",
            category: "ready",
            label: "Command automation recording ready",
            detail:
              "Command macro recording, safety checks, undo previews, QA packets, and telemetry exports are release-ready.",
            eventIds: [],
            commandIds: [],
            targetIds: [],
            metric: macros.length,
            threshold: 1,
            recommendation:
              "Keep automation exports attached to native desktop and web release evidence.",
          } satisfies CommandAutomationRecordingRow,
        ];
  const blockedCount = finalRows.filter((row) => row.status === "blocked").length;
  const reviewCount = finalRows.filter((row) => row.status === "review").length;
  const readyCount = finalRows.filter((row) => row.status === "ready").length;
  const disabledCommandCount = commandPaletteCommands.filter(
    (command) => command.disabled,
  ).length;

  return {
    generatedAt,
    score: clampScore(
      100 -
        blockedCount * 18 -
        reviewCount * 7 -
        unknownCommandEventCount * 2,
    ),
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    commandCount: commandPaletteCommands.length,
    enabledCommandCount: commandPaletteCommands.length - disabledCommandCount,
    disabledCommandCount,
    eventCount: events.length,
    recordedCommandEventCount: recordedEvents.length,
    unknownCommandEventCount,
    macroCandidateCount: macros.length,
    safeMacroCount: macros.filter((macro) => macro.status === "ready").length,
    blockedMacroCount: macros.filter((macro) => macro.status === "blocked").length,
    undoPreviewCount: macros.filter(
      (macro) => macro.undoPreview.scope !== "none",
    ).length,
    unscopedUndoPreviewCount: macros.filter(
      (macro) => macro.undoPreview.scope === "document",
    ).length,
    replayQaPacketCount: qaPackets.length,
    telemetryExportCount: telemetryExports.length,
    replayArtifactCount: actionReplay.artifactCount,
    slowCommandCount,
    failedCommandCount,
    missingTelemetryCount: recordedEvents.filter((item) => !item.event.telemetry)
      .length,
    blockedCount,
    reviewCount,
    readyCount,
    rows: finalRows,
    macros,
    qaPackets,
    telemetryExports,
  };
}

function createCommandLookup(commands: CommandPaletteCommand[]): CommandLookup {
  const byId = new Map<string, CommandPaletteCommand>();
  const byKey = new Map<string, CommandPaletteCommand>();

  commands.forEach((command) => {
    byId.set(command.id, command);
    byKey.set(normalizeKey(command.id), command);
    byKey.set(normalizeKey(command.label), command);
  });

  return { commands, byId, byKey };
}

function getRecordedCommandEvents(
  events: DesignActivityEvent[],
  lookup: CommandLookup,
): RecordedCommandEvent[] {
  return events.flatMap((event) => {
    const command = getMatchingCommand(event, lookup);
    const telemetryCommand = event.telemetry?.command?.trim();
    const commandId =
      command?.id ??
      telemetryCommand ??
      "";

    if (!commandId) {
      return [];
    }

    return [
      {
        event,
        commandId,
        command,
      },
    ];
  });
}

function getMacros(
  recordedEvents: RecordedCommandEvent[],
  lookup: CommandLookup,
): CommandAutomationMacro[] {
  if (recordedEvents.length === 0) {
    return [];
  }

  const macros = [
    createMacro({
      id: "recent-command-sequence",
      label: "Recent command sequence",
      recordedEvents: recordedEvents.slice(0, maxMacroEvents),
      lookup,
    }),
  ];
  const targetGroups = groupByTarget(recordedEvents);

  targetGroups.forEach((events, targetId) => {
    if (events.length < 2) {
      return;
    }

    macros.push(
      createMacro({
        id: `target-${targetId}`,
        label: `Target macro: ${targetId}`,
        recordedEvents: events.slice(0, maxMacroEvents),
        lookup,
      }),
    );
  });

  return macros;
}

function createMacro(input: {
  id: string;
  label: string;
  lookup: CommandLookup;
  recordedEvents: RecordedCommandEvent[];
}): CommandAutomationMacro {
  const safetyChecks = getSafetyChecks(input.recordedEvents, input.lookup);
  const status = getWorstStatus(safetyChecks.map((check) => check.status));
  const eventIds = input.recordedEvents.map((item) => item.event.id);
  const commandIds = unique(input.recordedEvents.map((item) => item.commandId));
  const targetIds = unique(
    input.recordedEvents.flatMap((item) =>
      item.event.targetId ? [item.event.targetId] : [],
    ),
  );
  const undoPreview = getUndoPreview(input.recordedEvents);
  const telemetryDurationMs = input.recordedEvents.reduce(
    (total, item) => total + (item.event.telemetry?.durationMs ?? 0),
    0,
  );

  return {
    id: `command-automation-${slugify(input.id)}`,
    status,
    label: input.label,
    actorName: input.recordedEvents[0]?.event.actorName ?? "Unknown actor",
    eventIds,
    commandIds,
    targetIds,
    stepCount: input.recordedEvents.length,
    telemetryDurationMs,
    safetyChecks,
    undoPreview,
    replayQaPacketId: `qa-${slugify(input.id)}`,
    recommendation:
      status === "ready"
        ? "Macro is safe to keep as replayable desktop automation evidence."
        : "Clear safety checks before offering this macro as a reusable automation.",
  };
}

function getSafetyChecks(
  recordedEvents: RecordedCommandEvent[],
  lookup: CommandLookup,
): CommandAutomationSafetyCheck[] {
  const checks: CommandAutomationSafetyCheck[] = [];
  const failedEvents = recordedEvents.filter(
    (item) => item.event.telemetry?.status === "failed",
  );
  const missingTelemetry = recordedEvents.filter((item) => !item.event.telemetry);
  const slowEvents = recordedEvents.filter((item) => isSlowTelemetry(item.event));
  const blockedSlowEvents = slowEvents.filter((item) =>
    isBlockedSlowTelemetry(item.event),
  );
  const disabledCommands = recordedEvents.filter((item) => item.command?.disabled);
  const unknownCommands = recordedEvents.filter((item) => !item.command);
  const unscopedMutations = recordedEvents.filter(
    (item) => mutatingKinds.has(item.event.kind) && !item.event.targetId,
  );

  if (failedEvents.length > 0) {
    checks.push({
      id: "failed-command",
      status: "blocked",
      label: "Failed command",
      detail: `${failedEvents.length} source command${failedEvents.length === 1 ? "" : "s"} failed during recording.`,
    });
  }

  if (blockedSlowEvents.length > 0) {
    checks.push({
      id: "blocked-slow-command",
      status: "blocked",
      label: "Blocked slow command",
      detail: `${blockedSlowEvents.length} command${blockedSlowEvents.length === 1 ? "" : "s"} exceeded the hard latency limit.`,
    });
  } else if (slowEvents.length > 0) {
    checks.push({
      id: "slow-command",
      status: "review",
      label: "Slow command",
      detail: `${slowEvents.length} command${slowEvents.length === 1 ? "" : "s"} exceeded the normal latency budget.`,
    });
  }

  if (unscopedMutations.length > 0) {
    checks.push({
      id: "unscoped-mutation",
      status: "review",
      label: "Unscoped mutation",
      detail: `${unscopedMutations.length} mutating command${unscopedMutations.length === 1 ? "" : "s"} need target ids for safe undo preview.`,
    });
  }

  if (missingTelemetry.length > 0) {
    checks.push({
      id: "missing-telemetry",
      status: "review",
      label: "Missing telemetry",
      detail: `${missingTelemetry.length} command${missingTelemetry.length === 1 ? "" : "s"} need timing evidence before automation replay.`,
    });
  }

  if (disabledCommands.length > 0) {
    checks.push({
      id: "disabled-command",
      status: "review",
      label: "Disabled command",
      detail: `${disabledCommands.length} disabled command${disabledCommands.length === 1 ? "" : "s"} are included in the macro candidate.`,
    });
  }

  if (unknownCommands.length > 0) {
    checks.push({
      id: "unknown-command",
      status: "review",
      label: "Unknown command",
      detail: `${unknownCommands.length} event${unknownCommands.length === 1 ? "" : "s"} do not map to the current ${lookup.commands.length} command-palette entries.`,
    });
  }

  if (checks.length === 0) {
    checks.push({
      id: "macro-safe",
      status: "ready",
      label: "Macro safety clear",
      detail: "Every recorded command maps to an enabled command with successful telemetry and scoped undo evidence.",
    });
  }

  return checks;
}

function getUndoPreview(
  recordedEvents: RecordedCommandEvent[],
): CommandAutomationUndoPreview {
  const mutatingEvents = recordedEvents.filter((item) =>
    mutatingKinds.has(item.event.kind),
  );
  const targetIds = unique(
    mutatingEvents.flatMap((item) =>
      item.event.targetId ? [item.event.targetId] : [],
    ),
  );

  if (mutatingEvents.length === 0) {
    return {
      scope: "none",
      available: false,
      label: "Replay-only macro",
      detail: "This macro only captures export or read-only evidence.",
      targetIds: [],
    };
  }

  if (targetIds.length === mutatingEvents.length || targetIds.length > 0) {
    const unscopedCount = mutatingEvents.filter(
      (item) => !item.event.targetId,
    ).length;

    if (unscopedCount === 0) {
      return {
        scope: "target",
        available: true,
        label: "Scoped undo preview",
        detail: `${targetIds.length} target${targetIds.length === 1 ? "" : "s"} can be previewed before macro replay.`,
        targetIds,
      };
    }
  }

  return {
    scope: "document",
    available: false,
    label: "Document-level undo fallback",
    detail:
      "At least one mutating command lacks a target id, so undo preview cannot be scoped safely.",
    targetIds,
  };
}

function getQaPacket(macro: CommandAutomationMacro): CommandAutomationQaPacket {
  return {
    id: macro.replayQaPacketId,
    status: macro.status,
    macroId: macro.id,
    label: `${macro.label} QA packet`,
    eventIds: macro.eventIds,
    commandIds: macro.commandIds,
    steps: [
      "Open the command palette.",
      ...macro.commandIds.map((commandId) => `Run command ${commandId}.`),
      "Replay the macro against the current document snapshot.",
      "Compare activity, selection, undo preview, and telemetry output.",
    ],
    assertions: [
      `${macro.stepCount} command event${macro.stepCount === 1 ? "" : "s"} replay in order.`,
      `${macro.safetyChecks.length} safety check${macro.safetyChecks.length === 1 ? "" : "s"} are attached to the packet.`,
      `${macro.undoPreview.scope} undo preview is recorded.`,
      `${macro.telemetryDurationMs}ms total command telemetry is exportable.`,
    ],
    undoPreview: macro.undoPreview,
    telemetryEvidenceCount: macro.commandIds.length,
    exportFileName: `${macro.id}.qa.json`,
  };
}

function getTelemetryExports(
  recordedEvents: RecordedCommandEvent[],
): CommandAutomationTelemetryExport[] {
  return recordedEvents.flatMap((item) => {
    const telemetry = item.event.telemetry;

    if (!telemetry) {
      return [];
    }

    return [
      {
        id: `automation-telemetry-${item.event.id}`,
        eventId: item.event.id,
        commandId: item.commandId,
        area: telemetry.area,
        durationMs: telemetry.durationMs,
        thresholdMs: telemetry.thresholdMs,
        status: telemetry.status,
        detail: telemetry.detail ?? item.event.detail ?? item.event.label,
        capturedAt: telemetry.capturedAt,
      },
    ];
  });
}

function getMatchingCommand(
  event: DesignActivityEvent,
  lookup: CommandLookup,
) {
  const telemetryCommand = event.telemetry?.command?.trim();

  if (telemetryCommand) {
    return (
      lookup.byId.get(telemetryCommand) ??
      lookup.byKey.get(normalizeKey(telemetryCommand))
    );
  }

  return lookup.byKey.get(normalizeKey(event.label));
}

function groupByTarget(recordedEvents: RecordedCommandEvent[]) {
  const groups = new Map<string, RecordedCommandEvent[]>();

  recordedEvents.forEach((item) => {
    const targetId = item.event.targetId;

    if (!targetId) {
      return;
    }

    groups.set(targetId, [...(groups.get(targetId) ?? []), item]);
  });

  return groups;
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

function getWorstStatus(
  statuses: CommandAutomationRecordingStatus[],
): CommandAutomationRecordingStatus {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function slugify(value: string) {
  return normalizeKey(value) || "macro";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
