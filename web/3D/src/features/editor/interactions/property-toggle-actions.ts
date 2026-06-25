import type { AudioSettings, LightSettings, Material, PropertyToggleAction, PropertyToggleTarget, SceneObject, VideoSettings } from "../types";

type RuntimeMaterialOverrides = Partial<Pick<Material, "wireframe">>;
type RuntimeLightOverrides = Partial<Pick<LightSettings, "castShadow">>;
type RuntimeVideoOverrides = Partial<Pick<VideoSettings, "loop" | "muted">>;
type RuntimeAudioOverrides = Partial<Pick<AudioSettings, "autoplay" | "loop" | "muted">>;

export interface RuntimePropertyOverride {
  audio?: RuntimeAudioOverrides;
  light?: RuntimeLightOverrides;
  material?: RuntimeMaterialOverrides;
  video?: RuntimeVideoOverrides;
}

export type RuntimePropertyOverrides = Record<string, RuntimePropertyOverride>;

export const propertyToggleTargets: PropertyToggleTarget[] = [
  "material.wireframe",
  "light.castShadow",
  "video.loop",
  "video.muted",
  "audio.autoplay",
  "audio.loop",
  "audio.muted",
];

export const propertyToggleTargetLabels: Record<PropertyToggleTarget, string> = {
  "audio.autoplay": "Audio autoplay",
  "audio.loop": "Audio loop",
  "audio.muted": "Audio muted",
  "light.castShadow": "Light shadows",
  "material.wireframe": "Wireframe",
  "video.loop": "Video loop",
  "video.muted": "Video muted",
};

function readCurrentValue(object: SceneObject, overrides: RuntimePropertyOverrides, property: PropertyToggleTarget) {
  const objectOverrides = overrides[object.id];

  switch (property) {
    case "material.wireframe":
      return objectOverrides?.material?.wireframe ?? object.material.wireframe;
    case "light.castShadow":
      return objectOverrides?.light?.castShadow ?? object.light?.castShadow ?? true;
    case "video.loop":
      return objectOverrides?.video?.loop ?? object.video?.loop ?? true;
    case "video.muted":
      return objectOverrides?.video?.muted ?? object.video?.muted ?? true;
    case "audio.autoplay":
      return objectOverrides?.audio?.autoplay ?? object.audio?.autoplay ?? false;
    case "audio.loop":
      return objectOverrides?.audio?.loop ?? object.audio?.loop ?? false;
    case "audio.muted":
      return objectOverrides?.audio?.muted ?? object.audio?.muted ?? false;
  }
}

function writeOverride(objectOverrides: RuntimePropertyOverride | undefined, property: PropertyToggleTarget, value: boolean): RuntimePropertyOverride {
  switch (property) {
    case "material.wireframe":
      return {
        ...objectOverrides,
        material: {
          ...objectOverrides?.material,
          wireframe: value,
        },
      };
    case "light.castShadow":
      return {
        ...objectOverrides,
        light: {
          ...objectOverrides?.light,
          castShadow: value,
        },
      };
    case "video.loop":
      return {
        ...objectOverrides,
        video: {
          ...objectOverrides?.video,
          loop: value,
        },
      };
    case "video.muted":
      return {
        ...objectOverrides,
        video: {
          ...objectOverrides?.video,
          muted: value,
        },
      };
    case "audio.autoplay":
      return {
        ...objectOverrides,
        audio: {
          ...objectOverrides?.audio,
          autoplay: value,
        },
      };
    case "audio.loop":
      return {
        ...objectOverrides,
        audio: {
          ...objectOverrides?.audio,
          loop: value,
        },
      };
    case "audio.muted":
      return {
        ...objectOverrides,
        audio: {
          ...objectOverrides?.audio,
          muted: value,
        },
      };
  }
}

export function getTogglePropertiesForObject(object: SceneObject): PropertyToggleTarget[] {
  if (object.kind === "audio") {
    return ["audio.autoplay", "audio.loop", "audio.muted"];
  }

  if (object.kind === "video") {
    return ["material.wireframe", "video.loop", "video.muted"];
  }

  if (object.kind === "pointLight" || object.kind === "directionalLight" || object.kind === "spotLight") {
    return ["light.castShadow"];
  }

  if (object.kind === "camera" || object.kind === "group" || object.kind === "model") {
    return [];
  }

  return ["material.wireframe"];
}

export function resolveRuntimePropertyObject(object: SceneObject, propertyOverrides: RuntimePropertyOverrides): SceneObject {
  const overrides = propertyOverrides[object.id];

  if (!overrides) {
    return object;
  }

  return {
    ...object,
    audio: overrides.audio && object.audio ? { ...object.audio, ...overrides.audio } : object.audio,
    light: overrides.light && object.light ? { ...object.light, ...overrides.light } : object.light,
    material: overrides.material ? { ...object.material, ...overrides.material } : object.material,
    video: overrides.video && object.video ? { ...object.video, ...overrides.video } : object.video,
  };
}

export function applyPropertyToggleAction(
  action: PropertyToggleAction | undefined | null,
  objects: SceneObject[],
  propertyOverrides: RuntimePropertyOverrides,
): RuntimePropertyOverrides {
  if (!action?.targetObjectId || !action.property) {
    return propertyOverrides;
  }

  const targetObject = objects.find((object) => object.id === action.targetObjectId);

  if (!targetObject || !getTogglePropertiesForObject(targetObject).includes(action.property)) {
    return propertyOverrides;
  }

  const nextValue = !readCurrentValue(targetObject, propertyOverrides, action.property);
  const nextObjectOverride = writeOverride(propertyOverrides[targetObject.id], action.property, nextValue);

  return {
    ...propertyOverrides,
    [targetObject.id]: nextObjectOverride,
  };
}
