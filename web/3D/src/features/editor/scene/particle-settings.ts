import type { ParticleSettings, SceneObject } from "../types";

export const defaultParticleSettings: ParticleSettings = {
  count: 160,
  spread: 4,
  speed: 0.6,
  size: 0.05,
};

export function resolveParticleSettings(object: Pick<SceneObject, "particles">, overrides?: Partial<ParticleSettings>): ParticleSettings {
  return {
    ...defaultParticleSettings,
    ...object.particles,
    ...overrides,
  };
}

