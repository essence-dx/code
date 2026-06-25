"use client";

import { useState } from "react";
import {
  Eye,
  Download,
  History,
  MessageSquare,
  Radio,
  RadioTower,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  CollaborationChatMessage,
  CollaborationPresenceEvent,
  CollaborationPresenceEventKind,
  CollaborationPeer,
  CollaborationRoomSyncStatus,
} from "@/features/editor/collaboration-presence";
import {
  getCollaborationPresenceEventsCsv,
  getCollaborationPresenterHandoff,
  getCollaborationSessionResume,
} from "@/features/editor/collaboration-handoff";

type PresenceActivityMenuProps = {
  chatMessages: CollaborationChatMessage[];
  events: CollaborationPresenceEvent[];
  peers: CollaborationPeer[];
  roomSyncStatus: CollaborationRoomSyncStatus;
  roomSyncedAt: number | null;
  onClear: () => void;
};

type PresenceActivityFilter =
  | "all"
  | "joined"
  | "left"
  | "chat"
  | "spotlight"
  | "follow";

const presenceEventLabels: Record<CollaborationPresenceEventKind, string> = {
  joined: "Joined",
  left: "Left",
  chat: "Chat",
  "spotlight-on": "Spotlight on",
  "spotlight-off": "Spotlight off",
  followed: "Followed",
  unfollowed: "Unfollowed",
};

const syncStatusLabels: Record<CollaborationRoomSyncStatus, string> = {
  loading: "Loading",
  offline: "Local",
  synced: "Synced",
  syncing: "Syncing",
};

