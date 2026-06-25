import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { UserNotificationSummary } from "@/db/notifications";
import {
  createDefaultNotificationRoutingPreferences,
  createNotificationPreferenceRoutingCenter,
  createWorkspaceNotificationChannelStatuses,
} from "@/features/notifications/notification-preference-routing";

describe("notification preference routing", () => {
  test("routes subscribed topics through quiet hours, digest previews, and recovery fallbacks", () => {
    const preferences = createDefaultNotificationRoutingPreferences({
      quietHours: {
        enabled: true,
        startHour: 18,
        endHour: 8,
        timezoneLabel: "UTC",
        digestDuringQuietHours: true,
        urgentBypassTopics: ["security"],
      },
      subscriptions: [
        {
          topic: "review",
          channels: ["in_app", "slack", "email_digest"],
          digest: true,
          muted: false,
        },
        {
          topic: "publishing",
          channels: ["in_app", "teams", "email_digest"],
          digest: true,
          muted: false,
        },
        {
          topic: "automation",
          channels: ["in_app"],
          digest: false,
          muted: true,
        },
      ],
    });
    const center = createNotificationPreferenceRoutingCenter({
      notifications: [
        createNotification({
          id: "review-1",
          type: "review.updated",
          title: "Project approval updated",
          readAt: null,
        }),
        createNotification({
          id: "publish-1",
          type: "publishing.changed",
          title: "Website published",
          readAt: null,
        }),
        createNotification({
          id: "automation-1",
          type: "automation_recipe",
          title: "Campaign cadence created",
          readAt: null,
        }),
      ],
      preferences,
      channels: [
        { channel: "in_app", configured: true },
        {
          channel: "slack",
          configured: true,
          lastFailureAt: "2026-05-18T20:55:00.000Z",
          lastFailureReason: "HTTP 500",
          retryAfterMinutes: 15,
        },
        { channel: "teams", configured: true },
        { channel: "email_digest", configured: true },
      ],
      now: "2026-05-18T21:15:00.000Z",
    });

    assert.equal(center.status, "review");
    assert.equal(center.quietHours.active, true);
    assert.equal(center.digestPreview.items.length, 2);
    assert.equal(center.digestPreview.topicCounts.review, 1);
    assert.equal(center.digestPreview.topicCounts.publishing, 1);

    const reviewRoute = center.routePlans.find(
      (route) => route.topic === "review",
    );
    assert.deepEqual(reviewRoute?.immediateChannels, ["in_app"]);
    assert.deepEqual(reviewRoute?.deferredChannels, ["email_digest", "slack"]);
    assert.equal(reviewRoute?.status, "recovery");

    const automationRoute = center.routePlans.find(
      (route) => route.topic === "automation",
    );
    assert.equal(automationRoute?.status, "muted");
    assert.deepEqual(automationRoute?.immediateChannels, []);

    assert.equal(center.failureRecovery.length, 1);
    assert.equal(center.failureRecovery[0]?.channel, "slack");
    assert.deepEqual(center.failureRecovery[0]?.fallbackChannels, [
      "in_app",
      "email_digest",
    ]);
    assert.equal(
      center.nextActions.some((action) => action.includes("Retry Slack")),
      true,
    );
  });

  test("discovers configured workspace notification channel status without exposing webhook URLs", () => {
    assert.deepEqual(
      createWorkspaceNotificationChannelStatuses({
        SLACK_WEBHOOK_URL: "https://example.com/slack",
        MICROSOFT_TEAMS_WEBHOOK_URL: "https://example.com/teams",
      }),
      [
        { channel: "in_app", configured: true },
        { channel: "email_digest", configured: true },
        { channel: "slack", configured: true },
        { channel: "teams", configured: true },
      ],
    );
  });
});

function createNotification(
  overrides: Partial<UserNotificationSummary> = {},
): UserNotificationSummary {
  return {
    id: "notification",
    type: "general",
    title: "Notification",
    body: "Body",
    targetHref: "/designs",
    readAt: null,
    createdAt: "2026-05-18T21:00:00.000Z",
    ...overrides,
  };
}
