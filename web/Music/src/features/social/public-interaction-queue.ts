"use client";

import type { PublicCommentRow, PublicCommentTargetType } from "@/lib/comments";
import type { SocialCounts, SocialTargetType } from "@/lib/social";

export type QueuedPublicComment = {
  body: string;
  createdAt: number;
  id: string;
  kind: "comment";
  lastAttemptAt?: number;
  lastError?: string;
  parentId?: string;
  targetId: string;
  targetType: PublicCommentTargetType;
};

export type QueuedPublicSocialAction = {
  createdAt: number;
  id: string;
  kind: "social";
  lastAttemptAt?: number;
  lastError?: string;
  socialKind: "follow" | "like" | "repost";
  targetId: string;
  targetType: SocialTargetType;
};

export type QueuedPublicInteraction =
  | QueuedPublicComment
  | QueuedPublicSocialAction;

export type PublicInteractionReplayScope = {
  targetId: string;
  targetType: PublicCommentTargetType;
};

export type SyncedQueuedPublicComment = {
  comment: PublicCommentRow;
  item: QueuedPublicComment;
  kind: "comment";
};

export type SyncedQueuedPublicSocialAction = {
  active: boolean;
  counts: SocialCounts;
  item: QueuedPublicSocialAction;
  kind: "social";
};

export type SyncedQueuedPublicInteraction =
  | SyncedQueuedPublicComment
  | SyncedQueuedPublicSocialAction;

export type PublicInteractionReplaySummary = {
  failed: number;
  failedItems: QueuedPublicInteraction[];
  synced: number;
  syncedItems: SyncedQueuedPublicInteraction[];
  total: number;
};

export type QueuedPublicInteractionGroup = {
  failedCount: number;
  id: "comments" | "follows" | "likes" | "reposts";
  items: QueuedPublicInteraction[];
  label: string;
  staleCount: number;
};

type QueuedReplayResult =
  | {
      ok: true;
      syncedItem: SyncedQueuedPublicInteraction;
    }
  | {
      error: string;
      ok: false;
    };

type ReplayQueuedPublicInteractionsOptions = {
  request?: typeof fetch;
  scope?: PublicInteractionReplayScope;
};

const queueKey = "essence.public-interaction-queue.v1";
const queueChangedEvent = "essence-public-interaction-queue:changed";
const queueReplayedEvent = "essence-public-interaction-queue:replayed";
const staleQueueAgeMs = 24 * 60 * 60 * 1000;

export function listQueuedPublicInteractions(): QueuedPublicInteraction[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(queueKey);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed.filter(isQueuedInteraction) : [];
  } catch {
    return [];
  }
}

export function queuePublicComment(
  input: Omit<
    QueuedPublicComment,
    "createdAt" | "id" | "kind" | "lastAttemptAt" | "lastError"
  >,
) {
  const item: QueuedPublicComment = {
    ...input,
    createdAt: Date.now(),
    id: createQueueId(),
    kind: "comment",
  };

  writeQueue([...listQueuedPublicInteractions(), item]);
  return item;
}

export function queuePublicSocialAction(
  input: Omit<
    QueuedPublicSocialAction,
    "createdAt" | "id" | "kind" | "lastAttemptAt" | "lastError"
  >,
) {
  const currentItems = listQueuedPublicInteractions();
  const existingItem = currentItems.find(
    (item): item is QueuedPublicSocialAction =>
      item.kind === "social" &&
      item.socialKind === input.socialKind &&
      item.targetId === input.targetId &&
      item.targetType === input.targetType,
  );

  if (existingItem) {
    const refreshedItem = {
      ...existingItem,
      createdAt: Date.now(),
      lastAttemptAt: undefined,
      lastError: undefined,
    };
    replaceQueuedPublicInteraction(refreshedItem);

    return refreshedItem;
  }

  const item: QueuedPublicSocialAction = {
    ...input,
    createdAt: Date.now(),
    id: createQueueId(),
    kind: "social",
  };

  writeQueue([...listQueuedPublicInteractions(), item]);
  return item;
}

export function updateQueuedPublicCommentBody(
  id: string,
  body: string,
): QueuedPublicComment | null {
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return null;
  }

  let updatedItem: QueuedPublicComment | null = null;
  const nextItems = listQueuedPublicInteractions().map((item) => {
    if (item.id !== id || item.kind !== "comment") {
      return item;
    }

    updatedItem = {
      ...item,
      body: trimmedBody,
      lastAttemptAt: undefined,
      lastError: undefined,
    };

    return updatedItem;
  });

  if (updatedItem) {
    writeQueue(nextItems);
  }

  return updatedItem;
}

