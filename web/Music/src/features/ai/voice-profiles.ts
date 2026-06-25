"use client";

const storageKey = "essence-suno:voice-profiles";
const voiceProfilesChangedEvent = "essence-suno:voice-profiles-changed";
const maxProfiles = 80;

export type VoiceSampleMetadata = {
  byteSize: number;
  durationMs: number;
  fileName: string;
  mediaType: string;
  sourceType: "recording" | "upload";
};

export type VoiceProfileInput = {
  language: string;
  name: string;
  notes: string;
  range: string;
  rightsConfirmed: boolean;
  sample?: VoiceSampleMetadata | null;
  tone: string;
};

export type VoiceProfile = VoiceProfileInput & {
  createdAt: number;
  id: string;
  updatedAt: number;
};

export type VoiceProfileAttachment = {
  id: string;
  name: string;
  rightsConfirmed: boolean;
  sampleSummary: string;
  summary: string;
};

export function listVoiceProfiles(): VoiceProfile[] {
  return readVoiceProfiles().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveVoiceProfile(input: VoiceProfileInput, existingId?: string) {
  const profiles = readVoiceProfiles();
  const now = Date.now();
  const existing = existingId
    ? profiles.find((profile) => profile.id === existingId)
    : undefined;
  const profile: VoiceProfile = {
    ...normalizeVoiceProfileInput(input),
    createdAt: existing?.createdAt ?? now,
    id: existing?.id ?? createVoiceProfileId(),
    updatedAt: now,
  };
  const next = [
    profile,
    ...profiles.filter((item) => item.id !== profile.id),
  ].slice(0, maxProfiles);

  writeVoiceProfiles(next);
  return profile;
}

export function deleteVoiceProfile(id: string) {
  writeVoiceProfiles(readVoiceProfiles().filter((profile) => profile.id !== id));
}

export function serializeVoiceProfiles() {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      product: "Essence Suno",
      type: "voice-profiles",
      version: 1,
      profiles: listVoiceProfiles(),
    },
    null,
    2,
  );
}

export function toVoiceProfileAttachment(
  profile: VoiceProfile,
): VoiceProfileAttachment {
  return {
    id: profile.id,
    name: profile.name,
    rightsConfirmed: profile.rightsConfirmed,
    sampleSummary: sampleSummary(profile.sample),
    summary: voiceProfileSummary(profile),
  };
}

export function voiceProfileSummary(profile: VoiceProfile) {
  return [profile.range, profile.tone, profile.language].filter(Boolean).join(" / ");
}

export function voiceProfileToPrompt(profile: VoiceProfile) {
  return [
    `Voice profile: ${profile.name}`,
    profile.range ? `Range: ${profile.range}` : "",
    profile.tone ? `Tone: ${profile.tone}` : "",
    profile.language ? `Language: ${profile.language}` : "",
    profile.notes ? `Notes: ${profile.notes}` : "",
    profile.sample ? `Sample metadata: ${sampleSummary(profile.sample)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function subscribeToVoiceProfiles(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(voiceProfilesChangedEvent, listener);
  return () => window.removeEventListener(voiceProfilesChangedEvent, listener);
}

function readVoiceProfiles(): VoiceProfile[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isVoiceProfile);
  } catch {
    return [];
  }
}

function writeVoiceProfiles(profiles: VoiceProfile[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(profiles));
  window.dispatchEvent(new Event(voiceProfilesChangedEvent));
}

function normalizeVoiceProfileInput(input: VoiceProfileInput): VoiceProfileInput {
  return {
    language: input.language.trim(),
    name: input.name.trim() || "Untitled voice",
    notes: input.notes.trim(),
    range: input.range.trim(),
    rightsConfirmed: input.rightsConfirmed,
    sample: normalizeSample(input.sample),
    tone: input.tone.trim(),
  };
}

function normalizeSample(sample: VoiceSampleMetadata | null | undefined) {
  if (!sample) {
    return null;
  }

  return {
    byteSize: Math.max(0, Math.round(sample.byteSize)),
    durationMs: Math.max(0, Math.round(sample.durationMs)),
    fileName: sample.fileName.trim(),
    mediaType: sample.mediaType.trim(),
    sourceType: sample.sourceType,
  } satisfies VoiceSampleMetadata;
}

function sampleSummary(sample: VoiceSampleMetadata | null | undefined) {
  if (!sample) {
    return "No sample metadata";
  }

  return `${sample.sourceType}: ${sample.fileName} / ${Math.round(
    sample.durationMs / 1000,
  )}s / ${Math.round(sample.byteSize / 1024)} KB`;
}

function createVoiceProfileId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isVoiceProfile(value: unknown): value is VoiceProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<VoiceProfile>;

  return (
    typeof profile.id === "string" &&
    typeof profile.name === "string" &&
    typeof profile.range === "string" &&
    typeof profile.tone === "string" &&
    typeof profile.language === "string" &&
    typeof profile.notes === "string" &&
    typeof profile.rightsConfirmed === "boolean" &&
    typeof profile.createdAt === "number" &&
    typeof profile.updatedAt === "number" &&
    (profile.sample === undefined ||
      profile.sample === null ||
      isVoiceSample(profile.sample))
  );
}

function isVoiceSample(value: unknown): value is VoiceSampleMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const sample = value as Partial<VoiceSampleMetadata>;

  return (
    typeof sample.fileName === "string" &&
    typeof sample.mediaType === "string" &&
    typeof sample.byteSize === "number" &&
    typeof sample.durationMs === "number" &&
    (sample.sourceType === "upload" || sample.sourceType === "recording")
  );
}
