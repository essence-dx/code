import type {
  AdminCollaborationNotificationPreferenceCategory,
  AdminCollaborationNotificationPreferenceCenterInput,
  AdminCollaborationNotificationPreferenceCenterReport,
  AdminCollaborationNotificationPreferenceFile,
  AdminCollaborationNotificationPreferenceGap,
  AdminCollaborationNotificationPreferenceRow,
  AdminCollaborationNotificationPreferenceScope,
  AdminCollaborationNotificationPreferenceState,
  AdminCollaborationNotificationPreferenceStatus,
} from "@/features/admin/admin-collaboration-notification-preference-center-types";

const categoryOrder: AdminCollaborationNotificationPreferenceCategory[] = [
  "reactions",
  "cursor-chat",
  "review-sessions",
  "mentions",
  "digests",
  "recovery-packets",
];

const categoryLabels: Record<
  AdminCollaborationNotificationPreferenceCategory,
  string
> = {
  "cursor-chat": "Cursor chat alerts",
  digests: "Digest preferences",
  mentions: "Mention preferences",
  reactions: "Reaction preferences",
  "recovery-packets": "Recovery packet alerts",
  "review-sessions": "Review session alerts",
};

export function getAdminCollaborationNotificationPreferenceCenterReport({
  collaborationRecoveryPackets,
  commentReactionWorkflows,
  cursorChatRoomMessages,
  externalCommentNotificationWorkflows,
  files,
  generatedAt = new Date().toISOString(),
  liveReviewSessions,
  notificationDigestSubscriptions,
}: AdminCollaborationNotificationPreferenceCenterInput): AdminCollaborationNotificationPreferenceCenterReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const preferences = [
    ...getReactionPreferenceScopes({
      commentReactionWorkflows,
      files: activeFiles,
    }),
    ...getCursorChatPreferenceScopes({
      cursorChatRoomMessages,
      digestRecipientCount: notificationDigestSubscriptions.recipientCount,
    }),
    ...getReviewSessionPreferenceScopes({
      liveReviewSessions,
    }),
    ...getMentionPreferenceScopes({
      externalCommentNotificationWorkflows,
      files: activeFiles,
    }),
    getDigestPreferenceScope(notificationDigestSubscriptions),
    ...getRecoveryPacketPreferenceScopes({
      collaborationRecoveryPackets,
    }),
  ].sort(sortPreferences);
  const alertGaps = getAlertGaps(preferences).sort(sortAlertGaps);
  const rows = getPreferenceRows({
    alertGaps,
    preferences,
  });
  const blockedPreferenceCount = preferences.filter(
    (preference) => preference.status === "blocked",
  ).length;
  const reviewPreferenceCount = preferences.filter(
    (preference) => preference.status === "review",
  ).length;
  const suppressedPreferenceCount = preferences.filter(
    (preference) => preference.suppressed,
  ).length;
  const unroutedAlertCount =
    externalCommentNotificationWorkflows.unroutedMentionCount +
    commentReactionWorkflows.failedReactionNotificationCount +
    notificationDigestSubscriptions.unroutedActiveSignalCount;

  return {
    generatedAt,
    status: getWorstStatus(rows.map((row) => row.status)),
    score: Math.max(
      0,
      100 -
        blockedPreferenceCount * 8 -
        reviewPreferenceCount * 3 -
        suppressedPreferenceCount * 2 -
        unroutedAlertCount * 5 -
        alertGaps.length,
    ),
    categoryCount: rows.length,
    preferenceScopeCount: preferences.length,
    readyPreferenceCount: preferences.filter(
      (preference) => preference.status === "ready",
    ).length,
    reviewPreferenceCount,
    blockedPreferenceCount,
    suppressedPreferenceCount,
    missingPreferenceCount: preferences.filter(
      (preference) =>
        preference.state === "disabled" || preference.state === "needs-routing",
    ).length,
    alertSignalCount: preferences.reduce(
      (total, preference) => total + preference.signalCount,
      0,
    ),
    unroutedAlertCount,
    digestRecipientCount: notificationDigestSubscriptions.recipientCount,
    digestTopicCount: notificationDigestSubscriptions.subscribedTopicCount,
    recoveryPacketAlertCount: collaborationRecoveryPackets.packetCount,
    exportReadyPreferenceCount: preferences.filter(
      (preference) => preference.exportReady,
    ).length,
    alertGapCount: alertGaps.length,
    rows,
    preferences,
    alertGaps,
    commands: getCollaborationNotificationPreferenceCenterCommands(),
  };
}

