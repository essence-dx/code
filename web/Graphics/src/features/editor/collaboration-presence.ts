"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CanvasView,
  DesignCommandTelemetry,
} from "@/features/editor/types";
import { createCommandTelemetry } from "@/features/editor/command-telemetry";
import {
  getCollaborationRoomState,
  saveCollaborationRoomState,
} from "@/features/editor/collaboration-room-actions";
import {
  getEmptyCollaborationRoomSnapshot,
  maxCollaborationRoomChatMessages,
  maxCollaborationRoomPresenceEvents,
  mergeCollaborationRoomSnapshots,
  type CollaborationRoomSnapshot,
} from "@/features/editor/collaboration-room-state";

export type CollaborationCursor = {
  x: number;
  y: number;
  pageId: string;
};

export type CollaborationPeer = {
  id: string;
  name: string;
  email?: string | null;
  color: string;
  cursor?: CollaborationCursor;
  view?: CanvasView;
  activePageId: string;
  spotlight: boolean;
  updatedAt: number;
};

export type CollaborationChatMessage = {
  id: string;
  peerId: string;
  name: string;
  email?: string | null;
  color: string;
  text: string;
  createdAt: number;
};

export type CollaborationPresenceEventKind =
  | "joined"
  | "left"
  | "chat"
  | "spotlight-on"
  | "spotlight-off"
  | "followed"
  | "unfollowed";

export type CollaborationPresenceEvent = {
  id: string;
  kind: CollaborationPresenceEventKind;
  peerId?: string;
  peerName: string;
  peerEmail?: string | null;
  color?: string;
  detail?: string;
  createdAt: number;
};

export type CollaborationRoomSyncStatus =
  | "loading"
  | "synced"
  | "syncing"
  | "offline";

type PresenceMessage =
  | {
      type: "presence";
      peer: CollaborationPeer;
    }
  | {
      type: "chat";
      message: CollaborationChatMessage;
    }
  | {
      type: "leave";
      peerId: string;
    };

type UseLocalPresenceOptions = {
  fileId: string;
  user: {
    name: string;
    email?: string | null;
  };
  activePageId: string;
  view: CanvasView;
  onCommandTelemetry?: (telemetry: DesignCommandTelemetry) => void;
};

const staleAfterMs = 8000;
const broadcastThrottleMs = 50;

