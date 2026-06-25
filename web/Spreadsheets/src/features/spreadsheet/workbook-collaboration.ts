import type {
  WorkbookPresenceSnapshot,
  WorkbookPresenceUser,
} from "@/features/spreadsheet/workbook-presence";

export const workbookCollaborationEventKinds = [
  "documentSaved",
  "mergeConflict",
  "offlineReplay",
  "selectionChanged",
] as const;

export type WorkbookCollaborationEventKind =
  (typeof workbookCollaborationEventKinds)[number];

export type WorkbookCollaborationTransportStatus =
  | "local"
  | "offline"
  | "replaying"
  | "server";

export type WorkbookCollaborationEventPayload = {
  baseUpdatedAt?: string;
  documentUpdatedAt?: string;
  rangeLabel?: string;
  sheetId?: string;
  summary: string;
};

export type WorkbookCollaborationClientEvent = {
  clientId: string;
  clientMutationId: string;
  createdAt: number;
  kind: WorkbookCollaborationEventKind;
  payload: WorkbookCollaborationEventPayload;
};

export type WorkbookCollaborationServerEvent =
  WorkbookCollaborationClientEvent & {
    serverSequence: number;
    user: WorkbookPresenceUser;
  };

export type WorkbookCollaborationSyncRequest = {
  afterSequence: number;
  clientId: string;
  events: WorkbookCollaborationClientEvent[];
  presence: WorkbookPresenceSnapshot | null;
};

export type WorkbookCollaborationSyncResponse = {
  cursor: number;
  events: WorkbookCollaborationServerEvent[];
  presence: WorkbookPresenceSnapshot[];
};

export type WorkbookCollaborationEventDraft = {
  kind: WorkbookCollaborationEventKind;
  payload: WorkbookCollaborationEventPayload;
};

const maxQueuedEventsPerSync = 25;
const maxPayloadTextLength = 240;
const maxClientIdLength = 96;
const maxClientMutationIdLength = 120;

function trimText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isEventKind(value: unknown): value is WorkbookCollaborationEventKind {
  return workbookCollaborationEventKinds.includes(
    value as WorkbookCollaborationEventKind,
  );
}

function normalizeOptionalText(value: unknown) {
  const trimmed = trimText(value, maxPayloadTextLength);

  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePayload(value: unknown): WorkbookCollaborationEventPayload {
  const candidate =
    typeof value === "object" && value !== null
      ? (value as Partial<WorkbookCollaborationEventPayload>)
      : {};
  const summary = trimText(candidate.summary, maxPayloadTextLength);

  return {
    summary: summary || "Workbook collaboration update",
    ...(normalizeOptionalText(candidate.baseUpdatedAt)
      ? { baseUpdatedAt: normalizeOptionalText(candidate.baseUpdatedAt) }
      : {}),
    ...(normalizeOptionalText(candidate.documentUpdatedAt)
      ? { documentUpdatedAt: normalizeOptionalText(candidate.documentUpdatedAt) }
      : {}),
    ...(normalizeOptionalText(candidate.rangeLabel)
      ? { rangeLabel: normalizeOptionalText(candidate.rangeLabel) }
      : {}),
    ...(normalizeOptionalText(candidate.sheetId)
      ? { sheetId: normalizeOptionalText(candidate.sheetId) }
      : {}),
  };
}

export function createWorkbookCollaborationEvent({
  clientId,
  draft,
}: {
  clientId: string;
  draft: WorkbookCollaborationEventDraft;
}): WorkbookCollaborationClientEvent {
  return {
    clientId,
    clientMutationId: crypto.randomUUID(),
    createdAt: Date.now(),
    kind: draft.kind,
    payload: normalizePayload(draft.payload),
  };
}

export function normalizeWorkbookCollaborationClientId(value: unknown) {
  const clientId = trimText(value, maxClientIdLength);

  return clientId || crypto.randomUUID();
}

export function normalizeWorkbookCollaborationCursor(value: unknown) {
  const cursor = Number(value);

  return Number.isFinite(cursor) ? Math.max(0, Math.floor(cursor)) : 0;
}

export function normalizeWorkbookCollaborationEvent(
  value: unknown,
  fallbackClientId: string,
): WorkbookCollaborationClientEvent | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<WorkbookCollaborationClientEvent>;
  const clientMutationId = trimText(
    candidate.clientMutationId,
    maxClientMutationIdLength,
  );

  if (!clientMutationId || !isEventKind(candidate.kind)) {
    return null;
  }

  return {
    clientId: normalizeWorkbookCollaborationClientId(
      candidate.clientId || fallbackClientId,
    ),
    clientMutationId,
    createdAt: normalizeWorkbookCollaborationCursor(candidate.createdAt),
    kind: candidate.kind,
    payload: normalizePayload(candidate.payload),
  };
}

export function normalizeWorkbookCollaborationSyncRequest(
  value: unknown,
): WorkbookCollaborationSyncRequest {
  const candidate =
    typeof value === "object" && value !== null
      ? (value as {
          afterSequence?: unknown;
          clientId?: unknown;
          events?: unknown;
          presence?: unknown;
        })
      : {};
  const clientId = normalizeWorkbookCollaborationClientId(candidate.clientId);
  const events = Array.isArray(candidate.events)
    ? candidate.events
        .map((event) => normalizeWorkbookCollaborationEvent(event, clientId))
        .filter((event): event is WorkbookCollaborationClientEvent => Boolean(event))
        .slice(0, maxQueuedEventsPerSync)
    : [];

  return {
    afterSequence: normalizeWorkbookCollaborationCursor(candidate.afterSequence),
    clientId,
    events,
    presence:
      typeof candidate.presence === "object" && candidate.presence !== null
        ? (candidate.presence as WorkbookPresenceSnapshot)
        : null,
  };
}
