import type {
  CollaborationChatMessage,
  CollaborationPeer,
  CollaborationPresenceEvent,
} from "@/features/editor/collaboration-presence";
import {
  getCollaborationChatReview,
  getCollaborationPresenterHandoff,
} from "@/features/editor/collaboration-handoff";

export type CollaborationSessionReviewStatus =
  | "ready"
  | "review"
  | "blocked";

export type CollaborationSessionReviewKind =
  | "activity"
  | "chat"
  | "follow"
  | "presence"
  | "spotlight"
  | "viewport";

export type CollaborationSessionReviewRow = {
  id: string;
  status: CollaborationSessionReviewStatus;
  kind: CollaborationSessionReviewKind;
  label: string;
  detail: string;
  peerId?: string;
  peerName?: string;
  peerEmail?: string | null;
  createdAt?: number;
};

export type CollaborationSessionReviewReport = {
  score: number;
  peerCount: number;
  livePeerCount: number;
  stalePeerCount: number;
  missingCursorCount: number;
  missingViewportCount: number;
  pageSpreadCount: number;
  spotlightCount: number;
  presenterReplayCount: number;
  chatCount: number;
  unreadChatCount: number;
  mentionCount: number;
  unreadMentionCount: number;
  eventCount: number;
  disconnectCount: number;
  followEventCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  lastActivityAt: number | null;
  rows: CollaborationSessionReviewRow[];
};

type CollaborationSessionReviewInput = {
  activePageId: string;
  chatMessages: CollaborationChatMessage[];
  currentUser: {
    email?: string | null;
    name: string;
  };
  lastReadAt: number;
  now?: number;
  peers: CollaborationPeer[];
  presenceEvents: CollaborationPresenceEvent[];
  selfId: string;
};

const presenceStaleAfterMs = 6000;
const presenceBlockedAfterMs = 8000;
const longChatBacklogThreshold = 40;
const noisyEventThreshold = 50;

