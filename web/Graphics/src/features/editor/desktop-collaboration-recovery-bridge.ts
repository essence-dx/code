import type {
  DesktopCollaborationCursorChatQueueItem,
  DesktopCollaborationOfflineReplayItem,
  DesktopCollaborationReconnectHandoff,
  DesktopCollaborationRecoveryBridgeInput,
  DesktopCollaborationRecoveryBridgeReport,
  DesktopCollaborationRecoveryPacket,
  DesktopCollaborationRecoveryRow,
  DesktopCollaborationRecoveryStatus,
} from "@/features/editor/desktop-collaboration-recovery-bridge-types";

export {
  getDesktopCollaborationRecoveryBridgeCsv,
  getDesktopCollaborationRecoveryBridgeJson,
  getDesktopCollaborationRecoveryBridgeMarkdown,
} from "@/features/editor/desktop-collaboration-recovery-bridge-export";
export type {
  DesktopCollaborationCursorChatQueueItem,
  DesktopCollaborationOfflineReplayItem,
  DesktopCollaborationReconnectHandoff,
  DesktopCollaborationRecoveryBridgeInput,
  DesktopCollaborationRecoveryBridgeReport,
  DesktopCollaborationRecoveryCategory,
  DesktopCollaborationRecoveryPacket,
  DesktopCollaborationRecoveryPacketKind,
  DesktopCollaborationRecoveryRow,
  DesktopCollaborationRecoveryStatus,
} from "@/features/editor/desktop-collaboration-recovery-bridge-types";

const staleCursorReviewMs = 2 * 60 * 1000;
const staleCursorBlockedMs = 5 * 60 * 1000;

export function getDesktopCollaborationRecoveryBridgeReport({
  activeFileId,
  activeFileName,
  activePageId,
  collaborationPresence,
  collaborationSyncReplay,
  generatedAt = new Date().toISOString(),
  multiplayerFollowSpotlight,
  now = Date.now(),
  offlineQueue,
}: DesktopCollaborationRecoveryBridgeInput): DesktopCollaborationRecoveryBridgeReport {
  const chatEventCount = collaborationPresence.presenceEvents.filter(
    (event) => event.kind === "chat",
  ).length;
  const reconnectHandoffs = getReconnectHandoffs({
    collaborationPresence,
    collaborationSyncReplay,
    multiplayerFollowSpotlight,
  });
  const offlineReplayItems = getOfflineReplayItems({
    collaborationSyncReplay,
    offlineQueue,
  });
  const cursorChatQueue = getCursorChatQueue({
    activePageId,
    collaborationPresence,
    multiplayerFollowSpotlight,
    now,
  });
  const adminEvidence = getAdminEvidence({
    activeFileName,
    collaborationSyncReplay,
    multiplayerFollowSpotlight,
    offlineQueue,
  });
  const rows = [
    getReconnectHandoffRow(reconnectHandoffs),
    getOfflineReplayRow(offlineReplayItems),
    getCursorChatQueueRow(cursorChatQueue),
    getAdminEvidenceRow(adminEvidence),
  ];
  const recoveryPackets = getRecoveryPackets({
    adminEvidence,
    cursorChatQueue,
    offlineReplayItems,
    reconnectHandoffs,
    rows,
  });
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const offlineReplayQueueCount =
    collaborationSyncReplay.offlineReplayQueueCount + offlineQueue.retryableCount;
  const cursorChatBlockedCount = cursorChatQueue.filter(
    (item) => item.status === "blocked",
  ).length;
  const reconnectHandoffBlockedCount = reconnectHandoffs.filter(
    (handoff) => handoff.status === "blocked",
  ).length;

  return {
    generatedAt,
    fileId: activeFileId,
    fileName: activeFileName,
    status: getWorstStatus(rows.map((row) => row.status)),
    score: Math.max(
      0,
      100 -
        blockedCount * 18 -
        reviewCount * 6 -
        Math.min(12, offlineQueue.failedCount * 4) -
        Math.min(10, collaborationSyncReplay.eventDriftCount * 2),
    ),
    activePeerCount: collaborationPresence.peers.length,
    chatEventCount,
    presenceEventCount: collaborationPresence.presenceEvents.length,
    reconnectHandoffCount: reconnectHandoffs.length,
    reconnectHandoffBlockedCount,
    offlineReplayQueueCount,
    failedOfflineSaveCount: offlineQueue.failedCount,
    staleOfflineSaveCount: offlineQueue.staleCount,
    eventDriftCount: collaborationSyncReplay.eventDriftCount,
    cursorChatQueueCount: cursorChatQueue.length,
    cursorChatBlockedCount,
    adminEvidenceCount: adminEvidence.length,
    readyCount,
    reviewCount,
    blockedCount,
    reconnectHandoffs,
    offlineReplayItems,
    cursorChatQueue,
    adminEvidence,
    rows: rows.sort(sortRows),
    recoveryPackets,
  };
}

