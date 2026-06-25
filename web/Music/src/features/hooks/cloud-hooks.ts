import { upload } from "@vercel/blob/client";
import { localHookToCloudPayload } from "@/lib/hooks/mappers";
import { maxCloudAudioBytes } from "@/lib/library/limits";
import type { LocalHookPost } from "./local-hook-feed";

export type CloudHookPost = {
  artist: string;
  durationMs: number;
  id: string;
  lyrics: string;
  moderationStatus: "clean" | "pending-review" | "hidden";
  overlayText: string;
  publishedAt: string | Date | null;
  songTitle: string;
  sourceSongId: string | null;
  startMs: number;
  stylePrompt: string;
  tags: string[];
  updatedAt: string | Date;
  userId: string | null;
  videoByteSize: number;
  videoStorageKey: string | null;
  videoType: string;
  visibility: "private" | "public";
};

export type CloudHookSyncResult = {
  hook: CloudHookPost;
  shareUrl: string | null;
  videoSkippedReason?: string;
  videoUploaded: boolean;
};

type ApiError = {
  error?: string;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as T & ApiError;

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export async function syncCloudHookPost(
  hook: LocalHookPost,
): Promise<CloudHookSyncResult> {
  const metadata = await requestJson<{
    hook: CloudHookPost;
    shareUrl: string | null;
  }>("/api/hooks", {
    method: "POST",
    body: JSON.stringify(localHookToCloudPayload(hook)),
  });
  const video = await uploadCloudHookVideo(hook);

  return {
    ...metadata,
    ...video,
  };
}

async function uploadCloudHookVideo(hook: LocalHookPost) {
  if (hook.videoBlob.size > maxCloudAudioBytes) {
    return uploadBlobHookVideo(hook);
  }

  await requestJson(`/api/hooks/${hook.id}/video`, {
    method: "POST",
    body: JSON.stringify({
      byteSize: hook.videoBlob.size,
      dataBase64: await blobToBase64(hook.videoBlob),
      mimeType: hook.videoType || hook.videoBlob.type || "video/webm",
    }),
  });

  return { videoUploaded: true };
}

async function uploadBlobHookVideo(hook: LocalHookPost) {
  try {
    await upload(`hooks/${hook.id}/${safeFileName(hook)}.webm`, hook.videoBlob, {
      access: "public",
      handleUploadUrl: `/api/hooks/${hook.id}/blob-upload`,
      clientPayload: JSON.stringify({ hookId: hook.id }),
    });

    return { videoUploaded: true };
  } catch (error) {
    return {
      videoSkippedReason:
        error instanceof Error
          ? error.message
          : "Large hook video upload failed.",
      videoUploaded: false,
    };
  }
}

async function blobToBase64(blob: Blob) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read hook video."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });

  return dataUrl.split(",")[1] ?? "";
}

function safeFileName(hook: LocalHookPost) {
  return hook.songTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "hook";
}
