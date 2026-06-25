import type { LocalSong } from "@/features/library/types";

export type ReusePromptContext = {
  audioPrompt: string;
  coverPrompt: string;
  draftTitle: string;
  lyrics: string;
  persona: {
    energy: string;
    name: string;
    vibe: string;
    vocalCharacter: string;
  };
  requestId: string;
  sourceSongId: string;
  sourceTitle: string;
  styleIdea: string;
  theme: string;
};

export function createReusePromptContext(song: LocalSong): ReusePromptContext {
  const tags = song.tags.length ? song.tags.join(", ") : "original song";
  const styleIdea =
    song.stylePrompt.trim() ||
    `Build from this track's existing direction: ${tags}.`;
  const title = song.title.trim() || "Untitled track";

  return {
    audioPrompt: [
      `Create a new version inspired by "${title}".`,
      styleIdea,
      song.lyrics.trim()
        ? "Keep the strongest melodic and lyrical identity, but allow a fresh arrangement."
        : "Use the existing vibe as direction for a fresh instrumental idea.",
    ].join(" "),
    coverPrompt: `Cover art for "${title}": ${styleIdea}`,
    draftTitle: `Reuse prompt - ${title}`,
    lyrics: song.lyrics,
    persona: {
      energy: inferEnergy(song.tags, styleIdea),
      name: `${title} persona`,
      vibe: tags,
      vocalCharacter: song.lyrics.trim()
        ? "lyric-led vocal identity from an original track"
        : "instrumental identity from an original track",
    },
    requestId: `${song.id}:${Date.now()}`,
    sourceSongId: song.id,
    sourceTitle: title,
    styleIdea,
    theme: `Reuse the creative DNA of "${title}" while making a distinct new version.`,
  };
}

function inferEnergy(tags: string[], styleIdea: string) {
  const value = `${tags.join(" ")} ${styleIdea}`.toLowerCase();

  if (value.includes("ambient") || value.includes("soft")) {
    return "low";
  }

  if (value.includes("anthem") || value.includes("rock") || value.includes("club")) {
    return "high";
  }

  return "medium";
}
