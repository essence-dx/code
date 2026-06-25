import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ContentScheduleSummary } from "@/db/content-planner";
import {
  buildPlannerCalendarDays,
  createPlannerRescheduleValue,
  toPlannerDateKey,
  toPlannerDatetimeLocalInputValue,
} from "@/features/content-planner/content-calendar";

function makeItem(
  id: string,
  scheduledAt: Date,
  title = `Item ${id}`,
): ContentScheduleSummary {
  return {
    id,
    projectId: "project-1",
    projectName: "Launch design",
    title,
    channel: "Instagram",
    caption: "",
    status: "planned",
    scheduledAt: scheduledAt.toISOString(),
    createdAt: scheduledAt.toISOString(),
    updatedAt: scheduledAt.toISOString(),
  };
}

describe("content planner calendar helpers", () => {
  test("formats local date keys and datetime-local values", () => {
    const value = new Date(2026, 4, 15, 8, 5);

    assert.equal(toPlannerDateKey(value), "2026-05-15");
    assert.equal(toPlannerDatetimeLocalInputValue(value), "2026-05-15T08:05");
  });

  test("groups scheduled items into calendar days in chronological order", () => {
    const days = buildPlannerCalendarDays({
      startDate: new Date(2026, 4, 15, 12),
      dayCount: 3,
      locale: "en-US",
      items: [
        makeItem("later", new Date(2026, 4, 16, 16, 30)),
        makeItem("earlier", new Date(2026, 4, 16, 9)),
        makeItem("outside", new Date(2026, 4, 20, 9)),
      ],
    });

    assert.equal(days.length, 3);
    assert.equal(days[0]?.key, "2026-05-15");
    assert.equal(days[1]?.key, "2026-05-16");
    assert.deepEqual(
      days[1]?.items.map((item) => item.id),
      ["earlier", "later"],
    );
    assert.deepEqual(
      days[2]?.items.map((item) => item.id),
      [],
    );
  });

  test("keeps the original publishing time when rescheduling by day", () => {
    assert.equal(
      createPlannerRescheduleValue("2026-05-18", new Date(2026, 4, 15, 21, 45)),
      "2026-05-18T21:45",
    );
    assert.equal(createPlannerRescheduleValue("2026-05-18", null), "2026-05-18T09:00");
  });
});
