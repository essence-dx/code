import { z } from "zod";
import { getSongReadiness } from "@/features/library/song-readiness";
import {
  normalizeSongRightsMetadata,
  songRightsMetadataSchema,
} from "@/lib/library/rights";
import type { EditableSongPatch, LocalSong } from "@/features/library/types";

const manifestTrackSchema = z
  .object({
    artist: z.string().optional(),
    id: z.string().min(1),
    liked: z.boolean().optional(),
    lyrics: z.string().optional(),
    stylePrompt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    rightsMetadata: songRightsMetadataSchema.optional(),
    title: z.string().optional(),
  })
  .passthrough();

const libraryManifestSchema = z
  .object({
    exportedAt: z.string().optional(),
    tracks: z.array(manifestTrackSchema),
    type: z.literal("library-manifest").optional(),
    version: z.number().optional(),
  })
  .passthrough();

export type LibraryManifestTrack = z.infer<typeof manifestTrackSchema>;

export type LibraryManifestImportSummary = {
  matchedTracks: number;
  skippedTracks: number;
  totalTracks: number;
  updatedTracks: number;
};

export function createLibraryManifest(songs: LocalSong[]) {
  return {
    exportedAt: new Date().toISOString(),
    product: "Essence Suno",
    readinessAverage: songs.length
      ? Math.round(
          songs.reduce((sum, song) => sum + getSongReadiness(song).score, 0) /
            songs.length,
        )
      : 0,
    tracks: songs.map((song) => {
      const { audioBlob: _audioBlob, ...metadata } = song;

      return {
        ...metadata,
        readiness: getSongReadiness(song),
      };
    }),
    type: "library-manifest" as const,
    version: 2,
  };
}

export function parseLibraryManifest(text: string) {
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Choose a valid library manifest JSON file.");
  }

  const parsed = libraryManifestSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error("This file is not a valid library manifest.");
  }

  return parsed.data;
}

export function getManifestRestorePatch(
  song: LocalSong,
  manifestTrack: LibraryManifestTrack,
): EditableSongPatch | null {
  const patch: EditableSongPatch = {};

  assignChangedText(patch, song, "title", manifestTrack.title);
  assignChangedText(patch, song, "artist", manifestTrack.artist);
  assignChangedText(patch, song, "lyrics", manifestTrack.lyrics);
  assignChangedText(patch, song, "stylePrompt", manifestTrack.stylePrompt);

  if (typeof manifestTrack.liked === "boolean" && manifestTrack.liked !== song.liked) {
    patch.liked = manifestTrack.liked;
  }

  if (manifestTrack.tags) {
    const tags = normalizeTags(manifestTrack.tags);

    if (tags.join("\u0000") !== song.tags.join("\u0000")) {
      patch.tags = tags;
    }
  }

  if (manifestTrack.rightsMetadata) {
    const rightsMetadata = normalizeSongRightsMetadata(manifestTrack.rightsMetadata);

    if (
      JSON.stringify(rightsMetadata) !==
      JSON.stringify(normalizeSongRightsMetadata(song.rightsMetadata))
    ) {
      patch.rightsMetadata = rightsMetadata;
    }
  }

  return Object.keys(patch).length ? patch : null;
}

function assignChangedText<Key extends "artist" | "lyrics" | "stylePrompt" | "title">(
  patch: EditableSongPatch,
  song: LocalSong,
  key: Key,
  value: string | undefined,
) {
  if (typeof value !== "string") {
    return;
  }

  const nextValue = value.trim();

  if (nextValue && nextValue !== song[key]) {
    patch[key] = nextValue;
  }
}

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 24),
    ),
  );
}
