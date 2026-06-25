import type { CreativeControls } from "./schemas";

export type JobReplayVoiceProfile = {
  id: string;
  name: string;
  rightsConfirmed: boolean;
  sampleSummary: string;
  summary: string;
};

export type JobReplayDraft = {
  audioPrompt: string;
  coverPrompt: string;
  creativeControls?: CreativeControls;
  lyrics: string;
  persona?: null;
  source?: {
    detail?: string;
    label: string;
    type: "replay";
  };
  styleIdea: string;
  theme: string;
  title: string;
  voiceProfile?: JobReplayVoiceProfile | null;
};

export function buildJobReplayDraft(
  kind: string,
  request: unknown,
): JobReplayDraft | null {
  const value = asRecord(request);

  if (!value) {
    return null;
  }

  const creativeControls = parseCreativeControls(value.creativeControls);
  const voiceProfile = parseReplayVoiceProfile(value.voiceProfile);

  if (kind === "audio") {
    return createReplayDraft({
      audioPrompt: readString(value.prompt),
      creativeControls,
      lyrics: readString(value.lyrics),
      styleIdea: readString(value.style),
      theme: "Replay music generation",
      title: readString(value.title) || "Music generation replay",
      voiceProfile,
    });
  }

  if (kind === "sample") {
    const sourceContext = asRecord(value.sourceContext);
    return createReplayDraft({
      audioPrompt: readString(value.prompt),
      creativeControls,
      styleIdea: readString(value.style),
      theme:
        readString(sourceContext?.summary) ||
        replayTheme("sample", readString(sourceContext?.sourceTitle)),
      title: readString(value.title) || "Sample replay",
    });
  }

  if (kind === "cover-remix") {
    const mode = readString(value.mode) || "remix";
    const sourceTitle = readString(value.sourceTitle);
    return createReplayDraft({
      audioPrompt: compactJoin([
        readString(value.targetStyle),
        readString(value.notes),
      ]),
      creativeControls,
      lyrics: readString(value.lyrics),
      styleIdea: readString(value.targetStyle) || readString(value.sourceStyle),
      theme: replayTheme(mode, sourceTitle),
      title: replayTitle(sourceTitle, `${mode} replay`),
    });
  }

  if (kind === "extend") {
    const sourceTitle = readString(value.sourceTitle);
    return createReplayDraft({
      audioPrompt: compactJoin([
        readString(value.continuationPrompt),
        readString(value.notes),
      ]),
      creativeControls,
      lyrics: readString(value.lyrics),
      styleIdea: readString(value.sourceStyle),
      theme: replayTheme("extension", sourceTitle),
      title: replayTitle(sourceTitle, "extension replay"),
    });
  }

  if (kind === "replace-section") {
    const sourceTitle = readString(value.sourceTitle);
    return createReplayDraft({
      audioPrompt: compactJoin([
        readString(value.directionPrompt),
        readString(value.notes),
      ]),
      creativeControls,
      lyrics: readString(value.lyrics),
      styleIdea: readString(value.sourceStyle),
      theme: replayTheme(readString(value.mode) || "section edit", sourceTitle),
      title: replayTitle(sourceTitle, "section replay"),
    });
  }

  if (kind === "vocals") {
    const sourceTitle = readString(value.sourceTitle);
    return createReplayDraft({
      audioPrompt: compactJoin([
        readString(value.directionPrompt),
        readString(value.notes),
      ]),
      lyrics: readString(value.lyrics),
      styleIdea: readString(value.sourceStyle),
      theme: replayTheme("vocal generation", sourceTitle),
      title: replayTitle(sourceTitle, "vocals replay"),
      voiceProfile,
    });
  }

  if (kind === "instrumental") {
    const sourceTitle = readString(value.sourceTitle);
    return createReplayDraft({
      audioPrompt: compactJoin([
        readString(value.directionPrompt),
        readString(value.notes),
      ]),
      lyrics: readString(value.lyrics),
      styleIdea: readString(value.sourceStyle),
      theme: replayTheme("instrumental generation", sourceTitle),
      title: replayTitle(sourceTitle, "instrumental replay"),
    });
  }

  return null;
}

function createReplayDraft(input: {
  audioPrompt: string;
  creativeControls?: CreativeControls;
  lyrics?: string;
  styleIdea: string;
  theme: string;
  title: string;
  voiceProfile?: JobReplayVoiceProfile | null;
}): JobReplayDraft | null {
  const audioPrompt = input.audioPrompt.trim();
  const lyrics = (input.lyrics ?? "").trim();
  const styleIdea = input.styleIdea.trim();

  if (!audioPrompt && !lyrics && !styleIdea) {
    return null;
  }

  return {
    audioPrompt,
    coverPrompt: "",
    creativeControls: input.creativeControls,
    lyrics,
    persona: null,
    source: {
      detail: input.theme.trim() || undefined,
      label: "Replay",
      type: "replay",
    },
    styleIdea,
    theme: input.theme.trim() || "Replay generation",
    title: input.title.trim() || "Replay draft",
    voiceProfile: input.voiceProfile ?? null,
  };
}

function parseCreativeControls(value: unknown): CreativeControls | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const controls = value as Partial<Record<keyof CreativeControls, unknown>>;
  const referenceInfluence = parseControlValue(controls.referenceInfluence);
  const structure = parseControlValue(controls.structure);
  const weirdness = parseControlValue(controls.weirdness);

  if (
    referenceInfluence === null ||
    structure === null ||
    weirdness === null
  ) {
    return undefined;
  }

  return {
    referenceInfluence,
    structure,
    weirdness,
  };
}

function parseControlValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseReplayVoiceProfile(value: unknown): JobReplayVoiceProfile | null {
  const profile = asRecord(value);

  if (!profile) {
    return null;
  }

  const id = readString(profile.id);
  const name = readString(profile.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    rightsConfirmed:
      typeof profile.rightsConfirmed === "boolean"
        ? profile.rightsConfirmed
        : false,
    sampleSummary: readString(profile.sampleSummary),
    summary: readString(profile.summary),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function compactJoin(values: string[]) {
  return values.filter(Boolean).join("\n\n");
}

function replayTheme(kind: string, sourceTitle: string) {
  return sourceTitle ? `Replay ${kind} from ${sourceTitle}` : `Replay ${kind}`;
}

function replayTitle(sourceTitle: string, suffix: string) {
  return sourceTitle ? `${sourceTitle} ${suffix}` : suffix;
}
