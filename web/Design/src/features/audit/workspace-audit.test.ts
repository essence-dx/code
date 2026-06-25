import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { formatAuditAction } from "@/features/audit/workspace-audit";

describe("workspace audit helpers", () => {
  test("formats dotted audit actions for the dashboard", () => {
    assert.equal(formatAuditAction("content.rescheduled"), "Content Rescheduled");
    assert.equal(
      formatAuditAction("campaign.deliverables.scheduled"),
      "Campaign Deliverables Scheduled",
    );
  });
});