export function listQueuedPublicCommentsForTarget(
  targetType: PublicCommentTargetType,
  targetId: string,
  items = listQueuedPublicInteractions(),
) {
  return items.filter(
    (item): item is QueuedPublicComment =>
      item.kind === "comment" &&
      item.targetType === targetType &&
      item.targetId === targetId,
  );
}

export function countQueuedPublicSocialActionsForTarget(
  targetType: SocialTargetType,
  targetId: string,
  items = listQueuedPublicInteractions(),
): Record<QueuedPublicSocialAction["socialKind"], number> {
  return items.reduce(
    (counts, item) => {
      if (
        item.kind === "social" &&
        item.targetType === targetType &&
        item.targetId === targetId
      ) {
        counts[item.socialKind] += 1;
      }

      return counts;
    },
    { follow: 0, like: 0, repost: 0 },
  );
}

export function listQueuedPublicInteractionsForTarget(
  targetType: PublicCommentTargetType,
  targetId: string,
  items = listQueuedPublicInteractions(),
) {
  return items.filter((item) =>
    queuedInteractionMatchesTarget(item, { targetId, targetType }),
  );
}

export function countQueuedPublicInteractionsOutsideScope(
  scope: PublicInteractionReplayScope,
  items = listQueuedPublicInteractions(),
) {
  return items.filter((item) => !queuedInteractionMatchesTarget(item, scope)).length;
}

export function getPublicInteractionQueueMembershipKey(
  items: QueuedPublicInteraction[],
) {
  return items
    .map((item) => `${item.kind}:${item.targetType}:${item.targetId}:${item.id}`)
    .join("|");
}

export function groupQueuedPublicInteractions(
  items = listQueuedPublicInteractions(),
  now = Date.now(),
): QueuedPublicInteractionGroup[] {
  const groups: QueuedPublicInteractionGroup[] = [
    {
      failedCount: 0,
      id: "comments",
      items: [],
      label: "Comments",
      staleCount: 0,
    },
    {
      failedCount: 0,
      id: "likes",
      items: [],
      label: "Likes",
      staleCount: 0,
    },
    {
      failedCount: 0,
      id: "follows",
      items: [],
      label: "Follows",
      staleCount: 0,
    },
    {
      failedCount: 0,
      id: "reposts",
      items: [],
      label: "Reposts",
      staleCount: 0,
    },
  ];
  const groupById = new Map(groups.map((group) => [group.id, group]));

  for (const item of items) {
    const group = groupById.get(getQueuedPublicInteractionGroupId(item));

    if (group) {
      group.items.push(item);
      group.failedCount += item.lastError ? 1 : 0;
      group.staleCount +=
        !item.lastError && isQueuedPublicInteractionStale(item, now) ? 1 : 0;
    }
  }

  return groups
    .map((group) => ({
      ...group,
      items: prioritizeQueuedPublicInteractions(group.items, now),
    }))
    .filter((group) => group.items.length > 0);
}

export function removeQueuedPublicInteraction(id: string) {
  writeQueue(listQueuedPublicInteractions().filter((item) => item.id !== id));
}

