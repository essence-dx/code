"use client";

import {
  Clipboard,
  ExternalLink,
  Lightbulb,
  ListMusic,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addSongToCloudPlaylist,
  createCloudPlaylist,
  deleteCloudPlaylist,
  listCloudPlaylistSongs,
  removeSongFromCloudPlaylist,
  listCloudPlaylists,
  updateCloudPlaylist,
  type CloudPlaylist,
  type CloudPlaylistSong,
} from "@/features/library/cloud-library";
import {
  assertOnlineAction,
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import { formatDuration } from "@/features/audio/format";
import {
  createPlaylistFingerprint,
  savePlaylistFingerprint,
  type PlaylistFingerprint,
} from "@/features/ai/playlist-fingerprint";
import type { LocalSong } from "@/features/library/types";

type PlaylistsPanelProps = {
  selectedSong?: LocalSong;
  songs: LocalSong[];
  syncing: boolean;
  onSelectSong: (id: string) => void;
  onPlayQueue: (ids: string[]) => void;
  onSyncSong: (song: LocalSong) => Promise<void>;
  onUseFingerprint: (fingerprint: PlaylistFingerprint) => void;
};

export function PlaylistsPanel({
  selectedSong,
  songs,
  syncing,
  onSelectSong,
  onPlayQueue,
  onSyncSong,
  onUseFingerprint,
}: PlaylistsPanelProps) {
  const onlineGuard = useOnlineActionGuard();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const cloudActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "cloud-sync", title);
  const refreshActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "refresh", title);
  const sharingActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "sharing", title);
  const [playlists, setPlaylists] = useState<CloudPlaylist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | undefined>();
  const [playlistSongs, setPlaylistSongs] = useState<CloudPlaylistSong[]>([]);
  const [name, setName] = useState("Focus drafts");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState<string | undefined>();
  const localSongIds = useMemo(() => new Set(songs.map((song) => song.id)), [songs]);
  const queueIds = useMemo(
    () =>
      playlistSongs
        .map((item) => item.song.id)
        .filter((songId) => localSongIds.has(songId)),
    [localSongIds, playlistSongs],
  );

  const refresh = useCallback(async () => {
    if (!onlineGuard.canUseConnectionActions) {
      return;
    }

    setBusy("load");
    try {
      setPlaylists(await listCloudPlaylists());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load playlists.");
    } finally {
      setBusy(undefined);
    }
  }, [onlineGuard]);

  const loadPlaylistSongs = useCallback(async (playlistId: string) => {
    assertOnlineAction(onlineGuard, "Playlist loading");
    setBusy(`songs:${playlistId}`);
    try {
      setSelectedPlaylistId(playlistId);
      setPlaylistSongs(await listCloudPlaylistSongs(playlistId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load playlist.");
    } finally {
      setBusy(undefined);
    }
  }, [onlineGuard]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createPlaylist() {
    assertOnlineAction(onlineGuard, "Playlist creation");
    setBusy("create");
    try {
      const playlist = await createCloudPlaylist({ name, description });
      setPlaylists((current) => [playlist, ...current]);
      toast.success("Playlist created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create playlist.");
    } finally {
      setBusy(undefined);
    }
  }

  async function addSelectedSong(playlistId: string) {
    assertOnlineAction(onlineGuard, "Playlist sync");
    if (!selectedSong) {
      toast.error("Select a track first.");
      return;
    }

    setBusy(playlistId);
    try {
      await onSyncSong(selectedSong);
      await addSongToCloudPlaylist(playlistId, selectedSong.id);
      if (selectedPlaylistId === playlistId) {
        setPlaylistSongs(await listCloudPlaylistSongs(playlistId));
      }
      toast.success("Track added to playlist.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add track.");
    } finally {
      setBusy(undefined);
    }
  }

  async function removePlaylist(id: string) {
    assertOnlineAction(onlineGuard, "Playlist deletion");
    setBusy(id);
    try {
      await deleteCloudPlaylist(id);
      setPlaylists((current) => current.filter((playlist) => playlist.id !== id));
      if (selectedPlaylistId === id) {
        setSelectedPlaylistId(undefined);
        setPlaylistSongs([]);
      }
      toast.success("Playlist deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete playlist.");
    } finally {
      setBusy(undefined);
    }
  }

  async function updatePlaylistVisibility(
    playlist: CloudPlaylist,
    visibility: CloudPlaylist["visibility"],
  ) {
    assertOnlineAction(onlineGuard, "Playlist sharing update");
    setBusy(`visibility:${playlist.id}`);
    try {
      const updated = await updateCloudPlaylist(playlist.id, { visibility });
      setPlaylists((current) =>
        current.map((item) => (item.id === playlist.id ? updated : item)),
      );
      toast.success(
        visibility === "private"
          ? "Playlist is private."
          : "Playlist page is ready.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update playlist.",
      );
    } finally {
      setBusy(undefined);
    }
  }

  async function removeSong(playlistId: string, songId: string) {
    assertOnlineAction(onlineGuard, "Playlist track removal");
    setBusy(`${playlistId}:${songId}`);
    try {
      await removeSongFromCloudPlaylist(playlistId, songId);
      setPlaylistSongs((current) =>
        current.filter((item) => item.song.id !== songId),
      );
      toast.success("Track removed from playlist.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove track.");
    } finally {
      setBusy(undefined);
    }
  }

  function inspireFromPlaylist(playlist: CloudPlaylist, rows: CloudPlaylistSong[]) {
    if (!rows.length) {
      toast.error("Add tracks before using playlist inspiration.");
      return;
    }

    const fingerprint = createPlaylistFingerprint(playlist, rows);
    savePlaylistFingerprint(fingerprint);
    onUseFingerprint(fingerprint);
    toast.success("Playlist inspiration sent to AI composer.");
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListMusic className="size-4 text-emerald-200" />
            Playlists
          </CardTitle>
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            disabled={connectionDisabled || busy === "load"}
            title={refreshActionTitle("Refresh playlists")}
            onClick={() => {
              void refresh();
            }}
          >
            <RefreshCw className={busy === "load" ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-md border border-white/10 bg-slate-950/50 p-4">
          <div className="space-y-2">
            <Label htmlFor="playlist-name">Name</Label>
            <Input
              id="playlist-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="playlist-description">Description</Label>
            <Input
              id="playlist-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <Button
            className="w-full gap-2"
            disabled={connectionDisabled || busy === "create" || !name.trim()}
            title={cloudActionTitle("Create playlist")}
            onClick={createPlaylist}
          >
            {busy === "create" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create playlist
          </Button>
          <p className="text-xs text-muted-foreground">
            Playlists sync track details to your account. Original audio stays
            available from this browser unless the track is published.
          </p>
          {connectionDisabled ? (
            <Badge variant="outline">{onlineGuard.cloudSyncDisabledReason}</Badge>
          ) : null}
        </div>

        <ScrollArea className="h-[420px] pr-3">
          <div className="space-y-2">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="grid gap-3 rounded-md border border-white/10 bg-slate-950/50 p-4"
              >
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => {
                    void loadPlaylistSongs(playlist.id);
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{playlist.name}</p>
                    {selectedPlaylistId === playlist.id ? (
                      <Badge className="bg-emerald-400/15 text-emerald-200">
                        open
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {playlist.description || "No description"}
                  </p>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={
                      connectionDisabled ||
                      !selectedSong ||
                      syncing ||
                      busy === playlist.id
                    }
                    title={cloudActionTitle("Add selected track")}
                    onClick={() => addSelectedSong(playlist.id)}
                  >
                    {busy === playlist.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Add selected
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={connectionDisabled || busy === `songs:${playlist.id}`}
                    title={cloudActionTitle("Open playlist")}
                    onClick={() => {
                      void loadPlaylistSongs(playlist.id);
                    }}
                  >
                    Open
                  </Button>
                  <Select
                    disabled={connectionDisabled}
                    value={playlist.visibility}
                    onValueChange={(value) => {
                      void updatePlaylistVisibility(
                        playlist,
                        value as CloudPlaylist["visibility"],
                      );
                    }}
                  >
                    <SelectTrigger
                      className="w-32"
                      aria-label={`Visibility for ${playlist.name}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="link-only">Link only</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Open playlist page for ${playlist.name}`}
                    disabled={connectionDisabled || playlist.visibility === "private"}
                    title={sharingActionTitle("Open playlist page")}
                    onClick={() => {
                      window.open(
                        getPlaylistHref(playlist.id),
                        "_blank",
                        "noopener",
                      );
                    }}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Copy playlist link for ${playlist.name}`}
                    disabled={playlist.visibility === "private"}
                    title="Copy playlist link"
                    onClick={async () => {
                      await copyPlaylistHref(playlist.id);
                      toast.success("Playlist link copied.");
                    }}
                  >
                    <Clipboard className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete playlist ${playlist.name}`}
                    disabled={connectionDisabled || busy === playlist.id}
                    title={cloudActionTitle("Delete playlist")}
                    onClick={() => removePlaylist(playlist.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!playlists.length ? (
              <div className="rounded-md border border-white/10 bg-slate-950/50 p-8 text-center text-sm text-muted-foreground">
                {connectionDisabled
                  ? "Reconnect to load synced playlists. Local library work stays available."
                  : "Sign in and create a playlist to start organizing synced tracks."}
              </div>
            ) : null}
          </div>
        </ScrollArea>
        <div className="lg:col-span-2">
          <PlaylistDetail
            busy={busy}
            playlistId={selectedPlaylistId}
            queueIds={queueIds}
            rows={playlistSongs}
            localSongIds={localSongIds}
            onSelectSong={onSelectSong}
            onPlayQueue={onPlayQueue}
            onRemoveSong={removeSong}
            connectionDisabled={connectionDisabled}
            cloudActionTitle={cloudActionTitle}
            onInspire={(rows) => {
              const playlist = playlists.find((item) => item.id === selectedPlaylistId);

              if (playlist) {
                inspireFromPlaylist(playlist, rows);
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function getPlaylistHref(playlistId: string) {
  return `${window.location.origin}/p/${playlistId}`;
}

async function copyPlaylistHref(playlistId: string) {
  if (!navigator.clipboard) {
    return;
  }

  await navigator.clipboard.writeText(getPlaylistHref(playlistId));
}

function PlaylistDetail({
  busy,
  playlistId,
  queueIds,
  rows,
  localSongIds,
  onSelectSong,
  onPlayQueue,
  onRemoveSong,
  connectionDisabled,
  cloudActionTitle,
  onInspire,
}: {
  busy?: string;
  playlistId?: string;
  queueIds: string[];
  rows: CloudPlaylistSong[];
  localSongIds: Set<string>;
  onSelectSong: (id: string) => void;
  onPlayQueue: (ids: string[]) => void;
  onRemoveSong: (playlistId: string, songId: string) => Promise<void>;
  connectionDisabled: boolean;
  cloudActionTitle: (title: string) => string | undefined;
  onInspire: (rows: CloudPlaylistSong[]) => void;
}) {
  if (!playlistId) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-md border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">Playlist tracks</p>
          <p className="text-sm text-muted-foreground">
            {rows.length} synced track{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          className="gap-2"
          disabled={!queueIds.length}
          onClick={() => onPlayQueue(queueIds)}
        >
          <Play className="size-4" />
          Play queue
        </Button>
        <Button
          variant="secondary"
          className="gap-2"
          disabled={!rows.length}
          onClick={() => onInspire(rows)}
        >
          <Lightbulb className="size-4" />
          Inspire
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map(({ song }) => {
          const available = localSongIds.has(song.id);
          return (
            <div
              key={song.id}
              className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_auto] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{song.title}</p>
                  {!available ? (
                    <Badge variant="outline">metadata only</Badge>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{song.artist}</span>
                  <span>{formatDuration(song.durationMs)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!available}
                  onClick={() => onSelectSong(song.id)}
                >
                  Select
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${song.title} from playlist`}
                  disabled={connectionDisabled || busy === `${playlistId}:${song.id}`}
                  title={cloudActionTitle("Remove track")}
                  onClick={() => {
                    void onRemoveSong(playlistId, song.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {!rows.length ? (
          <div className="rounded-md border border-white/10 bg-black/20 p-6 text-center text-sm text-muted-foreground">
            Add selected tracks to build this playlist queue.
          </div>
        ) : null}
      </div>
    </div>
  );
}
