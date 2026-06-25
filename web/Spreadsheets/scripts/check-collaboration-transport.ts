import assert from "node:assert/strict";
import {
  createWorkbookCollaborationEvent,
  normalizeWorkbookCollaborationClientId,
  normalizeWorkbookCollaborationCursor,
  normalizeWorkbookCollaborationEvent,
  normalizeWorkbookCollaborationSyncRequest,
} from "@/features/spreadsheet/workbook-collaboration";

const clientId = normalizeWorkbookCollaborationClientId(" client-1 ");

assert.equal(clientId, "client-1");
assert.equal(normalizeWorkbookCollaborationCursor("42.9"), 42);
assert.equal(normalizeWorkbookCollaborationCursor("not-a-number"), 0);

const event = createWorkbookCollaborationEvent({
  clientId,
  draft: {
    kind: "documentSaved",
    payload: {
      baseUpdatedAt: "2026-05-15T00:00:00.000Z",
      documentUpdatedAt: "2026-05-15T00:00:03.000Z",
      summary: "Workbook saved",
    },
  },
});

assert.equal(event.clientId, clientId);
assert.equal(event.kind, "documentSaved");
assert.equal(event.payload.summary, "Workbook saved");
assert.ok(event.clientMutationId.length > 10);

const normalizedEvent = normalizeWorkbookCollaborationEvent(
  {
    ...event,
    clientId: "",
    createdAt: "100.8",
    payload: {
      summary: "x".repeat(500),
      rangeLabel: "A1:C10",
      ignored: true,
    },
  },
  clientId,
);

assert.ok(normalizedEvent, "event normalizes");
assert.equal(normalizedEvent.clientId, clientId);
assert.equal(normalizedEvent.createdAt, 100);
assert.equal(normalizedEvent.payload.summary.length, 240);
assert.equal(normalizedEvent.payload.rangeLabel, "A1:C10");

const payload = normalizeWorkbookCollaborationSyncRequest({
  afterSequence: "9",
  clientId,
  events: [
    normalizedEvent,
    { clientMutationId: "", kind: "documentSaved" },
    { clientMutationId: "bad-kind", kind: "unknown" },
  ],
  presence: {
    activeCellLabel: "B2",
    clientId,
    color: "#2563eb",
    isDirty: false,
    lastSeenAt: Date.now(),
    rangeLabel: "B2",
    sheetId: "sheet_1",
    sheetName: "Sheet 1",
    user: {
      email: "user@example.com",
      name: "User",
    },
  },
});

assert.equal(payload.afterSequence, 9);
assert.equal(payload.events.length, 1);
assert.equal(payload.presence?.rangeLabel, "B2");

console.log("Collaboration transport checks passed");
