import { workspaceNotificationTopics, type WorkspaceNotificationDeliveryPreference, type WorkspaceNotificationTopic } from "@/features/workspaces/types";

export interface WorkspaceNotificationDeliveryTopicCopy {
  description: string;
  label: string;
  topic: WorkspaceNotificationTopic;
}

export const workspaceNotificationDeliveryTopicCopy: WorkspaceNotificationDeliveryTopicCopy[] = [
  {
    description: "Mentions, resolved comments, and remote collaboration review batches.",
    label: "Inbox",
    topic: "inbox",
  },
  {
    description: "Project health alerts for failed exports, stale comments, and missing assets.",
    label: "Health",
    topic: "health",
  },
  {
    description: "Review requests and blocked approval gates before publishing.",
    label: "Review",
    topic: "review",
  },
  {
    description: "Release readiness, app package, desktop handoff, and post-deploy events.",
    label: "Release",
    topic: "release",
  },
];

const topicSet = new Set<WorkspaceNotificationTopic>(workspaceNotificationTopics);

export function createDefaultWorkspaceNotificationDeliveryPreferences(): WorkspaceNotificationDeliveryPreference[] {
  return workspaceNotificationTopics.map((topic) => ({
    emailEnabled: false,
    inAppEnabled: true,
    topic,
  }));
}

export function normalizeWorkspaceNotificationDeliveryPreferences(
  preferences: Partial<WorkspaceNotificationDeliveryPreference>[],
): WorkspaceNotificationDeliveryPreference[] {
  const defaults = createDefaultWorkspaceNotificationDeliveryPreferences();
  const byTopic = new Map<WorkspaceNotificationTopic, WorkspaceNotificationDeliveryPreference>();

  for (const preference of preferences) {
    if (!preference.topic || !topicSet.has(preference.topic)) {
      continue;
    }

    byTopic.set(preference.topic, {
      emailEnabled: Boolean(preference.emailEnabled),
      inAppEnabled: preference.inAppEnabled ?? true,
      topic: preference.topic,
    });
  }

  return defaults.map((preference) => byTopic.get(preference.topic) ?? preference);
}

export function isWorkspaceNotificationTopicEnabled(
  preferences: WorkspaceNotificationDeliveryPreference[],
  topic: WorkspaceNotificationTopic,
  channel: "email" | "inApp",
) {
  const normalized = normalizeWorkspaceNotificationDeliveryPreferences(preferences);
  const preference = normalized.find((entry) => entry.topic === topic);

  return channel === "email" ? Boolean(preference?.emailEnabled) : preference?.inAppEnabled !== false;
}

export function summarizeWorkspaceNotificationDeliveryPreferences(preferences: WorkspaceNotificationDeliveryPreference[]) {
  const normalized = normalizeWorkspaceNotificationDeliveryPreferences(preferences);

  return {
    emailEnabledCount: normalized.filter((preference) => preference.emailEnabled).length,
    inAppEnabledCount: normalized.filter((preference) => preference.inAppEnabled).length,
    totalCount: normalized.length,
  };
}
