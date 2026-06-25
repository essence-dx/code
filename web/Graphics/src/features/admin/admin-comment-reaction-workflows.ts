import type {
  AdminCommentReactionModerationItem,
  AdminCommentReactionSource,
  AdminCommentReactionWorkflowComment,
  AdminCommentReactionWorkflowDelivery,
  AdminCommentReactionWorkflowInput,
  AdminCommentReactionWorkflowRow,
  AdminCommentReactionWorkflowStatus,
  AdminCommentReactionWorkflowsReport,
} from "@/features/admin/admin-comment-reaction-workflows-types";
import type { DesignComment, DesignCommentReaction } from "@/features/editor/types";

export function getAdminCommentReactionWorkflowsReport({
  files,
  generatedAt = new Date().toISOString(),
  notificationDeliveries,
}: AdminCommentReactionWorkflowInput): AdminCommentReactionWorkflowsReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const commentSources = activeFiles.flatMap(getCommentSources);
  const reactionDeliveries = notificationDeliveries.filter((delivery) =>
    isReactionDeliveryKind(delivery.kind),
  );
  const deliveriesByComment = groupBy(
    reactionDeliveries,
    (delivery) => delivery.commentId,
  );
  const moderationQueue = commentSources
    .flatMap((source) => getModerationItems(source))
    .sort(sortModerationItems);
  const moderationByComment = groupBy(
    moderationQueue,
    (item) => item.commentId,
  );
  const comments = commentSources.map((source) =>
    getReactionWorkflowComment({
      deliveries: deliveriesByComment.get(source.comment.id) ?? [],
      moderationItems: moderationByComment.get(source.comment.id) ?? [],
      source,
    }),
  );
  const reactionCount = comments.reduce(
    (total, comment) => total + comment.reactionCount,
    0,
  );
  const acknowledgementCount = comments.reduce(
    (total, comment) => total + comment.acknowledgementCount,
    0,
  );
  const unacknowledgedOpenCommentCount = comments.filter(
    (comment) => !comment.resolved && comment.acknowledgementCount === 0,
  ).length;
  const failedReactionNotificationCount = reactionDeliveries.filter(
    (delivery) => delivery.status === "failed",
  ).length;
  const unroutedReactionNotificationCount = failedReactionNotificationCount;
  const rows = getReactionWorkflowRows({
    acknowledgementCount,
    comments,
    failedReactionNotificationCount,
    moderationQueue,
    reactionCount,
    reactionDeliveries,
    unacknowledgedOpenCommentCount,
  });
  const blockedRows = rows.filter((row) => row.status === "blocked").length;
  const reviewRows = rows.filter((row) => row.status === "review").length;

  return {
    generatedAt,
    status: getWorstStatus(rows.map((row) => row.status)),
    score: Math.max(0, 100 - blockedRows * 18 - reviewRows * 6),
    fileCount: activeFiles.length,
    commentCount: comments.length,
    openCommentCount: comments.filter((comment) => !comment.resolved).length,
    reactionCount,
    acknowledgementCount,
    unacknowledgedOpenCommentCount,
    reactionNotificationRouteCount: reactionDeliveries.length,
    failedReactionNotificationCount,
    unroutedReactionNotificationCount,
    moderationReviewCount: moderationQueue.length,
    rows,
    comments: comments.sort(sortComments),
    moderationQueue,
    commands: getCommentReactionWorkflowCommands(),
  };
}

function getCommentSources(
  file: AdminCommentReactionWorkflowInput["files"][number],
): AdminCommentReactionSource[] {
  return file.document.pages.flatMap((page) =>
    (page.comments ?? []).map((comment) => ({
      comment,
      file,
      pageName: page.name,
    })),
  );
}

function getReactionWorkflowComment({
  deliveries,
  moderationItems,
  source,
}: {
  deliveries: AdminCommentReactionWorkflowDelivery[];
  moderationItems: AdminCommentReactionModerationItem[];
  source: AdminCommentReactionSource;
}): AdminCommentReactionWorkflowComment {
  const reactionCount = source.comment.reactions?.length ?? 0;
  const acknowledgementCount = getAcknowledgementCount(source.comment);
  const failedNotificationCount = deliveries.filter(
    (delivery) => delivery.status === "failed",
  ).length;
  const status = getCommentStatus({
    acknowledgementCount,
    failedNotificationCount,
    moderationReviewCount: moderationItems.length,
    resolved: source.comment.resolved,
  });

  return {
    id: `comment-reaction-workflow-${source.file.fileId}-${source.comment.id}`,
    status,
    fileId: source.file.fileId,
    fileName: source.file.fileName,
    ownerEmail: source.file.ownerEmail,
    pageName: source.pageName,
    commentId: source.comment.id,
    textPreview: summarizeText(source.comment.text),
    resolved: source.comment.resolved,
    assigneeEmail: source.comment.assigneeEmail ?? null,
    reactionCount,
    acknowledgementCount,
    reactionNotificationCount: deliveries.length,
    failedNotificationCount,
    moderationReviewCount: moderationItems.length,
    latestAt: getLatestIso([
      source.comment.updatedAt,
      ...((source.comment.reactions ?? []).map((reaction) => reaction.createdAt)),
      ...deliveries.map((delivery) => delivery.createdAt),
    ]),
    recommendation: getCommentRecommendation(status, acknowledgementCount),
  };
}

