import type {
  CollaborationChatMessage,
  CollaborationPeer,
  CollaborationPresenceEvent,
} from "@/features/editor/collaboration-presence";

export type CollaborationSessionSummary = {
  peerCount: number;
  spotlightCount: number;
  chatCount: number;
  eventCount: number;
  lastActivityAt: number | null;
};

export type CollaborationSessionResume = {
  headline: string;
  lastActivityAt: number | null;
  activePeerCount: number;
  chatCount: number;
  eventCount: number;
  spotlightCount: number;
  latestMessage: CollaborationChatMessage | null;
  latestEvent: CollaborationPresenceEvent | null;
  collaborators: CollaborationResumeCollaborator[];
  presenter: CollaborationPresenterHandoff;
};

export type CollaborationResumeCollaborator = {
  key: string;
  name: string;
  email?: string | null;
  color?: string;
  active: boolean;
  chatCount: number;
  eventCount: number;
  lastActivityAt: number;
};

export type CollaborationChatReview = {
  unreadCount: number;
  mentionCount: number;
  unreadMentionCount: number;
};

export type CollaborationViewportSnapshot = {
  peerId: string;
  peerName: string;
  peerEmail?: string | null;
  activePageId: string;
  spotlight: boolean;
  cursorX: number | null;
  cursorY: number | null;
  viewX: number | null;
  viewY: number | null;
  zoom: number | null;
  updatedAt: number;
};

export type CollaborationPresenterHandoffStatus =
  | "idle"
  | "owned"
  | "conflict";

export type CollaborationPresenterHandoff = {
  status: CollaborationPresenterHandoffStatus;
  ownerPeerId: string | null;
  ownerName: string | null;
  ownerEmail?: string | null;
  ownerColor?: string | null;
  spotlightEventCount: number;
  followEventCount: number;
  replayEventCount: number;
  lastHandoffAt: number | null;
  summary: string;
  replayEvents: CollaborationPresenceEvent[];
};

export function getCollaborationSessionSummary({
  chatMessages,
  peers,
  presenceEvents,
}: {
  chatMessages: CollaborationChatMessage[];
  peers: CollaborationPeer[];
  presenceEvents: CollaborationPresenceEvent[];
}): CollaborationSessionSummary {
  const activityTimes = [
    ...chatMessages.map((message) => message.createdAt),
    ...presenceEvents.map((event) => event.createdAt),
    ...peers.map((peer) => peer.updatedAt),
  ];

  return {
    peerCount: peers.length,
    spotlightCount: peers.filter((peer) => peer.spotlight).length,
    chatCount: chatMessages.length,
    eventCount: presenceEvents.length,
    lastActivityAt:
      activityTimes.length > 0 ? Math.max(...activityTimes) : null,
  };
}

export function getCollaborationSessionResume({
  chatMessages,
  peers,
  presenceEvents,
}: {
  chatMessages: CollaborationChatMessage[];
  peers: CollaborationPeer[];
  presenceEvents: CollaborationPresenceEvent[];
}): CollaborationSessionResume {
  const summary = getCollaborationSessionSummary({
    chatMessages,
    peers,
    presenceEvents,
  });
  const latestMessage = getLatestCreatedItem(chatMessages);
  const latestEvent = getLatestCreatedItem(presenceEvents);
  const collaborators = getCollaborationResumeCollaborators({
    chatMessages,
    peers,
    presenceEvents,
  });
  const presenter = getCollaborationPresenterHandoff({
    peers,
    presenceEvents,
  });

  return {
    headline: getCollaborationResumeHeadline(summary),
    lastActivityAt: summary.lastActivityAt,
    activePeerCount: summary.peerCount,
    chatCount: summary.chatCount,
    eventCount: summary.eventCount,
    spotlightCount: summary.spotlightCount,
    latestMessage,
    latestEvent,
    collaborators,
    presenter,
  };
}

