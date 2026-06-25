export const composerSystemPrompt = `You are the Essence Suno composer assistant.
Help the creator write lyrics, refine style prompts, plan arrangements, and prepare publishable song metadata.
Be concrete, music-literate, and concise. Never claim audio was generated unless a configured audio provider actually returned it.`;

export function lyricPrompt(input: {
  theme: string;
  style: string;
  mood: string;
  structure: string;
}) {
  return `Write original lyrics for a ${input.structure} song.
Theme: ${input.theme}
Style: ${input.style}
Mood: ${input.mood}

Return section-labeled lyrics only. Keep them singable and avoid copying existing songs.`;
}

export function styleExpansionPrompt(input: { idea: string; references: string }) {
  return `Expand this music idea into a precise generative music style prompt.
Idea: ${input.idea}
References or constraints: ${input.references || "none"}

Return a compact style description with instrumentation, tempo feel, vocal direction, mix texture, and negative guidance.`;
}

export function hookCaptionPrompt(input: {
  songTitle: string;
  mood: string;
  moment: string;
}) {
  return `Create five short captions for a music hook post.
Song: ${input.songTitle}
Mood: ${input.mood}
Moment: ${input.moment}

Make them punchy, non-cringe, and suitable for a creator profile.`;
}

export function songBriefPrompt(input: {
  title: string;
  lyrics: string;
  style: string;
  intention: string;
}) {
  return `Create a production brief for an original song.
Working title: ${input.title || "Untitled"}
Lyrics draft: ${input.lyrics || "not provided"}
Style prompt: ${input.style || "not provided"}
Creator intention: ${input.intention || "not provided"}

Return concise metadata, arrangement guidance, production notes, and a release checklist.`;
}

export function coverArtPrompt(input: {
  title: string;
  style: string;
  lyrics: string;
}) {
  return `Create a professional album-cover image prompt.
Title: ${input.title}
Style: ${input.style || "not specified"}
Lyrics excerpt: ${input.lyrics || "not provided"}

Return one vivid prompt. No text overlays, no logos, no fake artist names.`;
}

export function metadataPrompt(input: {
  title: string;
  lyrics: string;
  style: string;
}) {
  return `Suggest release-ready metadata for an original song.
Working title: ${input.title || "Untitled"}
Lyrics draft: ${input.lyrics || "not provided"}
Style prompt: ${input.style || "not provided"}

Return title options, tags, mood, approximate tempo guidance, a short description, and concise release copy.`;
}

export function playlistInspirationPrompt(input: {
  librarySummary: string;
  mood: string;
}) {
  return `Create practical playlist concepts for a creator music library.
Library notes: ${input.librarySummary || "The library is still small."}
Target mood: ${input.mood || "focused"}

Return playlist names, descriptions, and track ideas that help organize original songs.`;
}
