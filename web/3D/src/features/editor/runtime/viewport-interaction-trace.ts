import { createHash } from "node:crypto";

export type ViewportInteractionEventKind = "camera" | "keyboard" | "pointer" | "selection";
export type ViewportInteractionEventType =
  | "camera-control"
  | "keyboard-down"
  | "keyboard-up"
  | "pointer-down"
  | "pointer-leave"
  | "pointer-miss"
  | "pointer-move"
  | "pointer-up"
  | "selection-change";

export interface ViewportPointerEventPayload {
  button?: number | null;
  x: number;
  y: number;
}

export interface ViewportCameraEventPayload {
  controlEvent: "orbit-change" | "orbit-end" | "orbit-start" | "preview-camera" | "runtime-camera";
  mode: "2d" | "3d";
}

export interface ViewportSelectionEventPayload {
  nextObjectId: string | null;
  previousObjectId: string | null;
}

export interface ViewportInteractionTraceEvent {
  at: string;
  camera?: ViewportCameraEventPayload;
  elapsedMs: number;
  id: string;
  key?: string;
  kind: ViewportInteractionEventKind;
  pointer?: ViewportPointerEventPayload;
  selection?: ViewportSelectionEventPayload;
  sequence: number;
  type: ViewportInteractionEventType;
}

export interface ViewportInteractionTrace {
  events: ViewportInteractionTraceEvent[];
  id: string;
  sceneId: string;
  startedAt: string;
}

export interface ViewportInteractionTraceSummary {
  cameraEvents: number;
  durationMs: number;
  keyboardEvents: number;
  pointerEvents: number;
  selectionEvents: number;
  totalEvents: number;
  traceHash: string;
}

export interface ViewportInteractionReplayStep {
  action: string;
  eventId: string;
  payload: Record<string, unknown>;
  waitMs: number;
}

export interface ViewportInteractionReplay {
  nextAction: string;
  sceneId: string;
  steps: ViewportInteractionReplayStep[];
  traceHash: string;
}

export interface CreateViewportInteractionTraceInput {
  id?: string;
  sceneId: string;
  startedAt?: string;
}

export type AppendViewportInteractionEventInput = Omit<ViewportInteractionTraceEvent, "elapsedMs" | "id" | "sequence">;

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
      .slice(0, 72) || "scene"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function elapsedMs(startedAt: string, at: string) {
  const start = new Date(startedAt).getTime();
  const current = new Date(at).getTime();

  if (Number.isNaN(start) || Number.isNaN(current)) {
    return 0;
  }

  return Math.max(0, current - start);
}

function normalizeEvent(trace: ViewportInteractionTrace, input: AppendViewportInteractionEventInput): ViewportInteractionTraceEvent {
  const sequence = trace.events.at(-1)?.sequence ?? 0;
  const normalizedPointer = input.pointer
    ? {
        ...(typeof input.pointer.button === "number" ? { button: input.pointer.button } : {}),
        x: clamp01(input.pointer.x),
        y: clamp01(input.pointer.y),
      }
    : undefined;

  return {
    ...input,
    elapsedMs: elapsedMs(trace.startedAt, input.at),
    id: `${trace.id}:${sequence + 1}`,
    pointer: normalizedPointer,
    sequence: sequence + 1,
  };
}

export function createViewportInteractionTrace(input: CreateViewportInteractionTraceInput): ViewportInteractionTrace {
  const startedAt = input.startedAt ?? new Date().toISOString();

  return {
    events: [],
    id: input.id ?? `viewport-trace:${slug(input.sceneId)}:${dateStamp(startedAt)}`,
    sceneId: input.sceneId,
    startedAt,
  };
}

export function appendViewportInteractionEvent(
  trace: ViewportInteractionTrace,
  input: AppendViewportInteractionEventInput,
  maxEvents = 500,
): ViewportInteractionTrace {
  const nextEvent = normalizeEvent(trace, input);
  const events = [...trace.events, nextEvent].slice(-Math.max(1, maxEvents));

  return {
    ...trace,
    events,
  };
}

export function summarizeViewportInteractionTrace(trace: ViewportInteractionTrace): ViewportInteractionTraceSummary {
  const totalEvents = trace.events.length;
  const durationMs = trace.events.at(-1)?.elapsedMs ?? 0;

  return {
    cameraEvents: trace.events.filter((event) => event.kind === "camera").length,
    durationMs,
    keyboardEvents: trace.events.filter((event) => event.kind === "keyboard").length,
    pointerEvents: trace.events.filter((event) => event.kind === "pointer").length,
    selectionEvents: trace.events.filter((event) => event.kind === "selection").length,
    totalEvents,
    traceHash: sha256({
      events: trace.events,
      sceneId: trace.sceneId,
      startedAt: trace.startedAt,
    }),
  };
}

function payloadFor(event: ViewportInteractionTraceEvent): Record<string, unknown> {
  if (event.pointer) {
    return { ...event.pointer };
  }

  if (event.camera) {
    return { ...event.camera };
  }

  if (event.selection) {
    return { ...event.selection };
  }

  return event.key ? { key: event.key } : {};
}

export function createViewportInteractionReplay(trace: ViewportInteractionTrace): ViewportInteractionReplay {
  const summary = summarizeViewportInteractionTrace(trace);
  const steps = trace.events.map((event, index) => {
    const previous = index === 0 ? 0 : (trace.events[index - 1]?.elapsedMs ?? 0);

    return {
      action: `${event.kind}:${event.type}`,
      eventId: event.id,
      payload: payloadFor(event),
      waitMs: Math.max(0, event.elapsedMs - previous),
    };
  });

  return {
    nextAction:
      steps.length === 0
        ? "Record pointer, keyboard, camera, or selection events before runtime replay."
        : `Replay ${steps.length} viewport interaction events against the scene runtime.`,
    sceneId: trace.sceneId,
    steps,
    traceHash: summary.traceHash,
  };
}

export function exportViewportInteractionTrace(trace: ViewportInteractionTrace) {
  const replay = createViewportInteractionReplay(trace);
  const summary = summarizeViewportInteractionTrace(trace);
  const jsonContent = JSON.stringify(
    {
      replay,
      summary,
      trace,
    },
    null,
    2,
  );

  return {
    fileName: `${slug(trace.sceneId)}-viewport-interaction-trace-${dateStamp(trace.startedAt)}.json`,
    jsonContent,
    jsonDataUri: `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`,
  };
}