export function getCollaborationSessionReview({
  activePageId,
  chatMessages,
  currentUser,
  lastReadAt,
  now = Date.now(),
  peers,
  presenceEvents,
  selfId,
}: CollaborationSessionReviewInput): CollaborationSessionReviewReport {
  const rows: CollaborationSessionReviewRow[] = [];
  const chatReview = getCollaborationChatReview({
    lastReadAt,
    messages: chatMessages,
    selfId,
    userEmail: currentUser.email,
    userName: currentUser.name,
  });
  const stalePeers = peers.filter(
    (peer) => now - peer.updatedAt >= presenceStaleAfterMs,
  );
  const missingCursorPeers = peers.filter((peer) => !peer.cursor);
  const missingViewportPeers = peers.filter((peer) => !peer.view);
  const activePages = new Set(peers.map((peer) => peer.activePageId));
  const spotlightPeers = peers.filter((peer) => peer.spotlight);
  const presenterHandoff = getCollaborationPresenterHandoff({
    peers,
    presenceEvents,
  });
  const disconnectEvents = presenceEvents.filter(
    (event) =>
      event.kind === "left" &&
      Boolean(event.detail?.toLowerCase().includes("inactivity")),
  );
  const followEvents = presenceEvents.filter(
    (event) => event.kind === "followed" || event.kind === "unfollowed",
  );
  const activityTimes = [
    ...chatMessages.map((message) => message.createdAt),
    ...presenceEvents.map((event) => event.createdAt),
    ...peers.map((peer) => peer.updatedAt),
  ];

  for (const peer of stalePeers) {
    const ageMs = now - peer.updatedAt;

    rows.push({
      id: `presence-stale-${peer.id}`,
      status: ageMs >= presenceBlockedAfterMs ? "blocked" : "review",
      kind: "presence",
      label: "Presence is stale",
      detail: `${peer.name} has not broadcast in ${formatDuration(ageMs)}.`,
      peerId: peer.id,
      peerName: peer.name,
      peerEmail: peer.email,
      createdAt: peer.updatedAt,
    });
  }

  for (const peer of missingCursorPeers) {
    rows.push({
      id: `missing-cursor-${peer.id}`,
      status: "review",
      kind: "viewport",
      label: "Cursor is unavailable",
      detail: `${peer.name} is present, but their cursor has not been published.`,
      peerId: peer.id,
      peerName: peer.name,
      peerEmail: peer.email,
      createdAt: peer.updatedAt,
    });
  }

  for (const peer of missingViewportPeers) {
    rows.push({
      id: `missing-viewport-${peer.id}`,
      status: "review",
      kind: "viewport",
      label: "Viewport is unavailable",
      detail: `${peer.name} is present, but their pan and zoom state is missing.`,
      peerId: peer.id,
      peerName: peer.name,
      peerEmail: peer.email,
      createdAt: peer.updatedAt,
    });
  }

  if (spotlightPeers.length > 1) {
    rows.push({
      id: "multiple-spotlights",
      status: "blocked",
      kind: "spotlight",
      label: "Multiple spotlights are active",
      detail: `${spotlightPeers.map((peer) => peer.name).join(", ")} are broadcasting at the same time.`,
      createdAt: Math.max(...spotlightPeers.map((peer) => peer.updatedAt)),
    });
  }

  if (chatReview.unreadMentionCount > 0) {
    rows.push({
      id: "unread-mentions",
      status: "review",
      kind: "chat",
      label: "Unread mentions need review",
      detail: `${chatReview.unreadMentionCount} unread mention${chatReview.unreadMentionCount === 1 ? "" : "s"} in session chat.`,
      createdAt: getLatestMessageTime(chatMessages),
    });
  }

  if (chatMessages.length > longChatBacklogThreshold) {
    rows.push({
      id: "long-chat-backlog",
      status: "review",
      kind: "chat",
      label: "Long chat backlog",
      detail: `${chatMessages.length} session messages should be summarized before handoff.`,
      createdAt: getLatestMessageTime(chatMessages),
    });
  }

  if (presenceEvents.length > noisyEventThreshold) {
    rows.push({
      id: "busy-presence-log",
      status: "review",
      kind: "activity",
      label: "Presence log is busy",
      detail: `${presenceEvents.length} activity events are recorded in this session.`,
      createdAt: getLatestEventTime(presenceEvents),
    });
  }

  for (const event of disconnectEvents.slice(0, 6)) {
    rows.push({
      id: `disconnect-${event.id}`,
      status: "review",
      kind: "presence",
      label: "Inactive collaborator disconnected",
      detail: `${event.peerName}: ${event.detail ?? "Disconnected after inactivity."}`,
      peerId: event.peerId,
      peerName: event.peerName,
      peerEmail: event.peerEmail,
      createdAt: event.createdAt,
    });
  }

  if (peers.length > 0 && activePages.size > 1) {
    rows.push({
      id: "page-spread",
      status: "ready",
      kind: "viewport",
      label: "Collaborators are on multiple pages",
      detail: `${activePages.size} pages are active; current page is ${activePageId}.`,
      createdAt: getLatestPeerTime(peers),
    });
  }

  if (spotlightPeers.length === 1) {
    const peer = spotlightPeers[0];

    rows.push({
      id: `spotlight-${peer.id}`,
      status: "ready",
      kind: "spotlight",
      label: "Spotlight is active",
      detail: `${peer.name} is broadcasting their viewport.`,
      peerId: peer.id,
      peerName: peer.name,
      peerEmail: peer.email,
      createdAt: peer.updatedAt,
    });
  }

  if (presenterHandoff.replayEventCount > 0) {
    rows.push({
      id: "presenter-handoff-replay",
      status: presenterHandoff.status === "conflict" ? "blocked" : "ready",
      kind: "spotlight",
      label: "Presenter handoff replay is available",
      detail: presenterHandoff.summary,
      peerId: presenterHandoff.ownerPeerId ?? undefined,
      peerName: presenterHandoff.ownerName ?? undefined,
      peerEmail: presenterHandoff.ownerEmail,
      createdAt: presenterHandoff.lastHandoffAt ?? undefined,
    });
  }

  if (followEvents.length > 0) {
    const event = followEvents[0];

    rows.push({
      id: "follow-activity",
      status: "ready",
      kind: "follow",
      label: "Follow activity recorded",
      detail: `${followEvents.length} follow event${followEvents.length === 1 ? "" : "s"} in this session.`,
      peerId: event.peerId,
      peerName: event.peerName,
      peerEmail: event.peerEmail,
      createdAt: event.createdAt,
    });
  }

  if (rows.length === 0) {
    rows.push({
      id: "session-ready",
      status: "ready",
      kind: "presence",
      label: peers.length > 0 ? "Session is ready" : "No live collaborators",
      detail:
        peers.length > 0
          ? "Presence, cursor chat, and viewport handoff have no open review items."
          : "This file has no active collaborator sessions right now.",
      createdAt:
        activityTimes.length > 0 ? Math.max(...activityTimes) : undefined,
    });
  }

  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),
    peerCount: peers.length,
    livePeerCount: peers.length - stalePeers.length,
    stalePeerCount: stalePeers.length,
    missingCursorCount: missingCursorPeers.length,
    missingViewportCount: missingViewportPeers.length,
    pageSpreadCount: activePages.size,
    spotlightCount: spotlightPeers.length,
    presenterReplayCount: presenterHandoff.replayEventCount,
    chatCount: chatMessages.length,
    unreadChatCount: chatReview.unreadCount,
    mentionCount: chatReview.mentionCount,
    unreadMentionCount: chatReview.unreadMentionCount,
    eventCount: presenceEvents.length,
    disconnectCount: disconnectEvents.length,
    followEventCount: followEvents.length,
    readyCount,
    reviewCount,
    blockedCount,
    lastActivityAt:
      activityTimes.length > 0 ? Math.max(...activityTimes) : null,
    rows,
  };
}

