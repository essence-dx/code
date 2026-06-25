import { strict as assert } from "node:assert";
import { applyProjectHealthNotificationStates, createProjectHealthNotificationCenter, summarizeProjectHealthNotifications } from "@/features/projects/project-health-notifications";
import { createProjectHealthNotificationStateSummary } from "@/features/projects/server/project-health-notification-state-service";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import { defaultShareSettings } from "@/features/projects/share-settings";

const now = new Date("2026-05-16T10:00:00.000Z");
const center = createProjectHealthNotificationCenter({
  comments: [],
  now,
  projects: [
    {
      archivedAt: null,
      id: "project-a",
      name: "Project A",
      publishedAt: now,
      sceneData: createDefaultDocument("Project A"),
      shareSettings: defaultShareSettings,
      updatedAt: now,
    },
    {
      archivedAt: null,
      id: "project-b",
      name: "Project B",
      publishedAt: null,
      sceneData: { broken: true },
      shareSettings: defaultShareSettings,
      updatedAt: now,
    },
  ],
});

const readTarget = center.notifications.find((notification) => notification.projectId === "project-a");
const snoozeTarget = center.notifications.find((notification) => notification.projectId === "project-b" && notification.kind === "failed-export");
const dismissTarget = center.notifications.find((notification) => notification.projectId === "project-b" && notification.kind === "blocked-review");

assert.ok(readTarget, "expected a read target notification");
assert.ok(snoozeTarget, "expected a snooze target notification");
assert.ok(dismissTarget, "expected a dismiss target notification");

const readState = createProjectHealthNotificationStateSummary({
  action: "read",
  notificationId: readTarget.id,
  now,
  projectId: readTarget.projectId,
});
const dismissedState = createProjectHealthNotificationStateSummary({
  action: "dismiss",
  notificationId: dismissTarget.id,
  now,
  projectId: dismissTarget.projectId,
});
const snoozedState = createProjectHealthNotificationStateSummary({
  action: "snooze",
  notificationId: snoozeTarget.id,
  now,
  projectId: snoozeTarget.projectId,
  snoozedUntil: new Date("2026-05-17T10:00:00.000Z"),
});
const visibleCenter = applyProjectHealthNotificationStates(center, [readState, dismissedState, snoozedState], now);

assert.equal(visibleCenter.notifications.some((notification) => notification.id === dismissTarget.id), false);
assert.equal(visibleCenter.notifications.some((notification) => notification.id === snoozeTarget.id), false);
assert.equal(visibleCenter.notifications.find((notification) => notification.id === readTarget.id)?.readAt, "2026-05-16T10:00:00.000Z");
assert.equal(visibleCenter.summary.totalCount, summarizeProjectHealthNotifications(visibleCenter.notifications).totalCount);

const restoredState = createProjectHealthNotificationStateSummary({
  action: "restore",
  existing: dismissedState,
  notificationId: dismissTarget.id,
  now,
  projectId: dismissTarget.projectId,
});

assert.equal(restoredState.dismissedAt, null);
assert.equal(restoredState.readAt, null);
assert.equal(restoredState.snoozedUntil, null);

console.log("project health notification state smoke passed");
