import { summarizeProjectCollaborationInbox, type ProjectCollaborationInbox, type ProjectCollaborationInboxKind } from "@/features/projects/project-collaboration-inbox";
import { summarizeProjectHealthNotifications, type ProjectHealthNotification, type ProjectHealthNotificationCenter } from "@/features/projects/project-health-notifications";
import { isWorkspaceNotificationTopicEnabled } from "@/features/workspaces/notification-delivery-preferences";
import type { WorkspaceNotificationDeliveryPreference, WorkspaceNotificationTopic } from "@/features/workspaces/types";

export function getWorkspaceNotificationTopicForInboxKind(kind: ProjectCollaborationInboxKind): WorkspaceNotificationTopic {
  return kind === "review-request" ? "review" : "inbox";
}

export function getWorkspaceNotificationTopicForHealthKind(kind: ProjectHealthNotification["kind"]): WorkspaceNotificationTopic {
  switch (kind) {
    case "blocked-review":
      return "review";
    case "release-readiness":
      return "release";
    case "failed-export":
    case "missing-assets":
    case "stale-comments":
      return "health";
  }
}

export function applyCollaborationInboxDeliveryPreferences(
  inbox: ProjectCollaborationInbox,
  preferences: WorkspaceNotificationDeliveryPreference[],
): ProjectCollaborationInbox {
  const notifications = inbox.notifications.filter((notification) => isWorkspaceNotificationTopicEnabled(preferences, getWorkspaceNotificationTopicForInboxKind(notification.kind), "inApp"));

  return {
    ...inbox,
    notifications,
    summary: summarizeProjectCollaborationInbox(notifications),
  };
}

export function applyProjectHealthDeliveryPreferences(
  center: ProjectHealthNotificationCenter,
  preferences: WorkspaceNotificationDeliveryPreference[],
): ProjectHealthNotificationCenter {
  const notifications = center.notifications.filter((notification) => isWorkspaceNotificationTopicEnabled(preferences, getWorkspaceNotificationTopicForHealthKind(notification.kind), "inApp"));

  return {
    ...center,
    notifications,
    summary: summarizeProjectHealthNotifications(notifications),
  };
}
