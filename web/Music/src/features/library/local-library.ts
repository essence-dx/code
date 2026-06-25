import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { nanoid } from "nanoid";
import {
  defaultSongRightsMetadata,
  normalizeSongRightsMetadata,
} from "@/lib/library/rights";
import type {
  EditableSongPatch,
  GeneratedSongInput,
  LibraryStats,
  LocalSong,
} from "./types";

const DB_NAME = "essence-suno-local";
const DB_VERSION = 1;

interface EssenceSunoLocalDb extends DBSchema {
  songs: {
    key: string;
    value: LocalSong;
    indexes: {
      "by-created-at": number;
      "by-updated-at": number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<EssenceSunoLocalDb>> | undefined;

function getLibraryDb() {
  dbPromise ??= openDB<EssenceSunoLocalDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const songs = db.createObjectStore("songs", { keyPath: "id" });
      songs.createIndex("by-created-at", "createdAt");
      songs.createIndex("by-updated-at", "updatedAt");
    },
  });

  return dbPromise;
}

export async function listLocalSongs() {
  const db = await getLibraryDb();
  const songs = await db.getAllFromIndex("songs", "by-updated-at");
  return songs.map(normalizeSong).reverse();
}

export async function saveImportedFiles(files: File[]) {
  const db = await getLibraryDb();
  const now = Date.now();
  const songs: LocalSong[] = files.map((file) => ({
    id: nanoid(),
    title: file.name.replace(/\.[^/.]+$/, "") || "Untitled upload",
    artist: "essencefromexistence",
    source: "upload",
    visibility: "private",
    audioBlob: file,
    audioType: file.type || "audio/mpeg",
    durationMs: 0,
    lyrics: "",
    stylePrompt: "",
    tags: ["upload"],
    rightsMetadata: defaultSongRightsMetadata("upload", file.name),
    liked: false,
    createdAt: now,
    updatedAt: now,
  }));

  const tx = db.transaction("songs", "readwrite");
  await Promise.all(songs.map((song) => tx.store.put(song)));
  await tx.done;

  return songs;
}

export async function saveRecording(blob: Blob, title: string, durationMs = 0) {
  const db = await getLibraryDb();
  const now = Date.now();
  const recording: LocalSong = {
    id: nanoid(),
    title: title.trim() || "Untitled recording",
    artist: "essencefromexistence",
    source: "recording",
    visibility: "private",
    audioBlob: blob,
    audioType: blob.type || "audio/webm",
    durationMs,
    lyrics: "",
    stylePrompt: "",
    tags: ["recording"],
    rightsMetadata: defaultSongRightsMetadata("recording"),
    liked: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.put("songs", recording);
  return recording;
}

export async function saveGeneratedSong(input: GeneratedSongInput) {
  const db = await getLibraryDb();
  const now = Date.now();
  const generatedSong: LocalSong = {
    id: nanoid(),
    title: input.title.trim() || "Generated audio",
    artist: "essencefromexistence",
    source: "ai",
    visibility: "private",
    audioBlob: input.audioBlob,
    audioType: input.audioBlob.type || input.mediaType || "audio/mpeg",
    durationMs: input.durationMs,
    lyrics: input.lyrics,
    stylePrompt: input.stylePrompt,
    tags: Array.from(new Set(["generated", ...input.tags])),
    rightsMetadata: defaultSongRightsMetadata("ai"),
    liked: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.put("songs", generatedSong);
  return generatedSong;
}

export async function saveEditedSong(
  source: LocalSong,
  audioBlob: Blob,
  patch: EditableSongPatch = {},
) {
  const db = await getLibraryDb();
  const now = Date.now();
  const editedSong: LocalSong = {
    ...source,
    ...patch,
    id: nanoid(),
    title: patch.title ?? `${source.title} edit`,
    source: "edit",
    visibility: "private",
    shareSlug: undefined,
    audioBlob,
    audioType: audioBlob.type || source.audioType,
    rightsMetadata: normalizeSongRightsMetadata(
      patch.rightsMetadata ?? source.rightsMetadata,
    ),
    liked: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.put("songs", editedSong);
  return editedSong;
}

export async function updateLocalSong(id: string, patch: EditableSongPatch) {
  const db = await getLibraryDb();
  const song = await db.get("songs", id);

  if (!song) {
    throw new Error("Song not found.");
  }

  const updated: LocalSong = {
    ...song,
    ...patch,
    rightsMetadata: normalizeSongRightsMetadata(
      patch.rightsMetadata ?? song.rightsMetadata,
    ),
    updatedAt: Date.now(),
  };

  await db.put("songs", updated);
  return updated;
}

export async function deleteLocalSong(id: string) {
  const db = await getLibraryDb();
  await db.delete("songs", id);
}

export function getLibraryStats(songs: LocalSong[]): LibraryStats {
  return {
    totalSongs: songs.length,
    likedSongs: songs.filter((song) => song.liked).length,
    totalDurationMs: songs.reduce((sum, song) => sum + song.durationMs, 0),
  };
}

function normalizeSong(song: LocalSong): LocalSong {
  return {
    ...song,
    rightsMetadata: normalizeSongRightsMetadata(song.rightsMetadata),
    visibility: song.visibility ?? "private",
  };
}