function getModerationItems({
  comment,
  file,
  pageName,
}: AdminCommentReactionSource): AdminCommentReactionModerationItem[] {
  return (comment.reactions ?? []).flatMap((reaction) => {
    const reason = getModerationReason(comment, reaction, file.ownerEmail);

    if (!reason) {
      return [];
    }

    return [
      {
        id: `comment-reaction-moderation-${file.fileId}-${comment.id}-${reaction.id}`,
        status: reason.includes("External") ? "blocked" : "review",
        fileId: file.fileId,
        fileName: file.fileName,
        ownerEmail: file.ownerEmail,
        pageName,
        commentId: comment.id,
        reactionId: reaction.id,
        reactionKind: reaction.kind,
        actorName: reaction.actorName,
        actorEmail: reaction.actorEmail ?? null,
        reason,
        latestAt: reaction.createdAt,
      } satisfies AdminCommentReactionModerationItem,
    ];
  });
}

function getReactionWorkflowRows({
  acknowledgementCount,
  comments,
  failedReactionNotificationCount,
  moderationQueue,
  reactionCount,
  reactionDeliveries,
  unacknowledgedOpenCommentCount,
}: {
  acknowledgementCount: number;
  comments: AdminCommentReactionWorkflowComment[];
  failedReactionNotificationCount: number;
  moderationQueue: AdminCommentReactionModerationItem[];
  reactionCount: number;
  reactionDeliveries: AdminCommentReactionWorkflowDelivery[];
  unacknowledgedOpenCommentCount: number;
}): AdminCommentReactionWorkflowRow[] {
  const rows: AdminCommentReactionWorkflowRow[] = [
    {
      id: "comment-reaction-persistent-state",
      category: "persistent-state",
      status: reactionCount > 0 ? "ready" : "review",
      label: "Persistent reaction state",
      value: `${reactionCount} reactions`,
      detail: `${comments.length} comments are inspected with ${reactionCount} persisted reaction records.`,
      recommendation:
        reactionCount > 0
          ? "Reaction state is available for review workflows and exports."
          : "Capture reviewer reactions before relying on acknowledgement workflows.",
      count: reactionCount,
      target: comments.find((comment) => comment.reactionCount === 0)?.fileName ?? null,
      latestAt: getLatestIso(comments.map((comment) => comment.latestAt)),
    },
    {
      id: "comment-reaction-acknowledgement",
      category: "acknowledgement",
      status: unacknowledgedOpenCommentCount > 0 ? "review" : "ready",
      label: "Acknowledgement workflow",
      value: `${acknowledgementCount} acknowledgements`,
      detail: `${unacknowledgedOpenCommentCount} open comment${unacknowledgedOpenCommentCount === 1 ? "" : "s"} still need a check acknowledgement.`,
      recommendation:
        unacknowledgedOpenCommentCount > 0
          ? "Ask assignees or reviewers to acknowledge open comments with a check reaction."
          : "Open comments have acknowledgement coverage.",
      count: unacknowledgedOpenCommentCount,
      target:
        comments.find(
          (comment) => !comment.resolved && comment.acknowledgementCount === 0,
        )?.fileName ?? null,
      latestAt: getLatestIso(comments.map((comment) => comment.latestAt)),
    },
    {
      id: "comment-reaction-notification-routing",
      category: "notification-routing",
      status: failedReactionNotificationCount > 0 ? "blocked" : "ready",
      label: "Notification routing",
      value: `${reactionDeliveries.length} routes`,
      detail: `${failedReactionNotificationCount} reaction or acknowledgement notification route${failedReactionNotificationCount === 1 ? "" : "s"} failed and need retry.`,
      recommendation:
        failedReactionNotificationCount > 0
          ? "Retry failed reaction and acknowledgement notification routes before review handoff."
          : "Reaction and acknowledgement notifications have delivery evidence.",
      count: failedReactionNotificationCount,
      target:
        reactionDeliveries.find((delivery) => delivery.status === "failed")
          ?.recipientEmail ?? null,
      latestAt: getLatestIso(reactionDeliveries.map((delivery) => delivery.createdAt)),
    },
    {
      id: "comment-reaction-moderation-review",
      category: "moderation-review",
      status: getWorstStatus(moderationQueue.map((item) => item.status)),
      label: "Moderation review",
      value: `${moderationQueue.length} rows`,
      detail: `${moderationQueue.length} reaction moderation row${moderationQueue.length === 1 ? "" : "s"} need reviewer confirmation.`,
      recommendation:
        moderationQueue.length > 0
          ? "Review external acknowledgements and missing actor metadata before release handoff."
          : "No reaction moderation row needs review.",
      count: moderationQueue.length,
      target: moderationQueue[0]?.fileName ?? null,
      latestAt: getLatestIso(moderationQueue.map((item) => item.latestAt)),
    },
  ];

  return rows.sort(sortRows);
}

