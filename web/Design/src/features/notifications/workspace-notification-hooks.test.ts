import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  formatWorkspaceNotificationText,
  getWorkspaceNotificationTargets,
} from "@/features/notifications/workspace-notification-hooks";

describe("workspace notification hooks", () => {
  test("discovers Slack and Teams webhook targets from env", () => {
    assert.deepEqual(
      getWorkspaceNotificationTargets({
        SLACK_WEBHOOK_URL: "https://example.com/slack",
        TEAMS_WEBHOOK_URL: "https://example.com/teams",
      }),
      [
        { id: "slack", url: "https://example.com/slack" },
        { id: "teams", url: "https://example.com/teams" },
      ],
    );
  });

  test("formats concise notification text with an optional target link", () => {
    assert.equal(
      formatWorkspaceNotificationText({
        event: "publishing.changed",
        title: "Website published",
        body: "Landing page is live.",
        targetHref: "/designs",
      }),
      "Website published\nLanding page is live.\nOpen: /designs",
    );
  });
});
