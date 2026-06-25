"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { canUseCollisionBounds, collisionBoundsIntersect, resolveCollisionBounds, type CollisionBounds } from "../interactions/collision-bounds";
import { createAnimationTrackMap, resolveRuntimeObjectTransform } from "../interactions/runtime-transforms";
import { resolveRuntimeObjectVisible, type RuntimeVisibilityOverrides } from "../interactions/object-visibility-actions";
import { resolvePhysicsSettings } from "../scene/physics-settings";
import type { RuntimeAnimationOverrides } from "../interactions/animation-actions";
import type { RuntimeTransitionOverrides } from "../interactions/transition-actions";
import type { AnimationTrack, PhysicsSettings, SceneObject, SceneVariable, Transform, Vec3 } from "../types";
import type { RuntimePhysicsTransforms } from "./physics-runtime-state";

interface PhysicsRuntimeRunnerProps {
  animationTracks: AnimationTrack[];
  enabled: boolean;
  objects: SceneObject[];
  onTransformsChange: (transforms: RuntimePhysicsTransforms) => void;
  resetKey: number;
  runKey: string;
  runtimeAnimationOverrides: RuntimeAnimationOverrides;
  runtimeTransitionOverrides: RuntimeTransitionOverrides;
  variables: SceneVariable[];
  visibilityOverrides: RuntimeVisibilityOverrides;
}

interface BodyState {
  position: Vector3;
  velocity: Vector3;
}

interface RuntimeBody {
  sceneObjects: SceneObject[];
  bounds: CollisionBounds;
  object: SceneObject;
  physics: PhysicsSettings;
  transform: Transform;
}

interface CollisionResolution {
  normal: Vector3;
  penetration: number;
}

const gravity = new Vector3(0, -9.81, 0);
const fallbackNormal = new Vector3(0, 1, 0);

function toVec3(vector: Vector3): Vec3 {
  return [vector.x, vector.y, vector.z];
}

function withPosition(transform: Transform, position: Vector3): Transform {
  return {
    ...transform,
    position: toVec3(position),
  };
}

function sameTransforms(left: RuntimePhysicsTransforms, right: RuntimePhysicsTransforms) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => {
    const leftTransform = left[key];
    const rightTransform = right[key];

    return Boolean(rightTransform) && leftTransform.position.every((value, index) => Math.abs(value - rightTransform.position[index]) < 0.0001);
  });
}

function resolveCollision(first: CollisionBounds, second: CollisionBounds): CollisionResolution | null {
  if (!collisionBoundsIntersect(first, second)) {
    return null;
  }

  if (first.sphereLike || second.sphereLike) {
    const normal = first.center.clone().sub(second.center);
    const distance = normal.length();
    const penetration = first.radius + second.radius - distance;

    return {
      normal: distance > 0.0001 ? normal.multiplyScalar(1 / distance) : fallbackNormal.clone(),
      penetration,
    };
  }

  const overlaps = [
    first.halfExtents.x + second.halfExtents.x - Math.abs(first.center.x - second.center.x),
    first.halfExtents.y + second.halfExtents.y - Math.abs(first.center.y - second.center.y),
    first.halfExtents.z + second.halfExtents.z - Math.abs(first.center.z - second.center.z),
  ];
  let axis = 0;

  if (overlaps[1] < overlaps[axis]) {
    axis = 1;
  }

  if (overlaps[2] < overlaps[axis]) {
    axis = 2;
  }

  const normal = new Vector3();
  const firstValue = axis === 0 ? first.center.x : axis === 1 ? first.center.y : first.center.z;
  const secondValue = axis === 0 ? second.center.x : axis === 1 ? second.center.y : second.center.z;

  normal.setComponent(axis, firstValue >= secondValue ? 1 : -1);

  return {
    normal,
    penetration: overlaps[axis],
  };
}

function hasActivePhysicsAncestor(object: SceneObject, objectById: Map<string, SceneObject>, visibilityOverrides: RuntimeVisibilityOverrides) {
  let parentId = object.parentId ?? null;
  const visited = new Set<string>();

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = objectById.get(parentId);

    if (!parent) {
      return false;
    }

    if (canUseCollisionBounds(parent) && resolveRuntimeObjectVisible(parent, visibilityOverrides)) {
      return true;
    }

    parentId = parent.parentId ?? null;
  }

  return false;
}

