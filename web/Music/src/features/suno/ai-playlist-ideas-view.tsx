"use client";

import { Clipboard, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createCloudPlaylist } from "@/features/library/cloud-library";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import type { PlaylistInspiration } from "@/lib/ai/schemas";

export function AiPlaylistIdeasView({
  inspiration,
}: {
  inspiration?: PlaylistInspiration;
}) {
  const onlineGuard = useOnlineActionGuard();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const cloudActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "cloud-sync", title);

  if (!inspiration) {
    return null;
  }

  async function createPlaylist(input: { description: string; name: string }) {
    if (connectionDisabled) {
      toast.error(onlineGuard.cloudSyncDisabledReason);
      return;
    }

    try {
      await createCloudPlaylist(input);
      toast.success("Playlist created.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create playlist.",
      );
    }
  }

  async function copyTrackIdeas(playlist: {
    description: string;
    name: string;
    trackIdeas: string[];
  }) {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(
      [
        playlist.name,
        playlist.description,
        "",
        ...playlist.trackIdeas.map((idea) => `- ${idea}`),
      ].join("\n"),
    );
    toast.success("Playlist idea copied.");
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {inspiration.playlists.map((playlist) => (
        <div
          key={playlist.name}
          className="rounded-md border border-white/10 bg-slate-950/50 p-4"
        >
          <p className="font-medium">{playlist.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {playlist.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {connectionDisabled ? (
              <Badge variant="outline">{onlineGuard.cloudSyncDisabledReason}</Badge>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={connectionDisabled}
              title={cloudActionTitle("Create playlist")}
              onClick={() => {
                void createPlaylist(playlist);
              }}
            >
              <ListPlus className="size-4" />
              Create playlist
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              onClick={() => {
                void copyTrackIdeas(playlist);
              }}
            >
              <Clipboard className="size-4" />
              Copy ideas
            </Button>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {playlist.trackIdeas.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
