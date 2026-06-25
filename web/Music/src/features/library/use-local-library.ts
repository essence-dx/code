"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getAudioDurationMs } from "@/features/audio/audio-processing";
import {
  assertOnlineAction,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import {
  publishCloudSong,
  syncAllSongMetadata,
  syncSongMetadata,
} from "./cloud-library";
import {
  getManifestRestorePatch,
  parseLibraryManifest,
  type LibraryManifestImportSummary,
} from "./library-manifest";
import {
  deleteLocalSong,
  getLibraryStats,
  listLocalSongs,
  saveEditedSong,
  saveGeneratedSong,
  saveImportedFiles,
  saveRecording,
  updateLocalSong,
} from "./local-library";
import type {
  EditableSongPatch,
  GeneratedSongInput,
  LocalSong,
  SongVisibility,
} from "./types";

export function useLocalLibrary() {
  const onlineGuard = useOnlineActionGuard();
  const [songs, setSongs] = useState<LocalSong[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | undefined>();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextSongs = await listLocalSongs();
      setSongs(nextSongs);
      setSelectedId((current) => current ?? nextSongs[0]?.id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch((error) => {
      console.error(error);
      toast.error("Could not load the local library.");
      setLoading(false);
    });
  }, [refresh]);

  const selectedSong = useMemo(
    () => songs.find((song) => song.id === selectedId) ?? songs[0],
    [selectedId, songs],
  );

  const importFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) {
        return;
      }

      const audioFiles = files.filter((file) => file.type.startsWith("audio/"));
      if (!audioFiles.length) {
        toast.error("Choose at least one audio file.");
        return;
      }

      const imported = await saveImportedFiles(audioFiles);
      setSongs((current) => [...imported, ...current]);
      setSelectedId(imported[0]?.id);

      await Promise.all(
        imported.map(async (song) => {
          try {
            const durationMs = await getAudioDurationMs(song.audioBlob);
            const updated = await updateLocalSong(song.id, { durationMs });
            setSongs((current) =>
              current.map((item) => (item.id === song.id ? updated : item)),
            );
          } catch {
            return undefined;
          }
        }),
      );

      toast.success(`${imported.length} track${imported.length === 1 ? "" : "s"} imported.`);
    },
    [],
  );

  const updateSong = useCallback(async (id: string, patch: EditableSongPatch) => {
    const updated = await updateLocalSong(id, patch);
    setSongs((current) =>
      current.map((song) => (song.id === id ? updated : song)),
    );
  }, []);

  const syncSong = useCallback(async (song: LocalSong) => {
    assertOnlineAction(onlineGuard, "Track sync");
    setSyncing(true);
    try {
      const result = await syncSongMetadata(song);
      setLastSyncAt(Date.now());
      toast.success(
        result.audioSkippedReason
          ? `Track metadata synced. ${result.audioSkippedReason}`
          : "Track metadata and audio synced.",
      );
    } finally {
      setSyncing(false);
    }
  }, [onlineGuard]);

  const addRecording = useCallback(async (blob: Blob, title: string) => {
    let durationMs = 0;

    try {
      durationMs = await getAudioDurationMs(blob);
    } catch {
      durationMs = 0;
    }

    const recording = await saveRecording(blob, title, durationMs);
    setSongs((current) => [recording, ...current]);
    setSelectedId(recording.id);
    toast.success("Recording saved to the library.");
    return recording;
  }, []);

  const addGeneratedSong = useCallback(async (input: GeneratedSongInput) => {
    const generated = await saveGeneratedSong(input);
    setSongs((current) => [generated, ...current]);
    setSelectedId(generated.id);
    toast.success("Generated audio saved to the library.");
    return generated;
  }, []);

  const syncAll = useCallback(async () => {
    assertOnlineAction(onlineGuard, "Library sync");
    setSyncing(true);
    try {
      const count = await syncAllSongMetadata(songs);
      setLastSyncAt(Date.now());
      toast.success(`${count} track${count === 1 ? "" : "s"} synced.`);
    } finally {
      setSyncing(false);
    }
  }, [onlineGuard, songs]);

  const importManifest = useCallback(
    async (file: File): Promise<LibraryManifestImportSummary> => {
      const manifest = parseLibraryManifest(await file.text());
      const songsById = new Map(songs.map((song) => [song.id, song]));
      const updatedSongs: LocalSong[] = [];
      let matchedTracks = 0;

      for (const manifestTrack of manifest.tracks) {
        const song = songsById.get(manifestTrack.id);

        if (!song) {
          continue;
        }

        matchedTracks += 1;
        const patch = getManifestRestorePatch(song, manifestTrack);

        if (!patch) {
          continue;
        }

        updatedSongs.push(await updateLocalSong(song.id, patch));
      }

      if (updatedSongs.length) {
        const updatedById = new Map(updatedSongs.map((song) => [song.id, song]));
        setSongs((current) =>
          current.map((song) => updatedById.get(song.id) ?? song),
        );
      }

      const summary = {
        matchedTracks,
        skippedTracks: manifest.tracks.length - matchedTracks,
        totalTracks: manifest.tracks.length,
        updatedTracks: updatedSongs.length,
      };

      toast.success(
        summary.updatedTracks
          ? `${summary.updatedTracks} track${summary.updatedTracks === 1 ? "" : "s"} restored from manifest.`
          : "Manifest checked. No local track metadata needed changes.",
      );

      return summary;
    },
    [songs],
  );

  const publishSong = useCallback(
    async (song: LocalSong, visibility: SongVisibility) => {
      assertOnlineAction(onlineGuard, "Sharing update");
      setSyncing(true);
      try {
        const result = await publishCloudSong(song, visibility);
        const updated = await updateLocalSong(song.id, {
          visibility: result.song.visibility,
          shareSlug: result.song.shareSlug ?? undefined,
        });
        setSongs((current) =>
          current.map((item) => (item.id === song.id ? updated : item)),
        );
        setLastSyncAt(Date.now());
        return result.shareUrl;
      } finally {
        setSyncing(false);
      }
    },
    [onlineGuard],
  );

  const removeSong = useCallback(
    async (id: string) => {
      await deleteLocalSong(id);
      setSongs((current) => current.filter((song) => song.id !== id));
      setSelectedId((current) => {
        if (current !== id) {
          return current;
        }
        return songs.find((song) => song.id !== id)?.id;
      });
    },
    [songs],
  );

  const addEditedSong = useCallback(
    async (source: LocalSong, blob: Blob, patch: EditableSongPatch) => {
      const edited = await saveEditedSong(source, blob, patch);
      setSongs((current) => [edited, ...current]);
      setSelectedId(edited.id);
      toast.success("Edited track saved to the library.");
      return edited;
    },
    [],
  );

  return {
    songs,
    selectedSong,
    selectedId,
    loading,
    syncing,
    onlineGuard,
    lastSyncAt,
    stats: getLibraryStats(songs),
    setSelectedId,
    importFiles,
    addRecording,
    addGeneratedSong,
    updateSong,
    syncSong,
    syncAll,
    importManifest,
    publishSong,
    removeSong,
    addEditedSong,
    refresh,
  };
}
