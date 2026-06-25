import type {
  CloudPlaylist,
  CloudPlaylistSong,
} from "@/features/library/cloud-library";

const storageKey = "essence-suno:playlist-fingerprints";
const maxFingerprints = 24;

export type PlaylistFingerprint = {
  audioPrompt: string;
  createdAt: number;
  genre: string[];
  id: string;
  instrumentation: string[];
  mood: string[];
  playlistDescription: string;
  playlistId: string;
  playlistName: string;
  requestId: string;
  structure: string[];
  stylePrompt: string;
  tempoHint: string;
  theme: string;
  trackCount: number;
};

const moodWords = [
  "ambient",
  "bright",
  "cinematic",
  "dark",
  "dreamy",
  "emotional",
  "energetic",
  "focused",
  "intimate",
  "melancholic",
  "nostalgic",
  "playful",
  "romantic",
  "warm",
];

const instrumentWords = [
  "808",
  "bass",
  "drums",
  "guitar",
  "keys",
  "piano",
  "strings",
  "synth",
  "vocal",
];

const structureWords = ["bridge", "chorus", "drop", "hook", "intro", "outro", "verse"];

export function createPlaylistFingerprint(
  playlist: CloudPlaylist,
  rows: CloudPlaylistSong[],
): PlaylistFingerprint {
  const songs = rows.map((row) => row.song);
  const corpus = songs
    .flatMap((song) => [song.title, song.stylePrompt, song.lyrics, song.tags.join(" ")])
    .join("\n")
    .toLowerCase();
  const tags = topValues(
    songs.flatMap((song) => song.tags.map((tag) => tag.toLowerCase())),
    8,
  );
  const mood = findWords(corpus, moodWords);
  const instrumentation = findWords(corpus, instrumentWords);
  const structure = findWords(corpus, structureWords);
  const tempoHint = getTempoHint(songs.map((song) => song.bpm).filter(isNumber));
  const genre = tags.length ? tags.slice(0, 5) : ["original"];
  const playlistName = playlist.name.trim() || "Untitled playlist";
  const theme = [
    `Use "${playlistName}" as the creative reference point.`,
    playlist.description ? `Playlist note: ${playlist.description}` : "",
    mood.length ? `Mood: ${mood.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const stylePrompt = [
    genre.length ? `Genre tags: ${genre.join(", ")}` : "",
    instrumentation.length ? `Instrumentation: ${instrumentation.join(", ")}` : "",
    tempoHint ? `Tempo: ${tempoHint}` : "",
    structure.length ? `Structure: ${structure.join(", ")}` : "",
    "Keep it original and do not copy any specific track.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    audioPrompt: `${theme} ${stylePrompt}`.trim(),
    createdAt: Date.now(),
    genre,
    id: playlist.id,
    instrumentation,
    mood,
    playlistDescription: playlist.description,
    playlistId: playlist.id,
    playlistName,
    requestId: `${playlist.id}:${Date.now()}`,
    structure,
    stylePrompt,
    tempoHint,
    theme,
    trackCount: rows.length,
  };
}

export function savePlaylistFingerprint(fingerprint: PlaylistFingerprint) {
  const fingerprints = listPlaylistFingerprints().filter(
    (item) => item.playlistId !== fingerprint.playlistId,
  );
  const nextFingerprints = [fingerprint, ...fingerprints].slice(0, maxFingerprints);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(nextFingerprints));
  }
}

export function listPlaylistFingerprints(): PlaylistFingerprint[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isPlaylistFingerprint);
  } catch {
    return [];
  }
}

function findWords(corpus: string, words: string[]) {
  return words.filter((word) => corpus.includes(word));
}

function topValues(values: string[], limit: number) {
  const scores = new Map<string, number>();

  for (const value of values) {
    const normalized = value.trim().toLowerCase();

    if (normalized) {
      scores.set(normalized, (scores.get(normalized) ?? 0) + 1);
    }
  }

  return Array.from(scores.entries())
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function getTempoHint(bpms: number[]) {
  if (!bpms.length) {
    return "medium tempo";
  }

  const average = Math.round(bpms.reduce((sum, bpm) => sum + bpm, 0) / bpms.length);

  if (average < 90) {
    return `${average} BPM slow to mid tempo`;
  }
  if (average > 135) {
    return `${average} BPM high energy`;
  }
  return `${average} BPM mid tempo`;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPlaylistFingerprint(value: unknown): value is PlaylistFingerprint {
  if (!value || typeof value !== "object") {
    return false;
  }

  const fingerprint = value as Partial<PlaylistFingerprint>;
  return (
    typeof fingerprint.playlistId === "string" &&
    typeof fingerprint.playlistName === "string" &&
    typeof fingerprint.theme === "string" &&
    typeof fingerprint.stylePrompt === "string" &&
    typeof fingerprint.audioPrompt === "string" &&
    typeof fingerprint.createdAt === "number"
  );
}
