"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listQueuedPublicInteractions,
  queuePublicComment,
  queuePublicSocialAction,
  removeQueuedPublicInteraction,
  replayQueuedPublicInteraction,
  replayQueuedPublicInteractions,
  subscribePublicInteractionQueue,
  updateQueuedPublicCommentBody,
  type PublicInteractionReplayScope,
  type QueuedPublicInteraction,
} from "./public-interaction-queue";

export function usePublicInteractionQueue() {
  const [items, setItems] = useState<QueuedPublicInteraction[]>([]);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);

  const refresh = useCallback(() => {
    setItems(listQueuedPublicInteractions());
  }, []);

  useEffect(() => {
    refresh();
    return subscribePublicInteractionQueue(refresh);
  }, [refresh]);

  const replay = useCallback(async (scope?: PublicInteractionReplayScope) => {
    setReplaying(true);

    try {
      const summary = await replayQueuedPublicInteractions({ scope });
      refresh();
      return summary;
    } finally {
      setReplaying(false);
    }
  }, [refresh]);

  const replayItem = useCallback(
    async (id: string) => {
      setReplayingId(id);

      try {
        const summary = await replayQueuedPublicInteraction(id);
        refresh();
        return summary;
      } finally {
        setReplayingId(null);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    (id: string) => {
      removeQueuedPublicInteraction(id);
      refresh();
    },
    [refresh],
  );

  const updateComment = useCallback(
    (id: string, body: string) => {
      const updated = updateQueuedPublicCommentBody(id, body);
      refresh();
      return updated;
    },
    [refresh],
  );

  return {
    items,
    pendingCount: items.length,
    queueComment: queuePublicComment,
    queueSocialAction: queuePublicSocialAction,
    remove,
    replay,
    replayItem,
    replayingId,
    replaying,
    updateComment,
  };
}
