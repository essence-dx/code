import type {
  AdminCollaborationHandoffStatus,
} from "@/features/admin/admin-collaboration-handoff-operations-types";
import type {
  DesignCollaborationPresenceEvent,
  DesignDocument,
} from "@/features/editor/types";

export const collaborationHandoffStatusWeight: Record<
  AdminCollaborationHandoffStatus,
  number
> = {
  blocked: 0,
  review: 1,
  ready: 2,
};

export function getWorstCollaborationHandoffStatus(
  statuses: AdminCollaborationHandoffStatus[],
  fallback: AdminCollaborationHandoffStatus = "ready",
) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return fallback;
}

export function getLatestCollaborationIso(
  left: string | null,
  right: string | null,
) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return new Date(right).getTime() > new Date(left).getTime() ? right : left;
}

export function toIsoFromMs(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value).toISOString()
    : null;
}

export function getUnresolvedDocumentMentionCount(document: DesignDocument) {
  return document.pages.reduce((total, page) => {
    const unresolvedComments = (page.comments ?? []).filter(
      (comment) => !comment.resolved,
    );

    return (
      total +
      unresolvedComments.reduce((commentTotal, comment) => {
        const replyMentionCount = (comment.replies ?? []).reduce(
          (replyTotal, reply) => replyTotal + (reply.mentions?.length ?? 0),
          0,
        );

        return commentTotal + (comment.mentions?.length ?? 0) + replyMentionCount;
      }, 0)
    );
  }, 0);
}

export function getLatestUnresolvedDocumentMentionIso(document: DesignDocument) {
  return document.pages
    .flatMap((page) => page.comments ?? [])
    .filter(
      (comment) =>
        !comment.resolved &&
        ((comment.mentions?.length ?? 0) > 0 ||
          (comment.replies ?? []).some(
            (reply) => (reply.mentions?.length ?? 0) > 0,
          )),
    )
    .map((comment) => comment.updatedAt)
    .reduce(getLatestCollaborationIso, null as string | null);
}

export function getChatMentionCount(messages: Array<{ text: string }>) {
  return messages.filter((message) => /(^|\s)@[\w.-]+/i.test(message.text)).length;
}

export function getLatestPresenceEventIso(
  events: DesignCollaborationPresenceEvent[],
) {
  const latest = events.reduce(
    (value, event) => Math.max(value, event.createdAt),
    0,
  );

  return latest > 0 ? new Date(latest).toISOString() : null;
}
