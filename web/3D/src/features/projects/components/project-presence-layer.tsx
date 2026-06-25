"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { MousePointer2 } from "lucide-react";
import { heartbeatProjectPresence, listProjectPresence } from "@/features/projects/project-api";
import type { ProjectPresenceCursor, ProjectPresenceSummary } from "@/features/projects/presence-types";
import { useEditorStore } from "@/features/editor/store/editor-store";

function formatName(presence: ProjectPresenceSummary) {
  return presence.name?.trim() || presence.email;
}

export function ProjectPresenceLayer({ cursorRef }: { cursorRef: RefObject<ProjectPresenceCursor | null> }) {
  const activeProjectId = useEditorStore((state) => state.activeProjectId);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectedObjectName = useEditorStore((state) => state.document.objects.find((object) => object.id === state.selectedObjectId)?.name ?? null);
  const objects = useEditorStore((state) => state.document.objects);
  const [presence, setPresence] = useState<ProjectPresenceSummary[]>([]);
  const selectedObjectIdRef = useRef<string | null>(selectedObjectId);

  useEffect(() => {
    selectedObjectIdRef.current = selectedObjectId;
  }, [selectedObjectId]);

  useEffect(() => {
    if (!activeProjectId) {
      setPresence([]);
      cursorRef.current = null;
      return;
    }

    const projectId = activeProjectId;
    let cancelled = false;

    async function refreshPresence() {
      try {
        const response = await listProjectPresence(projectId);

        if (!cancelled) {
          setPresence(response.presence);
        }
      } catch {
        if (!cancelled) {
          setPresence([]);
        }
      }
    }

    async function sendHeartbeat() {
      await heartbeatProjectPresence(projectId, {
        cursor: cursorRef.current,
        selectedObjectId: selectedObjectIdRef.current,
      }).catch(() => undefined);
    }

    void sendHeartbeat();
    void refreshPresence();

    const heartbeatId = window.setInterval(() => {
      void sendHeartbeat();
    }, 4000);
    const refreshId = window.setInterval(() => {
      void refreshPresence();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatId);
      window.clearInterval(refreshId);
    };
  }, [activeProjectId]);

  function getObjectName(objectId: string | null) {
    return objectId ? (objects.find((object) => object.id === objectId)?.name ?? objectId) : null;
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      {presence.map((entry) =>
        entry.cursor ? (
          <div
            key={entry.userId}
            className="absolute flex -translate-y-1 items-center gap-1.5 rounded-md border bg-background/90 px-2 py-1 text-xs shadow-sm backdrop-blur"
            style={{ borderColor: entry.color, color: entry.color, left: `${entry.cursor.x * 100}%`, top: `${entry.cursor.y * 100}%` }}
          >
            <MousePointer2 className="size-3.5" />
            <span className="max-w-36 truncate text-foreground">{formatName(entry)}</span>
          </div>
        ) : null,
      )}
      {activeProjectId && selectedObjectName ? (
        <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-border bg-background/85 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
          You selected {selectedObjectName}
        </div>
      ) : null}
      {presence.some((entry) => entry.selectedObjectId) ? (
        <div className="pointer-events-none absolute bottom-4 right-4 max-w-64 space-y-1 rounded-md border border-border bg-background/85 p-2 text-xs text-muted-foreground backdrop-blur">
          {presence
            .filter((entry) => entry.selectedObjectId)
            .slice(0, 4)
            .map((entry) => (
              <p key={entry.userId} className="truncate">
                <span className="font-medium text-foreground">{formatName(entry)}</span> selecting {getObjectName(entry.selectedObjectId)}
              </p>
            ))}
        </div>
      ) : null}
    </div>
  );
}
