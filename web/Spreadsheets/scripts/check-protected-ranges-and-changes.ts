import assert from "node:assert/strict";
import { cellKey } from "@/features/workbooks/addresses";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import {
  addProtectedRangeToDocument,
  canEditCellWithProtectionRules,
  deleteProtectedRangeFromDocument,
} from "@/features/spreadsheet/state/protection-state";
import {
  recordTrackedChangesForDocuments,
  reviewTrackedChangeInDocument,
} from "@/features/spreadsheet/state/track-changes-state";

const document = createDefaultWorkbookDocument();
const sheet = document.sheets[0];

assert.ok(sheet, "default workbook has a sheet");

const targetRange = {
  startRowIndex: 0,
  startColumnIndex: 0,
  endRowIndex: 0,
  endColumnIndex: 0,
};

const protectedRangeId = addProtectedRangeToDocument(document, sheet, {
  allowedEmails: ["trusted@example.com", "TRUSTED@example.com"],
  createdByEmail: "owner@example.com",
  createdByName: "Owner",
  name: "Executive assumptions",
  range: targetRange,
});

assert.ok(protectedRangeId, "protected range is created for valid emails");
assert.equal(document.protectedRanges?.length, 1);
assert.deepEqual(document.protectedRanges?.[0]?.allowedEmails, [
  "trusted@example.com",
]);
assert.equal(
  canEditCellWithProtectionRules({
    columnIndex: 0,
    document,
    identity: { email: "owner@example.com", role: "owner" },
    rowIndex: 0,
    sheet,
  }),
  true,
  "owners can edit collaborator protected ranges",
);
assert.equal(
  canEditCellWithProtectionRules({
    columnIndex: 0,
    document,
    identity: { email: "trusted@example.com", role: "editor" },
    rowIndex: 0,
    sheet,
  }),
  true,
  "listed collaborators can edit protected ranges",
);
assert.equal(
  canEditCellWithProtectionRules({
    columnIndex: 0,
    document,
    identity: { email: "other@example.com", role: "editor" },
    rowIndex: 0,
    sheet,
  }),
  false,
  "unlisted collaborators cannot edit protected ranges",
);

const before = createDefaultWorkbookDocument();
const after = structuredClone(before);
const afterSheet = after.sheets[0];

assert.ok(afterSheet, "tracked-change workbook has a sheet");
afterSheet.cells[cellKey(0, 0)] = { raw: "42" };

recordTrackedChangesForDocuments({
  actor: { email: "editor@example.com", name: "Editor" },
  after,
  before,
});

const change = after.trackedChanges?.[0];

assert.ok(change, "cell edit records a tracked change");
assert.equal(change.status, "pending");
assert.equal(change.cellKey, "A1");
assert.equal(change.afterCell?.raw, "42");

const rejected = reviewTrackedChangeInDocument({
  actor: { email: "owner@example.com", name: "Owner" },
  decision: "rejected",
  document: after,
  trackedChangeId: change.id,
});

assert.equal(rejected, true, "pending changes can be rejected");
assert.equal(after.sheets[0]?.cells.A1?.raw, "Essence Excel");
assert.equal(after.trackedChanges?.[0]?.status, "rejected");

deleteProtectedRangeFromDocument(document, protectedRangeId);
assert.equal(document.protectedRanges?.length, 0);

const normalizedSheet = after.sheets[0];

assert.ok(normalizedSheet, "normalized workbook has a sheet");

const normalized = normalizeWorkbookDocument({
  ...after,
  protectedRanges: [
    {
      id: "range_1",
      sheetId: normalizedSheet.id,
      name: "Executive assumptions",
      range: targetRange,
      allowedEmails: ["Trusted@example.com", "trusted@example.com"],
      createdByName: "Owner",
      createdByEmail: "owner@example.com",
      createdAt: "2026-05-15T00:00:00.000Z",
      updatedAt: "2026-05-15T00:00:00.000Z",
    },
  ],
  trackedChanges: after.trackedChanges ?? [],
});

assert.equal(normalized.protectedRanges?.length, 1);
assert.deepEqual(normalized.protectedRanges?.[0]?.allowedEmails, [
  "trusted@example.com",
]);
assert.equal(normalized.trackedChanges?.[0]?.status, "rejected");

console.log("protected ranges and tracked changes checks passed");
