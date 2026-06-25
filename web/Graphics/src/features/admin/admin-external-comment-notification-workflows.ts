import type { DesignComment, DesignCommentReply } from "@/features/editor/types";
import type {
  AdminCommentNotificationDigestPreview,
  AdminCommentNotificationMentionRoute,
  AdminCommentNotificationRetryQueueItem,
  AdminCommentNotificationSuppressionControl,
  AdminExternalCommentNotificationWorkflowDelivery,
  AdminExternalCommentNotificationWorkflowFile,
  AdminExternalCommentNotificationWorkflowRow,
  AdminExternalCommentNotificationWorkflowStatus,
  AdminExternalCommentNotificationWorkflowsInput,
  AdminExternalCommentNotificationWorkflowsReport,
} from "@/features/admin/admin-external-comment-notification-workflows-types";

type MentionSignal = {
  id: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  pageName: string;
  commentId: string;
  replyId: string | null;
  mentionedEmail: string;
  latestAt: string;
};

type NotificationPreferences = {
  enabled: boolean;
  mentions: boolean;
  mutedEmails: string[];
  updatedAt: string | null;
};

export function getAdminExternalCommentNotificationWorkflowsReport({
  files,
  generatedAt = new Date().toISOString(),
  notificationDeliveries,
  notificationDigestSubscriptions,
}: AdminExternalCommentNotificationWorkflowsInput): AdminExternalCommentNotificationWorkflowsReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const retryQueue = getRetryQueue(notificationDeliveries);
  const mentionRoutes = getMentionRoutes(activeFiles, notificationDeliveries);
  const suppressionControls = getSuppressionControls(activeFiles);
  const unroutedMentionCount = mentionRoutes.filter(
    (route) => !route.suppressed && route.status !== "ready",
  ).length;
  const digestPreviews = getDigestPreviews({
    mentionRoutes,
    notificationDigestSubscriptions,
    retryQueue,
  });
  const failedDeliveryCount = notificationDeliveries.filter(
    (delivery) => delivery.status === "failed",
  ).length;
  const rows = [
    getRetryRow(retryQueue, notificationDeliveries),
    getDigestPreviewRow(digestPreviews, notificationDigestSubscriptions, {
      retryQueueCount: retryQueue.length,
      unroutedMentionCount,
    }),
    getMentionRoutingRow(mentionRoutes, unroutedMentionCount),
    getSuppressionRow(suppressionControls),
  ].sort(sortRows);
  const blockedRows = rows.filter((row) => row.status === "blocked").length;
  const reviewRows = rows.filter((row) => row.status === "review").length;

  return {
    generatedAt,
    status: getWorstStatus(rows.map((row) => row.status)),
    score: Math.max(0, 100 - blockedRows * 18 - reviewRows * 6),
    fileCount: activeFiles.length,
    deliveryCount: notificationDeliveries.length,
    failedDeliveryCount,
    retryQueueCount: retryQueue.length,
    digestPreviewCount: digestPreviews.length,
    mentionRouteCount: mentionRoutes.length,
    unroutedMentionCount,
    suppressedRecipientCount: suppressionControls.filter(
      (control) => control.mutedEmail,
    ).length,
    disabledFileCount: suppressionControls.filter((control) => !control.enabled)
      .length,
    rows,
    retryQueue,
    digestPreviews,
    mentionRoutes,
    suppressionControls,
    commands: getExternalCommentNotificationCommands(),
  };
}

function getRetryQueue(
  deliveries: AdminExternalCommentNotificationWorkflowDelivery[],
) {
  const deliveriesByRoute = groupBy(deliveries, getDeliveryRouteKey);
  const retryItems: AdminCommentNotificationRetryQueueItem[] = [];

  for (const group of deliveriesByRoute.values()) {
    const ordered = [...group].sort(sortDeliveriesByCreatedAtDesc);
    const latest = ordered[0];

    if (!latest || latest.status !== "failed") {
      continue;
    }

    const failedAttempts = ordered.filter(
      (delivery) => delivery.status === "failed",
    ).length;

    retryItems.push({
      id: `retry-${slugify(latest.eventId)}-${slugify(latest.recipientEmail)}`,
      status: failedAttempts >= 2 ? "blocked" : "review",
      fileId: latest.fileId,
      fileName: latest.fileName,
      ownerEmail: latest.ownerEmail,
      eventId: latest.eventId,
      kind: latest.kind,
      recipientEmail: latest.recipientEmail,
      attemptCount: failedAttempts,
      lastReason: latest.reason ?? "Delivery failed.",
      lastAttemptAt: latest.createdAt,
      command: `Retry ${latest.kind} notification for ${latest.recipientEmail} in ${latest.fileName}.`,
    });
  }

  return retryItems.sort(sortRetryItems);
}

