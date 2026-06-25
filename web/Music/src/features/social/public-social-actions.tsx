"use client";

import { Heart, Repeat2, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveCreationDraft } from "@/features/ai/creation-drafts";
import { authClient } from "@/lib/auth-client";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import {
  countQueuedPublicSocialActionsForTarget,
  subscribePublicInteractionReplay,
} from "./public-interaction-queue";
import { usePublicInteractionQueue } from "./use-public-interaction-queue";
import type { SocialCounts, SocialTargetType } from "@/lib/social";

type RemixDraft = {
  artist: string;
  lyrics: string;
  stylePrompt: string;
  tags: string[];
  title: string;
};

type PublicSocialActionsProps = {
  counts: SocialCounts;
  remixDraft?: RemixDraft;
  targetId: string;
  targetType: SocialTargetType;
};

export function PublicSocialActions({
  counts,
  remixDraft,
  targetId,
  targetType,
}: PublicSocialActionsProps) {
  const { data: session } = authClient.useSession();
  const onlineGuard = useOnlineActionGuard();
  const publicInteractionQueue = usePublicInteractionQueue();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const publicActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "public-interaction", title);
  const [currentCounts, setCurrentCounts] = useState(counts);
  const queuedSocialCounts = useMemo(
    () =>
      countQueuedPublicSocialActionsForTarget(
        targetType,
        targetId,
        publicInteractionQueue.items,
      ),
    [publicInteractionQueue.items, targetId, targetType],
  );

  useEffect(
    () =>
      subscribePublicInteractionReplay((summary) => {
        const syncedSocialActions = summary.syncedItems.filter(
          (synced) =>
            synced.kind === "social" &&
            synced.item.targetType === targetType &&
            synced.item.targetId === targetId,
        );
        const latest = syncedSocialActions[syncedSocialActions.length - 1];

        if (latest?.kind === "social") {
          setCurrentCounts(latest.counts);
        }
      }),
    [targetId, targetType],
  );

  async function toggle(kind: "follow" | "like" | "repost") {
    if (connectionDisabled) {
      if (!session?.user) {
        toast.error("Sign in before saving public actions.");
        return;
      }

      publicInteractionQueue.queueSocialAction({
        socialKind: kind,
        targetId,
        targetType,
      });
      toast.success("Public action saved locally and will sync when you reconnect.");
      return;
    }

    try {
      const response = await fetch("/api/social/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, targetId, targetType }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Could not save action.");
      }

      const payload = (await response.json()) as {
        active: boolean;
        counts: SocialCounts;
      };
      setCurrentCounts(payload.counts);
      toast.success(payload.active ? "Saved." : "Removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save action.");
    }
  }

  function saveRemixDraft() {
    if (!remixDraft) {
      return;
    }

    saveCreationDraft({
      audioPrompt: [
        `Create a new original version inspired by "${remixDraft.title}".`,
        remixDraft.stylePrompt,
        remixDraft.tags.length ? `Signals: ${remixDraft.tags.join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      coverPrompt: `Cover art for a new version inspired by "${remixDraft.title}": ${remixDraft.stylePrompt}`,
      lyrics: remixDraft.lyrics,
      styleIdea:
        remixDraft.stylePrompt ||
        `Build from the mood of ${remixDraft.artist}'s public track.`,
      source: {
        detail: remixDraft.artist,
        label: "Reuse",
        type: "reuse",
      },
      theme: `A distinct new take inspired by "${remixDraft.title}".`,
      title: `Public remix - ${remixDraft.title}`,
    });
    toast.success("Remix draft saved to Create.");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {targetType !== "profile" ? (
        <Button
          size="sm"
          variant="secondary"
          className="gap-2"
          title={publicActionButtonTitle("Like", connectionDisabled, session?.user)}
          onClick={() => {
            void toggle("like");
          }}
        >
          <Heart className="size-4" />
          {currentCounts.like}
          <QueuedActionBadge count={queuedSocialCounts.like} />
        </Button>
      ) : null}
      {targetType === "profile" ? (
        <Button
          size="sm"
          variant="secondary"
          className="gap-2"
          title={publicActionButtonTitle("Follow", connectionDisabled, session?.user)}
          onClick={() => {
            void toggle("follow");
          }}
        >
          <UserPlus className="size-4" />
          Follow {currentCounts.follow}
          <QueuedActionBadge count={queuedSocialCounts.follow} />
        </Button>
      ) : null}
      {(targetType === "song" || targetType === "hook") && remixDraft ? (
        <>
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            title={publicActionButtonTitle(
              "Repost",
              connectionDisabled,
              session?.user,
            )}
            onClick={() => {
              void toggle("repost");
            }}
          >
            <Repeat2 className="size-4" />
            Repost {currentCounts.repost}
            <QueuedActionBadge count={queuedSocialCounts.repost} />
          </Button>
          <Button size="sm" className="gap-2" onClick={saveRemixDraft}>
            <Sparkles className="size-4" />
            Remix draft
          </Button>
        </>
      ) : null}
    </div>
  );

  function publicActionButtonTitle(
    title: string,
    isOffline: boolean,
    user?: { id?: string },
  ) {
    if (!isOffline) {
      return publicActionTitle(title);
    }

    return user ? "Save action locally for retry" : "Sign in before saving actions";
  }
}

function QueuedActionBadge({ count }: { count: number }) {
  if (!count) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className="ml-1 max-w-24 border-amber-300/40 text-amber-100"
      aria-label={`${count} queued action${count === 1 ? "" : "s"}`}
    >
      <span aria-hidden="true">+{count} queued</span>
    </Badge>
  );
}
