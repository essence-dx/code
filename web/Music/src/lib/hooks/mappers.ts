import type { HookPost } from "@/db/schema";
import type { LocalHookPost } from "@/features/hooks/local-hook-feed";

export function localHookToCloudPayload(hook: LocalHookPost) {
  return {
    artist: hook.artist,
    durationMs: hook.durationMs,
    id: hook.id,
    lyrics: hook.lyrics,
    overlayText: hook.overlayText,
    songTitle: hook.songTitle,
    sourceSongId: hook.songId,
    startMs: hook.startMs,
    stylePrompt: hook.stylePrompt,
    tags: hook.tags,
    videoByteSize: hook.videoBlob.size,
    videoStorageKey: hook.cloudVideoStorageKey ?? `local:${hook.id}`,
    videoType: hook.videoType || hook.videoBlob.type || "video/webm",
    visibility: hook.visibility,
  };
}

export function serializeHookPost(hook: HookPost) {
  return {
    ...hook,
    createdAt:
      hook.createdAt instanceof Date ? hook.createdAt.toISOString() : hook.createdAt,
    publishedAt:
      hook.publishedAt instanceof Date
        ? hook.publishedAt.toISOString()
        : hook.publishedAt,
    updatedAt:
      hook.updatedAt instanceof Date ? hook.updatedAt.toISOString() : hook.updatedAt,
  };
}
