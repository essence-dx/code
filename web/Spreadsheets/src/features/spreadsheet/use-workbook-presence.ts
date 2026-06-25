"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CellRange,
  CellSelection,
} from "@/features/spreadsheet/state/selection-state";
import {
  createWorkbookPresenceChannelName,
  createWorkbookPresenceClientId,
  formatPresenceRange,
  getPresenceColor,
  pruneStalePresence,
  type WorkbookPresenceMessage,
  type WorkbookPresenceSnapshot,
  type WorkbookPresenceUser,
} from "@/features/spreadsheet/workbook-presence";
import { useWorkbookCollaborationTransport } from "@/features/spreadsheet/use-workbook-collaboration-transport";

function getSessionClientId(workbookId: string) {
  if (typeof window === "undefined") {
    return "server";
  }

  const key = `essence-excel:presence-client:${workbookId}`;
  const existing = window.sessionStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const nextId = createWorkbookPresenceClientId();

  window.sessionStorage.setItem(key, nextId);
  return nextId;
}

export function useWorkbookPresence({
  enabled = true,
  isDirty,
  selected,
  selectedRange,
  sheetId,
  sheetName,
  user,
  workbookId,
}: {
  enabled?: boolean;
  isDirty: boolean;
  selected: CellSelection;
  selectedRange: CellRange | null;
  sheetId: string;
  sheetName: string;
  user: WorkbookPresenceUser;
  workbookId: string;
}) {
  const [clientId] = useState(() => getSessionClientId(workbookId));
  const [peersById, setPeersById] = useState<
    Record<string, WorkbookPresenceSnapshot>
  >({});
  const channelRef = useRef<BroadcastChannel | null>(null);
  const range = useMemo(
    () => formatPresenceRange(selected, selectedRange),
    [selected, selectedRange],
  );
  const ownSnapshot = useMemo<WorkbookPresenceSnapshot>(
    () => ({
      activeCellLabel: range.activeCellLabel,
      clientId,
      color: getPresenceColor(user.email || clientId),
      isDirty,
      lastSeenAt: Date.now(),
      rangeLabel: range.rangeLabel,
      sheetId,
      sheetName,
      user,
    }),
    [clientId, isDirty, range.activeCellLabel, range.rangeLabel, sheetId, sheetName, user],
  );
  const snapshotRef = useRef(ownSnapshot);
  const transport = useWorkbookCollaborationTransport({
    clientId,
    enabled,
    snapshot: ownSnapshot,
    workbookId,
  });

  snapshotRef.current = ownSnapshot;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(
      createWorkbookPresenceChannelName(workbookId),
    );

    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<WorkbookPresenceMessage>) => {
      const message = event.data;

      if (!message || "clientId" in message && message.clientId === clientId) {
        return;
      }

      if (message.type === "leave") {
        setPeersById((current) => {
          const next = { ...current };

          delete next[message.clientId];
          return next;
        });
        return;
      }

      if (message.snapshot.clientId === clientId) {
        return;
      }

      setPeersById((current) => ({
        ...current,
        [message.snapshot.clientId]: message.snapshot,
      }));
    };

    return () => {
      channel.postMessage({
        type: "leave",
        clientId,
      } satisfies WorkbookPresenceMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [clientId, enabled, workbookId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const publish = () => {
      channelRef.current?.postMessage({
        type: "presence",
        snapshot: {
          ...snapshotRef.current,
          lastSeenAt: Date.now(),
        },
      } satisfies WorkbookPresenceMessage);
    };

    publish();
    const intervalId = window.setInterval(publish, 3_000);

    return () => window.clearInterval(intervalId);
  }, [enabled, ownSnapshot]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setPeersById((current) =>
        Object.fromEntries(
          pruneStalePresence(Object.values(current)).map((snapshot) => [
            snapshot.clientId,
            snapshot,
          ]),
        ),
      );
    }, 4_000);

    return () => window.clearInterval(intervalId);
  }, [enabled]);

  return {
    current: ownSnapshot,
    peers: pruneStalePresence([
      ...Object.values(peersById),
      ...transport.serverPeers,
    ]).filter(
      (peer, index, peers) =>
        peers.findIndex((candidate) => candidate.clientId === peer.clientId) ===
        index,
    ),
    publishEvent: transport.publishEvent,
    queuedEventCount: transport.queuedEventCount,
    transportStatus: transport.transportStatus,
  };
}