function getReconnectHandoffs({
  collaborationPresence,
  collaborationSyncReplay,
  multiplayerFollowSpotlight,
}: Pick<
  DesktopCollaborationRecoveryBridgeInput,
  | "collaborationPresence"
  | "collaborationSyncReplay"
  | "multiplayerFollowSpotlight"
>): DesktopCollaborationReconnectHandoff[] {
  const followedPeer = collaborationPresence.peers.find(
    (peer) => peer.id === collaborationPresence.followedPeerId,
  );
  const presenterStatus =
    multiplayerFollowSpotlight.presenterConflictCount > 0 ||
    multiplayerFollowSpotlight.handoffTimerStatus === "blocked"
      ? "blocked"
      : multiplayerFollowSpotlight.presenterStatus === "idle" ||
          multiplayerFollowSpotlight.handoffTimerStatus === "review"
        ? "review"
        : "ready";
  const reconnectStatus =
    collaborationSyncReplay.unrecoveredPeerCount > 0 ||
    collaborationSyncReplay.reconnectQualityScore < 60
      ? "blocked"
      : collaborationSyncReplay.recoveredPeerCount === 0 ||
          collaborationSyncReplay.reconnectQualityScore < 85
        ? "review"
        : "ready";
  const followStatus =
    collaborationPresence.followedPeerId && followedPeer
      ? "ready"
      : collaborationPresence.followedPeerId
        ? "blocked"
        : collaborationPresence.peers.length > 0
          ? "review"
          : "ready";

  return [
    {
      id: "desktop-recovery-presenter-handoff",
      status: presenterStatus,
      label: "Presenter reconnect handoff",
      detail:
        multiplayerFollowSpotlight.presenterStatus === "conflict"
          ? `${multiplayerFollowSpotlight.presenterConflictCount} presenter handoff conflict${multiplayerFollowSpotlight.presenterConflictCount === 1 ? "" : "s"} need ownership before reconnect.`
          : multiplayerFollowSpotlight.ownerName
            ? `${multiplayerFollowSpotlight.ownerName} owns the current presenter handoff.`
            : "No active presenter owns the recovery handoff.",
      ownerPeerId: multiplayerFollowSpotlight.ownerPeerId,
      ownerName: multiplayerFollowSpotlight.ownerName,
      metric: multiplayerFollowSpotlight.presenterConflictCount,
      recommendation:
        presenterStatus === "ready"
          ? "Keep presenter ownership attached to the recovery bridge export."
          : "Assign one presenter owner before replaying offline collaboration events.",
    },
    {
      id: "desktop-recovery-reconnect-quality",
      status: reconnectStatus,
      label: "Reconnect quality handoff",
      detail: `${collaborationSyncReplay.recoveredPeerCount} peer${collaborationSyncReplay.recoveredPeerCount === 1 ? "" : "s"} recovered, ${collaborationSyncReplay.unrecoveredPeerCount} unrecovered, quality ${collaborationSyncReplay.reconnectQualityScore}/100.`,
      ownerPeerId: null,
      ownerName: null,
      metric: collaborationSyncReplay.unrecoveredPeerCount,
      recommendation:
        reconnectStatus === "ready"
          ? "Reconnect quality is ready for desktop handoff."
          : "Keep the room open until disconnected peers recover or are explicitly removed from handoff.",
    },
    {
      id: "desktop-recovery-follow-target",
      status: followStatus,
      label: "Follow target continuity",
      detail: followedPeer
        ? `${followedPeer.name} is available as the followed reconnect target.`
        : collaborationPresence.followedPeerId
          ? "The followed peer is no longer present in the room."
          : "No followed peer is selected for reconnect continuity.",
      ownerPeerId: followedPeer?.id ?? null,
      ownerName: followedPeer?.name ?? null,
      metric: followedPeer ? 1 : 0,
      recommendation:
        followStatus === "ready"
          ? "Follow target can be reused after reconnect."
          : "Choose a live peer before relying on viewport follow state during recovery.",
    },
  ];
}

