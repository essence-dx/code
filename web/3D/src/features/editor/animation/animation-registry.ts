import type { AnimationKeyframeValue, AnimationProperty, SceneObject, Vec3 } from "../types";

const transformAnimationProperties = ["position", "rotation", "scale"] as const satisfies AnimationProperty[];
const meshMaterialKinds: SceneObject["kind"][] = ["box", "sphere", "cylinder", "cone", "torus", "plane", "rectangle", "ellipse", "triangle", "star"];

export const animationPropertyDefinitions: Array<{ label: string; property: AnimationProperty; valueKind: "number" | "vec3" }> = [
  { property: "position", label: "Position", valueKind: "vec3" },
  { property: "rotation", label: "Rotation", valueKind: "vec3" },
  { property: "scale", label: "Scale", valueKind: "vec3" },
  { property: "material.opacity", label: "Opacity", valueKind: "number" },
];

export function isTransformAnimationProperty(property: AnimationProperty): property is (typeof transformAnimationProperties)[number] {
  return transformAnimationProperties.includes(property as (typeof transformAnimationProperties)[number]);
}

export function supportsAnimationProperty(object: SceneObject, property: AnimationProperty) {
  if (isTransformAnimationProperty(property)) {
    return true;
  }

  return property === "material.opacity" && meshMaterialKinds.includes(object.kind);
}

export function cloneAnimationValue(value: AnimationKeyframeValue): AnimationKeyframeValue {
  return Array.isArray(value) ? ([value[0], value[1], value[2]] satisfies Vec3) : value;
}

export function readAnimationPropertyValue(object: SceneObject, property: AnimationProperty): AnimationKeyframeValue | null {
  if (!supportsAnimationProperty(object, property)) {
    return null;
  }

  if (isTransformAnimationProperty(property)) {
    return cloneAnimationValue(object.transform[property]);
  }

  return object.material.opacity;
}
