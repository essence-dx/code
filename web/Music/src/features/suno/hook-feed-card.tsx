"use client";

import {
  Download,
  Eye,
  EyeOff,
  Flag,
  Heart,
  LinkIcon,
  MessageSquare,
  Repeat2,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveCreationDraft } from "@/features/ai/creation-drafts";
import { formatDuration } from "@/features/audio/format";
import {
  hookPostToRemixDraft,
  type HookVisibility,
  type LocalHookPost,
} from "@/features/hooks/local-hook-feed";
import { useObjectUrl } from "@/hooks/use-object-url";

type HookFeedCardProps = {
  hook: LocalHookPost;
  onAddComment: (hook: LocalHookPost, body: string) => Promise<void>;
  onRemove: (hook: LocalHookPost) => Promise<void>;
  onReport: (hook: LocalHookPost) => Promise<void>;
  onSync: (hook: LocalHookPost) => Promise<unknown>;
  openDisabled?: boolean;
  openTitle?: string;
  syncDisabled?: boolean;
  syncTitle?: string;
  onToggleLike: (hook: LocalHookPost) => Promise<void>;
  onVisibilityChange: (
    hook: LocalHookPost,
    visibility: HookVisibility,
  ) => Promise<void>;
};

export function HookFeedCard({
  hook,
  onAddComment,
  onRemove,
  onReport,
  onSync,
  openDisabled,
  openTitle,
  syncDisabled,
  syncTitle,
  onToggleLike,
  onVisibilityChange,
}: HookFeedCardProps) {
  const [comment, setComment] = useState("");
  const videoUrl = useObjectUrl(hook.videoBlob);
  const visibleComments = hook.comments.filter((item) => item.status === "visible");

  async function submitComment() {
    await onAddComment(hook, comment);
    setComment("");
  }

  function saveRemixDraft() {
    saveCreationDraft(hookPostToRemixDraft(hook));
    toast.success("Hook remix draft saved to Create.");
  }

  async function copyShareText() {
    const text = [
      `${hook.songTitle} hook by ${hook.artist}`,
      hook.overlayText,
      `Start ${formatDuration(hook.startMs)} / Length ${formatDuration(hook.durationMs)}`,
      hook.tags.length ? `Tags: ${hook.tags.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast.success("Hook share text copied.");
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-white/10 bg-slate-950/55 p-3">
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <div className="overflow-hidden rounded-md border border-white/10 bg-black">
          {videoUrl ? (
            <video
              src={videoUrl}
              className="aspect-[9/16] w-full object-cover"
              controls
              playsInline
            />
          ) : (
            <div className="aspect-[9/16] p-4 text-xs text-muted-foreground">
              Video preview unavailable.
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{hook.songTitle}</p>
              <Badge
                className={
                  hook.visibility === "public"
                    ? "bg-emerald-400/15 text-emerald-200"
                    : "bg-slate-400/15 text-slate-200"
                }
              >
                {hook.visibility}
              </Badge>
              {hook.moderationStatus === "pending-review" ? (
                <Badge className="bg-amber-400/15 text-amber-100">
                  reported
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {hook.artist} / {formatDuration(hook.startMs)} to{" "}
              {formatDuration(hook.startMs + hook.durationMs)}
            </p>
          </div>

          {hook.overlayText ? (
            <p className="rounded-md border border-white/10 bg-black/20 p-3 text-sm leading-6">
              {hook.overlayText}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {hook.tags.slice(0, 6).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => {
                void onToggleLike(hook);
              }}
            >
              <Heart
                className={
                  hook.liked
                    ? "size-4 fill-rose-300 text-rose-300"
                    : "size-4"
                }
              />
              {hook.likeCount}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => {
                void copyShareText();
              }}
            >
              <Share2 className="size-4" />
              Share
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={saveRemixDraft}
            >
              <Repeat2 className="size-4" />
              Remix
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={syncDisabled}
              title={syncTitle}
              onClick={() => {
                void onSync(hook).catch((error) => {
                  toast.error(
                    error instanceof Error ? error.message : "Could not sync hook.",
                  );
                });
              }}
            >
              <LinkIcon className="size-4" />
              Sync
            </Button>
            {hook.cloudShareUrl ? (
              <Button
                size="sm"
                variant="secondary"
                className="gap-2"
                disabled={openDisabled}
                title={openTitle}
                onClick={() => {
                  window.open(hook.cloudShareUrl, "_blank", "noopener");
                }}
              >
                <Share2 className="size-4" />
                Open
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => downloadHook(hook)}
            >
              <Download className="size-4" />
              WebM
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() => {
                void onReport(hook);
              }}
            >
              <Flag className="size-4" />
              {hook.reportCount}
            </Button>
            <Select
              value={hook.visibility}
              onValueChange={(value) => {
                void onVisibilityChange(hook, value as HookVisibility);
              }}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <span className="inline-flex items-center gap-2">
                    <EyeOff className="size-4" />
                    Private
                  </span>
                </SelectItem>
                <SelectItem value="public">
                  <span className="inline-flex items-center gap-2">
                    <Eye className="size-4" />
                    Public
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() => {
                void onRemove(hook);
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-white/10 bg-black/20 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="size-4 text-emerald-200" />
          Comments {visibleComments.length}
        </div>
        <div className="space-y-2">
          {visibleComments.slice(-3).map((item) => (
            <div key={item.id} className="rounded-md bg-slate-950/70 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{item.authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
          {!visibleComments.length ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a local comment"
          />
          <Button
            className="gap-2"
            disabled={!comment.trim()}
            onClick={() => {
              void submitComment();
            }}
          >
            <Send className="size-4" />
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}

function downloadHook(hook: LocalHookPost) {
  const url = URL.createObjectURL(hook.videoBlob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${safeFileName(hook.songTitle)}-hook.webm`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "hook";
}
