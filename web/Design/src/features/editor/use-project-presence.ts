"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ProjectPresenceSummary } from "@/features/editor/types";

type CursorPoint = {
  x: number;
  y: number;
} | null;

type PresenceResponse = {
  presence: ProjectPresenceSummary[];
};

type UseProjectPresenceInput = {
  projectId: string;
  pageId: string;
  editShareId?: string | null;
  enabled?: boolean;
  initialPresence: ProjectPresenceSummary[];
};

export function useProjectPresence({
  projectId,
  pageId,
  editShareId,
  enabled = true,
  initialPresence,
}: UseProjectPresenceInput) {
  const [presence, setPresence] = useState(initialPresence);
  const cursorRef = useRef<CursorPoint>(null);
  const lastCursorSyncAtRef = useRef(0);
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const syncPresence = useCallback(async () => {
    if (!enabled) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      const response = await fetch(`/api/projects/${projectId}/presence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageId,
          cursor: cursorRef.current,
          ...(editShareId ? { editShareId } : {}),
        }),
      });

      if (!response.ok) return;

      const body = (await response.json()) as PresenceResponse;

      if (mountedRef.current && requestId === requestIdRef.current) {
        setPresence(body.presence);
      }
    } catch {
      return;
    }
  }, [editShareId, enabled, pageId, projectId]);

  const updateCursor = useCallback(
    (cursor: CursorPoint) => {
      if (!enabled) return;

      cursorRef.current = cursor;

      const now = Date.now();

      if (now - lastCursorSyncAtRef.current < 900) return;

      lastCursorSyncAtRef.current = now;
      void syncPresence();
    },
    [enabled, syncPresence],
  );

  useEffect(() => {
    if (!enabled) {
      mountedRef.current = false;
      return;
    }

    mountedRef.current = true;

    void syncPresence();

    const interval = window.setInterval(() => {
      void syncPresence();
    }, 5000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [enabled, initialPresence, syncPresence]);

  return {
    presence: enabled ? presence : initialPresence,
    updateCursor,
  };
}
