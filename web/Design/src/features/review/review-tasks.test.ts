import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  isReviewTaskOverdue,
  normalizeReviewTaskOwner,
  normalizeReviewTaskStatus,
  parseReviewTaskDueDate,
} from "@/features/review/review-tasks";

describe("review task helpers", () => {
  test("normalizes task status values", () => {
    assert.equal(normalizeReviewTaskStatus("todo"), "todo");
    assert.equal(normalizeReviewTaskStatus("in-progress"), "in-progress");
    assert.equal(normalizeReviewTaskStatus("done"), "done");
    assert.equal(normalizeReviewTaskStatus("later"), "none");
  });

  test("normalizes blank assignees to an explicit owner label", () => {
    assert.equal(normalizeReviewTaskOwner("  Priya  "), "Priya");
    assert.equal(normalizeReviewTaskOwner(""), "Unassigned");
  });

  test("parses safe due dates and ignores invalid values", () => {
    assert.equal(parseReviewTaskDueDate("nope"), null);
    assert.equal(
      parseReviewTaskDueDate("2026-05-16")?.toISOString().startsWith(
        "2026-05-16",
      ),
      true,
    );
  });

  test("marks active tasks overdue but leaves done tasks alone", () => {
    const now = new Date("2026-05-20T12:00:00.000Z");

    assert.equal(
      isReviewTaskOverdue({
        taskStatus: "todo",
        taskDueAt: "2026-05-19T00:00:00.000Z",
        now,
      }),
      true,
    );
    assert.equal(
      isReviewTaskOverdue({
        taskStatus: "done",
        taskDueAt: "2026-05-19T00:00:00.000Z",
        now,
      }),
      false,
    );
  });
});
