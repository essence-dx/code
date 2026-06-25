import assert from "node:assert/strict";

import {
  countQueuedPublicInteractionsOutsideScope,
  countReviewableStaleQueuedPublicInteractions,
  describePublicInteractionBulkReplayToast,
  describePublicInteractionBulkSyncConfirmationCopy,
  describePublicInteractionQueueErrorSummary,
  describePublicInteractionQueueFailedReviewStatus,
  describePublicInteractionQueueReadinessHint,
  describePublicInteractionQueueReviewSummary,
  describePublicInteractionQueueReviewStatus,
  describePublicInteractionQueueRecoveryHint,
  describePublicInteractionQueueSyncHint,
  describePublicInteractionReplaySummary,
  describeQueuedPublicInteractionActionLabels,
  describeQueuedPublicInteractionAgeStatus,
  describeQueuedPublicInteractionErrorStatus,
  describeQueuedPublicInteractionLastAttempt,
  describeQueuedPublicInteractionReviewedRetryStatus,
  describeQueuedPublicInteractionRetryAction,
  describeQueuedPublicInteractionRetryToast,
  describeQueuedPublicInteractionTarget,
  getPublicInteractionQueueMembershipKey,
  groupQueuedPublicInteractions,
  hasSyncedPublicCommentsForScope,
  listQueuedPublicInteractions,
  queuePublicComment,
  queuePublicSocialAction,
  replayQueuedPublicInteractions,
  shouldGuardPublicInteractionBulkReplay,
  shouldResetPublicInteractionReviewAfterBulkSync,
  updateQueuedPublicCommentBody,
} from "../src/features/social/public-interaction-queue";
import {
  makeFailedQueuedInteraction,
  makeReplaySummary,
  makeSyncedQueuedComment,
  makeSyncedQueuedSocialAction,
} from "./test-fixtures/public-interaction-queue";

type StoredValue = string | null;

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): StoredValue {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  clear() {
    this.values.clear();
  }
}

const eventTarget = new EventTarget();
const localStorage = new MemoryStorage();
const staleNow = 24 * 60 * 60 * 1000 + 60_000;

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    addEventListener: eventTarget.addEventListener.bind(eventTarget),
    dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
    localStorage,
    removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
  } as unknown as Window,
});

localStorage.clear();

const firstLike = queuePublicSocialAction({
  socialKind: "like",
  targetId: "song-a",
  targetType: "song",
});
const duplicateLike = queuePublicSocialAction({
  socialKind: "like",
  targetId: "song-a",
  targetType: "song",
});

assert.equal(firstLike.id, duplicateLike.id);
assert.equal(listQueuedPublicInteractions().length, 1);

const comment = queuePublicComment({
  body: "first draft",
  targetId: "song-a",
  targetType: "song",
});
const editedComment = updateQueuedPublicCommentBody(comment.id, " polished draft ");

assert.equal(editedComment?.body, "polished draft");

queuePublicComment({
  body: "other target",
  targetId: "song-b",
  targetType: "song",
});
queuePublicSocialAction({
  socialKind: "follow",
  targetId: "song-b",
  targetType: "song",
});
queuePublicSocialAction({
  socialKind: "repost",
  targetId: "song-b",
  targetType: "song",
});

