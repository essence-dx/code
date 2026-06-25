import { createHash } from "node:crypto";
import {
  createViewportInteractionReplay,
  summarizeViewportInteractionTrace,
  type ViewportInteractionTrace,
} from "@/features/editor/runtime/viewport-interaction-trace";
import type { SceneVariableValue } from "@/features/editor/types";

export type DeterministicRuntimeReplayStatus = "blocked" | "ready";
export type DeterministicRuntimeReplayAssertionStatus = "failed" | "passed";

export interface DeterministicRuntimeReplayTimelineState {
  cameraControlCount: number;
  durationMs: number;
  keyboardEventCount: number;
  pointerEventCount: number;
  selectionEventCount: number;
  stepCount: number;
}

export interface DeterministicRuntimeReplayObjectState {
  selected?: boolean;
}

export interface DeterministicRuntimeReplayState {
  objectStates: Record<string, DeterministicRuntimeReplayObjectState>;
  selectedObjectId: string | null;
  timeline: DeterministicRuntimeReplayTimelineState;
  variables: Record<string, SceneVariableValue>;
}

export interface DeterministicRuntimeReplayExpectedState {
  objectStates?: Record<string, DeterministicRuntimeReplayObjectState>;
  selectedObjectId?: string | null;
  timeline?: Partial<DeterministicRuntimeReplayTimelineState>;
  variables?: Record<string, SceneVariableValue>;
}

export interface DeterministicRuntimeReplayAssertion {
  actual: SceneVariableValue | null;
  expected: SceneVariableValue | null;
  path: string;
  status: DeterministicRuntimeReplayAssertionStatus;
}

export interface DeterministicRuntimeReplayResult {
  assertions: DeterministicRuntimeReplayAssertion[];
  finalState: DeterministicRuntimeReplayState;
  id: string;
  nextAction: string;
  replayHash: string;
  sceneId: string;
  summary: {
    assertionCount: number;
    failedCount: number;
    passedCount: number;
    replayHash: string;
    status: DeterministicRuntimeReplayStatus;
  };
  traceHash: string;
}

export interface DeterministicRuntimeReplayReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  replayResults: DeterministicRuntimeReplayResult[];
  summary: {
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    replayCount: number;
    replayScore: number;
    reportHash: string;
    status: DeterministicRuntimeReplayStatus;
  };
  workspaceId: string;
}

export interface ValidateDeterministicRuntimeReplayInput {
  expected: DeterministicRuntimeReplayExpectedState;
  id?: string;
  initialState?: Partial<Pick<DeterministicRuntimeReplayState, "objectStates" | "selectedObjectId" | "variables">>;
  trace: ViewportInteractionTrace;
}

