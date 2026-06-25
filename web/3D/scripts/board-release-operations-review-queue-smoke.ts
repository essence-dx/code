import assert from "node:assert/strict";
import type { BoardReleaseOperationsHistoryReport } from "@/features/projects/board-release-operations-history";
import { createBoardReleaseOperationsReviewQueueReport } from "@/features/projects/board-release-operations-review-queue";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

const generatedAt = "2026-05-22T10:00:00.000Z";

const members: WorkspaceMemberRow[] = [
  {
    email: "owner@example.com",
    id: "member-owner",
    joinedAt: generatedAt,
    name: "Workspace Owner",
    role: "owner",
    userId: "user-owner",
  },
  {
    email: "admin@example.com",
    id: "member-admin",
    joinedAt: generatedAt,
    name: "Release Admin",
    role: "admin",
    userId: "user-admin",
  },
];

const history = {
  generatedAt,
  records: [
    {
      archiveHash: "sha256:archive-hash",
      archivedAt: "2026-05-20T10:00:00.000Z",
      gateScore: 72,
      historyHash: "sha256:history-hash",
      historyId: "board-release-operations-history:workspace-board:release-2026-05-20:20260522",
      notificationEligibleRouteCount: 6,
      notificationSuppressedCount: 1,
      promotionAllowed: false,
      recordedAt: generatedAt,
      releasePromotionId: "release-2026-05-20",
      status: "blocked",
      varianceBlockerCount: 2,
      varianceCount: 4,
      workspaceId: "workspace-board",
    },
    {
      archiveHash: "sha256:archive-watch",
      archivedAt: "2026-05-21T10:00:00.000Z",
      gateScore: 88,
      historyHash: "sha256:history-watch",
      historyId: "board-release-operations-history:workspace-board:release-2026-05-21:20260522",
      notificationEligibleRouteCount: 3,
      notificationSuppressedCount: 0,
      promotionAllowed: true,
      recordedAt: generatedAt,
      releasePromotionId: "release-2026-05-21",
      status: "watch",
      varianceBlockerCount: 0,
      varianceCount: 1,
      workspaceId: "workspace-board",
    },
  ],
  summary: {
    archivedCount: 0,
    blockedCount: 1,
    historyCount: 2,
    latestHistoryHash: "sha256:history-hash",
    latestReleasePromotionId: "release-2026-05-20",
    nextAction: "Resolve blocked board release operations before promotion.",
    readyCount: 0,
    status: "blocked",
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseOperationsHistoryReport;

const queue = createBoardReleaseOperationsReviewQueueReport({
  generatedAt,
  history,
  members,
  workspaceId: "workspace-board",
});

assert.equal(queue.summary.status, "blocked");
assert.equal(queue.summary.queueCount, 2);
assert.equal(queue.summary.blockedCount, 1);
assert.equal(queue.summary.inReviewCount, 1);
assert.equal(queue.summary.nextAction, "Resolve blocked board release operations before promotion.");
assert.equal(queue.items[0]?.ownerName, "Workspace Owner");
assert.equal(queue.items[0]?.dueAt, "2026-05-23T10:00:00.000Z");
assert.equal(queue.items[0]?.closeoutTransition, "needs-review");
assert.equal(queue.items[1]?.ownerName, "Release Admin");
assert.equal(queue.items[1]?.dueAt, "2026-05-24T10:00:00.000Z");
assert.equal(queue.items[1]?.closeoutTransition, "in-review");
assert.match(queue.csvContent, /queue_id,release_promotion_id,status,owner,due_at,closeout_transition,history_hash,next_action/);
assert.match(queue.jsonContent, /"closeoutTransition": "needs-review"/);
assert.equal(queue.csvFileName, "workspace-board-board-release-operations-review-queue-20260522.csv");
assert.equal(queue.jsonFileName, "workspace-board-board-release-operations-review-queue-20260522.json");

console.log("board release operations review queue smoke passed");
