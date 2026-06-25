import type { SceneObject, Vec3 } from "../types";

export const defaultPivot: Vec3 = [0, 0, 0];

export function resolvePivot(object: Pick<SceneObject, "pivot">): Vec3 {
  return object.pivot ?? defaultPivot;
}

export function invertPivot(pivot: Vec3): Vec3 {
  return [-pivot[0], -pivot[1], -pivot[2]];
}