function getAcknowledgementCount(comment: DesignComment) {
  return (comment.reactions ?? []).filter((reaction) => reaction.kind === "check")
    .length;
}

function getCommentStatus({
  acknowledgementCount,
  failedNotificationCount,
  moderationReviewCount,
  resolved,
}: {
  acknowledgementCount: number;
  failedNotificationCount: number;
  moderationReviewCount: number;
  resolved: boolean;
}): AdminCommentReactionWorkflowStatus {
  if (failedNotificationCount > 0 || moderationReviewCount > 0) {
    return "blocked";
  }

  if (!resolved && acknowledgementCount === 0) {
    return "review";
  }

  return "ready";
}

function getModerationReason(
  comment: DesignComment,
  reaction: DesignCommentReaction,
  ownerEmail: string,
) {
  if (!reaction.actorEmail) {
    return "Reaction actor email is missing and needs moderation review.";
  }

  if (
    reaction.kind === "check" &&
    getDomain(reaction.actorEmail) !== getDomain(ownerEmail)
  ) {
    return "External acknowledgement requires moderation review.";
  }

  if (!comment.resolved && reaction.kind === "eyes" && !comment.assigneeEmail) {
    return "Unassigned watched comment needs an owner before review handoff.";
  }

  return null;
}

function getCommentRecommendation(
  status: AdminCommentReactionWorkflowStatus,
  acknowledgementCount: number,
) {
  if (status === "blocked") {
    return "Review moderation and failed notification routes before release handoff.";
  }

  if (acknowledgementCount === 0) {
    return "Ask the assignee to acknowledge the comment with a check reaction.";
  }

  return "Reaction and acknowledgement workflow evidence is ready.";
}

function isReactionDeliveryKind(kind: string) {
  return kind === "reaction" || kind === "acknowledgement";
}

function getCommentReactionWorkflowCommands() {
  return [
    "bun run admin:comment-reaction-workflows-smoke",
    "Export Admin > Comment reaction workflows JSON.",
    "Export Admin > Comment reaction workflows CSV.",
    "Export Admin > Comment reaction workflows Markdown.",
    "Review Admin > Notifications before release handoff when external acknowledgements are present.",
  ];
}

function getWorstStatus(statuses: AdminCommentReactionWorkflowStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function getLatestIso(values: Array<string | null | undefined>) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  );
}

function getDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function summarizeText(value: string) {
  const text = value.trim().replace(/\s+/g, " ");

  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function groupBy<Value>(
  values: Value[],
  getKey: (value: Value) => string,
) {
  const groups = new Map<string, Value[]>();

  for (const value of values) {
    const key = getKey(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }

  return groups;
}

function statusWeight(status: AdminCommentReactionWorkflowStatus) {
  return status === "blocked" ? 0 : status === "review" ? 1 : 2;
}

function sortRows(
  left: AdminCommentReactionWorkflowRow,
  right: AdminCommentReactionWorkflowRow,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.count - left.count ||
    left.label.localeCompare(right.label)
  );
}

function sortComments(
  left: AdminCommentReactionWorkflowComment,
  right: AdminCommentReactionWorkflowComment,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.moderationReviewCount - left.moderationReviewCount ||
    (right.latestAt ?? "").localeCompare(left.latestAt ?? "")
  );
}

function sortModerationItems(
  left: AdminCommentReactionModerationItem,
  right: AdminCommentReactionModerationItem,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.latestAt.localeCompare(left.latestAt)
  );
}

export {
  getAdminCommentReactionWorkflowsCsv,
  getAdminCommentReactionWorkflowsJson,
  getAdminCommentReactionWorkflowsMarkdown,
} from "@/features/admin/admin-comment-reaction-workflows-export";

export type {
  AdminCommentReactionModerationItem,
  AdminCommentReactionWorkflowCategory,
  AdminCommentReactionWorkflowComment,
  AdminCommentReactionWorkflowDelivery,
  AdminCommentReactionWorkflowFile,
  AdminCommentReactionWorkflowInput,
  AdminCommentReactionWorkflowRow,
  AdminCommentReactionWorkflowStatus,
  AdminCommentReactionWorkflowsReport,
} from "@/features/admin/admin-comment-reaction-workflows-types";