function getMentionRoutes(
  files: AdminExternalCommentNotificationWorkflowFile[],
  deliveries: AdminExternalCommentNotificationWorkflowDelivery[],
) {
  const mentionDeliveriesByRoute = new Map(
    deliveries
      .filter((delivery) => delivery.kind === "mention")
      .sort(sortDeliveriesByCreatedAtDesc)
      .map((delivery) => [getMentionRouteKey(delivery), delivery]),
  );

  return files.flatMap((file) => {
    const preferences = getPreferences(file);

    return getMentionSignals(file).map((signal) => {
      const latestDelivery = mentionDeliveriesByRoute.get(
        getMentionRouteKey(signal),
      );
      const suppressionReason = getSuppressionReason(
        preferences,
        signal.mentionedEmail,
      );
      const suppressed = Boolean(suppressionReason);
      const deliveryStatus = latestDelivery?.status ?? "missing";
      const status = getMentionRouteStatus({
        deliveryStatus,
        suppressed,
      });

      return {
        id: signal.id,
        status,
        fileId: signal.fileId,
        fileName: signal.fileName,
        ownerEmail: signal.ownerEmail,
        pageName: signal.pageName,
        commentId: signal.commentId,
        replyId: signal.replyId,
        mentionedEmail: signal.mentionedEmail,
        deliveryStatus,
        deliveryId: latestDelivery?.id ?? null,
        suppressed,
        suppressionReason,
        latestAt: latestDelivery?.createdAt ?? signal.latestAt,
        recommendation: getMentionRouteRecommendation({
          deliveryStatus,
          suppressed,
        }),
      } satisfies AdminCommentNotificationMentionRoute;
    });
  }).sort(sortMentionRoutes);
}

function getSuppressionControls(
  files: AdminExternalCommentNotificationWorkflowFile[],
) {
  const controls: AdminCommentNotificationSuppressionControl[] = [];

  for (const file of files) {
    const preferences = getPreferences(file);

    if (!preferences.enabled || !preferences.mentions) {
      controls.push({
        id: `suppression-${file.fileId}-notifications`,
        status: "review",
        fileId: file.fileId,
        fileName: file.fileName,
        ownerEmail: file.ownerEmail,
        mutedEmail: null,
        enabled: preferences.enabled,
        mentionsEnabled: preferences.mentions,
        reason: preferences.enabled
          ? "Mention notifications are disabled for this file."
          : "All comment notifications are disabled for this file.",
        command: `Review notification preferences for ${file.fileName}.`,
        latestAt: preferences.updatedAt ?? file.updatedAt,
      });
    }

    for (const mutedEmail of preferences.mutedEmails) {
      controls.push({
        id: `suppression-${file.fileId}-${slugify(mutedEmail)}`,
        status: "review",
        fileId: file.fileId,
        fileName: file.fileName,
        ownerEmail: file.ownerEmail,
        mutedEmail,
        enabled: preferences.enabled,
        mentionsEnabled: preferences.mentions,
        reason: "Recipient is muted for comment notification delivery.",
        command: `Confirm ${mutedEmail} should remain muted in ${file.fileName}.`,
        latestAt: preferences.updatedAt ?? file.updatedAt,
      });
    }
  }

  return controls.sort(sortSuppressionControls);
}