export function PresenceActivityMenu({
  chatMessages,
  events,
  peers,
  roomSyncStatus,
  roomSyncedAt,
  onClear,
}: PresenceActivityMenuProps) {
  const [filter, setFilter] = useState<PresenceActivityFilter>("all");
  const resume = getCollaborationSessionResume({
    chatMessages,
    peers,
    presenceEvents: events,
  });
  const presenter = getCollaborationPresenterHandoff({
    peers,
    presenceEvents: events,
  });
  const filteredEvents = events.filter((event) =>
    matchesPresenceActivityFilter(event, filter),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2"
          title="Collaboration activity"
        >
          <History className="size-3.5" />
          <span className="font-mono text-[11px]">{events.length}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex h-10 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <History className="size-3.5" />
            Presence activity
            <Badge
              variant={roomSyncStatus === "offline" ? "destructive" : "outline"}
              className="h-5 px-1.5 text-[10px]"
            >
              {syncStatusLabels[roomSyncStatus]}
            </Badge>
            <span className="font-mono text-[10px]">
              {filteredEvents.length}/{events.length}
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={filteredEvents.length === 0}
              aria-label="Export presence activity"
              onClick={() => exportPresenceActivity(filteredEvents)}
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={events.length === 0}
              aria-label="Clear presence activity"
              onClick={onClear}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="space-y-3 border-b border-border p-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">Resume session</span>
              {roomSyncedAt ? (
                <span className="text-[10px] text-muted-foreground">
                  Synced {formatPresenceTime(roomSyncedAt)}
                </span>
              ) : resume.lastActivityAt ? (
                <span className="text-[10px] text-muted-foreground">
                  {formatPresenceTime(resume.lastActivityAt)}
                </span>
              ) : null}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {resume.headline}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <ResumeMetric label="Active" value={resume.activePeerCount} />
            <ResumeMetric label="Chat" value={resume.chatCount} />
            <ResumeMetric label="Events" value={resume.eventCount} />
            <ResumeMetric label="Live" value={resume.spotlightCount} />
          </div>
          <div className="rounded-md border border-border bg-background p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">Presenter handoff</span>
              <Badge
                variant={
                  presenter.status === "conflict"
                    ? "destructive"
                    : presenter.status === "owned"
                      ? "secondary"
                      : "outline"
                }
                className="h-5 px-1.5 text-[10px]"
              >
                {presenter.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {presenter.summary}
            </p>
            {presenter.lastHandoffAt ? (
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                Replay {presenter.replayEventCount} events, latest{" "}
                {formatPresenceTime(presenter.lastHandoffAt)}
              </div>
            ) : null}
          </div>
          {resume.latestMessage || resume.latestEvent ? (
            <div className="grid gap-1.5">
              {resume.latestMessage ? (
                <ResumeSnippet
                  label="Latest chat"
                  value={`${resume.latestMessage.name}: ${resume.latestMessage.text}`}
                />
              ) : null}
              {resume.latestEvent ? (
                <ResumeSnippet
                  label="Latest activity"
                  value={`${presenceEventLabels[resume.latestEvent.kind]} by ${resume.latestEvent.peerName}`}
                />
              ) : null}
            </div>
          ) : null}
          {resume.collaborators.length > 0 ? (
            <div className="space-y-1.5">
              {resume.collaborators.map((collaborator) => (
                <div
                  key={collaborator.key}
                  className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5"
                >
                  <span
                    className="grid size-5 place-items-center rounded-full text-[10px] font-semibold text-white"
                    style={{
                      backgroundColor:
                        collaborator.color ?? "hsl(var(--muted-foreground))",
                    }}
                  >
                    {getInitial(collaborator.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {collaborator.name}
                  </span>
                  {collaborator.active ? (
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-[10px]"
                    >
                      Live
                    </Badge>
                  ) : null}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {collaborator.chatCount}/{collaborator.eventCount}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          {presenceActivityFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                filter === item.id
                  ? "rounded-sm bg-secondary px-2 py-1 text-[11px] text-secondary-foreground"
                  : "rounded-sm px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
              }
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <ScrollArea className="h-64">
          <div className="space-y-2 p-2">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-md border border-border bg-background p-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="grid size-6 place-items-center rounded-full text-white"
                      style={{
                        backgroundColor: event.color ?? "hsl(var(--muted))",
                      }}
                    >
                      <PresenceEventIcon kind={event.kind} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {event.peerName}
                      </span>
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                        {presenceEventLabels[event.kind]}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatPresenceTime(event.createdAt)}
                    </span>
                  </div>
                  {event.detail ? (
                    <div className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">
                      {event.detail}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                No collaboration activity yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const presenceActivityFilters = [
  { id: "all", label: "All" },
  { id: "joined", label: "Joins" },
  { id: "left", label: "Leaves" },
  { id: "chat", label: "Chat" },
  { id: "spotlight", label: "Spotlight" },
  { id: "follow", label: "Follow" },
] as const satisfies ReadonlyArray<{
  id: PresenceActivityFilter;
  label: string;
}>;

function matchesPresenceActivityFilter(
  event: CollaborationPresenceEvent,
  filter: PresenceActivityFilter,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "spotlight") {
    return event.kind === "spotlight-on" || event.kind === "spotlight-off";
  }

  if (filter === "follow") {
    return event.kind === "followed" || event.kind === "unfollowed";
  }

  return event.kind === filter;
}

function PresenceEventIcon({
  kind,
}: {
  kind: CollaborationPresenceEventKind;
}) {
  if (kind === "joined") {
    return <UserPlus className="size-3.5" />;
  }

  if (kind === "left") {
    return <UserMinus className="size-3.5" />;
  }

  if (kind === "chat") {
    return <MessageSquare className="size-3.5" />;
  }

  if (kind === "spotlight-on") {
    return <RadioTower className="size-3.5" />;
  }

  if (kind === "spotlight-off") {
    return <Radio className="size-3.5" />;
  }

  return <Eye className="size-3.5" />;
}

function ResumeMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1.5">
      <div className="font-mono text-xs">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function ResumeSnippet({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="line-clamp-2 break-words text-xs">{value}</div>
    </div>
  );
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatPresenceTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function exportPresenceActivity(events: CollaborationPresenceEvent[]) {
  const blob = new Blob([getCollaborationPresenceEventsCsv(events)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "essence-presence-activity.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