function getOfflineReplayItems({
  collaborationSyncReplay,
  offlineQueue,
}: Pick<
  DesktopCollaborationRecoveryBridgeInput,
  "collaborationSyncReplay" | "offlineQueue"
>): DesktopCollaborationOfflineReplayItem[] {
  return [
    {
      id: "desktop-recovery-sync-replay-queue",
      status:
        collaborationSyncReplay.offlineReplayQueueCount > 2
          ? "blocked"
          : collaborationSyncReplay.offlineReplayQueueCount > 0
            ? "review"
            : "ready",
      label: "Room offline replay queue",
      detail: `${collaborationSyncReplay.offlineReplayQueueCount} room replay item${collaborationSyncReplay.offlineReplayQueueCount === 1 ? "" : "s"} remain across duplicate messages, duplicate presence events, and unrecovered peers.`,
      queueCount: collaborationSyncReplay.offlineReplayQueueCount,
      failedCount: 0,
      staleCount: collaborationSyncReplay.eventDriftCount,
      recommendation:
        collaborationSyncReplay.offlineReplayQueueCount > 0
          ? "Replay or archive room sync evidence before accepting recovered edits."
          : "Room replay queue is clear.",
    },
    {
      id: "desktop-recovery-local-save-queue",
      status:
        offlineQueue.failedCount > 0
          ? "blocked"
          : offlineQueue.retryableCount > 0 || offlineQueue.staleCount > 0
            ? "review"
            : "ready",
      label: "Local offline save queue",
      detail: `${offlineQueue.retryableCount} retryable save${offlineQueue.retryableCount === 1 ? "" : "s"}, ${offlineQueue.failedCount} failed, and ${offlineQueue.staleCount} stale snapshot${offlineQueue.staleCount === 1 ? "" : "s"}.`,
      queueCount: offlineQueue.retryableCount,
      failedCount: offlineQueue.failedCount,
      staleCount: offlineQueue.staleCount,
      recommendation:
        offlineQueue.failedCount > 0
          ? "Resolve failed local saves before desktop collaboration recovery signoff."
          : offlineQueue.retryableCount > 0
            ? "Replay queued local saves before exporting the recovery packet."
            : "Local offline save queue is clear.",
    },
    {
      id: "desktop-recovery-event-drift",
      status:
        collaborationSyncReplay.eventDriftCount > 4
          ? "blocked"
          : collaborationSyncReplay.eventDriftCount > 0
            ? "review"
            : "ready",
      label: "Presence event ordering",
      detail: `${collaborationSyncReplay.eventDriftCount} presence event drift signal${collaborationSyncReplay.eventDriftCount === 1 ? "" : "s"} found in replay evidence.`,
      queueCount: collaborationSyncReplay.eventDriftCount,
      failedCount: 0,
      staleCount: collaborationSyncReplay.eventDriftCount,
      recommendation:
        collaborationSyncReplay.eventDriftCount > 0
          ? "Attach event-order evidence and confirm the final cursor/chat state."
          : "Presence events are ordered for replay.",
    },
  ];
}