assert.deepEqual(
  groupQueuedPublicInteractions(
    listQueuedPublicInteractions(),
    staleNow,
  ).map((group) => ({
    count: group.items.length,
    failedCount: group.failedCount,
    id: group.id,
    staleCount: group.staleCount,
  })),
  [
    { count: 2, failedCount: 0, id: "comments", staleCount: 0 },
    { count: 1, failedCount: 0, id: "likes", staleCount: 0 },
    { count: 1, failedCount: 0, id: "follows", staleCount: 0 },
    { count: 1, failedCount: 0, id: "reposts", staleCount: 0 },
  ],
);
assert.deepEqual(
  groupQueuedPublicInteractions(
    [
      duplicateLike,
      {
        ...firstLike,
        id: "failed-like",
        lastError: "Sync failed",
      },
    ],
    staleNow,
  ).map((group) => ({
    count: group.items.length,
    failedCount: group.failedCount,
    id: group.id,
    itemIds: group.items.map((item) => item.id),
    staleCount: group.staleCount,
  })),
  [
    {
      count: 2,
      failedCount: 1,
      id: "likes",
      itemIds: ["failed-like", duplicateLike.id],
      staleCount: 0,
    },
  ],
);
assert.deepEqual(
  groupQueuedPublicInteractions(
    [
      duplicateLike,
      {
        ...firstLike,
        createdAt: 0,
        id: "stale-like",
      },
    ],
    staleNow,
  ).map((group) => ({
    count: group.items.length,
    failedCount: group.failedCount,
    id: group.id,
    itemIds: group.items.map((item) => item.id),
    staleCount: group.staleCount,
  })),
  [
    {
      count: 2,
      failedCount: 0,
      id: "likes",
      itemIds: ["stale-like", duplicateLike.id],
      staleCount: 1,
    },
  ],
);
assert.equal(describeQueuedPublicInteractionTarget(firstLike), "Song song-a");
assert.equal(
  describeQueuedPublicInteractionTarget({
    ...firstLike,
    targetId: "song-with-a-very-long-id",
  }),
  "Song song-wit...g-id",
);
assert.deepEqual(
  describeQueuedPublicInteractionAgeStatus({
    item: firstLike,
    now: firstLike.createdAt,
  }),
  {
    age: "just now",
    label: "Queued just now.",
    reviewText: null,
    stale: false,
  },
);
assert.deepEqual(
  describeQueuedPublicInteractionAgeStatus({
    item: {
      ...firstLike,
      createdAt: 0,
      id: "age-stale-like",
    },
    now: staleNow,
  }),
  {
    age: "1d ago",
    label: "Queued 1d ago. Review before syncing.",
    reviewText: "Review before syncing",
    stale: true,
  },
);
assert.equal(
  describePublicInteractionQueueRecoveryHint({
    online: false,
    pendingCount: 2,
  }),
  "Reconnect to sync 2 public actions. You can still edit or discard them.",
);
assert.equal(
  describePublicInteractionQueueRecoveryHint({
    online: true,
    pendingCount: 2,
  }),
  null,
);
assert.equal(
  describePublicInteractionQueueReadinessHint({
    online: true,
    pendingCount: 1,
  }),
  "1 public action is ready to sync.",
);
assert.equal(
  describePublicInteractionQueueReadinessHint({
    online: false,
    pendingCount: 1,
  }),
  null,
);
assert.equal(
  describePublicInteractionQueueSyncHint({
    pendingCount: 3,
    replaying: true,
    replayingId: null,
  }),
  "Syncing 3 public actions.",
);
assert.equal(
  describePublicInteractionQueueSyncHint({
    pendingCount: 3,
    replaying: false,
    replayingId: firstLike.id,
  }),
  "Syncing 1 public action.",
);
assert.equal(
  describePublicInteractionQueueSyncHint({
    pendingCount: 3,
    replaying: false,
    replayingId: null,
  }),
  null,
);
assert.equal(
  describePublicInteractionQueueErrorSummary([
    {
      ...firstLike,
      lastError: "Sync failed",
    },
    duplicateLike,
  ]),
  "1 public action needs attention after retry failed.",
);
assert.equal(describePublicInteractionQueueErrorSummary([duplicateLike]), null);
assert.equal(
  describePublicInteractionQueueFailedReviewStatus({
    failedCount: 1,
    now: 3_660_000,
    reviewedAt: 60_000,
  }),
  "Reviewed 1h ago before retry.",
);
assert.equal(
  describePublicInteractionQueueFailedReviewStatus({
    failedCount: 1,
    reviewedAt: null,
  }),
  null,
);
assert.equal(
  describePublicInteractionQueueFailedReviewStatus({
    failedCount: 0,
    reviewedAt: 60_000,
  }),
  null,
);
assert.equal(
  describePublicInteractionQueueReviewSummary(
    [
      {
        ...firstLike,
        createdAt: 0,
        id: "stale-like",
      },
      {
        ...duplicateLike,
        createdAt: 0,
        lastError: "Sync failed",
      },
    ],
    staleNow,
  ),
  "1 public action is stale and should be reviewed before syncing.",
);
assert.equal(
  describePublicInteractionQueueReviewSummary([duplicateLike], staleNow),
  null,
);
assert.equal(
  countReviewableStaleQueuedPublicInteractions(
    [
      { ...firstLike, createdAt: 0, id: "stale-like" },
      { ...duplicateLike, createdAt: 0, lastError: "Sync failed" },
    ],
    staleNow,
  ),
  1,
);
const staleQueuedLike = {
  ...firstLike,
  createdAt: 0,
  id: "review-gated-like",
};
assert.equal(
  shouldGuardPublicInteractionBulkReplay({
    items: [staleQueuedLike],
    now: staleNow,
    reviewed: false,
  }),
  true,
);
assert.equal(
  shouldGuardPublicInteractionBulkReplay({
    items: [staleQueuedLike],
    now: staleNow,
    reviewed: true,
  }),
  false,
);
assert.equal(
  shouldGuardPublicInteractionBulkReplay({
    items: [{ ...staleQueuedLike, lastError: "Sync failed" }],
    now: staleNow,
    reviewed: false,
  }),
  false,
);
assert.equal(
  describePublicInteractionQueueReviewStatus(null, staleNow),
  "Review pending",
);
assert.equal(
  describePublicInteractionQueueReviewStatus(60_000, 3_660_000),
  "Reviewed 1h ago",
);
assert.equal(
  describePublicInteractionBulkSyncConfirmationCopy({
    pendingCount: 0,
    reviewedStaleCount: 0,
  }),
  "No pending public actions to sync.",
);
assert.equal(
  describePublicInteractionBulkSyncConfirmationCopy({
    pendingCount: 2,
    reviewedStaleCount: 0,
  }),
  "Sync 2 public actions.",
);
assert.equal(
  describePublicInteractionBulkSyncConfirmationCopy({
    pendingCount: 3,
    reviewedStaleCount: 1,
  }),
  "Sync 3 public actions, including 1 reviewed stale action.",
);
assert.equal(
  shouldResetPublicInteractionReviewAfterBulkSync({
    failed: 0,
    reviewedAt: staleNow,
    reviewedStaleCount: 1,
  }),
  true,
);
assert.equal(
  shouldResetPublicInteractionReviewAfterBulkSync({
    failed: 1,
    reviewedAt: staleNow,
    reviewedStaleCount: 1,
  }),
  false,
);
assert.equal(
  shouldResetPublicInteractionReviewAfterBulkSync({
    failed: 0,
    reviewedAt: null,
    reviewedStaleCount: 1,
  }),
  false,
);
assert.equal(
  describeQueuedPublicInteractionRetryAction({
    item: {
      ...staleQueuedLike,
      lastAttemptAt: staleNow + 10_000,
      lastError: "Sync failed",
    },
    online: true,
    reviewedAt: staleNow,
  }),
  "Retry this reviewed stale action",
);
assert.equal(
  describeQueuedPublicInteractionRetryAction({
    item: {
      ...staleQueuedLike,
      lastAttemptAt: staleNow - 10_000,
      lastError: "Sync failed",
    },
    online: true,
    reviewedAt: staleNow,
  }),
  "Retry this action",
);
assert.equal(
  describeQueuedPublicInteractionRetryAction({
    item: staleQueuedLike,
    online: false,
    reviewedAt: staleNow,
  }),
  "Reconnect to sync this action",
);
assert.deepEqual(
  describeQueuedPublicInteractionActionLabels({
    item: comment,
    online: true,
    reviewedAt: null,
  }),
  {
    discard: "Discard comment",
    edit: "Edit comment",
    retry: "Retry action",
    retryAriaLabel: "Retry this action: queued comment",
    retryTitle: "Retry this action",
  },
);
assert.deepEqual(
  describeQueuedPublicInteractionActionLabels({
    item: {
      ...staleQueuedLike,
      lastAttemptAt: staleNow + 10_000,
      lastError: "Sync failed",
    },
    online: true,
    reviewedAt: staleNow,
  }),
  {
    discard: "Discard like",
    edit: null,
    retry: "Retry reviewed",
    retryAriaLabel: "Retry this reviewed stale action: queued like",
    retryTitle: "Retry this reviewed stale action",
  },
);
assert.deepEqual(
  describeQueuedPublicInteractionActionLabels({
    item: firstLike,
    online: false,
    reviewedAt: staleNow,
  }),
  {
    discard: "Discard like",
    edit: null,
    retry: "Retry action",
    retryAriaLabel: "Reconnect to sync this action: queued like",
    retryTitle: "Reconnect to sync this action",
  },
);
assert.equal(
  describeQueuedPublicInteractionRetryToast({
    failed: true,
    item: {
      ...staleQueuedLike,
      lastAttemptAt: staleNow + 10_000,
      lastError: "Sync failed",
    },
    message: "1 action still needs attention.",
    reviewedAt: staleNow,
  }),
  "Sync failed. Reviewed stale action still needs attention.",
);
assert.equal(
  describeQueuedPublicInteractionRetryToast({
    failed: true,
    item: {
      ...firstLike,
      lastAttemptAt: staleNow + 10_000,
      lastError: "Sync failed",
    },
    message: "1 action still needs attention.",
    reviewedAt: staleNow,
  }),
  "Sync failed",
);
assert.equal(
  describeQueuedPublicInteractionRetryToast({
    failed: false,
    item: {
      ...staleQueuedLike,
      lastAttemptAt: staleNow + 10_000,
      lastError: "Sync failed",
    },
    message: "1 action synced.",
    reviewedAt: staleNow,
  }),
  "1 action synced. Reviewed stale action synced after review.",
);
assert.equal(
  describeQueuedPublicInteractionRetryToast({
    failed: false,
    item: staleQueuedLike,
    message: "1 action synced.",
    reviewedAt: staleNow,
  }),
  "1 action synced.",
);
assert.equal(
  describeQueuedPublicInteractionReviewedRetryStatus({
    item: {
      ...staleQueuedLike,
      lastAttemptAt: staleNow + 10_000,
      lastError: "Sync failed",
    },
    now: staleNow + 60_000,
    reviewedAt: staleNow,
  }),
  "Reviewed 1m ago before this retry.",
);
assert.equal(
  describeQueuedPublicInteractionReviewedRetryStatus({
    item: staleQueuedLike,
    now: staleNow + 60_000,
    reviewedAt: staleNow,
  }),
  null,
);
assert.equal(
  getPublicInteractionQueueMembershipKey([
    { ...comment, body: "first draft" },
    firstLike,
  ]),
  getPublicInteractionQueueMembershipKey([
    { ...comment, body: "edited draft" },
    firstLike,
  ]),
);
assert.notEqual(
  getPublicInteractionQueueMembershipKey([
    { ...comment, body: "first draft" },
    firstLike,
  ]),
  getPublicInteractionQueueMembershipKey([
    { ...comment, body: "first draft", id: "new-comment" },
    firstLike,
  ]),
);
assert.equal(
  describeQueuedPublicInteractionLastAttempt(
    {
      ...firstLike,
      lastAttemptAt: 60_000,
      lastError: "Sync failed",
    },
    3_660_000,
  ),
  "Last attempted 1h ago.",
);
assert.equal(
  describeQueuedPublicInteractionLastAttempt({
    ...firstLike,
    lastAttemptAt: 60_000,
  }),
  null,
);
assert.deepEqual(
  describeQueuedPublicInteractionErrorStatus({
    item: makeFailedQueuedInteraction(firstLike, "Sync failed", {
      lastAttemptAt: 60_000,
    }),
    now: 3_660_000,
  }),
  {
    error: "Sync failed",
    lastAttempt: "Last attempted 1h ago.",
  },
);
assert.equal(
  describeQueuedPublicInteractionErrorStatus({
    item: firstLike,
    now: 3_660_000,
  }),
  null,
);

