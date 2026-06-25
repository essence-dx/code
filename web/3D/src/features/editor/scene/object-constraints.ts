import type { TransformConstraints } from "../types";

export const defaultTransformConstraints: Required<TransformConstraints> = {
  lockPositionX: false,
  lockPositionY: false,
  lockPositionZ: false,
  lockRotationX: false,
  lockRotationY: false,
  lockRotationZ: false,
  lockScaleX: false,
  lockScaleY: false,
  lockScaleZ: false,
};

export function resolveTransformConstraints(constraints?: TransformConstraints | null): Required<TransformConstraints> {
  return {
    ...defaultTransformConstraints,
    ...constraints,
  };
}