export function formatQueuedPublicInteractionAge(
  createdAt: number,
  now = Date.now(),
) {
  const ageMs = Math.max(0, now - createdAt);
  const minutes = Math.floor(ageMs / 60000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

export function describeQueuedPublicInteractionTarget(
  item: QueuedPublicInteraction,
) {
  const targetType = formatQueuedPublicInteractionTargetType(item.targetType);
  const targetId = formatQueuedPublicInteractionTargetId(item.targetId);

  return `${targetType} ${targetId}`;
}

export function describeQueuedPublicInteractionAgeStatus({
  item,
  now = Date.now(),
}: {
  item: QueuedPublicInteraction;
  now?: number;
}) {
  const age = formatQueuedPublicInteractionAge(item.createdAt, now);
  const stale = isQueuedPublicInteractionStale(item, now);

  return {
    age,
    label: stale ? `Queued ${age}. Review before syncing.` : `Queued ${age}.`,
    reviewText: stale ? "Review before syncing" : null,
    stale,
  };
}

export function describePublicInteractionQueueRecoveryHint({
  online,
  pendingCount,
}: {
  online: boolean;
  pendingCount: number;
}) {
  if (online || pendingCount <= 0) {
    return null;
  }

  return `Reconnect to sync ${formatReplayCount(
    pendingCount,
    "public action",
    "public actions",
  )}. You can still edit or discard them.`;
}

export function describePublicInteractionQueueReadinessHint({
  online,
  pendingCount,
}: {
  online: boolean;
  pendingCount: number;
}) {
  if (!online || pendingCount <= 0) {
    return null;
  }

  return `${formatReplayCount(
    pendingCount,
    "public action is",
    "public actions are",
  )} ready to sync.`;
}

export function describePublicInteractionQueueSyncHint({
  pendingCount,
  replaying,
  replayingId,
}: {
  pendingCount: number;
  replaying: boolean;
  replayingId: string | null;
}) {
  if (replaying) {
    return `Syncing ${formatReplayCount(
      pendingCount,
      "public action",
      "public actions",
    )}.`;
  }

  if (replayingId) {
    return "Syncing 1 public action.";
  }

  return null;
}

export function describePublicInteractionQueueErrorSummary(
  items: QueuedPublicInteraction[],
) {
  const failedCount = items.filter((item) => item.lastError).length;

  if (!failedCount) {
    return null;
  }

  return `${formatReplayCount(
    failedCount,
    "public action needs",
    "public actions need",
  )} attention after retry failed.`;
}

export function describePublicInteractionQueueFailedReviewStatus({
  failedCount,
  reviewedAt,
  now = Date.now(),
}: {
  failedCount: number;
  now?: number;
  reviewedAt: number | null;
}) {
  if (failedCount <= 0 || !reviewedAt) {
    return null;
  }

  return `${describePublicInteractionQueueReviewStatus(reviewedAt, now)} before retry.`;
}

export function describePublicInteractionQueueReviewSummary(
  items: QueuedPublicInteraction[],
  now = Date.now(),
) {
  const staleCount = countReviewableStaleQueuedPublicInteractions(items, now);

  if (!staleCount) {
    return null;
  }

  return `${formatReplayCount(
    staleCount,
    "public action is",
    "public actions are",
  )} stale and should be reviewed before syncing.`;
}

export function countReviewableStaleQueuedPublicInteractions(
  items: QueuedPublicInteraction[],
  now = Date.now(),
) {
  return items.filter(
    (item) => !item.lastError && isQueuedPublicInteractionStale(item, now),
  ).length;
}

export function shouldGuardPublicInteractionBulkReplay({
  items,
  reviewed,
  now = Date.now(),
}: {
  items: QueuedPublicInteraction[];
  now?: number;
  reviewed: boolean;
}) {
  if (reviewed) {
    return false;
  }

  return items.some(
    (item) => !item.lastError && isQueuedPublicInteractionStale(item, now),
  );
}

export function describePublicInteractionQueueReviewStatus(
  reviewedAt: number | null,
  now = Date.now(),
) {
  if (!reviewedAt) {
    return "Review pending";
  }

  return `Reviewed ${formatQueuedPublicInteractionAge(reviewedAt, now)}`;
}

export function describePublicInteractionBulkSyncConfirmationCopy({
  pendingCount,
  reviewedStaleCount,
}: {
  pendingCount: number;
  reviewedStaleCount: number;
}) {
  if (pendingCount <= 0) {
    return "No pending public actions to sync.";
  }

  const syncTarget = formatReplayCount(
    pendingCount,
    "public action",
    "public actions",
  );

  if (reviewedStaleCount <= 0) {
    return `Sync ${syncTarget}.`;
  }

  return `Sync ${syncTarget}, including ${formatReplayCount(
    reviewedStaleCount,
    "reviewed stale action",
    "reviewed stale actions",
  )}.`;
}

export function shouldResetPublicInteractionReviewAfterBulkSync({
  failed,
  reviewedAt,
  reviewedStaleCount,
}: {
  failed: number;
  reviewedAt: number | null;
  reviewedStaleCount: number;
}) {
  return Boolean(reviewedAt && reviewedStaleCount > 0 && failed === 0);
}

export function describeQueuedPublicInteractionLastAttempt(
  item: QueuedPublicInteraction,
  now = Date.now(),
) {
  if (!item.lastError || !item.lastAttemptAt) {
    return null;
  }

  return `Last attempted ${formatQueuedPublicInteractionAge(
    item.lastAttemptAt,
    now,
  )}.`;
}

export function describeQueuedPublicInteractionErrorStatus({
  item,
  now = Date.now(),
}: {
  item: QueuedPublicInteraction;
  now?: number;
}) {
  if (!item.lastError) {
    return null;
  }

  return {
    error: item.lastError,
    lastAttempt: describeQueuedPublicInteractionLastAttempt(item, now),
  };
}

export function describeQueuedPublicInteractionRetryAction({
  item,
  online,
  reviewedAt,
}: {
  item: QueuedPublicInteraction;
  online: boolean;
  reviewedAt: number | null;
}) {
  if (!online) {
    return "Reconnect to sync this action";
  }

  if (wasQueuedPublicInteractionRetriedAfterReview({ item, reviewedAt })) {
    return "Retry this reviewed stale action";
  }

  return "Retry this action";
}

export function describeQueuedPublicInteractionActionLabels({
  item,
  online,
  reviewedAt,
}: {
  item: QueuedPublicInteraction;
  online: boolean;
  reviewedAt: number | null;
}) {
  const retryAction = describeQueuedPublicInteractionRetryAction({
    item,
    online,
    reviewedAt,
  });
  const itemKind = formatQueuedPublicInteractionActionKind(item);

  return {
    discard: `Discard ${itemKind}`,
    edit: item.kind === "comment" ? "Edit comment" : null,
    retry:
      retryAction === "Retry this reviewed stale action"
        ? "Retry reviewed"
        : "Retry action",
    retryAriaLabel: `${retryAction}: queued ${itemKind}`,
    retryTitle: retryAction,
  };
}

export function describeQueuedPublicInteractionRetryToast({
  failed,
  item,
  message,
  reviewedAt,
}: {
  failed: boolean;
  item: QueuedPublicInteraction;
  message: string;
  reviewedAt: number | null;
}) {
  const errorStatus = failed
    ? describeQueuedPublicInteractionErrorStatus({ item })
    : null;
  const baseMessage = errorStatus?.error ?? message;

  if (!wasQueuedPublicInteractionRetriedAfterReview({ item, reviewedAt })) {
    return baseMessage;
  }

  const punctuatedMessage = punctuateSentence(baseMessage);

  return failed
    ? `${punctuatedMessage} Reviewed stale action still needs attention.`
    : `${punctuatedMessage} Reviewed stale action synced after review.`;
}

export function describePublicInteractionBulkReplayToast(
  summary: PublicInteractionReplaySummary,
) {
  const message = describePublicInteractionReplaySummary(summary);

  if (!summary.failed) {
    return message;
  }

  const errorStatus = summary.failedItems[0]
    ? describeQueuedPublicInteractionErrorStatus({
        item: summary.failedItems[0],
      })
    : null;

  if (!errorStatus?.error) {
    return message;
  }

  return `${punctuateSentence(errorStatus.error)} ${message}`;
}

export function describeQueuedPublicInteractionReviewedRetryStatus({
  item,
  now = Date.now(),
  reviewedAt,
}: {
  item: QueuedPublicInteraction;
  now?: number;
  reviewedAt: number | null;
}) {
  if (!wasQueuedPublicInteractionRetriedAfterReview({ item, reviewedAt })) {
    return null;
  }

  return `${describePublicInteractionQueueReviewStatus(reviewedAt, now)} before this retry.`;
}

export function isQueuedPublicInteractionStale(
  item: QueuedPublicInteraction,
  now = Date.now(),
) {
  return now - item.createdAt >= staleQueueAgeMs;
}

function wasQueuedPublicInteractionRetriedAfterReview({
  item,
  reviewedAt,
}: {
  item: QueuedPublicInteraction;
  reviewedAt: number | null;
}) {
  return Boolean(
    reviewedAt &&
      item.lastError &&
      item.lastAttemptAt &&
      item.lastAttemptAt >= reviewedAt &&
      isQueuedPublicInteractionStale(item),
  );
}

function punctuateSentence(message: string) {
  const trimmedMessage = message.trim();

  return /[.!?]$/.test(trimmedMessage) ? trimmedMessage : `${trimmedMessage}.`;
}

function formatQueuedPublicInteractionActionKind(item: QueuedPublicInteraction) {
  if (item.kind === "comment") {
    return "comment";
  }

  return item.socialKind;
}

export function hasSyncedPublicCommentsForScope(
  summary: PublicInteractionReplaySummary,
  scope: PublicInteractionReplayScope,
) {
  return summary.syncedItems.some(
    (item) =>
      item.kind === "comment" &&
      item.item.targetType === scope.targetType &&
      item.item.targetId === scope.targetId,
  );
}

export function describePublicInteractionReplaySummary(
  summary: PublicInteractionReplaySummary,
) {
  const syncedText = formatReplayParts(
    countReplayItems(summary.syncedItems, "comment"),
    countReplayItems(summary.syncedItems, "social"),
    "synced",
  );
  const failedText = formatReplayParts(
    countReplayItems(summary.failedItems, "comment"),
    countReplayItems(summary.failedItems, "social"),
    summary.failed === 1 ? "still needs attention" : "still need attention",
  );

  if (summary.failed && summary.synced) {
    return `${syncedText}. ${failedText}.`;
  }

  if (summary.failed) {
    return `${failedText}.`;
  }

  if (summary.synced) {
    return `${syncedText}.`;
  }

  return "No pending public actions to sync.";
}

export function subscribePublicInteractionQueue(listener: () => void) {
  window.addEventListener(queueChangedEvent, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(queueChangedEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

export function subscribePublicInteractionReplay(
  listener: (summary: PublicInteractionReplaySummary) => void,
) {
  const eventListener = (event: Event) => {
    listener((event as CustomEvent<PublicInteractionReplaySummary>).detail);
  };

  window.addEventListener(queueReplayedEvent, eventListener);

  return () => {
    window.removeEventListener(queueReplayedEvent, eventListener);
  };
}

export async function replayQueuedPublicInteractions(
  optionsOrRequest: ReplayQueuedPublicInteractionsOptions | typeof fetch = {},
): Promise<PublicInteractionReplaySummary> {
  const options =
    typeof optionsOrRequest === "function"
      ? { request: optionsOrRequest }
      : optionsOrRequest;
  const request = options.request ?? fetch;
  const items = options.scope
    ? listQueuedPublicInteractionsForTarget(
        options.scope.targetType,
        options.scope.targetId,
      )
    : listQueuedPublicInteractions();
  const failedItems: QueuedPublicInteraction[] = [];
  const syncedItems: SyncedQueuedPublicInteraction[] = [];

  for (const item of items) {
    const result = await submitQueuedItem(item, request).catch(() => ({
      error: "Network request failed.",
      ok: false as const,
    }));

    if (result.ok) {
      syncedItems.push(result.syncedItem);
      removeQueuedPublicInteraction(item.id);
    } else {
      const failedItem = {
        ...item,
        lastAttemptAt: Date.now(),
        lastError: result.error,
      };
      replaceQueuedPublicInteraction(failedItem);
      failedItems.push(failedItem);
    }
  }

  const summary = {
    failed: failedItems.length,
    failedItems,
    synced: syncedItems.length,
    syncedItems,
    total: items.length,
  };

  emitReplaySummary(summary);

  return summary;
}

export async function replayQueuedPublicInteraction(
  id: string,
  request: typeof fetch = fetch,
): Promise<PublicInteractionReplaySummary> {
  const item = listQueuedPublicInteractions().find((queued) => queued.id === id);

  if (!item) {
    return { failed: 0, failedItems: [], synced: 0, syncedItems: [], total: 0 };
  }

  const result = await submitQueuedItem(item, request).catch(() => ({
    error: "Network request failed.",
    ok: false as const,
  }));

  if (result.ok) {
    removeQueuedPublicInteraction(id);
    const summary = {
      failed: 0,
      failedItems: [],
      synced: 1,
      syncedItems: [result.syncedItem],
      total: 1,
    };

    emitReplaySummary(summary);

    return summary;
  }

  const failedItem = {
    ...item,
    lastAttemptAt: Date.now(),
    lastError: result.error,
  };
  replaceQueuedPublicInteraction(failedItem);

  const summary = {
    failed: 1,
    failedItems: [failedItem],
    synced: 0,
    syncedItems: [],
    total: 1,
  };

  emitReplaySummary(summary);

  return summary;
}

async function submitQueuedItem(
  item: QueuedPublicInteraction,
  request: typeof fetch,
): Promise<QueuedReplayResult> {
  if (item.kind === "comment") {
    const response = await request("/api/comments", {
      body: JSON.stringify({
        body: item.body,
        parentId: item.parentId,
        targetId: item.targetId,
        targetType: item.targetType,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      return { error: await getReplayError(response), ok: false };
    }

    const payload = (await response.json().catch(() => null)) as
      | { comment?: PublicCommentRow }
      | null;

    if (!payload?.comment) {
      return { error: "Comment synced but the response was incomplete.", ok: false };
    }

    return {
      ok: true,
      syncedItem: {
        comment: payload.comment,
        item,
        kind: "comment",
      },
    };
  }

  const response = await request("/api/social/actions", {
    body: JSON.stringify({
      kind: item.socialKind,
      targetId: item.targetId,
      targetType: item.targetType,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    return { error: await getReplayError(response), ok: false };
  }

  const payload = (await response.json().catch(() => null)) as
    | { active?: boolean; counts?: SocialCounts }
    | null;

  if (!payload?.counts || typeof payload.active !== "boolean") {
    return { error: "Action synced but the response was incomplete.", ok: false };
  }

  return {
    ok: true,
    syncedItem: {
      active: payload.active,
      counts: payload.counts,
      item,
      kind: "social",
    },
  };
}

async function getReplayError(response: Response | null) {
  if (!response) {
    return "Network request failed.";
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return payload?.error || `Sync failed with status ${response.status}.`;
}

function writeQueue(items: QueuedPublicInteraction[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(queueKey, JSON.stringify(items));
  window.dispatchEvent(new Event(queueChangedEvent));
}

function emitReplaySummary(summary: PublicInteractionReplaySummary) {
  if (typeof window === "undefined" || summary.total === 0) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(queueReplayedEvent, {
      detail: summary,
    }),
  );
}

function replaceQueuedPublicInteraction(nextItem: QueuedPublicInteraction) {
  writeQueue(
    listQueuedPublicInteractions().map((item) =>
      item.id === nextItem.id ? nextItem : item,
    ),
  );
}

function isQueuedInteraction(value: unknown): value is QueuedPublicInteraction {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<QueuedPublicInteraction>;

  if (
    typeof item.id !== "string" ||
    typeof item.createdAt !== "number" ||
    typeof item.targetId !== "string"
  ) {
    return false;
  }

  if (item.kind === "comment") {
    return typeof item.body === "string";
  }

  if (item.kind === "social") {
    return (
      item.socialKind === "follow" ||
      item.socialKind === "like" ||
      item.socialKind === "repost"
    );
  }

  return false;
}

function queuedInteractionMatchesTarget(
  item: QueuedPublicInteraction,
  scope: PublicInteractionReplayScope,
) {
  return item.targetType === scope.targetType && item.targetId === scope.targetId;
}

function getQueuedPublicInteractionGroupId(
  item: QueuedPublicInteraction,
): QueuedPublicInteractionGroup["id"] {
  if (item.kind === "comment") {
    return "comments";
  }

  return item.socialKind === "follow"
    ? "follows"
    : item.socialKind === "repost"
      ? "reposts"
      : "likes";
}

function prioritizeQueuedPublicInteractions(
  items: QueuedPublicInteraction[],
  now: number,
) {
  return items
    .map((item, index) => ({ index, item }))
    .sort((left, right) => {
      const leftFailed = left.item.lastError ? 1 : 0;
      const rightFailed = right.item.lastError ? 1 : 0;
      const leftStale = isQueuedPublicInteractionStale(left.item, now) ? 1 : 0;
      const rightStale = isQueuedPublicInteractionStale(right.item, now) ? 1 : 0;

      if (leftFailed !== rightFailed) {
        return rightFailed - leftFailed;
      }

      if (leftStale !== rightStale) {
        return rightStale - leftStale;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}

function formatQueuedPublicInteractionTargetType(
  targetType: QueuedPublicInteraction["targetType"],
) {
  switch (targetType) {
    case "hook":
      return "Hook";
    case "playlist":
      return "Playlist";
    case "profile":
      return "Profile";
    case "song":
      return "Song";
    default:
      return "Public page";
  }
}

function formatQueuedPublicInteractionTargetId(targetId: string) {
  if (targetId.length <= 14) {
    return targetId;
  }

  return `${targetId.slice(0, 8)}...${targetId.slice(-4)}`;
}

function countReplayItems(
  items: Array<QueuedPublicInteraction | SyncedQueuedPublicInteraction>,
  kind: "comment" | "social",
) {
  return items.filter((item) => item.kind === kind).length;
}

function formatReplayParts(
  comments: number,
  socialActions: number,
  suffix: string,
) {
  const parts = [
    formatReplayCount(comments, "comment", "comments"),
    formatReplayCount(socialActions, "action", "actions"),
  ].filter(Boolean);

  return `${parts.join(" and ")} ${suffix}`;
}

function formatReplayCount(count: number, singular: string, plural: string) {
  if (!count) {
    return "";
  }

  return `${count} ${count === 1 ? singular : plural}`;
}

function createQueueId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `queue-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
