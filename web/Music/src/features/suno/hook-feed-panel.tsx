"use client";

import { MessageSquare } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  HookVisibility,
  LocalHookPost,
} from "@/features/hooks/local-hook-feed";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import { HookFeedCard } from "./hook-feed-card";

type HookFeedPanelProps = {
  hooks: LocalHookPost[];
  loading: boolean;
  onAddComment: (hook: LocalHookPost, body: string) => Promise<void>;
  onRemove: (hook: LocalHookPost) => Promise<void>;
  onReport: (hook: LocalHookPost) => Promise<void>;
  onSync: (hook: LocalHookPost) => Promise<unknown>;
  onToggleLike: (hook: LocalHookPost) => Promise<void>;
  onVisibilityChange: (
    hook: LocalHookPost,
    visibility: HookVisibility,
  ) => Promise<void>;
};

export function HookFeedPanel({
  hooks,
  loading,
  onAddComment,
  onRemove,
  onReport,
  onSync,
  onToggleLike,
  onVisibilityChange,
}: HookFeedPanelProps) {
  const onlineGuard = useOnlineActionGuard();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const cloudActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "cloud-sync", title);
  const sharingActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "sharing", title);
  const publicHooks = useMemo(
    () =>
      hooks.filter(
        (hook) =>
          hook.visibility === "public" && hook.moderationStatus !== "hidden",
      ),
    [hooks],
  );

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-emerald-200" />
            Hook feed
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{publicHooks.length} public</Badge>
            <Badge variant="outline">{hooks.length} saved</Badge>
            {connectionDisabled ? (
              <Badge variant="outline">{onlineGuard.cloudSyncDisabledReason}</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[690px] pr-3">
          <div className="space-y-3">
            {hooks.map((hook) => (
              <HookFeedCard
                key={hook.id}
                hook={hook}
                onAddComment={onAddComment}
                onRemove={onRemove}
                onReport={onReport}
                onSync={onSync}
                openDisabled={connectionDisabled}
                openTitle={sharingActionTitle("Open hook page")}
                syncDisabled={connectionDisabled}
                syncTitle={cloudActionTitle("Sync hook")}
                onToggleLike={onToggleLike}
                onVisibilityChange={onVisibilityChange}
              />
            ))}
            {!hooks.length ? (
              <div className="rounded-md border border-white/10 bg-slate-950/50 p-6 text-sm text-muted-foreground">
                {loading
                  ? "Loading hook feed..."
                  : "Save a hook from the creator to start the feed."}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