function getDigestPreviews({
  mentionRoutes,
  notificationDigestSubscriptions,
  retryQueue,
}: {
  mentionRoutes: AdminCommentNotificationMentionRoute[];
  notificationDigestSubscriptions: AdminExternalCommentNotificationWorkflowsInput["notificationDigestSubscriptions"];
  retryQueue: AdminCommentNotificationRetryQueueItem[];
}) {
  const recipients = notificationDigestSubscriptions.settings.recipients;
  const emailDeliveryEnabled =
    notificationDigestSubscriptions.settings.topics["email-delivery"];
  const openMentionRoutes = mentionRoutes.filter(
    (route) => !route.suppressed && route.status !== "ready",
  );
  const signalLines = [
    ...retryQueue.map(
      (item) =>
        `${item.fileName}: retry ${item.kind} to ${item.recipientEmail} after ${item.attemptCount} failed attempts.`,
    ),
    ...openMentionRoutes.map(
      (route) =>
        `${route.fileName}: mention route for ${route.mentionedEmail} is ${route.deliveryStatus}.`,
    ),
  ];

  if (!emailDeliveryEnabled || recipients.length === 0 || signalLines.length === 0) {
    return [];
  }

  const blockedSignalCount =
    retryQueue.filter((item) => item.status === "blocked").length +
    openMentionRoutes.filter((route) => route.status === "blocked").length;
  const reviewSignalCount = signalLines.length - blockedSignalCount;

  return recipients.map<AdminCommentNotificationDigestPreview>((recipient) => ({
    id: `digest-preview-${slugify(recipient)}`,
    status: blockedSignalCount > 0 ? "blocked" : "review",
    recipientEmail: recipient,
    subject: `Essence comment notification digest: ${signalLines.length} open signals`,
    signalCount: signalLines.length,
    blockedSignalCount,
    reviewSignalCount,
    lines: signalLines.slice(0, 10),
  }));
}

function getRetryRow(
  retryQueue: AdminCommentNotificationRetryQueueItem[],
  deliveries: AdminExternalCommentNotificationWorkflowDelivery[],
): AdminExternalCommentNotificationWorkflowRow {
  const status = getWorstStatus(retryQueue.map((item) => item.status));

  return {
    id: "external-comment-notification-retry",
    category: "delivery-retry",
    status,
    label: "Delivery retry queue",
    value: `${retryQueue.length} open retries`,
    detail: `${deliveries.length} delivery attempts are loaded, with ${retryQueue.length} latest-failed notification routes waiting for operator retry review.`,
    recommendation:
      status === "ready"
        ? "No failed comment email delivery route needs retry."
        : "Retry failed routes after sender/domain health is fixed and keep failed attempts in the evidence export.",
    count: retryQueue.length,
    target: retryQueue[0]?.recipientEmail ?? null,
    latestAt: retryQueue[0]?.lastAttemptAt ?? null,
  };
}

function getDigestPreviewRow(
  previews: AdminCommentNotificationDigestPreview[],
  subscriptions: AdminExternalCommentNotificationWorkflowsInput["notificationDigestSubscriptions"],
  signals: {
    retryQueueCount: number;
    unroutedMentionCount: number;
  },
): AdminExternalCommentNotificationWorkflowRow {
  const openSignalCount = signals.retryQueueCount + signals.unroutedMentionCount;
  const emailDeliveryEnabled = subscriptions.settings.topics["email-delivery"];
  const status: AdminExternalCommentNotificationWorkflowStatus =
    openSignalCount > 0 && (subscriptions.recipientCount === 0 || !emailDeliveryEnabled)
      ? "blocked"
      : previews.length > 0
        ? getWorstStatus(previews.map((preview) => preview.status))
        : "ready";

  return {
    id: "external-comment-notification-digest-preview",
    category: "digest-preview",
    status,
    label: "Digest preview",
    value: `${previews.length} previews`,
    detail: `${openSignalCount} open notification signals can be routed through ${subscriptions.recipientCount} digest recipients; email-delivery topic is ${emailDeliveryEnabled ? "enabled" : "disabled"}.`,
    recommendation:
      status === "ready"
        ? "Digest routing is ready for current comment notification signals."
        : "Enable email-delivery digest routing and confirm recipients before relying on operational notification digests.",
    count: previews.length,
    target: previews[0]?.recipientEmail ?? subscriptions.settings.recipients[0] ?? null,
    latestAt: subscriptions.generatedAt,
  };
}

function getMentionRoutingRow(
  mentionRoutes: AdminCommentNotificationMentionRoute[],
  unroutedMentionCount: number,
): AdminExternalCommentNotificationWorkflowRow {
  const openRoutes = mentionRoutes.filter(
    (route) => !route.suppressed && route.status !== "ready",
  );
  const status = getWorstStatus(openRoutes.map((route) => route.status));

  return {
    id: "external-comment-notification-mention-routing",
    category: "mention-routing",
    status,
    label: "Mention routing",
    value: `${unroutedMentionCount} unrouted`,
    detail: `${mentionRoutes.length} mention recipients are present across open comments; ${unroutedMentionCount} need delivery retry or routing review.`,
    recommendation:
      status === "ready"
        ? "Mention recipients are delivered or intentionally suppressed."
        : "Retry failed mention deliveries and review any missing notification route before handoff.",
    count: unroutedMentionCount,
    target: openRoutes[0]?.mentionedEmail ?? null,
    latestAt: openRoutes[0]?.latestAt ?? getLatestAt(mentionRoutes),
  };
}

