import type { BooleanOperation, BooleanOperationKind, SceneObject } from "../types";
import { isParametricPrimitiveKind, isTwoDimensionalShapeKind, resolveGeometry } from "./primitive-geometry";

export const booleanOperationLabels: Record<BooleanOperationKind, string> = {
  intersect: "Intersect",
  subtract: "Subtract",
  union: "Union",
};

export function resolveBooleanOperations(object: Pick<SceneObject, "booleans">): BooleanOperation[] {
  return object.booleans?.filter((operation) => operation.targetObjectId && operation.enabled !== false) ?? [];
}

export function canUseBooleanSource(object: Pick<SceneObject, "geometry" | "kind">) {
  if (!isParametricPrimitiveKind(object.kind)) {
    return false;
  }

  if (!isTwoDimensionalShapeKind(object.kind)) {
    return true;
  }

  return resolveGeometry(object).extrudeDepth > 0;
}

export function canHaveBooleanStack(object: Pick<SceneObject, "geometry" | "kind">) {
  return canUseBooleanSource(object);
}