export interface CreateDeterministicRuntimeReplayReportInput {
  generatedAt?: string;
  replayResults: DeterministicRuntimeReplayResult[];
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

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function createInitialState(input: ValidateDeterministicRuntimeReplayInput): DeterministicRuntimeReplayState {
  return {
    objectStates: { ...(input.initialState?.objectStates ?? {}) },
    selectedObjectId: input.initialState?.selectedObjectId ?? null,
    timeline: {
      cameraControlCount: 0,
      durationMs: 0,
      keyboardEventCount: 0,
      pointerEventCount: 0,
      selectionEventCount: 0,
      stepCount: 0,
    },
    variables: { ...(input.initialState?.variables ?? {}) },
  };
}

function applyTrace(trace: ViewportInteractionTrace, input: ValidateDeterministicRuntimeReplayInput): DeterministicRuntimeReplayState {
  const state = createInitialState(input);

  for (const event of trace.events) {
    state.timeline.stepCount += 1;
    state.timeline.durationMs = Math.max(state.timeline.durationMs, event.elapsedMs);

    if (event.kind === "pointer") {
      state.timeline.pointerEventCount += 1;
    }

    if (event.kind === "keyboard") {
      state.timeline.keyboardEventCount += 1;
      if (event.type === "keyboard-down" && event.key === "Space") {
        state.variables.playState = !(state.variables.playState === true);
      }
    }

    if (event.kind === "camera") {
      state.timeline.cameraControlCount += 1;
    }

    if (event.kind === "selection" && event.selection) {
      state.timeline.selectionEventCount += 1;
      state.selectedObjectId = event.selection.nextObjectId;

      if (event.selection.previousObjectId) {
        state.objectStates[event.selection.previousObjectId] = {
          ...state.objectStates[event.selection.previousObjectId],
          selected: false,
        };
      }

      if (event.selection.nextObjectId) {
        state.objectStates[event.selection.nextObjectId] = {
          ...state.objectStates[event.selection.nextObjectId],
          selected: true,
        };
      }
    }
  }

  return state;
}

function assertion(path: string, expected: SceneVariableValue | null, actual: SceneVariableValue | null): DeterministicRuntimeReplayAssertion {
  return {
    actual,
    expected,
    path,
    status: Object.is(expected, actual) ? "passed" : "failed",
  };
}

function createAssertions(
  expected: DeterministicRuntimeReplayExpectedState,
  finalState: DeterministicRuntimeReplayState,
): DeterministicRuntimeReplayAssertion[] {
  const assertions: DeterministicRuntimeReplayAssertion[] = [];

  if ("selectedObjectId" in expected) {
    assertions.push(assertion("selectedObjectId", expected.selectedObjectId ?? null, finalState.selectedObjectId));
  }

  for (const [key, expectedValue] of Object.entries(expected.variables ?? {})) {
    assertions.push(assertion(`variables.${key}`, expectedValue, finalState.variables[key] ?? null));
  }

  for (const [key, expectedValue] of Object.entries(expected.timeline ?? {})) {
    const actualValue = finalState.timeline[key as keyof DeterministicRuntimeReplayTimelineState];
    assertions.push(assertion(`timeline.${key}`, expectedValue, actualValue));
  }

  for (const [objectId, objectState] of Object.entries(expected.objectStates ?? {})) {
    if ("selected" in objectState) {
      assertions.push(assertion(`objectStates.${objectId}.selected`, objectState.selected ?? null, finalState.objectStates[objectId]?.selected ?? null));
    }
  }

  return assertions;
}

function nextActionFor(status: DeterministicRuntimeReplayStatus) {
  return status === "ready"
    ? "Deterministic runtime replay matches expected variable, timeline, and object-state outputs."
    : "Fix deterministic runtime replay mismatches before accepting editor runtime fidelity.";
}

export function validateDeterministicRuntimeReplay(input: ValidateDeterministicRuntimeReplayInput): DeterministicRuntimeReplayResult {
  const replay = createViewportInteractionReplay(input.trace);
  const traceSummary = summarizeViewportInteractionTrace(input.trace);
  const finalState = applyTrace(input.trace, input);
  const assertions = createAssertions(input.expected, finalState);
  const failedCount = assertions.filter((entry) => entry.status === "failed").length;
  const passedCount = assertions.length - failedCount;
  const status: DeterministicRuntimeReplayStatus = failedCount > 0 ? "blocked" : "ready";
  const replayHash = sha256({
    assertions,
    finalState,
    replay,
    traceHash: traceSummary.traceHash,
  });

  return {
    assertions,
    finalState,
    id: input.id ?? `runtime-replay:${slug(input.trace.sceneId)}:${input.trace.events.length}`,
    nextAction: nextActionFor(status),
    replayHash,
    sceneId: input.trace.sceneId,
    summary: {
      assertionCount: assertions.length,
      failedCount,
      passedCount,
      replayHash,
      status,
    },
    traceHash: traceSummary.traceHash,
  };
}

function summarizeReport(results: DeterministicRuntimeReplayResult[]): DeterministicRuntimeReplayReport["summary"] {
  const blockedCount = results.filter((result) => result.summary.status === "blocked").length;
  const readyCount = results.filter((result) => result.summary.status === "ready").length;
  const status: DeterministicRuntimeReplayStatus = blockedCount > 0 ? "blocked" : "ready";
  const replayScore = Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, results.length)) * 100)));

  return {
    blockedCount,
    nextAction:
      status === "ready"
        ? "Deterministic runtime replay evidence is ready."
        : "Resolve blocked deterministic runtime replay results before increasing runtime fidelity.",
    readyCount,
    replayCount: results.length,
    replayScore,
    reportHash: sha256(results.map((result) => result.replayHash)),
    status,
  };
}

function createCsv(results: DeterministicRuntimeReplayResult[]) {
  const header = ["replay_id", "status", "assertions", "passed", "failed", "replay_hash", "next_action"];
  const body = results.map((result) =>
    [
      result.id,
      result.summary.status,
      result.summary.assertionCount,
      result.summary.passedCount,
      result.summary.failedCount,
      result.replayHash,
      result.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createDeterministicRuntimeReplayReport(input: CreateDeterministicRuntimeReplayReportInput): DeterministicRuntimeReplayReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const replayResults = [...input.replayResults].sort((first, second) => first.id.localeCompare(second.id));
  const summary = summarizeReport(replayResults);
  const csvContent = createCsv(replayResults);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      replayResults,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-deterministic-runtime-replay-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    replayResults,
    summary,
    workspaceId,
  };
}