export function getCollaborationPresenterHandoff({
  peers,
  presenceEvents,
}: {
  peers: CollaborationPeer[];
  presenceEvents: CollaborationPresenceEvent[];
}): CollaborationPresenterHandoff {
  const spotlightPeers = peers.filter((peer) => peer.spotlight);
  const spotlightEvents = presenceEvents.filter(
    (event) =>
      event.kind === "spotlight-on" || event.kind === "spotlight-off",
  );
  const followEvents = presenceEvents.filter(
    (event) => event.kind === "followed" || event.kind === "unfollowed",
  );
  const replayEvents = [...spotlightEvents, ...followEvents]
    .sort((first, second) => second.createdAt - first.createdAt)
    .slice(0, 12);
  const owner = spotlightPeers.length === 1 ? spotlightPeers[0] : null;
  const lastHandoffAt =
    replayEvents.length > 0 ? Math.max(...replayEvents.map((event) => event.createdAt)) : null;
  const status: CollaborationPresenterHandoffStatus =
    spotlightPeers.length > 1 ? "conflict" : owner ? "owned" : "idle";

  return {
    status,
    ownerPeerId: owner?.id ?? null,
    ownerName: owner?.name ?? null,
    ownerEmail: owner?.email,
    ownerColor: owner?.color,
    spotlightEventCount: spotlightEvents.length,
    followEventCount: followEvents.length,
    replayEventCount: replayEvents.length,
    lastHandoffAt,
    summary: getPresenterHandoffSummary(status, owner, replayEvents.length),
    replayEvents,
  };
}

export function getCollaborationPresenceEventsCsv(
  events: CollaborationPresenceEvent[],
) {
  const header: Array<keyof CollaborationPresenceEvent> = [
    "id",
    "kind",
    "peerId",
    "peerName",
    "peerEmail",
    "detail",
    "createdAt",
  ];

  return [
    header.join(","),
    ...events.map((event) =>
      header.map((key) => escapeCsvCell(event[key])).join(","),
    ),
  ].join("\n");
}

export function getCollaborationChatMessagesCsv(
  messages: CollaborationChatMessage[],
) {
  const header: Array<keyof CollaborationChatMessage> = [
    "id",
    "peerId",
    "name",
    "email",
    "text",
    "createdAt",
  ];

  return [
    header.join(","),
    ...messages.map((message) =>
      header.map((key) => escapeCsvCell(message[key])).join(","),
    ),
  ].join("\n");
}

export function getCollaborationChatReview({
  lastReadAt,
  messages,
  selfId,
  userEmail,
  userName,
}: {
  lastReadAt: number;
  messages: CollaborationChatMessage[];
  selfId: string;
  userEmail?: string | null;
  userName: string;
}): CollaborationChatReview {
  const reviewerMessages = messages.filter((message) => message.peerId !== selfId);
  const mentions = reviewerMessages.filter((message) =>
    messageMentionsUser(message.text, userName, userEmail),
  );

  return {
    unreadCount: reviewerMessages.filter((message) => message.createdAt > lastReadAt)
      .length,
    mentionCount: mentions.length,
    unreadMentionCount: mentions.filter(
      (message) => message.createdAt > lastReadAt,
    ).length,
  };
}

export function getCollaborationViewportSnapshots(
  peers: CollaborationPeer[],
): CollaborationViewportSnapshot[] {
  return peers.map((peer) => ({
    peerId: peer.id,
    peerName: peer.name,
    peerEmail: peer.email,
    activePageId: peer.activePageId,
    spotlight: peer.spotlight,
    cursorX: peer.cursor?.x ?? null,
    cursorY: peer.cursor?.y ?? null,
    viewX: peer.view?.x ?? null,
    viewY: peer.view?.y ?? null,
    zoom: peer.view?.zoom ?? null,
    updatedAt: peer.updatedAt,
  }));
}

export function getCollaborationViewportSnapshotsCsv(
  peers: CollaborationPeer[],
) {
  const header: Array<keyof CollaborationViewportSnapshot> = [
    "peerId",
    "peerName",
    "peerEmail",
    "activePageId",
    "spotlight",
    "cursorX",
    "cursorY",
    "viewX",
    "viewY",
    "zoom",
    "updatedAt",
  ];

  return [
    header.join(","),
    ...getCollaborationViewportSnapshots(peers).map((snapshot) =>
      header.map((key) => escapeCsvCell(snapshot[key])).join(","),
    ),
  ].join("\n");
}

