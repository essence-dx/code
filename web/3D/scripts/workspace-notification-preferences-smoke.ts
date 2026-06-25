import { strict as assert } from "node:assert";
import { applyCollaborationInboxDeliveryPreferences, applyProjectHealthDeliveryPreferences } from "@/features/projects/project-notification-delivery";
import { summarizeProjectCollaborationInbox, type ProjectCollaborationInbox } from "@/features/projects/project-collaboration-inbox";
import { summarizeProjectHealthNotifications, type ProjectHealthNotificationCenter } from "@/features/projects/project-health-notifications";
import {
  createDefaultWorkspaceNotificationDeliveryPreferences,
  normalizeWorkspaceNotificationDeliveryPreferences,
  summarizeWorkspaceNotificationDeliveryPreferences,
} from "@/features/workspaces/notification-delivery-preferences";

const generatedAt = "2026-05-16T14:00:00.000Z";
const inbox: ProjectCollaborationInbox = {
  generatedAt,
  notifications: [
    {
      actionLabel: "Open comment",
      count: 1,
      id: "project-1:mention",
      kind: "mention",
      message: "One open comment mentions you.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "urgent",
      title: "Mentioned in comments",
      updatedAt: generatedAt,
    },
    {
      actionLabel: "Review request",
      count: 1,
      id: "project-1:review-request",
      kind: "review-request",
      message: "Public link is waiting for approval.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "warning",
      title: "Review requested",
      updatedAt: generatedAt,
    },
    {
      actionLabel: "Review remote changes",
      count: 2,
      id: "project-1:remote-conflict",
      kind: "remote-conflict",
      message: "Two remote batches may need review.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "info",
      title: "Remote collaboration review",
      updatedAt: generatedAt,
    },
  ],
  summary: summarizeProjectCollaborationInbox([]),
};
inbox.summary = summarizeProjectCollaborationInbox(inbox.notifications);

const healthCenter: ProjectHealthNotificationCenter = {
  generatedAt,
  notifications: [
    {
      actionLabel: "Check export readiness",
      count: 1,
      id: "project-1:failed-export",
      kind: "failed-export",
      message: "GLB needs export review.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "critical",
      title: "Export failed",
      updatedAt: generatedAt,
    },
    {
      actionLabel: "Open review workflow",
      count: 1,
      id: "project-1:blocked-review",
      kind: "blocked-review",
      message: "Public link is not approved.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "warning",
      title: "Blocked review gates",
      updatedAt: generatedAt,
    },
    {
      actionLabel: "Prepare release",
      count: 1,
      id: "project-1:release-readiness",
      kind: "release-readiness",
      message: "Desktop release must be approved.",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "warning",
      title: "Release readiness blocked",
      updatedAt: generatedAt,
    },
  ],
  summary: summarizeProjectHealthNotifications([]),
};
healthCenter.summary = summarizeProjectHealthNotifications(healthCenter.notifications);

const defaultPreferences = createDefaultWorkspaceNotificationDeliveryPreferences();
const normalizedPreferences = normalizeWorkspaceNotificationDeliveryPreferences([
  { emailEnabled: true, inAppEnabled: false, topic: "inbox" },
  { emailEnabled: true, inAppEnabled: false, topic: "review" },
]);
const preferenceSummary = summarizeWorkspaceNotificationDeliveryPreferences(normalizedPreferences);

assert.equal(defaultPreferences.length, 4);
assert.equal(preferenceSummary.emailEnabledCount, 2);
assert.equal(preferenceSummary.inAppEnabledCount, 2);

const filteredInbox = applyCollaborationInboxDeliveryPreferences(inbox, normalizedPreferences);
assert.equal(filteredInbox.summary.totalCount, 0);
assert.equal(filteredInbox.notifications.length, 0);

const filteredHealth = applyProjectHealthDeliveryPreferences(healthCenter, normalizedPreferences);
assert.equal(filteredHealth.summary.totalCount, 2);
assert.equal(filteredHealth.summary.failedExportCount, 1);
assert.equal(filteredHealth.summary.releaseReadinessCount, 1);
assert.equal(filteredHealth.notifications.some((notification) => notification.kind === "blocked-review"), false);

const releaseMutedPreferences = normalizeWorkspaceNotificationDeliveryPreferences([{ emailEnabled: false, inAppEnabled: false, topic: "release" }]);
const releaseMutedHealth = applyProjectHealthDeliveryPreferences(healthCenter, releaseMutedPreferences);

assert.equal(releaseMutedHealth.summary.releaseReadinessCount, 0);
assert.equal(releaseMutedHealth.summary.totalCount, 2);

console.log("workspace notification preferences smoke passed");
