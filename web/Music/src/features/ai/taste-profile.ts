import { getSongReadiness } from "@/features/library/song-readiness";
import type { LocalSong } from "@/features/library/types";
import type { CreationDraft } from "./creation-drafts";

const storageKey = "essence-suno:taste-settings";

export type TasteProfileSettings = {
  enabled: boolean;
  moodWords?: string[];
  stylePhrases?: string[];
  tags?: string[];
};

export type TasteProfile = {
  enabled: boolean;
  moodWords: string[];
  sourceCount: number;
  stylePhrases: string[];
  summary: string;
  tags: string[];
  updatedAt: number;
};

const moodDictionary = [
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

export function readTasteSettings(): TasteProfileSettings {
  if (typeof window === "undefined") {
    return { enabled: true };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as Partial<TasteProfileSettings>) : {};

    return normalizeSettings(parsed);
  } catch {
    return { enabled: true };
  }
}

export function writeTasteSettings(settings: TasteProfileSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(normalizeSettings(settings)));
}

export function clearTasteSettings() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}

export function deriveTasteProfile(
  songs: LocalSong[],
  drafts: CreationDraft[],
  settings: TasteProfileSettings,
): TasteProfile {
  const derived = deriveTasteSignals(songs, drafts);
  const tags = settings.tags !== undefined ? settings.tags : derived.tags;
  const stylePhrases =
    settings.stylePhrases !== undefined
      ? settings.stylePhrases
      : derived.stylePhrases;
  const moodWords =
    settings.moodWords !== undefined ? settings.moodWords : derived.moodWords;

  return {
    enabled: settings.enabled,
    moodWords,
    sourceCount: derived.sourceCount,
    stylePhrases,
    summary: createTasteSummary(tags, stylePhrases, moodWords),
    tags,
    updatedAt: Date.now(),
  };
}

export function profileToPrompt(profile: TasteProfile) {
  if (!profile.enabled) {
    return "";
  }

  return [
    profile.tags.length ? `Preferred tags: ${profile.tags.join(", ")}` : "",
    profile.moodWords.length ? `Mood lean: ${profile.moodWords.join(", ")}` : "",
    profile.stylePhrases.length
      ? `Style phrases: ${profile.stylePhrases.join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function serializeTasteProfile(profile: TasteProfile) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      product: "Essence Suno",
      profile,
      type: "taste-profile",
      version: 1,
    },
    null,
    2,
  );
}

function deriveTasteSignals(songs: LocalSong[], drafts: CreationDraft[]) {
  const tagScores = new Map<string, number>();
  const phraseScores = new Map<string, number>();
  const moodScores = new Map<string, number>();

  for (const song of songs) {
    const weight = getSongWeight(song);
    for (const tag of song.tags) {
      bump(tagScores, tag, weight);
      bumpMood(moodScores, tag, weight);
    }
    for (const phrase of extractPhrases(song.stylePrompt)) {
      bump(phraseScores, phrase, weight);
      bumpMood(moodScores, phrase, weight);
    }
  }

  for (const draft of drafts) {
    const weight = draft.title.toLowerCase().startsWith("reuse prompt") ? 2 : 1;
    for (const phrase of extractPhrases(draft.styleIdea)) {
      bump(phraseScores, phrase, weight);
      bumpMood(moodScores, phrase, weight);
    }
    for (const phrase of extractPhrases(draft.theme)) {
      bumpMood(moodScores, phrase, weight);
    }
  }

  return {
    moodWords: topValues(moodScores, 8),
    sourceCount: songs.length + drafts.length,
    stylePhrases: topValues(phraseScores, 8),
    tags: topValues(tagScores, 12),
  };
}

function getSongWeight(song: LocalSong) {
  let weight = 1;

  if (song.liked) {
    weight += 2;
  }
  if (song.visibility === "public") {
    weight += 2;
  }
  if (getSongReadiness(song).score === 100) {
    weight += 2;
  }

  return weight;
}

function extractPhrases(value: string) {
  return value
    .split(/[,.;\n]/)
    .map((phrase) => phrase.trim().toLowerCase())
    .filter((phrase) => phrase.length >= 3 && phrase.length <= 80)
    .slice(0, 16);
}

function bump(scores: Map<string, number>, rawValue: string, weight: number) {
  const value = rawValue.trim().toLowerCase();

  if (!value) {
    return;
  }

  scores.set(value, (scores.get(value) ?? 0) + weight);
}

function bumpMood(scores: Map<string, number>, value: string, weight: number) {
  const normalized = value.toLowerCase();

  for (const mood of moodDictionary) {
    if (normalized.includes(mood)) {
      bump(scores, mood, weight);
    }
  }
}

function topValues(scores: Map<string, number>, limit: number) {
  return Array.from(scores.entries())
    .toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function normalizeSettings(settings: Partial<TasteProfileSettings>): TasteProfileSettings {
  return {
    enabled: settings.enabled ?? true,
    moodWords: normalizeList(settings.moodWords),
    stylePhrases: normalizeList(settings.stylePhrases),
    tags: normalizeList(settings.tags),
  };
}

function normalizeList(values: string[] | undefined) {
  return values?.map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function createTasteSummary(
  tags: string[],
  stylePhrases: string[],
  moodWords: string[],
) {
  if (!tags.length && !stylePhrases.length && !moodWords.length) {
    return "Taste profile will learn from liked, ready, public, and reused tracks.";
  }

  return [
    tags.length ? `tags: ${tags.slice(0, 5).join(", ")}` : "",
    moodWords.length ? `moods: ${moodWords.slice(0, 4).join(", ")}` : "",
    stylePhrases.length ? `styles: ${stylePhrases.slice(0, 3).join("; ")}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}
