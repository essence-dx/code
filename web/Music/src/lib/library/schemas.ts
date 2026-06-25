import { z } from "zod";
import { maxCloudAudioBytes } from "./limits";
import {
  normalizeSongRightsMetadata,
  songRightsMetadataSchema,
} from "./rights";

export const songVisibilitySchema = z.enum(["private", "link-only", "public"]);
export const songSourceSchema = z.enum([
  "upload",
  "recording",
  "edit",
  "ai",
  "import",
]);

export const cloudSongSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(160),
  artist: z.string().min(1).max(160).default("essencefromexistence"),
  source: songSourceSchema,
  visibility: songVisibilitySchema.default("private"),
  audioStorageKey: z.string().max(500).optional().nullable(),
  coverImageUrl: z.string().max(1000).optional().nullable(),
  lyrics: z.string().max(10000).default(""),
  stylePrompt: z.string().max(2000).default(""),
  durationMs: z.number().int().min(0).default(0),
  bpm: z.number().int().min(1).max(300).optional().nullable(),
  musicalKey: z.string().max(32).optional().nullable(),
  tags: z.array(z.string().min(1).max(40)).max(24).default([]),
  rightsMetadata: songRightsMetadataSchema.default(() =>
    normalizeSongRightsMetadata({}),
  ),
  liked: z.boolean().default(false),
});

export const updateCloudSongSchema = cloudSongSchema
  .omit({ id: true, source: true })
  .partial();

export const playlistSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(700).default(""),
  visibility: songVisibilitySchema.default("private"),
});

export const updatePlaylistSchema = playlistSchema.partial();

export const playlistSongSchema = z.object({
  songId: z.string().min(1).max(128),
});

export const songAudioUploadSchema = z.object({
  mimeType: z.string().min(1).max(120),
  byteSize: z.number().int().min(1).max(maxCloudAudioBytes),
  dataBase64: z.string().min(1),
});