function getReactionPreferenceScopes({
  commentReactionWorkflows,
  files,
}: Pick<
  AdminCollaborationNotificationPreferenceCenterInput,
  "commentReactionWorkflows"
> & {
  files: AdminCollaborationNotificationPreferenceFile[];
}): AdminCollaborationNotificationPreferenceScope[] {
  const commentsByFile = groupBy(
    commentReactionWorkflows.comments,
    (comment) => comment.fileId,
  );

  return files.map((file) => {
    const preference = getNotificationPreferences(file);
    const comments = commentsByFile.get(file.fileId) ?? [];
    const reactionCount = comments.reduce(
      (total, comment) => total + comment.reactionCount,
      0,
    );
    const failedRouteCount = comments.reduce(
      (total, comment) => total + comment.failedNotificationCount,
      0,
    );
    const unacknowledgedCount = comments.filter(
      (comment) => !comment.resolved && comment.acknowledgementCount === 0,
    ).length;
    const disabled = !preference.enabled || !preference.reactions;
    const acknowledgementsDisabled = !preference.acknowledgements;
    const status =
      failedRouteCount > 0
        ? "blocked"
        : disabled || acknowledgementsDisabled || unacknowledgedCount > 0
          ? "review"
          : "ready";

    return {
      id: `collaboration-notification-reactions-${file.fileId}`,
      category: "reactions",
      status,
      state: disabled ? "disabled" : "enabled",
      label: `${file.fileName} reaction routing`,
      target: file.fileName,
      fileId: file.fileId,
      fileName: file.fileName,
      ownerRef: redactRef(file.ownerEmail),
      signalCount: reactionCount + unacknowledgedCount,
      blockedSignalCount: failedRouteCount,
      suppressed: disabled || acknowledgementsDisabled,
      exportReady: status === "ready" && reactionCount > 0,
      latestAt: getLatestIso([
        file.updatedAt,
        ...comments.map((comment) => comment.latestAt),
      ]),
      recommendation:
        failedRouteCount > 0
          ? "Retry failed reaction or acknowledgement notification routes."
          : disabled || acknowledgementsDisabled
            ? "Confirm reaction and acknowledgement preferences before relying on review acknowledgements."
            : unacknowledgedCount > 0
              ? "Ask reviewers to acknowledge open comment threads."
              : "Reaction and acknowledgement preferences are ready.",
    };
  });
}

function getCursorChatPreferenceScopes({
  cursorChatRoomMessages,
  digestRecipientCount,
}: Pick<
  AdminCollaborationNotificationPreferenceCenterInput,
  "cursorChatRoomMessages"
> & {
  digestRecipientCount: number;
}): AdminCollaborationNotificationPreferenceScope[] {
  return cursorChatRoomMessages.rooms.map((room) => {
    const needsRouting = room.mentionCount > 0 && digestRecipientCount === 0;
    const status = needsRouting ? "blocked" : normalizeStatus(room.status);

    return {
      id: `collaboration-notification-cursor-chat-${room.fileId}`,
      category: "cursor-chat",
      status,
      state: needsRouting ? "needs-routing" : "enabled",
      label: `${room.fileName} cursor chat alerts`,
      target: room.fileName,
      fileId: room.fileId,
      fileName: room.fileName,
      ownerRef: redactRef(room.ownerRef),
      signalCount: room.messageCount + room.mentionCount,
      blockedSignalCount: room.expiredMessageCount + room.externalParticipantCount,
      suppressed: false,
      exportReady: status === "ready" && room.exportReady,
      latestAt: room.latestAt,
      recommendation: needsRouting
        ? "Add a digest recipient before routing cursor chat mention alerts."
        : room.status === "ready"
          ? "Cursor chat alerts are covered by retained room evidence."
          : room.recommendation,
    };
  });
}

function getReviewSessionPreferenceScopes({
  liveReviewSessions,
}: Pick<
  AdminCollaborationNotificationPreferenceCenterInput,
  "liveReviewSessions"
>): AdminCollaborationNotificationPreferenceScope[] {
  const actionItemsBySession = groupBy(
    liveReviewSessions.actionItems,
    (item) => item.sessionId,
  );

  return liveReviewSessions.sessions.map((session) => {
    const actionItems = actionItemsBySession.get(session.id) ?? [];
    const blockedActionItemCount = actionItems.filter(
      (item) => item.status === "blocked",
    ).length;
    const status =
      blockedActionItemCount > 0 || session.status === "blocked"
        ? "blocked"
        : actionItems.length > 0 || session.status === "review"
          ? "review"
          : "ready";

    return {
      id: `collaboration-notification-review-session-${session.id}`,
      category: "review-sessions",
      status,
      state: "enabled",
      label: `${session.fileName} review session alerts`,
      target: session.branchName,
      fileId: session.fileId,
      fileName: session.fileName,
      ownerRef: redactRef(session.ownerRef),
      signalCount: session.actionItemCount + session.openCommentCount,
      blockedSignalCount: blockedActionItemCount + session.blockerCount,
      suppressed: false,
      exportReady: status === "ready",
      latestAt: session.latestAt,
      recommendation:
        status === "blocked"
          ? "Resolve blocked live-review action items before relying on review-session alerts."
          : status === "review"
            ? "Confirm live-review action items have owners and alert routes."
            : "Review-session alerts are ready.",
    };
  });
}

