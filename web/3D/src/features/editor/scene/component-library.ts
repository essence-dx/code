import { nanoid } from "nanoid";
import { z } from "zod";
import { sceneComponentSchema, type SceneComponent, type SceneObject, type Vec3 } from "../types";
import { getDescendantIds } from "./scene-tree-utils";

const instanceOffset: Vec3 = [0.8, 0, 0.8];
const componentLibraryFileSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  components: z.array(sceneComponentSchema),
});

export type ComponentLibraryFile = z.infer<typeof componentLibraryFileSchema>;

function offsetVec3(vector: Vec3, offset: Vec3): Vec3 {
  return [vector[0] + offset[0], vector[1] + offset[1], vector[2] + offset[2]];
}

export function createComponentFromObject(objects: SceneObject[], rootObjectId: string, name: string): SceneComponent | null {
  const root = objects.find((object) => object.id === rootObjectId);

  if (!root) {
    return null;
  }

  const descendantIds = getDescendantIds(objects, rootObjectId);
  const componentObjects = [
    root,
    ...objects.filter((object) => descendantIds.has(object.id)),
  ].map((object) => {
    const clone = structuredClone(object);

    return {
      ...clone,
      parentId: clone.id === rootObjectId ? null : clone.parentId,
      transform:
        clone.id === rootObjectId
          ? {
              ...clone.transform,
              position: [0, 0, 0] as Vec3,
            }
          : clone.transform,
    };
  });
  const now = new Date().toISOString();

  return {
    id: nanoid(),
    name,
    rootObjectId,
    objects: componentObjects,
    createdAt: now,
    updatedAt: now,
  };
}

export function instantiateComponent(component: SceneComponent): { objects: SceneObject[]; rootObjectId: string | null } {
  const idMap = new Map<string, string>();

  for (const object of component.objects) {
    idMap.set(object.id, nanoid());
  }

  const rootObjectId = idMap.get(component.rootObjectId) ?? null;
  const objects = component.objects.map((object) => {
    const nextId = idMap.get(object.id) ?? nanoid();
    const parentId = object.parentId && idMap.has(object.parentId) ? (idMap.get(object.parentId) ?? null) : null;
    const isRoot = object.id === component.rootObjectId;

    return {
      ...structuredClone(object),
      id: nextId,
      componentId: component.id,
      parentId,
      name: isRoot ? `${component.name} Instance` : object.name,
      transform: {
        ...object.transform,
        position: isRoot ? offsetVec3(object.transform.position, instanceOffset) : object.transform.position,
      },
    };
  });

  return { objects, rootObjectId };
}

function createUniqueName(baseName: string, existingNames: Set<string>) {
  let name = baseName.trim() || "Component";
  let suffix = 2;

  while (existingNames.has(name)) {
    name = `${baseName} ${suffix}`;
    suffix += 1;
  }

  existingNames.add(name);

  return name;
}

function normalizeImportedComponent(component: SceneComponent, existingNames: Set<string>): SceneComponent {
  const componentId = nanoid();
  const now = new Date().toISOString();
  const objects = structuredClone(component.objects).map((object) => ({
    ...object,
    componentId,
  }));

  return {
    ...component,
    id: componentId,
    name: createUniqueName(component.name, existingNames),
    objects,
    createdAt: now,
    updatedAt: now,
  };
}

export function createComponentLibraryFile(name: string, components: SceneComponent[]): ComponentLibraryFile {
  return {
    version: 1,
    name,
    components: structuredClone(components),
  };
}

export function serializeComponentLibraryFile(library: ComponentLibraryFile) {
  return JSON.stringify(library, null, 2);
}

export function parseComponentLibraryFile(text: string): ComponentLibraryFile {
  const parsed = componentLibraryFileSchema.safeParse(JSON.parse(text));

  if (!parsed.success) {
    throw new Error("This file is not a valid Essence component library.");
  }

  return parsed.data;
}

export function mergeComponentLibrary(currentComponents: SceneComponent[], incomingComponents: SceneComponent[]) {
  const existingNames = new Set(currentComponents.map((component) => component.name));
  const importedComponents = incomingComponents.map((component) => normalizeImportedComponent(component, existingNames));

  return [...currentComponents, ...importedComponents];
}