function getCursorChatQueue({
  activePageId,
  collaborationPresence,
  multiplayerFollowSpotlight,
  now,
}: Pick<
  DesktopCollaborationRecoveryBridgeInput,
  "activePageId" | "collaborationPresence" | "multiplayerFollowSpotlight" | "now"
>): DesktopCollaborationCursorChatQueueItem[] {
  const chatEventsByPeer = groupBy(
    collaborationPresence.presenceEvents.filter((event) => event.kind === "chat"),
    (event) => event.peerId ?? "unknown",
  );
  const currentTime = now ?? Date.now();

  if (collaborationPresence.peers.length === 0) {
    return [
      {
        id: "desktop-recovery-cursor-chat-empty",
        status: "ready",
        peerId: null,
        peerName: "No active peers",
        cursorAgeSeconds: null,
        chatEventCount: 0,
        hasCursor: false,
        detail: "There are no active peer cursors or chat messages queued for recovery.",
        recommendation: "Keep this empty-room evidence with the recovery export.",
      },
    ];
  }

  return collaborationPresence.peers.map((peer) => {
    const cursorAgeMs = Math.max(0, currentTime - peer.updatedAt);
    const chatEventCount = chatEventsByPeer.get(peer.id)?.length ?? 0;
    const staleStatus =
      cursorAgeMs >= staleCursorBlockedMs
        ? "blocked"
        : cursorAgeMs >= staleCursorReviewMs
          ? "review"
          : "ready";
    const followedViewportBlocked =
      peer.id === collaborationPresence.followedPeerId &&
      multiplayerFollowSpotlight.viewportSyncStatus === "blocked";
    const status: DesktopCollaborationRecoveryStatus =
      followedViewportBlocked || staleStatus === "blocked"
        ? "blocked"
        : !peer.cursor ||
            peer.activePageId !== activePageId ||
            staleStatus === "review" ||
            chatEventCount > 3
          ? "review"
          : "ready";

    return {
      id: `desktop-recovery-cursor-chat-${peer.id}`,
      status,
      peerId: peer.id,
      peerName: peer.name,
      cursorAgeSeconds: Math.round(cursorAgeMs / 1000),
      chatEventCount,
      hasCursor: Boolean(peer.cursor),
      detail: `${peer.name} cursor is ${Math.round(cursorAgeMs / 1000)}s old, ${peer.cursor ? "present" : "missing"}, on ${peer.activePageId === activePageId ? "the active page" : "another page"}, with ${chatEventCount} chat event${chatEventCount === 1 ? "" : "s"} queued.`,
      recommendation:
        status === "ready"
          ? "Cursor and chat state is ready for reconnect."
          : followedViewportBlocked
            ? "Refresh followed viewport state before replaying cursor/chat recovery."
            : "Refresh this peer cursor or archive the chat queue before recovery export.",
    };
  });
}

function getAdminEvidence({
  activeFileName,
  collaborationSyncReplay,
  multiplayerFollowSpotlight,
  offlineQueue,
}: {
  activeFileName: string;
  collaborationSyncReplay: DesktopCollaborationRecoveryBridgeInput["collaborationSyncReplay"];
  multiplayerFollowSpotlight: DesktopCollaborationRecoveryBridgeInput["multiplayerFollowSpotlight"];
  offlineQueue: DesktopCollaborationRecoveryBridgeInput["offlineQueue"];
}) {
  return [
    "bun run editor:desktop-collaboration-recovery-bridge-smoke",
    "Export Extensions > Desktop collaboration recovery JSON.",
    "Export Extensions > Desktop collaboration recovery CSV.",
    "Export Extensions > Desktop collaboration recovery Markdown.",
    "Export Extensions > Sync replay JSON.",
    "Export Extensions > Multiplayer follow/spotlight Markdown.",
    "Export Admin > Collaboration recovery packets JSON.",
    `Attach offline queue evidence for ${activeFileName}.`,
    `Reconnect quality ${collaborationSyncReplay.reconnectQualityScore}/100 with ${collaborationSyncReplay.unrecoveredPeerCount} unrecovered peer signals.`,
    `${offlineQueue.retryableCount} retryable offline save artifacts and ${multiplayerFollowSpotlight.adminExportEvidenceCount} multiplayer evidence artifacts available.`,
  ];
}

