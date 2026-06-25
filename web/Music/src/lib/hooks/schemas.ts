import { z } from "zod";
import { maxCloudAudioBytes } from "@/lib/library/limits";

export const hookVisibilitySchema = z.enum(["private", "public"]);

export const cloudHookPostSchema = z.object({
  artist: z.string().min(1).max(160).default("essencefromexistence"),
  durationMs: z.number().int().min(0).max(120_000).default(0),
  id: z.string().min(1).max(128),
  lyrics: z.string().max(10000).default(""),
  overlayText: z.string().max(700).default(""),
  songTitle: z.string().min(1).max(180),
  sourceSongId: z.string().max(160).optional().nullable(),
  startMs: z.number().int().min(0).default(0),
  stylePrompt: z.string().max(2000).default(""),
  tags: z.array(z.string().min(1).max(40)).max(24).default([]),
  videoByteSize: z.number().int().min(0).default(0),
  videoStorageKey: z.string().max(1000).optional().nullable(),
  videoType: z.string().min(1).max(120).default("video/webm"),
  visibility: hookVisibilitySchema.default("private"),
});

export const updateCloudHookPostSchema = cloudHookPostSchema
  .omit({ id: true })
  .partial();

export const hookVideoUploadSchema = z.object({
  byteSize: z.number().int().min(1).max(maxCloudAudioBytes),
  dataBase64: z.string().min(1),
  mimeType: z.string().min(1).max(120),
});
