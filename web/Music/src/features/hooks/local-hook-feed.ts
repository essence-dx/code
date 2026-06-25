import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { nanoid } from "nanoid";
import type { CreationDraftInput } from "@/features/ai/creation-drafts";
import type { LocalSong } from "@/features/library/types";

export type HookVisibility = "private" | "public";
export type HookModerationStatus = "clean" | "pending-review" | "hidden";

export type LocalHookComment = {
  authorName: string;
  body: string;
  createdAt: number;
  id: string;
  status: "visible" | "hidden";
};

export type LocalHookPost = {
  artist: string;
  cloudShareUrl?: string;
  cloudSyncedAt?: number;
  cloudVideoStorageKey?: string;
  comments: LocalHookComment[];
  createdAt: number;
  durationMs: number;
  id: string;
  liked: boolean;
  likeCount: number;
  lyrics: string;
  moderationStatus: HookModerationStatus;
  overlayText: string;
  reportCount: number;
  songId: string;
  songTitle: string;
  startMs: number;
  stylePrompt: string;
  tags: string[];
  updatedAt: number;
  videoBlob: Blob;
  videoType: string;
  visibility: HookVisibility;
};

export type HookPostInput = {
  durationMs: number;
  overlayText: string;
  song: LocalSong;
  startMs: number;
  videoBlob: Blob;
  visibility: HookVisibility;
};

export type HookPostPatch = Partial<
  Pick<
    LocalHookPost,
    | "cloudShareUrl"
    | "cloudSyncedAt"
    | "cloudVideoStorageKey"
    | "liked"
    | "likeCount"
    | "moderationStatus"
    | "reportCount"
    | "visibility"
  >
>;

const DB_NAME = "essence-suno-hooks";
const DB_VERSION = 1;

interface EssenceSunoHooksDb extends DBSchema {
  hooks: {
    key: string;
    value: LocalHookPost;
    indexes: {
      "by-song-id": string;
      "by-updated-at": number;
      "by-visibility": HookVisibility;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<EssenceSunoHooksDb>> | undefined;

function getHooksDb() {
  dbPromise ??= openDB<EssenceSunoHooksDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const hooks = db.createObjectStore("hooks", { keyPath: "id" });
      hooks.createIndex("by-song-id", "songId");
      hooks.createIndex("by-updated-at", "updatedAt");
      hooks.createIndex("by-visibility", "visibility");
    },
  });

  return dbPromise;
}

export async function listLocalHookPosts() {
  const db = await getHooksDb();
  const hooks = await db.getAllFromIndex("hooks", "by-updated-at");

  return hooks.map(normalizeHookPost).reverse();
}

export async function saveLocalHookPost(input: HookPostInput) {
  const db = await getHooksDb();
  const now = Date.now();
  const post: LocalHookPost = {
    artist: input.song.artist,
    comments: [],
    createdAt: now,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    id: nanoid(),
    liked: false,
    likeCount: 0,
    lyrics: input.song.lyrics,
    moderationStatus: "clean",
    overlayText: input.overlayText.trim(),
    reportCount: 0,
    songId: input.song.id,
    songTitle: input.song.title,
    startMs: Math.max(0, Math.round(input.startMs)),
    stylePrompt: input.song.stylePrompt,
    tags: input.song.tags,
    updatedAt: now,
    videoBlob: input.videoBlob,
    videoType: input.videoBlob.type || "video/webm",
    visibility: input.visibility,
  };

  await db.put("hooks", post);
  return post;
}

export async function updateLocalHookPost(id: string, patch: HookPostPatch) {
  const db = await getHooksDb();
  const existing = await db.get("hooks", id);

  if (!existing) {
    throw new Error("Hook post not found.");
  }

  const updated = normalizeHookPost({
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  });

  await db.put("hooks", updated);
  return updated;
}

export async function addLocalHookComment(
  id: string,
  input: { authorName?: string; body: string },
) {
  const db = await getHooksDb();
  const existing = await db.get("hooks", id);

  if (!existing) {
    throw new Error("Hook post not found.");
  }

  const comment: LocalHookComment = {
    authorName: input.authorName?.trim() || "essencefromexistence",
    body: input.body.trim(),
    createdAt: Date.now(),
    id: nanoid(),
    status: "visible",
  };

  if (!comment.body) {
    throw new Error("Write a comment first.");
  }

  const updated = normalizeHookPost({
    ...existing,
    comments: [...existing.comments, comment],
    updatedAt: Date.now(),
  });

  await db.put("hooks", updated);
  return updated;
}

export async function deleteLocalHookPost(id: string) {
  const db = await getHooksDb();
  await db.delete("hooks", id);
}

export function hookPostToRemixDraft(post: LocalHookPost): CreationDraftInput {
  return {
    audioPrompt: [
      `Create a new original track inspired by the hook from "${post.songTitle}".`,
      post.overlayText ? `Hook phrase: ${post.overlayText}` : "",
      post.stylePrompt,
      post.tags.length ? `Signals: ${post.tags.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    coverPrompt: `Cover art for a short hook inspired by "${post.songTitle}". ${post.stylePrompt}`,
    lyrics: post.lyrics,
    styleIdea:
      post.stylePrompt ||
      `Build around the energy of ${post.artist}'s hook from "${post.songTitle}".`,
    source: {
      detail: post.artist,
      label: "Reuse",
      type: "reuse",
    },
    theme: `A distinct new hook inspired by "${post.songTitle}".`,
    title: `Hook remix - ${post.songTitle}`,
  };
}

function normalizeHookPost(post: LocalHookPost): LocalHookPost {
  return {
    ...post,
    comments: (post.comments ?? []).map(normalizeComment),
    durationMs: Math.max(0, Math.round(post.durationMs ?? 0)),
    liked: Boolean(post.liked),
    likeCount: Math.max(0, Math.round(post.likeCount ?? 0)),
    moderationStatus: normalizeModerationStatus(post.moderationStatus),
    overlayText: post.overlayText ?? "",
    reportCount: Math.max(0, Math.round(post.reportCount ?? 0)),
    startMs: Math.max(0, Math.round(post.startMs ?? 0)),
    tags: Array.isArray(post.tags) ? post.tags : [],
    videoType: post.videoType || post.videoBlob.type || "video/webm",
    visibility: post.visibility === "public" ? "public" : "private",
  };
}

function normalizeComment(comment: LocalHookComment): LocalHookComment {
  return {
    ...comment,
    authorName: comment.authorName?.trim() || "essencefromexistence",
    body: comment.body ?? "",
    createdAt: comment.createdAt || Date.now(),
    status: comment.status === "hidden" ? "hidden" : "visible",
  };
}

function normalizeModerationStatus(value: HookModerationStatus) {
  return value === "hidden" || value === "pending-review" ? value : "clean";
}