export function useLocalCollaborationPresence({
  fileId,
  user,
  activePageId,
  view,
  onCommandTelemetry,
}: UseLocalPresenceOptions) {
  const selfId = useMemo(() => createPresenceId(), []);
  const [peersById, setPeersById] = useState<Record<string, CollaborationPeer>>(
    {},
  );
  const [chatMessages, setChatMessages] = useState<CollaborationChatMessage[]>(
    [],
  );
  const [presenceEvents, setPresenceEvents] = useState<
    CollaborationPresenceEvent[]
  >([]);
  const [spotlight, setSpotlight] = useState(false);
  const [roomSyncStatus, setRoomSyncStatus] =
    useState<CollaborationRoomSyncStatus>("loading");
  const [roomSyncedAt, setRoomSyncedAt] = useState<number | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const peersByIdRef = useRef<Record<string, CollaborationPeer>>({});
  const lastBroadcastAtRef = useRef(0);
  const skipNextStorageWriteRef = useRef(true);
  const serverSaveTimeoutRef = useRef<number | null>(null);
  const onCommandTelemetryRef = useRef(onCommandTelemetry);
  const broadcastPresenceRef = useRef<
    (patch?: Partial<CollaborationPeer>, force?: boolean) => void
  >(() => undefined);
  const spotlightMountedRef = useRef(false);
  const latestPeerRef = useRef<CollaborationPeer>({
    id: selfId,
    name: user.name || user.email || "Anonymous",
    email: user.email,
    color: getPresenceColor(user.email || user.name || selfId),
    activePageId,
    spotlight: false,
    view,
    updatedAt: Date.now(),
  });

  useEffect(() => {
    onCommandTelemetryRef.current = onCommandTelemetry;
  }, [onCommandTelemetry]);

  useEffect(() => {
    let cancelled = false;
    const startedAt = performance.now();
    const localSnapshot = readCollaborationSessionSnapshot(fileId);

    skipNextStorageWriteRef.current = true;
    setRoomSyncStatus("loading");
    setChatMessages(localSnapshot.chatMessages);
    setPresenceEvents(localSnapshot.presenceEvents);

    void getCollaborationRoomState({ fileId })
      .then((serverSnapshot) => {
        if (cancelled) {
          return;
        }

        const mergedSnapshot = mergeCollaborationRoomSnapshots(
          localSnapshot,
          serverSnapshot,
        );

        setRoomSyncStatus("synced");
        setRoomSyncedAt(getSnapshotTimestamp(mergedSnapshot.updatedAt));
        setChatMessages(mergedSnapshot.chatMessages);
        setPresenceEvents(mergedSnapshot.presenceEvents);
        onCommandTelemetryRef.current?.(
          createCommandTelemetry({
            area: "collaboration",
            command: "room load",
            durationMs: performance.now() - startedAt,
            itemCount:
              mergedSnapshot.chatMessages.length +
              mergedSnapshot.presenceEvents.length,
          }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setRoomSyncStatus("offline");
          onCommandTelemetryRef.current?.(
            createCommandTelemetry({
              area: "collaboration",
              command: "room load",
              durationMs: performance.now() - startedAt,
              status: "failed",
            }),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileId]);

  useEffect(() => {
    if (skipNextStorageWriteRef.current) {
      skipNextStorageWriteRef.current = false;
      return;
    }

    const snapshot = {
      chatMessages,
      presenceEvents,
      updatedAt: new Date().toISOString(),
    } satisfies CollaborationRoomSnapshot;

    writeCollaborationSessionSnapshot(fileId, snapshot);

    if (serverSaveTimeoutRef.current !== null) {
      window.clearTimeout(serverSaveTimeoutRef.current);
    }

    setRoomSyncStatus("syncing");
    serverSaveTimeoutRef.current = window.setTimeout(() => {
      const startedAt = performance.now();

      void saveCollaborationRoomState({
        fileId,
        snapshot,
      })
        .then((result) => {
          setRoomSyncStatus("synced");
          setRoomSyncedAt(getSnapshotTimestamp(result.updatedAt));
          onCommandTelemetryRef.current?.(
            createCommandTelemetry({
              area: "collaboration",
              command: "room save",
              durationMs: performance.now() - startedAt,
              itemCount:
                snapshot.chatMessages.length + snapshot.presenceEvents.length,
            }),
          );
        })
        .catch(() => {
          setRoomSyncStatus("offline");
          onCommandTelemetryRef.current?.(
            createCommandTelemetry({
              area: "collaboration",
              command: "room save",
              durationMs: performance.now() - startedAt,
              status: "failed",
              itemCount:
                snapshot.chatMessages.length + snapshot.presenceEvents.length,
            }),
          );
        });
    }, 900);

    return () => {
      if (serverSaveTimeoutRef.current !== null) {
        window.clearTimeout(serverSaveTimeoutRef.current);
      }
    };
  }, [chatMessages, fileId, presenceEvents]);

  const recordPresenceEvent = useCallback(
    (
      input: Omit<CollaborationPresenceEvent, "id" | "createdAt"> &
        Partial<Pick<CollaborationPresenceEvent, "createdAt">>,
    ) => {
      setPresenceEvents((current) =>
        appendPresenceEvent(current, {
          ...input,
          id: createPresenceId(),
          createdAt: input.createdAt ?? Date.now(),
        }),
      );
    },
    [],
  );

  const broadcastPresence = useCallback(
    (patch: Partial<CollaborationPeer> = {}, force = false) => {
      const now = Date.now();

      if (!force && now - lastBroadcastAtRef.current < broadcastThrottleMs) {
        return;
      }

      const peer: CollaborationPeer = {
        ...latestPeerRef.current,
        ...patch,
        activePageId,
        view,
        spotlight,
        updatedAt: now,
      };

      latestPeerRef.current = peer;
      lastBroadcastAtRef.current = now;
      channelRef.current?.postMessage({
        type: "presence",
        peer,
      } satisfies PresenceMessage);
    },
    [activePageId, spotlight, view],
  );

  useEffect(() => {
    broadcastPresenceRef.current = broadcastPresence;
  }, [broadcastPresence]);

  useEffect(() => {
    const channel = new BroadcastChannel(`essence-figma:${fileId}:presence`);

    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<PresenceMessage>) => {
      const message = event.data;

      if (message.type === "presence") {
        if (message.peer.id === selfId) {
          return;
        }

        const existingPeer = peersByIdRef.current[message.peer.id];

        if (!existingPeer) {
          recordPresenceEvent({
            kind: "joined",
            peerId: message.peer.id,
            peerName: message.peer.name,
            peerEmail: message.peer.email,
            color: message.peer.color,
            detail: "Joined this file session.",
          });
        } else if (existingPeer.spotlight !== message.peer.spotlight) {
          recordPresenceEvent({
            kind: message.peer.spotlight ? "spotlight-on" : "spotlight-off",
            peerId: message.peer.id,
            peerName: message.peer.name,
            peerEmail: message.peer.email,
            color: message.peer.color,
            detail: message.peer.spotlight
              ? "Started broadcasting their viewport."
              : "Stopped broadcasting their viewport.",
          });
        }

        setPeersById((current) => {
          const next = {
            ...current,
            [message.peer.id]: message.peer,
          };

          peersByIdRef.current = next;
          return next;
        });
        return;
      }

      if (message.type === "chat") {
        if (message.message.peerId === selfId) {
          return;
        }

        setChatMessages((current) =>
          appendChatMessage(current, message.message),
        );
        recordPresenceEvent({
          kind: "chat",
          peerId: message.message.peerId,
          peerName: message.message.name,
          peerEmail: message.message.email,
          color: message.message.color,
          detail: message.message.text,
          createdAt: message.message.createdAt,
        });
        return;
      }

      if (message.type === "leave") {
        const peer = peersByIdRef.current[message.peerId];

        if (peer) {
          recordPresenceEvent({
            kind: "left",
            peerId: peer.id,
            peerName: peer.name,
            peerEmail: peer.email,
            color: peer.color,
            detail: "Left this file session.",
          });
        }

        setPeersById((current) => {
          const { [message.peerId]: _removedPeer, ...remainingPeers } = current;

          peersByIdRef.current = remainingPeers;
          return remainingPeers;
        });
      }
    };

    broadcastPresenceRef.current({}, true);

    return () => {
      channel.postMessage({
        type: "leave",
        peerId: selfId,
      } satisfies PresenceMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [fileId, recordPresenceEvent, selfId]);

  useEffect(() => {
    broadcastPresence({}, true);
  }, [activePageId, broadcastPresence, spotlight, user.email, user.name, view]);

  useEffect(() => {
    if (!spotlightMountedRef.current) {
      spotlightMountedRef.current = true;
      return;
    }

    const peer = latestPeerRef.current;

    recordPresenceEvent({
      kind: spotlight ? "spotlight-on" : "spotlight-off",
      peerId: selfId,
      peerName: peer.name,
      peerEmail: peer.email,
      color: peer.color,
      detail: spotlight
        ? "You started broadcasting your viewport."
        : "You stopped broadcasting your viewport.",
    });
  }, [recordPresenceEvent, selfId, spotlight]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const stalePeers = Object.values(peersByIdRef.current).filter(
        (peer) => now - peer.updatedAt >= staleAfterMs,
      );

      for (const peer of stalePeers) {
        recordPresenceEvent({
          kind: "left",
          peerId: peer.id,
          peerName: peer.name,
          peerEmail: peer.email,
          color: peer.color,
          detail: "Disconnected after inactivity.",
        });
      }

      setPeersById((current) => {
        const next = Object.fromEntries(
          Object.entries(current).filter(
            ([, peer]) => now - peer.updatedAt < staleAfterMs,
          ),
        );

        peersByIdRef.current = next;
        return next;
      });
      broadcastPresenceRef.current({}, true);
    }, 2500);

    return () => window.clearInterval(timer);
  }, [recordPresenceEvent]);

  const publishCursor = useCallback(
    (cursor: CollaborationCursor) => {
      broadcastPresence({ cursor });
    },
    [broadcastPresence],
  );

  const sendChatMessage = useCallback((text: string) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    const peer = latestPeerRef.current;
    const message: CollaborationChatMessage = {
      id: createPresenceId(),
      peerId: selfId,
      name: peer.name,
      email: peer.email,
      color: peer.color,
      text: trimmedText,
      createdAt: Date.now(),
    };

    setChatMessages((current) => appendChatMessage(current, message));
    recordPresenceEvent({
      kind: "chat",
      peerId: selfId,
      peerName: peer.name,
      peerEmail: peer.email,
      color: peer.color,
      detail: trimmedText,
      createdAt: message.createdAt,
    });
    channelRef.current?.postMessage({
      type: "chat",
      message,
    } satisfies PresenceMessage);
  }, [recordPresenceEvent, selfId]);

  const clearChatMessages = useCallback(() => {
    setChatMessages([]);
  }, []);

  const clearPresenceEvents = useCallback(() => {
    setPresenceEvents([]);
  }, []);

  const recordFollowedPeer = useCallback(
    (peer: CollaborationPeer | null) => {
      const selfPeer = latestPeerRef.current;

      recordPresenceEvent({
        kind: peer ? "followed" : "unfollowed",
        peerId: peer?.id ?? selfId,
        peerName: peer?.name ?? selfPeer.name,
        peerEmail: peer?.email ?? selfPeer.email,
        color: peer?.color ?? selfPeer.color,
        detail: peer
          ? `You followed ${peer.name}'s viewport.`
          : "You stopped following a collaborator viewport.",
      });
    },
    [recordPresenceEvent, selfId],
  );

  return {
    selfId,
    peers: Object.values(peersById).sort((first, second) =>
      first.name.localeCompare(second.name),
    ),
    chatMessages,
    presenceEvents,
    roomSyncStatus,
    roomSyncedAt,
    spotlight,
    setSpotlight,
    publishCursor,
    sendChatMessage,
    clearChatMessages,
    clearPresenceEvents,
    recordFollowedPeer,
  };
}

function createPresenceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function getPresenceColor(seed: string) {
  const colors = [
    "#22c55e",
    "#06b6d4",
    "#f97316",
    "#a855f7",
    "#ec4899",
    "#eab308",
  ];
  const hash = Array.from(seed).reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  );

  return colors[hash % colors.length] ?? colors[0];
}

function appendChatMessage(
  messages: CollaborationChatMessage[],
  message: CollaborationChatMessage,
) {
  return [...messages.filter((item) => item.id !== message.id), message].slice(
    -maxCollaborationRoomChatMessages,
  );
}

function appendPresenceEvent(
  events: CollaborationPresenceEvent[],
  event: CollaborationPresenceEvent,
) {
  const duplicate = events[0];

  if (
    duplicate &&
    duplicate.kind === event.kind &&
    duplicate.peerId === event.peerId &&
    duplicate.detail === event.detail &&
    Math.abs(duplicate.createdAt - event.createdAt) < 300
  ) {
    return events;
  }

  return [event, ...events.filter((item) => item.id !== event.id)].slice(
    0,
    maxCollaborationRoomPresenceEvents,
  );
}

function readCollaborationSessionSnapshot(
  fileId: string,
): CollaborationRoomSnapshot {
  if (typeof window === "undefined") {
    return getEmptyCollaborationRoomSnapshot();
  }

  try {
    const stored = window.localStorage.getItem(
      getCollaborationStorageKey(fileId),
    );

    if (!stored) {
      return getEmptyCollaborationRoomSnapshot();
    }

    const parsed: unknown = JSON.parse(stored);

    if (!isCollaborationSessionSnapshot(parsed)) {
      return getEmptyCollaborationRoomSnapshot();
    }

    return {
      chatMessages: parsed.chatMessages.slice(-maxCollaborationRoomChatMessages),
      presenceEvents: parsed.presenceEvents.slice(
        0,
        maxCollaborationRoomPresenceEvents,
      ),
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch {
    return getEmptyCollaborationRoomSnapshot();
  }
}

function writeCollaborationSessionSnapshot(
  fileId: string,
  snapshot: CollaborationRoomSnapshot,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getCollaborationStorageKey(fileId),
      JSON.stringify({
        version: 1,
        chatMessages: snapshot.chatMessages.slice(
          -maxCollaborationRoomChatMessages,
        ),
        presenceEvents: snapshot.presenceEvents.slice(
          0,
          maxCollaborationRoomPresenceEvents,
        ),
        updatedAt: snapshot.updatedAt ?? new Date().toISOString(),
      }),
    );
  } catch {
    return;
  }
}

function getCollaborationStorageKey(fileId: string) {
  return `essence.figma.collaboration.${fileId}`;
}

function isCollaborationSessionSnapshot(
  value: unknown,
): value is {
  chatMessages: CollaborationChatMessage[];
  presenceEvents: CollaborationPresenceEvent[];
  updatedAt?: string;
} {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.chatMessages) &&
    value.chatMessages.every(isCollaborationChatMessage) &&
    Array.isArray(value.presenceEvents) &&
    value.presenceEvents.every(isCollaborationPresenceEvent)
  );
}

function isCollaborationChatMessage(
  value: unknown,
): value is CollaborationChatMessage {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.peerId) &&
    isString(value.name) &&
    (value.email === undefined ||
      value.email === null ||
      isString(value.email)) &&
    isString(value.color) &&
    isString(value.text) &&
    isNumber(value.createdAt)
  );
}

function isCollaborationPresenceEvent(
  value: unknown,
): value is CollaborationPresenceEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isPresenceEventKind(value.kind) &&
    (value.peerId === undefined || isString(value.peerId)) &&
    isString(value.peerName) &&
    (value.peerEmail === undefined ||
      value.peerEmail === null ||
      isString(value.peerEmail)) &&
    (value.color === undefined || isString(value.color)) &&
    (value.detail === undefined || isString(value.detail)) &&
    isNumber(value.createdAt)
  );
}

function isPresenceEventKind(
  value: unknown,
): value is CollaborationPresenceEventKind {
  return (
    value === "joined" ||
    value === "left" ||
    value === "chat" ||
    value === "spotlight-on" ||
    value === "spotlight-off" ||
    value === "followed" ||
    value === "unfollowed"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getSnapshotTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);

  return Number.isFinite(time) ? time : null;
}
