"use client";

import { MousePointer2, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getPresenceDisplayName,
  type WorkbookPresenceSnapshot,
} from "@/features/spreadsheet/workbook-presence";
import type { WorkbookCollaborationTransportStatus } from "@/features/spreadsheet/workbook-collaboration";

function PresencePill({
  presence,
  self,
}: {
  presence: WorkbookPresenceSnapshot;
  self?: boolean;
}) {
  return (
    <Badge
      variant={self ? "default" : "outline"}
      className="flex max-w-40 shrink-0 items-center gap-1.5 truncate rounded-sm px-2 py-1"
      title={`${getPresenceDisplayName(presence.user)} on ${presence.sheetName} ${presence.rangeLabel}`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: presence.color }}
      />
      <span className="truncate">{self ? "You" : getPresenceDisplayName(presence.user)}</span>
      <MousePointer2 className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate font-mono text-[10px]">
        {presence.rangeLabel}
      </span>
      {presence.isDirty ? (
        <span className="rounded-sm bg-background/40 px-1 text-[10px]">unsaved</span>
      ) : null}
    </Badge>
  );
}

export function WorkbookPresenceBar({
  current,
  peers,
  queuedEventCount = 0,
  transportStatus = "local",
}: {
  current: WorkbookPresenceSnapshot;
  peers: WorkbookPresenceSnapshot[];
  queuedEventCount?: number;
  transportStatus?: WorkbookCollaborationTransportStatus;
}) {
  const statusLabel =
    transportStatus === "server"
      ? "Server synced"
      : transportStatus === "replaying"
        ? `Replaying ${queuedEventCount}`
        : transportStatus === "offline"
          ? `Offline queue ${queuedEventCount}`
          : "Local session";

  return (
    <div className="flex min-h-10 shrink-0 items-center justify-between gap-3 overflow-hidden border-b bg-muted/20 px-3 py-2 text-xs">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <UsersRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="hidden shrink-0 font-medium sm:inline">Coediting</span>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable]">
          <PresencePill presence={current} self />
          {peers.map((peer) => (
            <PresencePill key={peer.clientId} presence={peer} />
          ))}
        </div>
      </div>
      <span className="shrink-0 text-muted-foreground">
        {peers.length === 0 ? statusLabel : `${peers.length} active - ${statusLabel}`}
      </span>
    </div>
  );
}
