import type { CreationDraftInput } from "./creation-drafts";

export type DraftHandoffSection =
  | "controls"
  | "lyrics"
  | "persona"
  | "prompt"
  | "style"
  | "title"
  | "voice";

export type DraftHandoffSelection = Record<DraftHandoffSection, boolean>;

export type DraftHandoffChange = {
  after: string;
  before: string;
  changed: boolean;
  label: string;
  section: DraftHandoffSection;
};

export const draftHandoffSections: Array<{
  label: string;
  section: DraftHandoffSection;
}> = [
  { label: "Prompt", section: "prompt" },
  { label: "Lyrics", section: "lyrics" },
  { label: "Style", section: "style" },
  { label: "Title", section: "title" },
  { label: "Persona", section: "persona" },
  { label: "Voice", section: "voice" },
  { label: "Creative controls", section: "controls" },
];

export function createDraftHandoffSelection(
  current: CreationDraftInput,
  draft: CreationDraftInput,
): DraftHandoffSelection {
  return Object.fromEntries(
    getDraftHandoffChanges(current, draft).map((change) => [
      change.section,
      change.changed,
    ]),
  ) as DraftHandoffSelection;
}

export function getDraftHandoffChanges(
  current: CreationDraftInput,
  draft: CreationDraftInput,
): DraftHandoffChange[] {
  return draftHandoffSections.map(({ label, section }) => {
    const before = sectionValue(current, section);
    const after = sectionValue(draft, section);

    return {
      after,
      before,
      changed: before !== after,
      label,
      section,
    };
  });
}

export function hasSelectedDraftSections(selection: DraftHandoffSelection) {
  return Object.values(selection).some(Boolean);
}

export function composeDraftHandoff(
  current: CreationDraftInput,
  draft: CreationDraftInput,
  selection: DraftHandoffSelection,
): CreationDraftInput {
  return {
    audioPrompt: selection.prompt ? draft.audioPrompt : current.audioPrompt,
    coverPrompt: selection.prompt ? draft.coverPrompt : current.coverPrompt,
    creativeControls: selection.controls
      ? draft.creativeControls
      : current.creativeControls,
    lyrics: selection.lyrics ? draft.lyrics : current.lyrics,
    persona: selection.persona ? draft.persona : current.persona,
    source: draft.source ?? current.source ?? null,
    styleIdea: selection.style ? draft.styleIdea : current.styleIdea,
    theme: selection.style ? draft.theme : current.theme,
    title: selection.title ? draft.title : current.title,
    voiceProfile: selection.voice ? draft.voiceProfile : current.voiceProfile,
  };
}

function sectionValue(draft: CreationDraftInput, section: DraftHandoffSection) {
  if (section === "prompt") {
    return formatLines([draft.audioPrompt, draft.coverPrompt]);
  }

  if (section === "lyrics") {
    return draft.lyrics.trim() || "Empty";
  }

  if (section === "style") {
    return formatLines([draft.styleIdea, draft.theme]);
  }

  if (section === "title") {
    return draft.title.trim() || "Untitled";
  }

  if (section === "persona") {
    return draft.persona
      ? `${draft.persona.name} / ${rightsLabel(draft.persona.rightsConfirmed)}`
      : "None";
  }

  if (section === "voice") {
    return draft.voiceProfile
      ? `${draft.voiceProfile.name} / ${rightsLabel(
          draft.voiceProfile.rightsConfirmed,
        )}`
      : "None";
  }

  return draft.creativeControls
    ? [
        `Weirdness ${draft.creativeControls.weirdness}`,
        `Structure ${draft.creativeControls.structure}`,
        `Reference ${draft.creativeControls.referenceInfluence}`,
      ].join(" / ")
    : "Default";
}

function formatLines(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean).join("\n") || "Empty";
}

function rightsLabel(value: boolean) {
  return value ? "rights confirmed" : "rights unconfirmed";
}