function getMentionPreferenceScopes({
  externalCommentNotificationWorkflows,
  files,
}: Pick<
  AdminCollaborationNotificationPreferenceCenterInput,
  "externalCommentNotificationWorkflows"
> & {
  files: AdminCollaborationNotificationPreferenceFile[];
}): AdminCollaborationNotificationPreferenceScope[] {
  const routesByFile = groupBy(
    externalCommentNotificationWorkflows.mentionRoutes,
    (route) => route.fileId,
  );
  const suppressionsByFile = groupBy(
    externalCommentNotificationWorkflows.suppressionControls,
    (control) => control.fileId,
  );

  return files.map((file) => {
    const preference = getNotificationPreferences(file);
    const routes = routesByFile.get(file.fileId) ?? [];
    const suppressions = suppressionsByFile.get(file.fileId) ?? [];
    const blockedRouteCount = routes.filter(
      (route) => route.status === "blocked",
    ).length;
    const suppressed = !preference.enabled || !preference.mentions || suppressions.length > 0;
    const status =
      blockedRouteCount > 0
        ? "blocked"
        : suppressed
          ? "review"
          : routes.some((route) => route.status === "review")
            ? "review"
            : "ready";
    const state = !preference.enabled || !preference.mentions
      ? "disabled"
      : suppressions.length > 0
        ? "muted"
        : "enabled";

    return {
      id: `collaboration-notification-mentions-${file.fileId}`,
      category: "mentions",
      status,
      state,
      label: `${file.fileName} mention routing`,
      target: file.fileName,
      fileId: file.fileId,
      fileName: file.fileName,
      ownerRef: redactRef(file.ownerEmail),
      signalCount: countMentionSignals(file) + routes.length,
      blockedSignalCount: blockedRouteCount,
      suppressed,
      exportReady: status === "ready",
      latestAt: getLatestIso([
        file.updatedAt,
        ...routes.map((route) => route.latestAt),
        ...suppressions.map((control) => control.latestAt),
      ]),
      recommendation:
        blockedRouteCount > 0
          ? "Retry failed mention routes before review handoff."
          : suppressed
            ? "Review muted or disabled mention preferences for this file."
            : "Mention preferences are ready.",
    };
  });
}

function getDigestPreferenceScope(
  report: AdminCollaborationNotificationPreferenceCenterInput["notificationDigestSubscriptions"],
): AdminCollaborationNotificationPreferenceScope {
  const noRoute = report.activeSignalCount > 0 && report.recipientCount === 0;
  const status = noRoute ? "blocked" : normalizeStatus(report.status);

  return {
    id: "collaboration-notification-digests-workspace",
    category: "digests",
    status,
    state:
      report.recipientCount === 0 || report.subscribedTopicCount === 0
        ? "disabled"
        : report.unroutedActiveSignalCount > 0
          ? "needs-routing"
          : "enabled",
    label: "Workspace collaboration digest",
    target: `${report.recipientCount} recipient${report.recipientCount === 1 ? "" : "s"}`,
    fileId: null,
    fileName: null,
    ownerRef: redactRef(report.settings.updatedBy ?? "admin"),
    signalCount: report.activeSignalCount,
    blockedSignalCount: report.unroutedActiveSignalCount,
    suppressed: report.recipientCount === 0 || report.subscribedTopicCount === 0,
    exportReady: status === "ready" && report.recipientCount > 0,
    latestAt: report.settings.updatedAt ?? report.generatedAt,
    recommendation: noRoute
      ? "Add at least one digest recipient before routing collaboration alerts."
      : report.unroutedActiveSignalCount > 0
        ? "Review digest topic coverage for active collaboration signals."
        : "Digest preferences are ready.",
  };
}