function applyCollisionResponse(position: Vector3, velocity: Vector3, body: RuntimeBody, colliders: RuntimeBody[]) {
  let nextPosition = position;
  let nextVelocity = velocity;
  let bounds = resolveCollisionBounds(body.object, withPosition(body.transform, nextPosition), body.sceneObjects);

  for (const collider of colliders) {
    if (collider.object.id === body.object.id || collider.physics.bodyType === "trigger") {
      continue;
    }

    const collision = resolveCollision(bounds, collider.bounds);

    if (!collision || collision.penetration <= 0) {
      continue;
    }

    nextPosition = nextPosition.clone().addScaledVector(collision.normal, collision.penetration + 0.001);
    const velocityAlongNormal = nextVelocity.dot(collision.normal);

    if (velocityAlongNormal < 0) {
      nextVelocity = nextVelocity.clone().addScaledVector(collision.normal, -(1 + body.physics.restitution) * velocityAlongNormal);
      const tangent = nextVelocity.clone().sub(collision.normal.clone().multiplyScalar(nextVelocity.dot(collision.normal)));
      nextVelocity.addScaledVector(tangent, -Math.min(1, body.physics.friction));
    }

    bounds = resolveCollisionBounds(body.object, withPosition(body.transform, nextPosition), body.sceneObjects);
  }

  return {
    bounds,
    position: nextPosition,
    velocity: nextVelocity,
  };
}

export function PhysicsRuntimeRunner({
  animationTracks,
  enabled,
  objects,
  onTransformsChange,
  resetKey,
  runKey,
  runtimeAnimationOverrides,
  runtimeTransitionOverrides,
  variables,
  visibilityOverrides,
}: PhysicsRuntimeRunnerProps) {
  const bodyStatesRef = useRef<Record<string, BodyState>>({});
  const transformsRef = useRef<RuntimePhysicsTransforms>({});
  const playStartedAt = useRef<number | null>(null);
  const tracksByObjectId = useMemo(() => createAnimationTrackMap(animationTracks), [animationTracks]);

  useEffect(() => {
    bodyStatesRef.current = {};
    transformsRef.current = {};
    playStartedAt.current = null;
    onTransformsChange({});
  }, [enabled, onTransformsChange, resetKey, runKey]);

  useFrame(({ clock }, frameDelta) => {
    if (!enabled) {
      return;
    }

    if (playStartedAt.current === null) {
      playStartedAt.current = clock.elapsedTime;
    }

    const elapsedSeconds = clock.elapsedTime - playStartedAt.current;
    const delta = Math.min(0.05, Math.max(0, frameDelta));
    const objectById = new Map(objects.map((object) => [object.id, object]));
    const visibleObjects = objects.filter((object) => resolveRuntimeObjectVisible(object, visibilityOverrides));
    const activeBodies = visibleObjects
      .filter((object) => canUseCollisionBounds(object) && !hasActivePhysicsAncestor(object, objectById, visibilityOverrides))
      .map((object): RuntimeBody => {
        const transform = resolveRuntimeObjectTransform(object, tracksByObjectId, runtimeAnimationOverrides, runtimeTransitionOverrides, elapsedSeconds, variables);
        const physics = resolvePhysicsSettings(object);
        const state = bodyStatesRef.current[object.id] ?? {
          position: new Vector3(...transform.position),
          velocity: new Vector3(),
        };

        bodyStatesRef.current[object.id] = state;

        const runtimeTransform = physics.bodyType === "dynamic" ? withPosition(transform, state.position) : transform;

        return {
          bounds: resolveCollisionBounds(object, runtimeTransform, visibleObjects),
          sceneObjects: visibleObjects,
          object,
          physics,
          transform,
        };
      });
    const activeIds = new Set(activeBodies.map((body) => body.object.id));

    for (const objectId of Object.keys(bodyStatesRef.current)) {
      if (!activeIds.has(objectId)) {
        delete bodyStatesRef.current[objectId];
      }
    }

    const colliders = activeBodies.filter((body) => body.physics.bodyType !== "trigger");
    const resolvedBodies: RuntimeBody[] = colliders.filter((body) => body.physics.bodyType !== "dynamic");
    const nextTransforms: RuntimePhysicsTransforms = {};

    for (const body of activeBodies) {
      if (body.physics.bodyType !== "dynamic") {
        continue;
      }

      const state = bodyStatesRef.current[body.object.id];

      if (!state) {
        continue;
      }

      const mass = Math.max(0.001, body.physics.mass);
      let velocity = state.velocity.clone();

      if (body.physics.gravity) {
        velocity.addScaledVector(gravity, delta);
      }

      const damping = Math.max(0, 1 - (body.physics.damping / mass) * delta * 10);
      velocity.multiplyScalar(damping);

      const position = state.position.clone().addScaledVector(velocity, delta);
      const resolved = applyCollisionResponse(position, velocity, body, [...resolvedBodies, ...colliders.filter((collider) => collider.object.id !== body.object.id)]);

      state.position.copy(resolved.position);
      state.velocity.copy(resolved.velocity);

      const transform = withPosition(body.transform, state.position);
      nextTransforms[body.object.id] = transform;
      resolvedBodies.push({
        ...body,
        bounds: resolved.bounds,
        transform,
      });
    }

    if (!sameTransforms(transformsRef.current, nextTransforms)) {
      transformsRef.current = nextTransforms;
      onTransformsChange(nextTransforms);
    }
  });

  return null;
}
