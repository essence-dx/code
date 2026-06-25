export const videoEnhancementModes = ["stabilization", "eye-contact", "lip-sync"] as const;
export type VideoEnhancementMode = (typeof videoEnhancementModes)[number];

export const videoEnhancementStrength = {
  min: 0.5,
  max: 1.5,
  step: 0.05,
  defaultValue: 1,
} as const;

export function normalizeVideoEnhancementStrength(value: number | undefined) {
  if (!Number.isFinite(value)) return videoEnhancementStrength.defaultValue;
  const clamped = Math.min(videoEnhancementStrength.max, Math.max(videoEnhancementStrength.min, value ?? videoEnhancementStrength.defaultValue));
  return Number(clamped.toFixed(2));
}