function getRecoveryPacketPreferenceScopes({
  collaborationRecoveryPackets,
}: Pick<
  AdminCollaborationNotificationPreferenceCenterInput,
  "collaborationRecoveryPackets"
>): AdminCollaborationNotificationPreferenceScope[] {
  return collaborationRecoveryPackets.packets.map((packet) => ({
    id: `collaboration-notification-recovery-packet-${packet.fileId}`,
    category: "recovery-packets",
    status: normalizeStatus(packet.status),
    state: packet.exportReady ? "enabled" : "needs-routing",
    label: `${packet.fileName} recovery packet alerts`,
    target: packet.fileName,
    fileId: packet.fileId,
    fileName: packet.fileName,
    ownerRef: redactRef(packet.ownerEmail),
    signalCount:
      packet.conflictSummaryCount +
      packet.unresolvedMentionCount +
      packet.activityReplayEvidenceCount,
    blockedSignalCount:
      packet.status === "blocked"
        ? packet.conflictSummaryCount +
          (packet.ownerHandoffStatus === "missing" ? 1 : 0)
        : 0,
    suppressed: false,
    exportReady: packet.exportReady,
    latestAt: packet.latestAt,
    recommendation: packet.exportReady
      ? "Recovery packet alert routing is ready."
      : packet.recommendation,
  }));
}

function getPreferenceRows({
  alertGaps,
  preferences,
}: {
  alertGaps: AdminCollaborationNotificationPreferenceGap[];
  preferences: AdminCollaborationNotificationPreferenceScope[];
}): AdminCollaborationNotificationPreferenceRow[] {
  return categoryOrder.map((category) => {
    const categoryPreferences = preferences.filter(
      (preference) => preference.category === category,
    );
    const categoryGaps = alertGaps.filter((gap) => gap.category === category);
    const status = getWorstStatus(
      categoryPreferences.map((preference) => preference.status),
    );
    const signalCount = categoryPreferences.reduce(
      (total, preference) => total + preference.signalCount,
      0,
    );
    const blockedSignalCount = categoryPreferences.reduce(
      (total, preference) => total + preference.blockedSignalCount,
      0,
    );
    const suppressedCount = categoryPreferences.filter(
      (preference) => preference.suppressed,
    ).length;

    return {
      id: `collaboration-notification-${category}`,
      category,
      status,
      label: categoryLabels[category],
      value: `${categoryPreferences.length} scopes`,
      detail: `${signalCount} alert signals, ${blockedSignalCount} blocked signals, and ${suppressedCount} suppressed preference scopes are tracked.`,
      recommendation: getRowRecommendation({
        category,
        gapCount: categoryGaps.length,
        status,
      }),
      count: categoryGaps.length,
      target: categoryGaps[0]?.target ?? categoryPreferences[0]?.target ?? null,
      latestAt: getLatestIso(
        categoryPreferences.map((preference) => preference.latestAt),
      ),
    };
  });
}

function getAlertGaps(
  preferences: AdminCollaborationNotificationPreferenceScope[],
): AdminCollaborationNotificationPreferenceGap[] {
  return preferences
    .filter(
      (preference) =>
        preference.status !== "ready" ||
        preference.blockedSignalCount > 0 ||
        preference.suppressed,
    )
    .map((preference) => ({
      id: `gap-${preference.id}`,
      category: preference.category,
      status: preference.status,
      label: `${categoryLabels[preference.category]} needs review`,
      target: preference.target,
      detail: `${preference.label} is ${preference.status} with ${preference.blockedSignalCount} blocked signal${preference.blockedSignalCount === 1 ? "" : "s"} and ${preference.suppressed ? "suppressed preferences" : "active preferences"}.`,
      command: getGapCommand(preference),
      latestAt: preference.latestAt,
    }));
}

function getNotificationPreferences(
  file: AdminCollaborationNotificationPreferenceFile,
) {
  const preferences = file.document.commentNotificationPreferences;

  return {
    enabled: preferences?.enabled ?? true,
    mentions: preferences?.mentions ?? true,
    reactions: preferences?.reactions ?? true,
    acknowledgements: preferences?.acknowledgements ?? true,
    mutedEmails: preferences?.mutedEmails ?? [],
  };
}

function countMentionSignals(file: AdminCollaborationNotificationPreferenceFile) {
  return file.document.pages.reduce(
    (total, page) =>
      total +
      (page.comments ?? []).reduce(
        (commentTotal, comment) =>
          commentTotal +
          (comment.mentions?.length ?? 0) +
          (comment.replies ?? []).reduce(
            (replyTotal, reply) => replyTotal + (reply.mentions?.length ?? 0),
            0,
          ),
        0,
      ),
    0,
  );
}

