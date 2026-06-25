import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getApprovalStatusBadgeVariant,
  normalizeApprovalStatus,
} from "@/features/review/approval-status";

describe("approval status helpers", () => {
  test("normalizes known approval statuses", () => {
    assert.equal(normalizeApprovalStatus("in-review"), "in-review");
    assert.equal(normalizeApprovalStatus("changes-requested"), "changes-requested");
    assert.equal(normalizeApprovalStatus("approved"), "approved");
  });

  test("falls back unknown approval statuses to draft", () => {
    assert.equal(normalizeApprovalStatus("waiting"), "draft");
    assert.equal(normalizeApprovalStatus(null), "draft");
  });

  test("maps review statuses to badge variants", () => {
    assert.equal(getApprovalStatusBadgeVariant("approved"), "secondary");
    assert.equal(getApprovalStatusBadgeVariant("changes-requested"), "destructive");
    assert.equal(getApprovalStatusBadgeVariant("draft"), "outline");
  });
});
