import type { CommandPaletteCommand } from "@/features/editor/components/command-palette";
import type {
  DesignActivityEvent,
  DesignCommandTelemetry,
  DesignDocument,
} from "@/features/editor/types";

export type CommandAutomationRecordingStatus = "ready" | "review" | "blocked";

export type CommandAutomationRecordingCategory =
  | "macro-safety"
  | "ready"
  | "recording-coverage"
  | "replay-qa-packet"
  | "telemetry-export"
  | "undo-preview";

export type CommandAutomationSafetyCheck = {
  id: string;
  status: CommandAutomationRecordingStatus;
  label: string;
  detail: string;
};

export type CommandAutomationUndoPreview = {
  scope: "target" | "document" | "none";
  available: boolean;
  label: string;
  detail: string;
  targetIds: string[];
};

export type CommandAutomationMacro = {
  id: string;
  status: CommandAutomationRecordingStatus;
  label: string;
  actorName: string;
  eventIds: string[];
  commandIds: string[];
  targetIds: string[];
  stepCount: number;
  telemetryDurationMs: number;
  safetyChecks: CommandAutomationSafetyCheck[];
  undoPreview: CommandAutomationUndoPreview;
  replayQaPacketId: string;
  recommendation: string;
};

export type CommandAutomationQaPacket = {
  id: string;
  status: CommandAutomationRecordingStatus;
  macroId: string;
  label: string;
  eventIds: string[];
  commandIds: string[];
  steps: string[];
  assertions: string[];
  undoPreview: CommandAutomationUndoPreview;
  telemetryEvidenceCount: number;
  exportFileName: string;
};

export type CommandAutomationTelemetryExport = {
  id: string;
  eventId: string;
  commandId: string;
  area: DesignCommandTelemetry["area"];
  durationMs: number;
  thresholdMs: number;
  status: DesignCommandTelemetry["status"];
  detail: string;
  capturedAt: string;
};

export type CommandAutomationRecordingRow = {
  id: string;
  status: CommandAutomationRecordingStatus;
  category: CommandAutomationRecordingCategory;
  label: string;
  detail: string;
  eventIds: string[];
  commandIds: string[];
  targetIds: string[];
  metric: number;
  threshold: number;
  recommendation: string;
};

export type CommandAutomationRecordingReport = {
  generatedAt: string;
  score: number;
  status: CommandAutomationRecordingStatus;
  commandCount: number;
  enabledCommandCount: number;
  disabledCommandCount: number;
  eventCount: number;
  recordedCommandEventCount: number;
  unknownCommandEventCount: number;
  macroCandidateCount: number;
  safeMacroCount: number;
  blockedMacroCount: number;
  undoPreviewCount: number;
  unscopedUndoPreviewCount: number;
  replayQaPacketCount: number;
  telemetryExportCount: number;
  replayArtifactCount: number;
  slowCommandCount: number;
  failedCommandCount: number;
  missingTelemetryCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: CommandAutomationRecordingRow[];
  macros: CommandAutomationMacro[];
  qaPackets: CommandAutomationQaPacket[];
  telemetryExports: CommandAutomationTelemetryExport[];
};

export type CommandAutomationRecordingInput = {
  commandPaletteCommands: CommandPaletteCommand[];
  document: DesignDocument;
  generatedAt?: string;
};

export type CommandLookup = {
  commands: CommandPaletteCommand[];
  byId: Map<string, CommandPaletteCommand>;
  byKey: Map<string, CommandPaletteCommand>;
};

export type RecordedCommandEvent = {
  event: DesignActivityEvent;
  commandId: string;
  command?: CommandPaletteCommand;
};