function getRowRecommendation({
  category,
  gapCount,
  status,
}: {
  category: AdminCollaborationNotificationPreferenceCategory;
  gapCount: number;
  status: AdminCollaborationNotificationPreferenceStatus;
}) {
  if (status === "ready") {
    return `${categoryLabels[category]} are ready for the current workspace evidence.`;
  }

  if (status === "blocked") {
    return `Resolve ${gapCount} blocked ${categoryLabels[category].toLowerCase()} gap${gapCount === 1 ? "" : "s"} before relying on collaboration alerts.`;
  }

  return `Review ${gapCount} ${categoryLabels[category].toLowerCase()} gap${gapCount === 1 ? "" : "s"} before release handoff.`;
}

function getGapCommand(
  preference: AdminCollaborationNotificationPreferenceScope,
) {
  if (preference.category === "digests") {
    return "Review Admin > Notifications digest recipients and subscribed topics.";
  }

  if (preference.category === "mentions" || preference.category === "reactions") {
    return `Review notification preferences for ${preference.target}.`;
  }

  if (preference.category === "cursor-chat") {
    return `Resolve cursor chat alert routing for ${preference.target}.`;
  }

  if (preference.category === "review-sessions") {
    return `Resolve live review session alert blockers for ${preference.target}.`;
  }

  return `Resolve recovery packet alert blockers for ${preference.target}.`;
}

function getCollaborationNotificationPreferenceCenterCommands() {
  return [
    "bun run admin:collaboration-notification-preference-center-smoke",
    "Export Admin > Collaboration notification preference center JSON.",
    "Export Admin > Collaboration notification preference center CSV.",
    "Export Admin > Collaboration notification preference center Markdown.",
  ];
}

function normalizeStatus(
  status: AdminCollaborationNotificationPreferenceStatus,
): AdminCollaborationNotificationPreferenceStatus {
  return status;
}

function getWorstStatus(
  statuses: AdminCollaborationNotificationPreferenceStatus[],
): AdminCollaborationNotificationPreferenceStatus {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function getLatestIso(
  values: Array<string | null | undefined>,
): string | null {
  let latest: string | null = null;

  for (const value of values) {
    if (!value) {
      continue;
    }

    if (!latest) {
      latest = value;
      continue;
    }

    if (Date.parse(value) > Date.parse(latest)) {
      latest = value;
    }
  }

  return latest;
}

function groupBy<T>(
  values: T[],
  getKey: (value: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const value of values) {
    const key = getKey(value);
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }

  return groups;
}

function redactRef(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/secret[-_:]?[a-z0-9-]+/gi, "[redacted-token]");
}

function statusWeight(
  status: AdminCollaborationNotificationPreferenceStatus,
) {
  return status === "blocked" ? 0 : status === "review" ? 1 : 2;
}

function stateWeight(state: AdminCollaborationNotificationPreferenceState) {
  if (state === "needs-routing") {
    return 0;
  }

  if (state === "disabled" || state === "muted") {
    return 1;
  }

  if (state === "digest-only") {
    return 2;
  }

  return 3;
}

function sortPreferences(
  left: AdminCollaborationNotificationPreferenceScope,
  right: AdminCollaborationNotificationPreferenceScope,
) {
  return (
    categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category) ||
    statusWeight(left.status) - statusWeight(right.status) ||
    stateWeight(left.state) - stateWeight(right.state) ||
    right.blockedSignalCount - left.blockedSignalCount ||
    left.label.localeCompare(right.label)
  );
}

function sortAlertGaps(
  left: AdminCollaborationNotificationPreferenceGap,
  right: AdminCollaborationNotificationPreferenceGap,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    categoryOrder.indexOf(left.category) - categoryOrder.indexOf(right.category) ||
    (right.latestAt ?? "").localeCompare(left.latestAt ?? "") ||
    left.label.localeCompare(right.label)
  );
}

export {
  getAdminCollaborationNotificationPreferenceCenterCsv,
  getAdminCollaborationNotificationPreferenceCenterJson,
  getAdminCollaborationNotificationPreferenceCenterMarkdown,
} from "@/features/admin/admin-collaboration-notification-preference-center-export";

export type {
  AdminCollaborationNotificationPreferenceCategory,
  AdminCollaborationNotificationPreferenceCenterInput,
  AdminCollaborationNotificationPreferenceCenterReport,
  AdminCollaborationNotificationPreferenceFile,
  AdminCollaborationNotificationPreferenceGap,
  AdminCollaborationNotificationPreferenceRow,
  AdminCollaborationNotificationPreferenceScope,
  AdminCollaborationNotificationPreferenceState,
  AdminCollaborationNotificationPreferenceStatus,
} from "@/features/admin/admin-collaboration-notification-preference-center-types";
