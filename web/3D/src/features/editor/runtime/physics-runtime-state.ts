import type { Transform } from "../types";

export type RuntimePhysicsTransforms = Record<string, Transform>;

export function resolveRuntimePhysicsTransform(objectId: string, transform: Transform, physicsTransforms: RuntimePhysicsTransforms): Transform {
  return physicsTransforms[objectId] ?? transform;
}