function getReconnectHandoffRow(
  handoffs: DesktopCollaborationReconnectHandoff[],
): DesktopCollaborationRecoveryRow {
  const status = getWorstStatus(handoffs.map((handoff) => handoff.status));
  const blocked = handoffs.filter((handoff) => handoff.status === "blocked")
    .length;
  const review = handoffs.filter((handoff) => handoff.status === "review")
    .length;

  return {
    id: "desktop-collaboration-reconnect-handoff",
    status,
    category: "reconnect-handoff",
    label: "Reconnect handoff",
    detail:
      blocked > 0
        ? `${blocked} reconnect handoff signal${blocked === 1 ? "" : "s"} block desktop recovery.`
        : review > 0
          ? `${review} reconnect handoff signal${review === 1 ? "" : "s"} need review.`
          : "Presenter, reconnect quality, and follow target handoff are ready.",
    metric: blocked + review,
    threshold: 0,
    packetIds: ["desktop-recovery-reconnect-handoff-packet"],
    recommendation:
      status === "ready"
        ? "Keep reconnect handoff evidence with the desktop recovery export."
        : "Resolve presenter ownership, followed peer, or reconnect quality before handoff.",
  };
}

function getOfflineReplayRow(
  items: DesktopCollaborationOfflineReplayItem[],
): DesktopCollaborationRecoveryRow {
  const status = getWorstStatus(items.map((item) => item.status));
  const queueCount = items.reduce((total, item) => total + item.queueCount, 0);
  const failedCount = items.reduce((total, item) => total + item.failedCount, 0);
  const staleCount = items.reduce((total, item) => total + item.staleCount, 0);

  return {
    id: "desktop-collaboration-offline-event-replay",
    status,
    category: "offline-event-replay",
    label: "Offline event replay",
    detail: `${queueCount} replay queue signal${queueCount === 1 ? "" : "s"}, ${failedCount} failed save${failedCount === 1 ? "" : "s"}, and ${staleCount} stale/drift signal${staleCount === 1 ? "" : "s"} are tracked.`,
    metric: queueCount + failedCount + staleCount,
    threshold: 0,
    packetIds: ["desktop-recovery-offline-replay-packet"],
    recommendation:
      status === "ready"
        ? "Offline event replay is clear for desktop recovery."
        : "Replay, archive, or remove failed offline events before release handoff.",
  };
}

function getCursorChatQueueRow(
  items: DesktopCollaborationCursorChatQueueItem[],
): DesktopCollaborationRecoveryRow {
  const status = getWorstStatus(items.map((item) => item.status));
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const reviewCount = items.filter((item) => item.status === "review").length;

  return {
    id: "desktop-collaboration-cursor-chat-queue",
    status,
    category: "cursor-chat-queue",
    label: "Cursor/chat queue safety",
    detail:
      blockedCount > 0
        ? `${blockedCount} peer cursor/chat queue${blockedCount === 1 ? "" : "s"} block recovery.`
        : reviewCount > 0
          ? `${reviewCount} peer cursor/chat queue${reviewCount === 1 ? "" : "s"} need review.`
          : "Peer cursors and chat queues are safe for reconnect.",
    metric: blockedCount + reviewCount,
    threshold: 0,
    packetIds: ["desktop-recovery-cursor-chat-packet"],
    recommendation:
      status === "ready"
        ? "Cursor/chat queue is ready for reconnect."
        : "Refresh stale cursors, followed viewport state, or chat queue evidence before export.",
  };
}

function getAdminEvidenceRow(evidence: string[]): DesktopCollaborationRecoveryRow {
  return {
    id: "desktop-collaboration-admin-evidence",
    status: evidence.length >= 6 ? "ready" : "review",
    category: "admin-evidence",
    label: "Admin evidence exports",
    detail: `${evidence.length} admin evidence artifact${evidence.length === 1 ? "" : "s"} are ready for the collaboration recovery handoff.`,
    metric: evidence.length,
    threshold: 6,
    packetIds: ["desktop-recovery-admin-evidence-packet"],
    recommendation:
      evidence.length >= 6
        ? "Export JSON, CSV, and Markdown evidence for the release/admin owner."
        : "Collect admin recovery exports before marking the bridge ready.",
  };
}