function getSuppressionRow(
  controls: AdminCommentNotificationSuppressionControl[],
): AdminExternalCommentNotificationWorkflowRow {
  const disabledCount = controls.filter((control) => !control.enabled).length;
  const mutedCount = controls.filter((control) => control.mutedEmail).length;

  return {
    id: "external-comment-notification-suppression",
    category: "suppression",
    status: controls.length > 0 ? "review" : "ready",
    label: "Suppression controls",
    value: `${controls.length} controls`,
    detail: `${mutedCount} muted recipients and ${disabledCount} disabled files are available for operator-safe suppression review.`,
    recommendation:
      controls.length > 0
        ? "Confirm each mute or disabled notification scope is intentional before relying on external comment delivery."
        : "No comment notification suppression control needs review.",
    count: controls.length,
    target: controls[0]?.fileName ?? null,
    latestAt: controls[0]?.latestAt ?? null,
  };
}

function getMentionSignals(
  file: AdminExternalCommentNotificationWorkflowFile,
) {
  const signals = new Map<string, MentionSignal>();

  for (const page of file.document.pages) {
    for (const comment of page.comments ?? []) {
      collectMentionSignals({
        comment,
        file,
        pageName: page.name,
        reply: null,
        signals,
      });

      for (const reply of comment.replies ?? []) {
        collectMentionSignals({
          comment,
          file,
          pageName: page.name,
          reply,
          signals,
        });
      }
    }
  }

  return [...signals.values()];
}

function collectMentionSignals({
  comment,
  file,
  pageName,
  reply,
  signals,
}: {
  comment: DesignComment;
  file: AdminExternalCommentNotificationWorkflowFile;
  pageName: string;
  reply: DesignCommentReply | null;
  signals: Map<string, MentionSignal>;
}) {
  const sourceText = reply?.text ?? comment.text;
  const mentionValues = [
    ...(reply?.mentions ?? comment.mentions ?? []),
    ...getEmailsFromText(sourceText),
  ];

  for (const mentionedEmail of uniqueEmails(mentionValues)) {
    const signal: MentionSignal = {
      id: `mention-route-${file.fileId}-${comment.id}-${reply?.id ?? "comment"}-${slugify(mentionedEmail)}`,
      fileId: file.fileId,
      fileName: file.fileName,
      ownerEmail: file.ownerEmail,
      pageName,
      commentId: comment.id,
      replyId: reply?.id ?? null,
      mentionedEmail,
      latestAt: reply?.updatedAt ?? comment.updatedAt,
    };

    signals.set(getMentionRouteKey(signal), signal);
  }
}

function getPreferences(
  file: AdminExternalCommentNotificationWorkflowFile,
): NotificationPreferences {
  const preferences = file.document.commentNotificationPreferences;

  return {
    enabled: preferences?.enabled ?? true,
    mentions: preferences?.mentions ?? true,
    mutedEmails: uniqueEmails(preferences?.mutedEmails ?? []),
    updatedAt: preferences?.updatedAt ?? file.document.updatedAt ?? null,
  };
}

function getSuppressionReason(
  preferences: NotificationPreferences,
  recipientEmail: string,
) {
  if (!preferences.enabled) {
    return "All comment notifications are disabled for this file.";
  }

  if (!preferences.mentions) {
    return "Mention notifications are disabled for this file.";
  }

  if (preferences.mutedEmails.includes(recipientEmail)) {
    return "Recipient is muted for this file.";
  }

  return null;
}

function getMentionRouteStatus({
  deliveryStatus,
  suppressed,
}: {
  deliveryStatus: AdminCommentNotificationMentionRoute["deliveryStatus"];
  suppressed: boolean;
}): AdminExternalCommentNotificationWorkflowStatus {
  if (suppressed || deliveryStatus === "sent") {
    return "ready";
  }

  return deliveryStatus === "failed" ? "blocked" : "review";
}