const summary = await replayQueuedPublicInteractions({
  request: async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      kind?: string;
      targetId: string;
    };

    if (url === "/api/comments") {
      return Response.json({
        comment: {
          authorId: "user-a",
          authorName: "Tester",
          body: "polished draft",
          createdAt: new Date(0).toISOString(),
          id: `comment-${body.targetId}`,
          parentId: null,
          status: "visible",
          targetId: body.targetId,
          targetType: "song",
          updatedAt: new Date(0).toISOString(),
        },
      });
    }

    if (url === "/api/social/actions") {
      return Response.json({
        active: true,
        counts: {
          follow: 0,
          like: 1,
          repost: 0,
        },
      });
    }

    return Response.json({ error: "Unexpected request" }, { status: 500 });
  },
  scope: {
    targetId: "song-a",
    targetType: "song",
  },
});

assert.equal(summary.total, 2);
assert.equal(summary.synced, 2);
assert.equal(summary.failed, 0);
assert.equal(summary.syncedItems.length, 2);
assert.equal(
  describePublicInteractionReplaySummary(summary),
  "1 comment and 1 action synced.",
);
assert.equal(
  describePublicInteractionReplaySummary(
    makeReplaySummary({
      failedItems: [makeFailedQueuedInteraction(duplicateLike, "Sync failed")],
    }),
  ),
  "1 action still needs attention.",
);
assert.equal(
  describePublicInteractionBulkReplayToast(
    makeReplaySummary({
      failedItems: [makeFailedQueuedInteraction(duplicateLike, "Sync failed")],
    }),
  ),
  "Sync failed. 1 action still needs attention.",
);
assert.equal(
  describePublicInteractionBulkReplayToast(
    makeReplaySummary({
      failedItems: [
        makeFailedQueuedInteraction(duplicateLike, "Sync failed"),
        makeFailedQueuedInteraction(comment, "Rate limited"),
      ],
    }),
  ),
  "Sync failed. 1 comment and 1 action still need attention.",
);
assert.equal(
  describePublicInteractionBulkReplayToast(
    makeReplaySummary({
      failedItems: [makeFailedQueuedInteraction(duplicateLike)],
    }),
  ),
  "1 action still needs attention.",
);
const defaultFailedQueuedLike = makeFailedQueuedInteraction(duplicateLike);
assert.equal(defaultFailedQueuedLike.lastAttemptAt, undefined);
const mixedBulkToastSummary = makeReplaySummary({
  failedItems: [makeFailedQueuedInteraction(duplicateLike, "Sync failed")],
  syncedItems: [makeSyncedQueuedComment(comment)],
});
assert.equal(mixedBulkToastSummary.total, 2);
assert.equal(
  describePublicInteractionBulkReplayToast(mixedBulkToastSummary),
  "Sync failed. 1 comment synced. 1 action still needs attention.",
);
assert.equal(
  describePublicInteractionBulkReplayToast(summary),
  "1 comment and 1 action synced.",
);
assert.equal(
  describePublicInteractionBulkReplayToast(
    makeReplaySummary({
      syncedItems: [makeSyncedQueuedSocialAction(duplicateLike)],
    }),
  ),
  "1 action synced.",
);
assert.equal(
  describePublicInteractionBulkReplayToast(makeReplaySummary({})),
  "No pending public actions to sync.",
);
assert.equal(
  hasSyncedPublicCommentsForScope(summary, {
    targetId: "song-a",
    targetType: "song",
  }),
  true,
);
assert.equal(
  hasSyncedPublicCommentsForScope(summary, {
    targetId: "song-b",
    targetType: "song",
  }),
  false,
);
assert.deepEqual(
  listQueuedPublicInteractions().map((item) => item.targetId),
  ["song-b", "song-b", "song-b"],
);
assert.equal(
  countQueuedPublicInteractionsOutsideScope({
    targetId: "song-a",
    targetType: "song",
  }),
  3,
);
assert.equal(
  countQueuedPublicInteractionsOutsideScope({
    targetId: "song-b",
    targetType: "song",
  }),
  0,
);

console.log("public interaction queue tests passed");
