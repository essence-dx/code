import { nanoid } from "nanoid";
import type {
  CreationDraftArchiveScope,
  CreationDraftRecoveryReason,
} from "./creation-drafts";

const archiveEventsStorageKey = "essence-suno:creation-draft-archive-events";
const archiveEventsChangedEvent =
  "essence-suno:creation-draft-archive-events-changed";
export const creationDraftArchiveEventLimit = 12;

export type CreationDraftArchiveEventType =
  | "archive-import"
  | "recovery-dismiss"
  | "recovery-export"
  | "recovery-restore";

export type CreationDraftArchiveEvent = {
  archiveScope?: CreationDraftArchiveScope;
  archiveVersion?: number | null;
  capacityLimited?: number;
  createdAt: number;
  draftCount?: number;
  duplicates?: number;
  id: string;
  invalid?: number;
  recoveryReason?: CreationDraftRecoveryReason;
  skipped?: number;
  totalDrafts?: number;
  type: CreationDraftArchiveEventType;
};

export type CreationDraftArchiveEventInput = Omit<
  CreationDraftArchiveEvent,
  "createdAt" | "id"
>;

export function listCreationDraftArchiveEvents(): CreationDraftArchiveEvent[] {
  return readArchiveEvents();
}

export function serializeCreationDraftArchiveEvents(
  events: CreationDraftArchiveEvent[] = listCreationDraftArchiveEvents(),
) {
  return JSON.stringify(
    {
      count: events.length,
      events: events.map(sanitizeArchiveEvent),
      exportedAt: new Date().toISOString(),
      product: "Essence Suno",
      type: "creation-draft-archive-timeline",
      version: 1,
    },
    null,
    2,
  );
}

export function recordCreationDraftArchiveEvent(
  input: CreationDraftArchiveEventInput,
) {
  if (typeof window === "undefined") {
    return null;
  }

  const event: CreationDraftArchiveEvent = {
    archiveScope: input.archiveScope,
    archiveVersion: input.archiveVersion ?? null,
    capacityLimited: normalizeEventCount(input.capacityLimited),
    createdAt: Date.now(),
    draftCount: normalizeEventCount(input.draftCount),
    duplicates: normalizeEventCount(input.duplicates),
    id: nanoid(),
    invalid: normalizeEventCount(input.invalid),
    recoveryReason: input.recoveryReason,
    skipped: normalizeEventCount(input.skipped),
    totalDrafts: normalizeEventCount(input.totalDrafts),
    type: input.type,
  };

  writeArchiveEvents(
    [event, ...readArchiveEvents()].slice(0, creationDraftArchiveEventLimit),
  );
  return event;
}

function sanitizeArchiveEvent(
  event: CreationDraftArchiveEvent,
): CreationDraftArchiveEvent {
  return {
    archiveScope: event.archiveScope,
    archiveVersion: event.archiveVersion,
    capacityLimited: event.capacityLimited,
    createdAt: event.createdAt,
    draftCount: event.draftCount,
    duplicates: event.duplicates,
    id: event.id,
    invalid: event.invalid,
    recoveryReason: event.recoveryReason,
    skipped: event.skipped,
    totalDrafts: event.totalDrafts,
    type: event.type,
  };
}

export function clearCreationDraftArchiveEvents() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(archiveEventsStorageKey);
  window.dispatchEvent(new Event(archiveEventsChangedEvent));
}

export function subscribeToCreationDraftArchiveEvents(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(archiveEventsChangedEvent, listener);
  return () => window.removeEventListener(archiveEventsChangedEvent, listener);
}

function readArchiveEvents(): CreationDraftArchiveEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(archiveEventsStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isCreationDraftArchiveEvent)
      .slice(0, creationDraftArchiveEventLimit);
  } catch {
    return [];
  }
}

function writeArchiveEvents(events: CreationDraftArchiveEvent[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(archiveEventsStorageKey, JSON.stringify(events));
  window.dispatchEvent(new Event(archiveEventsChangedEvent));
}

function isCreationDraftArchiveEvent(
  value: unknown,
): value is CreationDraftArchiveEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<CreationDraftArchiveEvent>;

  return (
    typeof event.id === "string" &&
    typeof event.createdAt === "number" &&
    Number.isFinite(event.createdAt) &&
    isCreationDraftArchiveEventType(event.type) &&
    (event.archiveScope === undefined ||
      isCreationDraftArchiveScope(event.archiveScope)) &&
    (event.archiveVersion === undefined ||
      event.archiveVersion === null ||
      typeof event.archiveVersion === "number") &&
    (event.capacityLimited === undefined ||
      isNonNegativeEventCount(event.capacityLimited)) &&
    (event.draftCount === undefined ||
      isNonNegativeEventCount(event.draftCount)) &&
    (event.duplicates === undefined ||
      isNonNegativeEventCount(event.duplicates)) &&
    (event.invalid === undefined || isNonNegativeEventCount(event.invalid)) &&
    (event.recoveryReason === undefined ||
      event.recoveryReason === "archive-import" ||
      event.recoveryReason === "recovery-restore") &&
    (event.skipped === undefined || isNonNegativeEventCount(event.skipped)) &&
    (event.totalDrafts === undefined ||
      isNonNegativeEventCount(event.totalDrafts))
  );
}

function isCreationDraftArchiveEventType(
  value: unknown,
): value is CreationDraftArchiveEventType {
  return (
    value === "archive-import" ||
    value === "recovery-dismiss" ||
    value === "recovery-export" ||
    value === "recovery-restore"
  );
}

function isCreationDraftArchiveScope(
  value: unknown,
): value is CreationDraftArchiveScope {
  return (
    value === "full-vault" ||
    value === "legacy" ||
    value === "selected-visible"
  );
}

function normalizeEventCount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.round(value));
}

function isNonNegativeEventCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
