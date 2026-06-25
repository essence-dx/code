"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createWorkbookCollaborationEvent,
  type WorkbookCollaborationClientEvent,
  type WorkbookCollaborationEventDraft,
  type WorkbookCollaborationSyncResponse,
  type WorkbookCollaborationTransportStatus,
} from "@/features/spreadsheet/workbook-collaboration";
import type { WorkbookPresenceSnapshot } from "@/features/spreadsheet/workbook-presence";

type CollaborationResponse = WorkbookCollaborationSyncResponse & {
  ok: true;
};

const syncIntervalMs = 4_000;

function queueKey(workbookId: string, clientId: string) {
  return `essence-excel:collaboration-queue:${workbookId}:${clientId}`;
}

function cursorKey(workbookId: string, clientId: string) {
  return `essence-excel:collaboration-cursor:${workbookId}:${clientId}`;
}

function collaborationEndpoint(workbookId: string) {
  return `/api/workbooks/${encodeURIComponent(workbookId)}/collaboration`;
}

function readQueuedEvents(workbookId: string, clientId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(queueKey(workbookId, clientId)) ?? "[]",
    );

    return Array.isArray(parsed)
      ? (parsed as WorkbookCollaborationClientEvent[])
      : [];
  } catch {
    return [];
  }
}

function writeQueuedEvents(
  workbookId: string,
  clientId: string,
  events: WorkbookCollaborationClientEvent[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    queueKey(workbookId, clientId),
    JSON.stringify(events.slice(-100)),
  );
}

function readCursor(workbookId: string, clientId: string) {
  if (typeof window === "undefined") {
    return 0;
  }

  const value = Number(window.localStorage.getItem(cursorKey(workbookId, clientId)));

  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function writeCursor(workbookId: string, clientId: string, cursor: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(cursorKey(workbookId, clientId), String(cursor));
}

function mergeServerPeers(
  snapshots: WorkbookPresenceSnapshot[],
  clientId: string,
) {
  return Object.fromEntries(
    snapshots
      .filter((snapshot) => snapshot.clientId !== clientId)
      .map((snapshot) => [snapshot.clientId, snapshot]),
  );
}

export function useWorkbookCollaborationTransport({
  clientId,
  enabled = true,
  snapshot,
  workbookId,
}: {
  clientId: string;
  enabled?: boolean;
  snapshot: WorkbookPresenceSnapshot;
  workbookId: string;
}) {
  const snapshotRef = useRef(snapshot);
  const cursorRef = useRef(0);
  const queueRef = useRef<WorkbookCollaborationClientEvent[]>([]);
  const [serverPeersById, setServerPeersById] = useState<
    Record<string, WorkbookPresenceSnapshot>
  >({});
  const [queuedEventCount, setQueuedEventCount] = useState(0);
  const [transportStatus, setTransportStatus] =
    useState<WorkbookCollaborationTransportStatus>("local");

  snapshotRef.current = snapshot;

  useEffect(() => {
    if (!enabled) {
      cursorRef.current = 0;
      queueRef.current = [];
      return;
    }

    cursorRef.current = readCursor(workbookId, clientId);
    queueRef.current = readQueuedEvents(workbookId, clientId);
    setQueuedEventCount(queueRef.current.length);
  }, [clientId, enabled, workbookId]);

  const publishEvent = useCallback(
    (draft: WorkbookCollaborationEventDraft) => {
      if (!enabled) {
        return;
      }

      const event = createWorkbookCollaborationEvent({ clientId, draft });
      const nextQueue = [...queueRef.current, event].slice(-100);

      queueRef.current = nextQueue;
      writeQueuedEvents(workbookId, clientId, nextQueue);
      setQueuedEventCount(nextQueue.length);
    },
    [clientId, enabled, workbookId],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function sync() {
      const pendingEvents = queueRef.current.slice(0, 25);

      try {
        const response = await fetch(collaborationEndpoint(workbookId), {
          body: JSON.stringify({
            afterSequence: cursorRef.current,
            clientId,
            events: pendingEvents,
            presence: snapshotRef.current,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("collaboration-sync-failed");
        }

        const result = (await response.json()) as CollaborationResponse;

        if (!result.ok || cancelled) {
          return;
        }

        const deliveredIds = new Set(
          pendingEvents.map((event) => event.clientMutationId),
        );
        const nextQueue = queueRef.current.filter(
          (event) => !deliveredIds.has(event.clientMutationId),
        );

        queueRef.current = nextQueue;
        cursorRef.current = result.cursor;
        writeQueuedEvents(workbookId, clientId, nextQueue);
        writeCursor(workbookId, clientId, result.cursor);
        setQueuedEventCount(nextQueue.length);
        setServerPeersById(mergeServerPeers(result.presence, clientId));
        setTransportStatus(nextQueue.length > 0 ? "replaying" : "server");
      } catch {
        if (!cancelled) {
          setTransportStatus(queueRef.current.length > 0 ? "offline" : "local");
        }
      }
    }

    void sync();
    const intervalId = window.setInterval(sync, syncIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [clientId, enabled, workbookId]);

  return {
    publishEvent,
    queuedEventCount,
    serverPeers: Object.values(serverPeersById),
    transportStatus,
  };
}