export function getCollaborationSessionHandoffMarkdown({
  chatMessages,
  peers,
  presenceEvents,
}: {
  chatMessages: CollaborationChatMessage[];
  peers: CollaborationPeer[];
  presenceEvents: CollaborationPresenceEvent[];
}) {
  const summary = getCollaborationSessionSummary({
    chatMessages,
    peers,
    presenceEvents,
  });
  const snapshots = getCollaborationViewportSnapshots(peers);
  const presenter = getCollaborationPresenterHandoff({
    peers,
    presenceEvents,
  });

  return [
    "# Collaboration Session Handoff",
    "",
    `Peers: ${summary.peerCount}`,
    `Spotlights: ${summary.spotlightCount}`,
    `Chat messages: ${summary.chatCount}`,
    `Activity events: ${summary.eventCount}`,
    `Last activity: ${summary.lastActivityAt ? new Date(summary.lastActivityAt).toISOString() : "No activity"}`,
    `Presenter: ${presenter.ownerName ?? presenter.status}`,
    `Presenter replay events: ${presenter.replayEventCount}`,
    "",
    "## Collaborator Viewports",
    ...(snapshots.length > 0
      ? snapshots.map(
          (snapshot) =>
            `- ${snapshot.peerName}: page ${snapshot.activePageId}, zoom ${formatOptionalNumber(snapshot.zoom)}, pan ${formatOptionalNumber(snapshot.viewX)}/${formatOptionalNumber(snapshot.viewY)}, cursor ${formatOptionalNumber(snapshot.cursorX)}/${formatOptionalNumber(snapshot.cursorY)}, spotlight ${snapshot.spotlight ? "on" : "off"}`,
        )
      : ["- No active collaborator viewports."]),
    "",
    "## Presenter Handoff",
    `- Status: ${presenter.status}`,
    `- Owner: ${presenter.ownerName ?? "No active presenter"}`,
    `- Spotlight events: ${presenter.spotlightEventCount}`,
    `- Follow events: ${presenter.followEventCount}`,
    ...(presenter.replayEvents.length > 0
      ? presenter.replayEvents.map(
          (event) =>
            `- ${event.kind} / ${event.peerName} (${new Date(event.createdAt).toISOString()}): ${event.detail ?? "No detail"}`,
        )
      : ["- No presenter replay evidence recorded."]),
    "",
    "## Recent Chat",
    ...(chatMessages.length > 0
      ? chatMessages
          .slice(-8)
          .map(
            (message) =>
              `- ${message.name} (${new Date(message.createdAt).toISOString()}): ${message.text}`,
          )
      : ["- No session chat messages."]),
    "",
    "## Recent Activity",
    ...(presenceEvents.length > 0
      ? presenceEvents
          .slice(0, 12)
          .map(
            (event) =>
              `- ${event.kind} / ${event.peerName} (${new Date(event.createdAt).toISOString()}): ${event.detail ?? "No detail"}`,
          )
      : ["- No collaboration activity recorded."]),
  ].join("\n");
}

function getPresenterHandoffSummary(
  status: CollaborationPresenterHandoffStatus,
  owner: CollaborationPeer | null,
  replayEventCount: number,
) {
  if (status === "conflict") {
    return "Multiple collaborators are broadcasting spotlight at the same time.";
  }

  if (status === "owned" && owner) {
    return `${owner.name} owns the live presenter spotlight with ${replayEventCount} replay event${replayEventCount === 1 ? "" : "s"}.`;
  }

  return replayEventCount > 0
    ? `No live presenter, but ${replayEventCount} handoff replay event${replayEventCount === 1 ? "" : "s"} are available.`
    : "No live presenter or handoff replay evidence yet.";
}

export function messageMentionsUser(
  text: string,
  userName: string,
  userEmail?: string | null,
) {
  const normalizedText = text.toLowerCase();
  const tokens = getMentionTokens(userName, userEmail);

  return tokens.some((token) => normalizedText.includes(token));
}