function getMentionRouteRecommendation({
  deliveryStatus,
  suppressed,
}: {
  deliveryStatus: AdminCommentNotificationMentionRoute["deliveryStatus"];
  suppressed: boolean;
}) {
  if (suppressed) {
    return "Suppression is intentional; confirm the mute before release.";
  }

  if (deliveryStatus === "sent") {
    return "Mention route has a sent delivery record.";
  }

  if (deliveryStatus === "failed") {
    return "Retry the failed mention delivery after sender health is repaired.";
  }

  return "Create or retry a mention delivery route for this recipient.";
}

function getDeliveryRouteKey(
  delivery: AdminExternalCommentNotificationWorkflowDelivery,
) {
  return `${delivery.eventId}:${normalizeEmail(delivery.recipientEmail)}`;
}

function getMentionRouteKey(
  value:
    | MentionSignal
    | AdminCommentNotificationMentionRoute
    | AdminExternalCommentNotificationWorkflowDelivery,
) {
  const replyId = "replyId" in value ? (value.replyId ?? "comment") : "comment";
  const recipient =
    "mentionedEmail" in value ? value.mentionedEmail : value.recipientEmail;

  return [
    value.fileId,
    value.commentId,
    replyId,
    normalizeEmail(recipient),
  ].join(":");
}

function getExternalCommentNotificationCommands() {
  return [
    "bun run admin:external-comment-notifications-smoke",
    "Export Admin > External comment notification workflows JSON.",
    "Export Admin > External comment notification workflows CSV.",
    "Export Admin > External comment notification workflows Markdown.",
    "Review Admin > Notifications before publishing files with external mentions.",
  ];
}

function getWorstStatus(
  statuses: AdminExternalCommentNotificationWorkflowStatus[],
) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function getLatestAt(
  values: Array<{ latestAt: string | null }>,
): string | null {
  return (
    values
      .map((value) => value.latestAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  );
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

function getEmailsFromText(text: string) {
  return Array.from(
    text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi),
    (match) => match[0] ?? "",
  );
}

function uniqueEmails(values: string[]) {
  return [
    ...new Set(
      values
        .map((value) => normalizeEmail(value.replace(/^@/, "")))
        .filter((value): value is string => Boolean(value && isEmail(value))),
    ),
  ];
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function statusWeight(status: AdminExternalCommentNotificationWorkflowStatus) {
  return status === "blocked" ? 0 : status === "review" ? 1 : 2;
}

function sortRows(
  left: AdminExternalCommentNotificationWorkflowRow,
  right: AdminExternalCommentNotificationWorkflowRow,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    right.count - left.count ||
    left.label.localeCompare(right.label)
  );
}

function sortDeliveriesByCreatedAtDesc(
  left: AdminExternalCommentNotificationWorkflowDelivery,
  right: AdminExternalCommentNotificationWorkflowDelivery,
) {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

function sortRetryItems(
  left: AdminCommentNotificationRetryQueueItem,
  right: AdminCommentNotificationRetryQueueItem,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    Date.parse(right.lastAttemptAt) - Date.parse(left.lastAttemptAt)
  );
}

function sortMentionRoutes(
  left: AdminCommentNotificationMentionRoute,
  right: AdminCommentNotificationMentionRoute,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    Date.parse(right.latestAt ?? "0") - Date.parse(left.latestAt ?? "0")
  );
}

function sortSuppressionControls(
  left: AdminCommentNotificationSuppressionControl,
  right: AdminCommentNotificationSuppressionControl,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.fileName.localeCompare(right.fileName) ||
    (left.mutedEmail ?? "").localeCompare(right.mutedEmail ?? "")
  );
}

export {
  getAdminExternalCommentNotificationWorkflowsCsv,
  getAdminExternalCommentNotificationWorkflowsJson,
  getAdminExternalCommentNotificationWorkflowsMarkdown,
} from "@/features/admin/admin-external-comment-notification-workflows-export";

export type {
  AdminCommentNotificationDigestPreview,
  AdminCommentNotificationMentionRoute,
  AdminCommentNotificationRetryQueueItem,
  AdminCommentNotificationSuppressionControl,
  AdminExternalCommentNotificationWorkflowCategory,
  AdminExternalCommentNotificationWorkflowDelivery,
  AdminExternalCommentNotificationWorkflowFile,
  AdminExternalCommentNotificationWorkflowRow,
  AdminExternalCommentNotificationWorkflowStatus,
  AdminExternalCommentNotificationWorkflowsInput,
  AdminExternalCommentNotificationWorkflowsReport,
} from "@/features/admin/admin-external-comment-notification-workflows-types";
