import type { CreationDraft, CreationDraftSource } from "./creation-drafts";

export type DraftFilter =
  | "all"
  | "needs-context"
  | CreationDraftSource["type"]
  | "persona-attachment"
  | "voice-attachment";

export type DraftSourceBadge = {
  label: string;
  tone: "default" | "good" | "warn";
};

export type DraftQuality = {
  missing: string[];
  present: string[];
  score: number;
};

export const draftFilters: Array<{ label: string; value: DraftFilter }> = [
  { label: "All", value: "all" },
  { label: "Needs context", value: "needs-context" },
  { label: "Replay", value: "replay" },
  { label: "Reuse", value: "reuse" },
  { label: "Playlist", value: "playlist" },
  { label: "Persona", value: "persona-attachment" },
  { label: "Voice", value: "voice-attachment" },
  { label: "Variant", value: "variant" },
];

export function getDraftQuality(draft: CreationDraft): DraftQuality {
  const checks = [
    ["Prompt", draft.audioPrompt],
    ["Lyrics", draft.lyrics],
    ["Style", draft.styleIdea],
    ["Voice", draft.voiceProfile?.name],
    ["Controls", draft.creativeControls ? "ready" : ""],
  ] as const;
  const present = checks
    .filter(([, value]) => Boolean(value?.trim()))
    .map(([label]) => label);
  const missing = checks
    .filter(([, value]) => !value?.trim())
    .map(([label]) => label);

  return {
    missing,
    present,
    score: Math.round((present.length / checks.length) * 100),
  };
}

export function getDraftSourceBadges(draft: CreationDraft): DraftSourceBadge[] {
  const badges: DraftSourceBadge[] = [];
  const source = inferDraftSource(draft);

  if (draft.pinned) {
    badges.push({
      label: "Pinned",
      tone: "good",
    });
  }

  if (draft.notes) {
    badges.push({
      label: "Notes",
      tone: "default",
    });
  }

  badges.push({
    label: source.label,
    tone: source.type === "manual" ? "default" : "good",
  });

  if (draft.persona) {
    badges.push({
      label: `Persona: ${draft.persona.name}`,
      tone: draft.persona.rightsConfirmed ? "good" : "warn",
    });
  }

  if (draft.voiceProfile) {
    badges.push({
      label: `Voice: ${draft.voiceProfile.name}`,
      tone: draft.voiceProfile.rightsConfirmed ? "good" : "warn",
    });
  }

  return badges;
}

export function draftMatchesFilter(draft: CreationDraft, filter: DraftFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "needs-context") {
    return getDraftQuality(draft).score < 80;
  }

  if (filter === "persona-attachment") {
    return Boolean(draft.persona);
  }

  if (filter === "voice-attachment") {
    return Boolean(draft.voiceProfile);
  }

  return inferDraftSource(draft).type === filter;
}

export function draftMatchesSearch(draft: CreationDraft, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [
    draft.title,
    draft.theme,
    draft.styleIdea,
    draft.audioPrompt,
    draft.lyrics,
    draft.persona?.name,
    draft.voiceProfile?.name,
    draft.source?.label,
    draft.source?.detail,
    draft.notes,
    draft.pinned ? "pinned" : undefined,
  ]
    .filter((value): value is string => typeof value === "string")
    .some((value) => value.toLowerCase().includes(normalized));
}

function inferDraftSource(draft: CreationDraft): CreationDraftSource {
  if (draft.source) {
    return draft.source;
  }

  const text = [draft.title, draft.theme].join(" ").toLowerCase();

  if (text.includes("variant set")) {
    return { label: "Variant", type: "variant" };
  }

  if (text.includes("playlist")) {
    return { label: "Playlist", type: "playlist" };
  }

  if (text.includes("replay")) {
    return { label: "Replay", type: "replay" };
  }

  if (text.includes("remix") || text.includes("inspired by")) {
    return { label: "Reuse", type: "reuse" };
  }

  if (draft.voiceProfile) {
    return { label: "Voice", type: "voice" };
  }

  if (draft.persona) {
    return { label: "Persona", type: "persona" };
  }

  return { label: "Manual", type: "manual" };
}
