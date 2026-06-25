import { readFileSync } from "node:fs";
import {
  getCommandAutomationRecordingCsv,
  getCommandAutomationRecordingJson,
  getCommandAutomationRecordingMarkdown,
  getCommandAutomationRecordingReport,
} from "../src/features/editor/command-automation-recording";
import type { CommandPaletteCommand } from "../src/features/editor/components/command-palette";
import type {
  DesignActivityEvent,
  DesignCommandTelemetryArea,
  DesignDocument,
  DesignPage,
} from "../src/features/editor/types";

const generatedAt = "2026-05-19T17:00:00.000Z";
const commands = createCommands([
  ["align-left", "Align left", "Align selected layers to the left edge"],
  ["group-selection", "Group selection", "Group selected layers"],
  ["export", "Export", "Open batch export settings"],
  ["import-assets", "Import assets", "Import image and video assets"],
  ["delete-selection", "Delete selection", "Delete selected layers"],
  ["plugin-transform", "Plugin transform", "Run approved plugin transform"],
]);
const document = createDocument([
  createEvent("event-align", {
    kind: "component",
    label: "Align left",
    detail: "Aligned hero artboard",
    targetId: "layer-hero",
    telemetry: telemetry("canvas", "align-left", 42, 80),
  }),
  createEvent("event-group", {
    kind: "component",
    label: "Group selection",
    detail: "Grouped hero controls",
    targetId: "layer-hero",
    telemetry: telemetry("canvas", "group-selection", 55, 80),
  }),
  createEvent("event-export", {
    kind: "export",
    label: "Export",
    detail: "Exported release review PNGs",
    telemetry: telemetry("export", "export", 420, 900),
  }),
  createEvent("event-import", {
    kind: "import",
    label: "Import assets",
    detail: "Imported vendor video",
    telemetry: telemetry("import", "import-assets", 820, 700),
  }),
  createEvent("event-delete", {
    kind: "component",
    label: "Delete selection",
    detail: "Deleted stale draft layers",
    telemetry: telemetry("canvas", "delete-selection", 22, 80, "failed"),
  }),
  createEvent("event-plugin-gap", {
    kind: "extension",
    label: "Plugin transform",
    detail: "Plugin transform ran without timing evidence",
    targetId: "layer-plugin",
  }),
]);
const readyDocument = createDocument([
  createEvent("ready-align", {
    kind: "component",
    label: "Align left",
    detail: "Aligned production frame",
    targetId: "layer-ready",
    telemetry: telemetry("canvas", "align-left", 31, 80),
  }),
  createEvent("ready-group", {
    kind: "component",
    label: "Group selection",
    detail: "Grouped production frame",
    targetId: "layer-ready",
    telemetry: telemetry("canvas", "group-selection", 44, 80),
  }),
  createEvent("ready-export", {
    kind: "export",
    label: "Export",
    detail: "Exported QA packet",
    telemetry: telemetry("export", "export", 320, 900),
  }),
]);
const report = getCommandAutomationRecordingReport({
  commandPaletteCommands: commands,
  document,
  generatedAt,
});
const readyReport = getCommandAutomationRecordingReport({
  commandPaletteCommands: commands,
  document: readyDocument,
  generatedAt,
});
const markdown = getCommandAutomationRecordingMarkdown(report);
const csv = getCommandAutomationRecordingCsv(report);
const json = JSON.parse(getCommandAutomationRecordingJson(report)) as {
  macros: unknown[];
  qaPackets: unknown[];
  rows: unknown[];
  summary: {
    macroCandidateCount: number;
    replayQaPacketCount: number;
    telemetryExportCount: number;
    undoPreviewCount: number;
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

assert(report.status === "blocked", "Risky command recording fixture should block release automation.");
assert(report.recordedCommandEventCount >= 5, "Report should find recorded command events.");
assert(report.macroCandidateCount >= 2, "Report should produce macro candidates.");
assert(report.blockedMacroCount >= 1, "Report should block unsafe macro candidates.");
assert(report.safeMacroCount >= 1, "Report should keep safe macro candidates.");
assert(report.undoPreviewCount >= 1, "Report should create undo previews.");
assert(report.unscopedUndoPreviewCount >= 1, "Report should flag unscoped undo previews.");
assert(report.replayQaPacketCount === report.macroCandidateCount, "Each macro should get a replay QA packet.");
assert(report.telemetryExportCount >= 4, "Report should expose telemetry export rows.");
assert(report.replayArtifactCount >= report.recordedCommandEventCount, "Report should reuse action replay artifacts.");
assert(
  report.rows.some((row) => row.category === "macro-safety"),
  "Rows should include macro safety checks.",
);
assert(
  report.rows.some((row) => row.category === "undo-preview"),
  "Rows should include undo preview checks.",
);
assert(
  report.rows.some((row) => row.category === "replay-qa-packet"),
  "Rows should include replay QA packets.",
);
assert(
  report.rows.some((row) => row.category === "telemetry-export"),
  "Rows should include telemetry export evidence.",
);
assert(readyReport.status === "ready", "Ready fixture should pass command automation recording.");
assert(readyReport.blockedCount === 0, "Ready fixture should not have blockers.");
assert(markdown.includes("Command Automation Recording"), "Markdown should include a clear title.");
assert(markdown.includes("Replay QA Packets"), "Markdown should include replay QA packet details.");
assert(csv.includes("macro-safety"), "CSV should include macro safety rows.");
assert(json.rows.length === report.rows.length, "JSON should preserve all rows.");
assert(json.macros.length === report.macros.length, "JSON should preserve macros.");
assert(json.qaPackets.length === report.qaPackets.length, "JSON should preserve QA packets.");
assert(json.summary.status === report.status, "JSON summary should preserve status.");
assert(
  json.summary.macroCandidateCount === report.macroCandidateCount &&
    json.summary.replayQaPacketCount === report.replayQaPacketCount &&
    json.summary.telemetryExportCount === report.telemetryExportCount &&
    json.summary.undoPreviewCount === report.undoPreviewCount,
  "JSON summary should preserve automation counts.",
);
assert(
  /CommandAutomationRecordingPanel/.test(extensionsSource) &&
    /getCommandAutomationRecordingReport/.test(extensionsSource),
  "Extensions should wire the command automation recording panel and report.",
);
assert(
  packageJson.scripts["editor:command-automation-recording-smoke"]?.includes(
    "command-automation-recording-smoke",
  ),
  "Targeted command automation recording smoke command should be listed.",
);

console.log(
  `Command automation recording smoke passed: ${report.score} score, ${report.macroCandidateCount} macros, ${report.replayQaPacketCount} QA packets.`,
);

function createCommands(
  items: Array<[string, string, string, boolean?]>,
): CommandPaletteCommand[] {
  return items.map(([id, label, detail, disabled]) => ({
    id,
    label,
    detail,
    disabled,
    run: () => undefined,
  }));
}

function createDocument(events: DesignActivityEvent[]): DesignDocument {
  const page: DesignPage = {
    id: "page-command-automation",
    name: "Command automation",
    background: "#111827",
    layers: [],
  };

  return {
    version: 1,
    activePageId: page.id,
    pages: [page],
    variables: {},
    components: {},
    activityEvents: events,
    updatedAt: generatedAt,
  };
}

function createEvent(
  id: string,
  input: Omit<DesignActivityEvent, "actorEmail" | "actorName" | "createdAt" | "id">,
): DesignActivityEvent {
  return {
    id,
    actorName: "Essence",
    actorEmail: "essencefromexistence@gmail.com",
    createdAt: generatedAt,
    ...input,
  };
}

function telemetry(
  area: DesignCommandTelemetryArea,
  command: string,
  durationMs: number,
  thresholdMs: number,
  status: "failed" | "ok" = "ok",
) {
  return {
    area,
    command,
    durationMs,
    thresholdMs,
    status,
    itemCount: 1,
    detail: `${command} ${durationMs}ms`,
    capturedAt: generatedAt,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
