import type {
  DesignCollaborationChatMessage,
  DesignCollaborationPresenceEvent,
  DesignCollaborationRoomState,
} from "@/features/editor/types";

export type CollaborationRoomSnapshot = {
  chatMessages: DesignCollaborationChatMessage[];
  presenceEvents: DesignCollaborationPresenceEvent[];
  updatedAt: string | null;
};

export const maxCollaborationRoomChatMessages = 80;
export const maxCollaborationRoomPresenceEvents = 80;

export function getEmptyCollaborationRoomSnapshot(): CollaborationRoomSnapshot {
  return {
    chatMessages: [],
    presenceEvents: [],
    updatedAt: null,
  };
}

export function toCollaborationRoomSnapshot(
  state: DesignCollaborationRoomState | undefined,
): CollaborationRoomSnapshot {
  if (!state) {
    return getEmptyCollaborationRoomSnapshot();
  }

  return {
    chatMessages: state.chatMessages.slice(-maxCollaborationRoomChatMessages),
    presenceEvents: state.presenceEvents.slice(
      0,
      maxCollaborationRoomPresenceEvents,
    ),
    updatedAt: state.updatedAt,
  };
}

export function toDesignCollaborationRoomState(
  snapshot: Pick<CollaborationRoomSnapshot, "chatMessages" | "presenceEvents">,
  updatedAt = new Date().toISOString(),
): DesignCollaborationRoomState {
  return {
    version: 1,
    chatMessages: snapshot.chatMessages.slice(-maxCollaborationRoomChatMessages),
    presenceEvents: snapshot.presenceEvents.slice(
      0,
      maxCollaborationRoomPresenceEvents,
    ),
    updatedAt,
  };
}

export function mergeCollaborationRoomSnapshots(
  first: CollaborationRoomSnapshot,
  second: CollaborationRoomSnapshot,
): CollaborationRoomSnapshot {
  const chatMessages = mergeById(
    first.chatMessages,
    second.chatMessages,
    (message) => message.createdAt,
  ).slice(-maxCollaborationRoomChatMessages);
  const presenceEvents = mergeById(
    first.presenceEvents,
    second.presenceEvents,
    (event) => event.createdAt,
  )
    .reverse()
    .slice(0, maxCollaborationRoomPresenceEvents);

  return {
    chatMessages,
    presenceEvents,
    updatedAt: getLatestIsoDate(first.updatedAt, second.updatedAt),
  };
}

function mergeById<TItem extends { id: string }>(
  first: TItem[],
  second: TItem[],
  getTime: (item: TItem) => number,
) {
  const items = new Map<string, TItem>();

  for (const item of [...first, ...second]) {
    items.set(item.id, item);
  }

  return Array.from(items.values()).sort(
    (left, right) => getTime(left) - getTime(right),
  );
}

function getLatestIsoDate(first: string | null, second: string | null) {
  if (!first) {
    return second;
  }

  if (!second) {
    return first;
  }

  return Date.parse(first) >= Date.parse(second) ? first : second;
}
