export const audioCleanupModes = ["noise-reduction", "voice-isolation", "room-echo", "speech-enhancement"] as const;
export type AudioCleanupMode = (typeof audioCleanupModes)[number];

export const audioCleanupAdapterIds = [
  "local/noise-cleanup-v1",
  "local/voice-isolation-v1",
  "local/room-echo-reduction-v1",
  "local/speech-enhancement-v1",
] as const;
export type AudioCleanupAdapterId = (typeof audioCleanupAdapterIds)[number];

export const audioCleanupAdapterId = audioCleanupAdapterIds[0];

export const audioCleanupIntensity = {
  min: 0.5,
  max: 1.5,
  step: 0.05,
  defaultValue: 1,
} as const;

export interface AudioCleanupProfile {
  id: AudioCleanupMode;
  adapter: AudioCleanupAdapterId;
  label: string;
  filenameSuffix: string;
  description: string;
  highPassHz: number;
  lowPassHz: number;
  noiseGateDb: number;
  floorGain: number;
  targetPeak: number;
  presenceGainDb: number;
  centerBlend: number;
  echoTailDamping: number;
}

export const audioCleanupProfiles: Record<AudioCleanupMode, AudioCleanupProfile> = {
  "noise-reduction": {
    id: "noise-reduction",
    adapter: "local/noise-cleanup-v1",
    label: "Noise reduction",
    filenameSuffix: "cleaned",
    description: "Reduce constant room noise and normalize speech level.",
    highPassHz: 90,
    lowPassHz: 8200,
    noiseGateDb: -44,
    floorGain: 0.22,
    targetPeak: 0.92,
    presenceGainDb: 1.5,
    centerBlend: 0,
    echoTailDamping: 0,
  },
  "voice-isolation": {
    id: "voice-isolation",
    adapter: "local/voice-isolation-v1",
    label: "Voice isolation",
    filenameSuffix: "voice-isolated",
    description: "Prioritize centered dialogue and suppress wider background audio.",
    highPassHz: 110,
    lowPassHz: 6800,
    noiseGateDb: -40,
    floorGain: 0.08,
    targetPeak: 0.94,
    presenceGainDb: 3,
    centerBlend: 0.82,
    echoTailDamping: 0.12,
  },
  "room-echo": {
    id: "room-echo",
    adapter: "local/room-echo-reduction-v1",
    label: "Room echo reduction",
    filenameSuffix: "de-echoed",
    description: "Tame low-level echo tails and tighten spoken audio.",
    highPassHz: 120,
    lowPassHz: 6500,
    noiseGateDb: -38,
    floorGain: 0.05,
    targetPeak: 0.9,
    presenceGainDb: 2,
    centerBlend: 0.35,
    echoTailDamping: 0.42,
  },
  "speech-enhancement": {
    id: "speech-enhancement",
    adapter: "local/speech-enhancement-v1",
    label: "Speech enhancement",
    filenameSuffix: "speech-enhanced",
    description: "Lift dialogue clarity with stronger presence, soft background gating, and balanced loudness.",
    highPassHz: 95,
    lowPassHz: 7600,
    noiseGateDb: -46,
    floorGain: 0.16,
    targetPeak: 0.91,
    presenceGainDb: 4.2,
    centerBlend: 0.28,
    echoTailDamping: 0.18,
  },
};

export function normalizeAudioCleanupMode(mode: AudioCleanupMode | undefined): AudioCleanupMode {
  return mode && audioCleanupModes.includes(mode) ? mode : "noise-reduction";
}

export function normalizeAudioCleanupIntensity(value: number | undefined) {
  if (!Number.isFinite(value)) return audioCleanupIntensity.defaultValue;
  const clamped = Math.min(audioCleanupIntensity.max, Math.max(audioCleanupIntensity.min, value ?? audioCleanupIntensity.defaultValue));
  return Number(clamped.toFixed(2));
}

export function resolveAudioCleanupProfile(mode: AudioCleanupMode | undefined, intensity?: number): AudioCleanupProfile {
  const profile = audioCleanupProfiles[normalizeAudioCleanupMode(mode)];
  const normalizedIntensity = normalizeAudioCleanupIntensity(intensity);
  const delta = normalizedIntensity - audioCleanupIntensity.defaultValue;

  return {
    ...profile,
    noiseGateDb: roundProfileNumber(profile.noiseGateDb + delta * 8),
    floorGain: roundProfileNumber(clampProfile(profile.floorGain * (normalizedIntensity < 1 ? 1 + Math.abs(delta) * 1.5 : 1 - delta * 0.65), 0.02, 0.78)),
    presenceGainDb: roundProfileNumber(clampProfile(profile.presenceGainDb * (0.72 + normalizedIntensity * 0.28), 0, 7)),
    centerBlend: roundProfileNumber(clampProfile(profile.centerBlend * (0.72 + normalizedIntensity * 0.28), 0, 0.96)),
    echoTailDamping: roundProfileNumber(clampProfile(profile.echoTailDamping * (0.66 + normalizedIntensity * 0.34), 0, 0.8)),
  };
}

function clampProfile(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundProfileNumber(value: number) {
  return Number(value.toFixed(3));
}