function getRecoveryPackets({
  adminEvidence,
  cursorChatQueue,
  offlineReplayItems,
  reconnectHandoffs,
  rows,
}: {
  adminEvidence: string[];
  cursorChatQueue: DesktopCollaborationCursorChatQueueItem[];
  offlineReplayItems: DesktopCollaborationOfflineReplayItem[];
  reconnectHandoffs: DesktopCollaborationReconnectHandoff[];
  rows: DesktopCollaborationRecoveryRow[];
}): DesktopCollaborationRecoveryPacket[] {
  const reconnectStatus = getWorstStatus(
    reconnectHandoffs.map((handoff) => handoff.status),
  );
  const offlineStatus = getWorstStatus(
    offlineReplayItems.map((item) => item.status),
  );
  const cursorStatus = getWorstStatus(cursorChatQueue.map((item) => item.status));
  const bridgeStatus = getWorstStatus(rows.map((row) => row.status));

  return [
    {
      id: "desktop-recovery-reconnect-handoff-packet",
      kind: "reconnect-handoff",
      status: reconnectStatus,
      label: "Reconnect handoff packet",
      detail: `${reconnectHandoffs.length} reconnect handoff signal${reconnectHandoffs.length === 1 ? "" : "s"} are captured.`,
      evidenceCount: reconnectHandoffs.length,
      steps: [
        "Confirm one presenter or handoff owner.",
        "Verify reconnect quality is acceptable.",
        "Confirm the followed peer is still available or clear follow state.",
      ],
    },
    {
      id: "desktop-recovery-offline-replay-packet",
      kind: "offline-replay",
      status: offlineStatus,
      label: "Offline event replay packet",
      detail: `${offlineReplayItems.length} offline replay source${offlineReplayItems.length === 1 ? "" : "s"} are joined.`,
      evidenceCount: offlineReplayItems.reduce(
        (total, item) => total + item.queueCount + item.failedCount + item.staleCount,
        0,
      ),
      steps: [
        "Replay queued local save artifacts.",
        "Archive room replay and event drift evidence.",
        "Attach failed save errors before release signoff.",
      ],
    },
    {
      id: "desktop-recovery-cursor-chat-packet",
      kind: "cursor-chat-safety",
      status: cursorStatus,
      label: "Cursor/chat queue safety packet",
      detail: `${cursorChatQueue.length} peer cursor/chat queue${cursorChatQueue.length === 1 ? "" : "s"} are reviewed.`,
      evidenceCount: cursorChatQueue.reduce(
        (total, item) => total + item.chatEventCount + (item.hasCursor ? 1 : 0),
        0,
      ),
      steps: [
        "Refresh stale peer cursor state.",
        "Confirm followed viewport drift is resolved.",
        "Export chat queue evidence with peer names and redacted message bodies.",
      ],
    },
    {
      id: "desktop-recovery-admin-evidence-packet",
      kind: "admin-evidence-export",
      status: adminEvidence.length >= 6 ? "ready" : "review",
      label: "Admin evidence export packet",
      detail: `${adminEvidence.length} admin evidence artifact${adminEvidence.length === 1 ? "" : "s"} are listed.`,
      evidenceCount: adminEvidence.length,
      steps: [
        "Export desktop recovery JSON.",
        "Export desktop recovery CSV.",
        "Export desktop recovery Markdown and attach admin packet references.",
      ],
    },
    {
      id: "desktop-recovery-operator-bridge-packet",
      kind: "operator-bridge",
      status: bridgeStatus,
      label: "Operator bridge packet",
      detail: `${rows.length} recovery bridge row${rows.length === 1 ? "" : "s"} summarize desktop collaboration readiness.`,
      evidenceCount: rows.length,
      steps: [
        "Review blocked rows first.",
        "Attach packet exports to the release owner.",
        "Keep offline replay and handoff evidence together for post-incident recovery.",
      ],
    },
  ];
}

function getWorstStatus(
  statuses: DesktopCollaborationRecoveryStatus[],
): DesktopCollaborationRecoveryStatus {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return "ready";
}

function sortRows(
  left: DesktopCollaborationRecoveryRow,
  right: DesktopCollaborationRecoveryRow,
) {
  const rank: Record<DesktopCollaborationRecoveryStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return rank[left.status] - rank[right.status] || left.id.localeCompare(right.id);
}

function groupBy<TItem, TKey>(
  items: TItem[],
  getKey: (item: TItem) => TKey,
) {
  const groups = new Map<TKey, TItem[]>();

  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return groups;
}
