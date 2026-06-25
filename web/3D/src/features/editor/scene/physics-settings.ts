import type { PhysicsSettings, PrimitiveKind, SceneObject } from "../types";

export const defaultPhysicsSettings: PhysicsSettings = {
  bodyType: "dynamic",
  collider: "box",
  damping: 0.02,
  enabled: false,
  friction: 0.4,
  gravity: true,
  mass: 1,
  restitution: 0.2,
};

export function canHavePhysics(kind: PrimitiveKind) {
  return kind !== "camera" && kind !== "pointLight" && kind !== "directionalLight" && kind !== "spotLight" && kind !== "audio" && kind !== "figma";
}

export function resolvePhysicsSettings(object: Pick<SceneObject, "physics">): PhysicsSettings {
  return {
    ...defaultPhysicsSettings,
    ...object.physics,
  };
}
