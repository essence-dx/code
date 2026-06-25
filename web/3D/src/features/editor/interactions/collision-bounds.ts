import { Vector3 } from "three";
import { resolveGeometry } from "../scene/primitive-geometry";
import { canHavePhysics, resolvePhysicsSettings } from "../scene/physics-settings";
import type { SceneObject, Transform, Vec3 } from "../types";

export interface CollisionBounds {
  center: Vector3;
  halfExtents: Vector3;
  radius: number;
  sphereLike: boolean;
}

interface LocalBounds {
  center: Vector3;
  halfExtents: Vector3;
}

const defaultHalfExtents: Vec3 = [0.5, 0.5, 0.5];

function scaleVector(scale: Vec3) {
  return new Vector3(Math.abs(scale[0]), Math.abs(scale[1]), Math.abs(scale[2]));
}

function composeChildTransform(parent: Transform, child: Transform): Transform {
  return {
    position: [
      parent.position[0] + child.position[0] * parent.scale[0],
      parent.position[1] + child.position[1] * parent.scale[1],
      parent.position[2] + child.position[2] * parent.scale[2],
    ],
    rotation: [parent.rotation[0] + child.rotation[0], parent.rotation[1] + child.rotation[1], parent.rotation[2] + child.rotation[2]],
    scale: [parent.scale[0] * child.scale[0], parent.scale[1] * child.scale[1], parent.scale[2] * child.scale[2]],
  };
}

function resolveLocalHalfExtents(object: SceneObject): Vec3 {
  if (object.kind === "text") {
    return [(object.text?.maxWidth ?? 4) / 2, (object.text?.fontSize ?? 1) / 2, 0.04];
  }

  if (object.kind === "image") {
    return [(object.image?.width ?? 1) / 2, (object.image?.height ?? 1) / 2, 0.04];
  }

  if (object.kind === "video") {
    return [(object.video?.width ?? 1) / 2, (object.video?.height ?? 1) / 2, 0.04];
  }

  if (object.kind === "svg") {
    return [(object.svg?.width ?? 1) / 2, (object.svg?.height ?? 1) / 2, Math.max(0.04, object.geometry?.extrudeDepth ?? 0.04) / 2];
  }

  if (object.kind === "path") {
    const tubeRadius = object.path?.tubeRadius ?? 0.08;
    const maxPoint = (object.path?.points ?? []).reduce<Vec3>(
      (bounds, point) => [Math.max(bounds[0], Math.abs(point[0])), Math.max(bounds[1], Math.abs(point[1])), Math.max(bounds[2], Math.abs(point[2]))],
      [tubeRadius, tubeRadius, tubeRadius],
    );

    return [maxPoint[0] + tubeRadius, maxPoint[1] + tubeRadius, maxPoint[2] + tubeRadius];
  }

  if (object.kind === "particles") {
    const radius = Math.max(0.1, (object.particles?.spread ?? 2) / 2);

    return [radius, radius, radius];
  }

  if (object.kind === "model") {
    return defaultHalfExtents;
  }

  const geometry = resolveGeometry(object);

  if (object.kind === "sphere") {
    return [geometry.radius, geometry.radius, geometry.radius];
  }

  if (object.kind === "cylinder") {
    return [Math.max(geometry.radiusTop, geometry.radiusBottom), geometry.height / 2, Math.max(geometry.radiusTop, geometry.radiusBottom)];
  }

  if (object.kind === "cone") {
    return [geometry.radius, geometry.height / 2, geometry.radius];
  }

  if (object.kind === "torus") {
    const radius = geometry.radius + geometry.tubeRadius;

    return [radius, radius, radius];
  }

  return [geometry.width / 2, Math.max(geometry.height, geometry.extrudeDepth || geometry.height) / 2, geometry.depth / 2];
}

function resolveDescendantTransform(descendant: SceneObject, objectById: Map<string, SceneObject>, ancestorId: string): Transform {
  let transform = descendant.transform;
  let parentId = descendant.parentId ?? null;
  const visited = new Set<string>();

  while (parentId && parentId !== ancestorId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = objectById.get(parentId);

    if (!parent) {
      break;
    }

    transform = composeChildTransform(parent.transform, transform);
    parentId = parent.parentId ?? null;
  }

  return transform;
}

function resolveGroupLocalBounds(group: SceneObject, objects: SceneObject[]): LocalBounds {
  const objectById = new Map(objects.map((object) => [object.id, object]));
  const childBounds = objects
    .filter((object) => object.id !== group.id && object.kind !== "group" && object.parentId)
    .filter((object) => {
      let parentId = object.parentId ?? null;
      const visited = new Set<string>();

      while (parentId && !visited.has(parentId)) {
        if (parentId === group.id) {
          return true;
        }

        visited.add(parentId);
        parentId = objectById.get(parentId)?.parentId ?? null;
      }

      return false;
    })
    .map((object) => resolveCollisionBounds(object, resolveDescendantTransform(object, objectById, group.id)));

  if (childBounds.length === 0) {
    return {
      center: new Vector3(),
      halfExtents: new Vector3(...defaultHalfExtents),
    };
  }

  const min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  for (const bounds of childBounds) {
    min.min(bounds.center.clone().sub(bounds.halfExtents));
    max.max(bounds.center.clone().add(bounds.halfExtents));
  }

  return {
    center: min.clone().add(max).multiplyScalar(0.5),
    halfExtents: max.clone().sub(min).multiplyScalar(0.5),
  };
}

export function canUseCollisionBounds(object: SceneObject) {
  return canHavePhysics(object.kind) && resolvePhysicsSettings(object).enabled;
}

export function resolveCollisionBounds(object: SceneObject, transform: Transform, objects: SceneObject[] = []): CollisionBounds {
  const physics = resolvePhysicsSettings(object);
  const localBounds =
    object.kind === "group"
      ? resolveGroupLocalBounds(object, objects)
      : {
          center: new Vector3(),
          halfExtents: new Vector3(...resolveLocalHalfExtents(object)),
        };
  const scale = scaleVector(transform.scale);
  const halfExtents = localBounds.halfExtents.clone().multiply(scale);
  const center = new Vector3(...transform.position).add(localBounds.center.clone().multiply(scale));
  const radius = Math.max(halfExtents.x, halfExtents.y, halfExtents.z);

  return {
    center,
    halfExtents,
    radius,
    sphereLike: physics.collider === "sphere" || physics.collider === "capsule",
  };
}

export function collisionBoundsIntersect(first: CollisionBounds, second: CollisionBounds) {
  if (first.sphereLike || second.sphereLike) {
    return first.center.distanceTo(second.center) <= first.radius + second.radius;
  }

  return (
    Math.abs(first.center.x - second.center.x) <= first.halfExtents.x + second.halfExtents.x &&
    Math.abs(first.center.y - second.center.y) <= first.halfExtents.y + second.halfExtents.y &&
    Math.abs(first.center.z - second.center.z) <= first.halfExtents.z + second.halfExtents.z
  );
}
