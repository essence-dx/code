import { nanoid } from "nanoid";
import type {
  DesignActivityEvent,
  DesignActivityKind,
  DesignCommandTelemetry,
  DesignDocument,
} from "@/features/editor/types";

const MAX_ACTIVITY_EVENTS = 180;

type ActivityEventInput = {
  kind: DesignActivityKind;
  actorName: string;
  actorEmail?: string | null;
  label: string;
  detail?: string;
  targetId?: string;
  telemetry?: DesignCommandTelemetry;
};

export function createActivityEvent(input: ActivityEventInput) {
  return {
    id: nanoid(),
    kind: input.kind,
    actorName: input.actorName,
    actorEmail: input.actorEmail ?? null,
    label: input.label,
    detail: input.detail,
    targetId: input.targetId,
    telemetry: input.telemetry,
    createdAt: new Date().toISOString(),
  } satisfies DesignActivityEvent;
}

export function appendActivityEvent(
  document: DesignDocument,
  event: DesignActivityEvent,
): DesignDocument {
  return {
    ...document,
    activityEvents: [
      event,
      ...(document.activityEvents ?? []).filter((item) => item.id !== event.id),
    ].slice(0, MAX_ACTIVITY_EVENTS),
    updatedAt: new Date().toISOString(),
  };
}

export function clearActivityEvents(document: DesignDocument): DesignDocument {
  return {
    ...document,
    activityEvents: [],
    updatedAt: new Date().toISOString(),
  };
}

export function activityEventsToCsv(events: DesignActivityEvent[]) {
  return [
    [
      "created_at",
      "kind",
      "actor_name",
      "actor_email",
      "label",
      "detail",
      "target_id",
      "telemetry_area",
      "telemetry_command",
      "telemetry_duration_ms",
      "telemetry_threshold_ms",
      "telemetry_status",
      "telemetry_item_count",
      "telemetry_captured_at",
    ],
    ...events.map((event) => [
      event.createdAt,
      event.kind,
      event.actorName,
      event.actorEmail ?? "",
      event.label,
      event.detail ?? "",
      event.targetId ?? "",
      event.telemetry?.area ?? "",
      event.telemetry?.command ?? "",
      event.telemetry?.durationMs !== undefined
        ? String(event.telemetry.durationMs)
        : "",
      event.telemetry?.thresholdMs !== undefined
        ? String(event.telemetry.thresholdMs)
        : "",
      event.telemetry?.status ?? "",
      event.telemetry?.itemCount !== undefined
        ? String(event.telemetry.itemCount)
        : "",
      event.telemetry?.capturedAt ?? "",
    ]),
  ]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
