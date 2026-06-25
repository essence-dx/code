import { nanoid } from "nanoid";
import { getDescendantIds } from "../scene/scene-tree-utils";
import type { ObjectInstanceAction, SceneObject, Vec3 } from "../types";

export type RuntimeObjectInstance = SceneObject & {
  runtimeSourceObjectId: string;
};

export const defaultInstanceOffset: Vec3 = [0.8, 0, 0.8];

function offsetVec3(vector: Vec3, offset: Vec3): Vec3 {
  return [vector[0] + offset[0], vector[1] + offset[1], vector[2] + offset[2]];
}

function countSourceInstances(instances: RuntimeObjectInstance[], sourceObjectId: string) {
  return instances.filter((instance) => instance.runtimeSourceObjectId === sourceObjectId && !instance.parentId).length;
}

function cloneRuntimeObjects(objects: SceneObject[], sourceObjectId: string, offset: Vec3): RuntimeObjectInstance[] {
  const sourceObject = objects.find((object) => object.id === sourceObjectId);

  if (!sourceObject) {
    return [];
  }

  const descendantIds = getDescendantIds(objects, sourceObjectId);
  const sourceObjects = [
    sourceObject,
    ...objects.filter((object) => descendantIds.has(object.id)),
  ];
  const idMap = new Map(sourceObjects.map((object) => [object.id, `runtime-${nanoid()}`]));

  return sourceObjects.map((object) => {
    const id = idMap.get(object.id) ?? `runtime-${nanoid()}`;
    const isRoot = object.id === sourceObjectId;
    const parentId = object.parentId && idMap.has(object.parentId) ? (idMap.get(object.parentId) ?? null) : null;
    const clone = structuredClone(object);

    return {
      ...clone,
      id,
      parentId,
      runtimeSourceObjectId: sourceObjectId,
      name: isRoot ? `${sourceObject.name} Instance` : object.name,
      transform: {
        ...clone.transform,
        position: isRoot ? offsetVec3(clone.transform.position, offset) : clone.transform.position,
      },
    };
  });
}

function createInstance(action: ObjectInstanceAction, objects: SceneObject[], instances: RuntimeObjectInstance[]) {
  if (!action.sourceObjectId) {
    return instances;
  }

  const maxInstances = action.maxInstances ?? 12;

  if (countSourceInstances(instances, action.sourceObjectId) >= maxInstances) {
    return instances;
  }

  const clones = cloneRuntimeObjects(objects, action.sourceObjectId, action.offset ?? defaultInstanceOffset);

  return clones.length ? [...instances, ...clones] : instances;
}

function destroyInstances(action: ObjectInstanceAction, instances: RuntimeObjectInstance[]) {
  if (!action.sourceObjectId) {
    return instances;
  }

  const nextInstances = instances.filter((instance) => instance.runtimeSourceObjectId !== action.sourceObjectId);

  return nextInstances.length === instances.length ? instances : nextInstances;
}

export function applyObjectInstanceAction(
  action: ObjectInstanceAction | undefined | null,
  objects: SceneObject[],
  instances: RuntimeObjectInstance[],
): RuntimeObjectInstance[] {
  if (!action?.sourceObjectId) {
    return instances;
  }

  if (action.operation === "destroy") {
    return destroyInstances(action, instances);
  }

  if (action.operation === "toggle" && countSourceInstances(instances, action.sourceObjectId) > 0) {
    return destroyInstances(action, instances);
  }

  return createInstance(action, objects, instances);
}

