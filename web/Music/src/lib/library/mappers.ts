import type { LocalSong } from "@/features/library/types";
import type { Song } from "@/db/schema";
import { normalizeSongRightsMetadata } from "./rights";

export function localSongToCloudPayload(song: LocalSong) {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    source: song.source,
    visibility: song.visibility ?? "private",
    audioStorageKey: `local:${song.id}`,
    lyrics: song.lyrics,
    stylePrompt: song.stylePrompt,
    durationMs: song.durationMs,
    tags: song.tags,
    rightsMetadata: normalizeSongRightsMetadata(song.rightsMetadata),
    liked: song.liked,
  };
}

export function serializeSong(song: Song) {
  return {
    ...song,
    rightsMetadata: normalizeSongRightsMetadata(song.rightsMetadata),
    createdAt: song.createdAt instanceof Date ? song.createdAt.toISOString() : song.createdAt,
    updatedAt: song.updatedAt instanceof Date ? song.updatedAt.toISOString() : song.updatedAt,
    publishedAt:
      song.publishedAt instanceof Date ? song.publishedAt.toISOString() : song.publishedAt,
  };
}
