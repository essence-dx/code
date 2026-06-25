import { strict as assert } from "node:assert";
import { createProjectCollaborationInbox } from "@/features/projects/project-collaboration-inbox";
import { defaultShareSettings, updateProjectReviewWorkflow } from "@/features/projects/share-settings";

const now = new Date("2026-05-16T08:00:00.000Z");
const reviewWorkflow = updateProjectReviewWorkflow(defaultShareSettings.reviewWorkflow, "publicLink", "requested", {
  reviewerName: "Lead",
  updatedAt: "2026-05-16T07:30:00.000Z",
});
const shareSettings = {
  ...defaultShareSettings,
  reviewWorkflow,
};

const inbox = createProjectCollaborationInbox({
  comments: [
    {
      body: "@admin please inspect the latest hero camera.",
      createdAt: "2026-05-16T07:35:00.000Z",
      id: "comment-mention",
      projectId: "project-1",
      resolvedAt: null,
      updatedAt: "2026-05-16T07:40:00.000Z",
      userId: "user-other",
    },
    {
      body: "Lighting note is handled.",
      createdAt: "2026-05-15T10:00:00.000Z",
      id: "comment-resolved",
      projectId: "project-1",
      resolvedAt: "2026-05-16T07:20:00.000Z",
      updatedAt: "2026-05-16T07:20:00.000Z",
      userId: "user-other",
    },
  ],
  currentUser: {
    email: "admin@mail.com",
    id: "admin-user",
    name: "Essence Admin",
  },
  now,
  operationBatches: [
    {
      batchId: "batch-remote-1",
      createdAt: "2026-05-16T07:50:00.000Z",
      operationCount: 6,
      projectId: "project-1",
      userEmail: "collab@example.com",
      userId: "user-other",
      userName: "Collaborator",
    },
    {
      batchId: "batch-own",
      createdAt: "2026-05-16T07:55:00.000Z",
      operationCount: 2,
      projectId: "project-1",
      userEmail: "admin@mail.com",
      userId: "admin-user",
      userName: "Essence Admin",
    },
  ],
  projects: [
    {
      archivedAt: null,
      id: "project-1",
      name: "Launch scene",
      shareSettings,
      updatedAt: "2026-05-16T07:45:00.000Z",
    },
  ],
});

assert.equal(inbox.summary.totalCount, 4);
assert.equal(inbox.summary.reviewRequestCount, 1);
assert.equal(inbox.summary.mentionCount, 1);
assert.equal(inbox.summary.remoteConflictCount, 1);
assert.equal(inbox.summary.resolvedCommentCount, 1);
assert.equal(inbox.summary.urgentCount, 1);
assert.equal(inbox.notifications[0]?.kind, "mention");
assert.ok(inbox.notifications.some((notification) => notification.kind === "remote-conflict" && notification.count === 1));

console.log("project collaboration inbox smoke passed");
