import type {
  PublicInteractionReplaySummary,
  QueuedPublicComment,
  QueuedPublicInteraction,
  QueuedPublicSocialAction,
  SyncedQueuedPublicComment,
  SyncedQueuedPublicInteraction,
  SyncedQueuedPublicSocialAction,
} from "../../src/features/social/public-interaction-queue";

export function makeFailedQueuedInteraction(
  item: QueuedPublicInteraction,
  lastError?: string,
  options: {
    lastAttemptAt?: number;
  } = {},
): QueuedPublicInteraction {
  const lastAttempt =
    lastError || typeof options.lastAttemptAt === "number"
      ? { lastAttemptAt: options.lastAttemptAt ?? 0 }
      : {};

  return {
    ...item,
    ...lastAttempt,
    ...(lastError ? { lastError } : {}),
  };
}

export function makeSyncedQueuedComment(
  item: QueuedPublicComment,
): SyncedQueuedPublicComment {
  return {
    comment: {
      authorId: "user-a",
      authorName: "Tester",
      body: item.body,
      createdAt: new Date(0).toISOString(),
      id: `comment-${item.targetId}`,
      parentId: null,
      status: "visible",
      targetId: item.targetId,
      targetType: item.targetType,
      updatedAt: new Date(0).toISOString(),
    },
    item,
    kind: "comment",
  };
}

export function makeSyncedQueuedSocialAction(
  item: QueuedPublicSocialAction,
): SyncedQueuedPublicSocialAction {
  return {
    active: true,
    counts: {
      follow: item.socialKind === "follow" ? 1 : 0,
      like: item.socialKind === "like" ? 1 : 0,
      repost: item.socialKind === "repost" ? 1 : 0,
    },
    item,
    kind: "social",
  };
}

export function makeReplaySummary({
  failedItems = [],
  syncedItems = [],
}: {
  failedItems?: QueuedPublicInteraction[];
  syncedItems?: SyncedQueuedPublicInteraction[];
}): PublicInteractionReplaySummary {
  return {
    failed: failedItems.length,
    failedItems,
    synced: syncedItems.length,
    syncedItems,
    total: failedItems.length + syncedItems.length,
  };
}
