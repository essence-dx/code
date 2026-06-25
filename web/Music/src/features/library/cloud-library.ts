import { localSongToCloudPayload } from "@/lib/library/mappers";
import { maxCloudAudioBytes } from "@/lib/library/limits";
import type { SongRightsMetadata } from "@/lib/library/rights";
import { upload } from "@vercel/blob/client";
import type { LocalSong, SongVisibility } from "./types";

export type CloudSong = {
  id: string;
  title: string;
  artist: string;
  source: LocalSong["source"];
  visibility: SongVisibility;
  shareSlug: string | null;
  audioStorageKey: string | null;
  coverImageUrl: string | null;
  lyrics: string;
  stylePrompt: string;
  durationMs: number;
  bpm: number | null;
  musicalKey: string | null;
  tags: string[];
  rightsMetadata: SongRightsMetadata;
  liked: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  publishedAt: string | Date | null;
};

export type CloudPlaylist = {
  id: string;
  name: string;
  description: string;
  visibility: "private" | "link-only" | "public";
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type CloudPlaylistSong = {
  link: {
    playlistId: string;
    songId: string;
    position: number;
    addedAt: string | Date;
  };
  song: CloudSong;
};

export type CloudSongSyncResult = {
  song: CloudSong;
  audioUploaded: boolean;
  audioSkippedReason?: string;
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

export async function syncSongMetadata(song: LocalSong) {
  const data = await requestJson<{ song: CloudSong }>("/api/library/songs", {
    method: "POST",
    body: JSON.stringify(localSongToCloudPayload(song)),
  });
  const audio = await uploadCloudSongAudio(song);

  return {
    song: data.song,
    ...audio,
  };
}

export async function syncAllSongMetadata(songs: LocalSong[]) {
  const results = await Promise.allSettled(songs.map(syncSongMetadata));
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length) {
    const first = failed[0];
    throw new Error(
      first.status === "rejected"
        ? first.reason instanceof Error
          ? first.reason.message
          : "Some tracks failed to sync."
        : "Some tracks failed to sync.",
    );
  }

  return results.length;
}

export async function listCloudPlaylists() {
  const data = await requestJson<{ playlists: CloudPlaylist[] }>(
    "/api/library/playlists",
  );
  return data.playlists;
}

export async function createCloudPlaylist(input: {
  name: string;
  description: string;
  visibility?: CloudPlaylist["visibility"];
}) {
  const data = await requestJson<{ playlist: CloudPlaylist }>(
    "/api/library/playlists",
    {
      method: "POST",
      body: JSON.stringify({
        ...input,
        visibility: input.visibility ?? "private",
      }),
    },
  );
  return data.playlist;
}

export async function updateCloudPlaylist(
  id: string,
  input: Partial<Pick<CloudPlaylist, "description" | "name" | "visibility">>,
) {
  const data = await requestJson<{ playlist: CloudPlaylist }>(
    `/api/library/playlists/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return data.playlist;
}

export async function deleteCloudPlaylist(id: string) {
  await requestJson(`/api/library/playlists/${id}`, {
    method: "DELETE",
  });
}

export async function addSongToCloudPlaylist(playlistId: string, songId: string) {
  await requestJson(`/api/library/playlists/${playlistId}/songs`, {
    method: "POST",
    body: JSON.stringify({ songId }),
  });
}

export async function listCloudPlaylistSongs(playlistId: string) {
  const data = await requestJson<{ songs: CloudPlaylistSong[] }>(
    `/api/library/playlists/${playlistId}/songs`,
  );
  return data.songs;
}

export async function removeSongFromCloudPlaylist(
  playlistId: string,
  songId: string,
) {
  await requestJson(`/api/library/playlists/${playlistId}/songs`, {
    method: "DELETE",
    body: JSON.stringify({ songId }),
  });
}

export async function publishCloudSong(
  song: LocalSong,
  visibility: SongVisibility,
) {
  await syncSongMetadata(song);
  return requestJson<{ song: CloudSong; shareUrl: string | null }>(
    `/api/library/songs/${song.id}/publish`,
    {
      method: "POST",
      body: JSON.stringify({ visibility }),
    },
  );
}

async function uploadCloudSongAudio(song: LocalSong) {
  if (song.audioBlob.size > maxCloudAudioBytes) {
    return uploadBlobSongAudio(song);
  }

  await requestJson(`/api/library/songs/${song.id}/audio`, {
    method: "POST",
    body: JSON.stringify({
      mimeType: song.audioType || song.audioBlob.type || "audio/mpeg",
      byteSize: song.audioBlob.size,
      dataBase64: await blobToBase64(song.audioBlob),
    }),
  });

  return { audioUploaded: true };
}

async function uploadBlobSongAudio(song: LocalSong) {
  try {
    await upload(`songs/${song.id}/${safeFileName(song)}`, song.audioBlob, {
      access: "public",
      handleUploadUrl: `/api/library/songs/${song.id}/blob-upload`,
      clientPayload: JSON.stringify({ songId: song.id }),
    });

    return { audioUploaded: true };
  } catch (error) {
    return {
      audioUploaded: false,
      audioSkippedReason:
        error instanceof Error
          ? error.message
          : `Audio is larger than ${Math.round(maxCloudAudioBytes / 1024 / 1024)} MB and Blob upload failed.`,
    };
  }
}

async function blobToBase64(blob: Blob) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read audio blob."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });

  return dataUrl.split(",")[1] ?? "";
}

function safeFileName(song: LocalSong) {
  const extension = song.audioType.includes("wav")
    ? "wav"
    : song.audioType.includes("webm")
      ? "webm"
      : song.audioType.includes("mp4") || song.audioType.includes("m4a")
        ? "m4a"
        : "mp3";

  return `${song.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "audio"}.${extension}`;
}
