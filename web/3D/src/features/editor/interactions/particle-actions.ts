import { resolveParticleSettings } from "../scene/particle-settings";
import type { ParticleAction, ParticleSettings, SceneObject } from "../types";

export type RuntimeParticleOverrides = Record<string, Partial<ParticleSettings>>;

const particleSettingKeys: Array<keyof ParticleSettings> = ["count", "spread", "speed", "size"];

function isParticleObject(object: SceneObject) {
  return object.kind === "particles";
}

function resolveCurrentSettings(object: SceneObject, particleOverrides: RuntimeParticleOverrides) {
  return resolveParticleSettings(object, particleOverrides[object.id]);
}

function compactOverride(object: SceneObject, settings: ParticleSettings): Partial<ParticleSettings> {
  const base = resolveParticleSettings(object);

  return particleSettingKeys.reduce<Partial<ParticleSettings>>((override, key) => {
    if (settings[key] !== base[key]) {
      override[key] = settings[key];
    }

    return override;
  }, {});
}

export function resolveRuntimeParticleSettings(object: SceneObject, particleOverrides: RuntimeParticleOverrides) {
  return resolveCurrentSettings(object, particleOverrides);
}

export function applyParticleAction(
  action: ParticleAction | undefined | null,
  objects: SceneObject[],
  particleOverrides: RuntimeParticleOverrides,
): RuntimeParticleOverrides {
  if (!action?.targetObjectId) {
    return particleOverrides;
  }

  const targetObject = objects.find((object) => object.id === action.targetObjectId);

  if (!targetObject || !isParticleObject(targetObject)) {
    return particleOverrides;
  }

  const baseSettings = resolveParticleSettings(targetObject);
  const currentSettings = resolveCurrentSettings(targetObject, particleOverrides);
  const operation = action.operation ?? "toggle";
  const actionSpeed = action.speed ?? baseSettings.speed;
  const nextSettings: ParticleSettings =
    operation === "stop"
      ? { ...currentSettings, speed: 0 }
      : operation === "start"
        ? { ...currentSettings, speed: actionSpeed }
        : operation === "toggle"
          ? { ...currentSettings, speed: currentSettings.speed > 0 ? 0 : actionSpeed }
          : {
              count: action.count ?? currentSettings.count,
              spread: action.spread ?? currentSettings.spread,
              speed: action.speed ?? currentSettings.speed,
              size: action.size ?? currentSettings.size,
            };
  const nextOverride = compactOverride(targetObject, nextSettings);
  const currentOverride = particleOverrides[targetObject.id];
  const overrideUnchanged = particleSettingKeys.every((key) => nextOverride[key] === currentOverride?.[key]);

  if (overrideUnchanged && Object.keys(nextOverride).length === Object.keys(currentOverride ?? {}).length) {
    return particleOverrides;
  }

  const nextOverrides = { ...particleOverrides };

  if (Object.keys(nextOverride).length) {
    nextOverrides[targetObject.id] = nextOverride;
  } else {
    delete nextOverrides[targetObject.id];
  }

  return nextOverrides;
}

