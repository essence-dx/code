import type { SceneObject } from "../types";

export interface SceneObjectNode {
  object: SceneObject;
  children: SceneObjectNode[];
}

export function getDescendantIds(objects: SceneObject[], objectId: string) {
  const descendants = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;

    for (const object of objects) {
      if (object.parentId && (object.parentId === objectId || descendants.has(object.parentId)) && !descendants.has(object.id)) {
        descendants.add(object.id);
        changed = true;
      }
    }
  }

  return descendants;
}

export function buildSceneTree(objects: SceneObject[]) {
  const nodeMap = new Map<string, SceneObjectNode>();
  const roots: SceneObjectNode[] = [];

  for (const object of objects) {
    nodeMap.set(object.id, { object, children: [] });
  }

  for (const object of objects) {
    const node = nodeMap.get(object.id);

    if (!node) {
      continue;
    }

    if (object.parentId && nodeMap.has(object.parentId)) {
      nodeMap.get(object.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