export function getCollaborationSessionReviewCsv(
  report: CollaborationSessionReviewReport,
  rows: CollaborationSessionReviewRow[] = report.rows,
) {
  const header: Array<keyof CollaborationSessionReviewRow> = [
    "id",
    "status",
    "kind",
    "label",
    "detail",
    "peerId",
    "peerName",
    "peerEmail",
    "createdAt",
  ];

  return [
    [
      "score",
      "peers",
      "livePeers",
      "stalePeers",
      "missingCursors",
      "missingViewports",
      "presenterReplay",
      "unreadMentions",
      "disconnects",
    ].join(","),
    [
      report.score,
      report.peerCount,
      report.livePeerCount,
      report.stalePeerCount,
      report.missingCursorCount,
      report.missingViewportCount,
      report.presenterReplayCount,
      report.unreadMentionCount,
      report.disconnectCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) => header.map((key) => escapeCsvCell(row[key])).join(",")),
  ].join("\n");
}

export function getCollaborationSessionReviewMarkdown(
  report: CollaborationSessionReviewReport,
  rows: CollaborationSessionReviewRow[] = report.rows,
) {
  return [
    "# Collaboration Session Review",
    "",
    `Score: ${report.score}`,
    `Peers: ${report.peerCount}`,
    `Live peers: ${report.livePeerCount}`,
    `Stale peers: ${report.stalePeerCount}`,
    `Missing cursors: ${report.missingCursorCount}`,
    `Missing viewports: ${report.missingViewportCount}`,
    `Presenter replay events: ${report.presenterReplayCount}`,
    `Unread mentions: ${report.unreadMentionCount}`,
    `Disconnects: ${report.disconnectCount}`,
    `Last activity: ${report.lastActivityAt ? new Date(report.lastActivityAt).toISOString() : "No activity"}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.label}: ${row.detail}${row.peerName ? ` (${row.peerName})` : ""}`,
        )
      : ["- No collaboration review rows."]),
  ].join("\n");
}

function getLatestPeerTime(peers: CollaborationPeer[]) {
  return peers.length > 0
    ? Math.max(...peers.map((peer) => peer.updatedAt))
    : undefined;
}

function getLatestMessageTime(messages: CollaborationChatMessage[]) {
  return messages.length > 0
    ? Math.max(...messages.map((message) => message.createdAt))
    : undefined;
}

function getLatestEventTime(events: CollaborationPresenceEvent[]) {
  return events.length > 0
    ? Math.max(...events.map((event) => event.createdAt))
    : undefined;
}

function formatDuration(value: number) {
  if (value < 1000) {
    return `${value}ms`;
  }

  return `${Math.round(value / 1000)}s`;
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
