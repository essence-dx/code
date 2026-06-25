import type { ObjectVisibilityAction, SceneObject } from "../types";

export type RuntimeVisibilityOverrides = Record<string, boolean>;

export function resolveRuntimeObjectVisible(object: SceneObject, visibilityOverrides: RuntimeVisibilityOverrides) {
  return visibilityOverrides[object.id] ?? object.visible;
}

export function applyObjectVisibilityAction(
  action: ObjectVisibilityAction | undefined | null,
  objects: SceneObject[],
  visibilityOverrides: RuntimeVisibilityOverrides,
): RuntimeVisibilityOverrides {
  if (!action?.targetObjectId) {
    return visibilityOverrides;
  }

  const targetObject = objects.find((object) => object.id === action.targetObjectId);

  if (!targetObject) {
    return visibilityOverrides;
  }

  const currentVisible = resolveRuntimeObjectVisible(targetObject, visibilityOverrides);
  const nextVisible = action.operation === "show" ? true : action.operation === "hide" ? false : !currentVisible;

  if (visibilityOverrides[targetObject.id] === nextVisible || (visibilityOverrides[targetObject.id] === undefined && targetObject.visible === nextVisible)) {
    return visibilityOverrides;
  }

  return {
    ...visibilityOverrides,
    [targetObject.id]: nextVisible,
  };
}