function getMentionTokens(userName: string, userEmail?: string | null) {
  const nameParts = userName
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const email = userEmail?.toLowerCase().trim();
  const emailHandle = email?.split("@")[0];

  return Array.from(
    new Set(
      [
        ...nameParts.map((part) => `@${part}`),
        email ? `@${email}` : "",
        emailHandle ? `@${emailHandle}` : "",
      ].filter(Boolean),
    ),
  );
}

function formatOptionalNumber(value: number | null) {
  return value === null ? "n/a" : Number(value.toFixed(2)).toString();
}

function getCollaborationResumeHeadline(summary: CollaborationSessionSummary) {
  if (
    summary.peerCount === 0 &&
    summary.chatCount === 0 &&
    summary.eventCount === 0
  ) {
    return "No collaboration activity has been recorded for this file yet.";
  }

  if (summary.peerCount > 0) {
    return `${summary.peerCount} active collaborator${
      summary.peerCount === 1 ? "" : "s"
    } in this file session.`;
  }

  return `Resume from ${summary.chatCount} chat message${
    summary.chatCount === 1 ? "" : "s"
  } and ${summary.eventCount} activity event${
    summary.eventCount === 1 ? "" : "s"
  }.`;
}

function getCollaborationResumeCollaborators({
  chatMessages,
  peers,
  presenceEvents,
}: {
  chatMessages: CollaborationChatMessage[];
  peers: CollaborationPeer[];
  presenceEvents: CollaborationPresenceEvent[];
}) {
  const collaborators = new Map<string, CollaborationResumeCollaborator>();

  for (const peer of peers) {
    const key = getCollaboratorKey(peer.email, peer.id);
    collaborators.set(key, {
      key,
      name: peer.name,
      email: peer.email,
      color: peer.color,
      active: true,
      chatCount: 0,
      eventCount: 0,
      lastActivityAt: peer.updatedAt,
    });
  }

  for (const message of chatMessages) {
    const key = getCollaboratorKey(message.email, message.peerId);
    const collaborator =
      collaborators.get(key) ??
      createResumeCollaborator({
        key,
        name: message.name,
        email: message.email,
        color: message.color,
        active: false,
        lastActivityAt: message.createdAt,
      });

    collaborators.set(key, {
      ...collaborator,
      color: collaborator.color ?? message.color,
      chatCount: collaborator.chatCount + 1,
      lastActivityAt: Math.max(collaborator.lastActivityAt, message.createdAt),
    });
  }

  for (const event of presenceEvents) {
    const key = getCollaboratorKey(
      event.peerEmail,
      event.peerId ?? event.peerName,
    );
    const collaborator =
      collaborators.get(key) ??
      createResumeCollaborator({
        key,
        name: event.peerName,
        email: event.peerEmail,
        color: event.color,
        active: false,
        lastActivityAt: event.createdAt,
      });

    collaborators.set(key, {
      ...collaborator,
      color: collaborator.color ?? event.color,
      eventCount: collaborator.eventCount + 1,
      lastActivityAt: Math.max(collaborator.lastActivityAt, event.createdAt),
    });
  }

  return Array.from(collaborators.values())
    .sort((first, second) => second.lastActivityAt - first.lastActivityAt)
    .slice(0, 5);
}

function createResumeCollaborator({
  key,
  name,
  email,
  color,
  active,
  lastActivityAt,
}: Pick<
  CollaborationResumeCollaborator,
  "active" | "color" | "email" | "key" | "lastActivityAt" | "name"
>): CollaborationResumeCollaborator {
  return {
    key,
    name,
    email,
    color,
    active,
    chatCount: 0,
    eventCount: 0,
    lastActivityAt,
  };
}

function getCollaboratorKey(
  email: string | null | undefined,
  fallback: string,
) {
  return email?.toLowerCase().trim() || fallback;
}

function getLatestCreatedItem<TItem extends { createdAt: number }>(
  items: TItem[],
) {
  return items.reduce<TItem | null>(
    (latest, item) =>
      !latest || item.createdAt > latest.createdAt ? item : latest,
    null,
  );
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
