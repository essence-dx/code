"use client";

import { useEffect, useState } from "react";
import {
  ClipboardCopy,
  Eye,
  Download,
  MessageSquare,
  Radio,
  RadioTower,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type {
  CollaborationChatMessage,
  CollaborationPresenceEvent,
  CollaborationPeer,
  CollaborationRoomSyncStatus,
} from "@/features/editor/collaboration-presence";
import {
  getCollaborationChatMessagesCsv,
  getCollaborationChatReview,
  getCollaborationSessionSummary,
  getCollaborationSessionHandoffMarkdown,
  getCollaborationViewportSnapshotsCsv,
  messageMentionsUser,
} from "@/features/editor/collaboration-handoff";
import { CollaborationSessionReviewPanel } from "@/features/editor/components/collaboration-session-review-panel";
import { PresenceActivityMenu } from "@/features/editor/components/presence-activity-menu";
import { cn } from "@/lib/utils";

type CollaborationPresenceBarProps = {
  activePageId: string;
  currentUser: {
    email?: string | null;
    name: string;
  };
  peers: CollaborationPeer[];
  chatMessages: CollaborationChatMessage[];
  presenceEvents: CollaborationPresenceEvent[];
  roomSyncStatus: CollaborationRoomSyncStatus;
  roomSyncedAt: number | null;
  selfId: string;
  followedPeerId: string | null;
  spotlight: boolean;
  onFollowPeer: (peerId: string | null) => void;
  onToggleSpotlight: () => void;
  onSendChatMessage: (text: string) => void;
  onClearChatMessages: () => void;
  onClearPresenceEvents: () => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function CollaborationPresenceBar({
  activePageId,
  currentUser,
  peers,
  chatMessages,
  presenceEvents,
  roomSyncStatus,
  roomSyncedAt,
  selfId,
  followedPeerId,
  spotlight,
  onFollowPeer,
  onToggleSpotlight,
  onSendChatMessage,
  onClearChatMessages,
  onClearPresenceEvents,
  onRecordActivity,
}: CollaborationPresenceBarProps) {
  const followedPeer = peers.find((peer) => peer.id === followedPeerId);
  const summary = getCollaborationSessionSummary({
    chatMessages,
    peers,
    presenceEvents,
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [lastReadAt, setLastReadAt] = useState(() => Date.now());
  const chatReview = getCollaborationChatReview({
    lastReadAt,
    messages: chatMessages,
    selfId,
    userEmail: currentUser.email,
    userName: currentUser.name,
  });

  useEffect(() => {
    if (!chatOpen) {
      return;
    }

    const latestMessageAt = Math.max(
      Date.now(),
      ...chatMessages.map((message) => message.createdAt),
    );
    setLastReadAt(latestMessageAt);
  }, [chatMessages, chatOpen]);

  function sendMessage() {
    const text = draft.trim();

    if (!text) {
      return;
    }

    onSendChatMessage(text);
    setDraft("");
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant={spotlight ? "secondary" : "ghost"}
        className="h-8 gap-1.5 px-2"
        onClick={onToggleSpotlight}
        title="Broadcast spotlight"
      >
        {spotlight ? (
          <RadioTower className="size-3.5" />
        ) : (
          <Radio className="size-3.5" />
        )}
        <span className="hidden text-xs xl:inline">Spotlight</span>
      </Button>
      {followedPeer ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 px-2"
          onClick={() => onFollowPeer(null)}
          title={`Stop following ${followedPeer.name}`}
        >
          <Eye className="size-3.5" />
          <span className="max-w-24 truncate text-xs">
            {followedPeer.name}
          </span>
        </Button>
      ) : null}
      <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
        <Users className="size-3.5 text-muted-foreground" />
        <span className="font-mono text-[11px] text-muted-foreground">
          {peers.length}
        </span>
        <div className="ml-1 flex -space-x-1">
          {peers.slice(0, 4).map((peer) => (
            <button
              key={peer.id}
              type="button"
              className={cn(
                "grid size-6 place-items-center rounded-full border border-background text-[10px] font-semibold text-white",
                peer.spotlight && "ring-2 ring-primary",
              )}
              style={{ backgroundColor: peer.color }}
              title={`Follow ${peer.name}`}
              onClick={() => onFollowPeer(peer.id)}
            >
              {getInitial(peer.name)}
            </button>
          ))}
        </div>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8"
        disabled={peers.length === 0}
        aria-label="Export collaborator viewport snapshots"
        title="Export collaborator viewport snapshots"
        onClick={() => exportViewportSnapshots(peers)}
      >
        <Download className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8"
        disabled={
          peers.length === 0 &&
          chatMessages.length === 0 &&
          presenceEvents.length === 0
        }
        aria-label="Copy collaboration handoff"
        title="Copy collaboration handoff"
        onClick={() =>
          void navigator.clipboard.writeText(
            getCollaborationSessionHandoffMarkdown({
              chatMessages,
              peers,
              presenceEvents,
            }),
          )
        }
      >
        <ClipboardCopy className="size-3.5" />
      </Button>
      <div className="hidden items-center gap-1 lg:flex">
        <Badge variant={summary.spotlightCount > 0 ? "secondary" : "outline"}>
          {summary.spotlightCount} live
        </Badge>
        <Badge variant={summary.eventCount > 0 ? "secondary" : "outline"}>
          {summary.eventCount} events
        </Badge>
      </div>
      <CollaborationSessionReviewPanel
        activePageId={activePageId}
        chatMessages={chatMessages}
        currentUser={currentUser}
        lastReadAt={lastReadAt}
        onRecordActivity={onRecordActivity}
        peers={peers}
        presenceEvents={presenceEvents}
        selfId={selfId}
      />
      <DropdownMenu open={chatOpen} onOpenChange={setChatOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant={chatOpen ? "secondary" : "ghost"}
            className="relative h-8 gap-1.5 px-2"
            title="Cursor chat"
          >
            <MessageSquare className="size-3.5" />
            <span className="font-mono text-[11px]">
              {chatMessages.length}
            </span>
            {chatReview.unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-medium text-primary-foreground">
                {chatReview.unreadCount}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="flex h-10 items-center justify-between border-b border-border px-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <MessageSquare className="size-3.5" />
              Session chat
              {chatReview.mentionCount > 0 ? (
                <Badge
                  variant={
                    chatReview.unreadMentionCount > 0 ? "secondary" : "outline"
                  }
                  className="h-5 px-1.5 text-[10px]"
                >
                  {chatReview.mentionCount} mention
                  {chatReview.mentionCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                disabled={chatMessages.length === 0}
                aria-label="Export session chat"
                onClick={() => exportChatMessages(chatMessages)}
              >
                <Download className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                disabled={chatMessages.length === 0}
                aria-label="Clear session chat"
                onClick={onClearChatMessages}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          <ScrollArea className="h-60">
            <div className="space-y-2 p-2">
              {chatMessages.length > 0 ? (
                chatMessages.map((message) => (
                  <ChatMessageCard
                    key={message.id}
                    currentUser={currentUser}
                    message={message}
                    selfId={selfId}
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  No session messages.
                </div>
              )}
            </div>
          </ScrollArea>
          <form
            className="flex items-center gap-2 border-t border-border p-2"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <Input
              value={draft}
              className="h-8 text-xs"
              maxLength={240}
              placeholder="Message collaborators"
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button
              type="submit"
              size="icon"
              className="size-8"
              disabled={!draft.trim()}
              aria-label="Send session message"
            >
              <Send className="size-3.5" />
            </Button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
      <PresenceActivityMenu
        chatMessages={chatMessages}
        events={presenceEvents}
        peers={peers}
        roomSyncStatus={roomSyncStatus}
        roomSyncedAt={roomSyncedAt}
        onClear={onClearPresenceEvents}
      />
    </div>
  );
}

function ChatMessageCard({
  currentUser,
  message,
  selfId,
}: {
  currentUser: {
    email?: string | null;
    name: string;
  };
  message: CollaborationChatMessage;
  selfId: string;
}) {
  const isOwnMessage = message.peerId === selfId;
  const mentionsUser = !isOwnMessage
    ? messageMentionsUser(message.text, currentUser.name, currentUser.email)
    : false;

  return (
                  <div
      className={cn(
        "rounded-md border bg-background p-2",
        mentionsUser ? "border-primary/60" : "border-border",
      )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="grid size-5 place-items-center rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: message.color }}
                      >
                        {getInitial(message.name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">
                        {message.name}
                      </span>
        {mentionsUser ? (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            Mention
          </Badge>
        ) : null}
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatChatTime(message.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {message.text}
                    </div>
                  </div>
  );
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatChatTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function exportChatMessages(messages: CollaborationChatMessage[]) {
  const blob = new Blob([getCollaborationChatMessagesCsv(messages)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "essence-session-chat.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportViewportSnapshots(peers: CollaborationPeer[]) {
  const blob = new Blob([getCollaborationViewportSnapshotsCsv(peers)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "essence-collaborator-viewports.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
