import type { CollisionTrigger, CollisionTriggerMode } from "../types";

export const DEFAULT_COLLISION_TRIGGER_COOLDOWN_MS = 500;
export const collisionTriggerModes: CollisionTriggerMode[] = ["enter", "inside", "exit"];

export function resolveCollisionTriggerMode(trigger: CollisionTrigger | undefined): CollisionTriggerMode {
  return trigger?.mode ?? "enter";
}

export function resolveCollisionTriggerCooldownMs(trigger: CollisionTrigger | undefined) {
  return trigger?.cooldownMs ?? DEFAULT_COLLISION_TRIGGER_COOLDOWN_MS;
}

export function matchesCollisionTrigger(trigger: CollisionTrigger | undefined, touching: boolean, wasTouching: boolean) {
  if (trigger?.enabled !== true) {
    return false;
  }

  const mode = resolveCollisionTriggerMode(trigger);

  if (mode === "inside") {
    return touching;
  }

  if (mode === "exit") {
    return wasTouching && !touching;
  }

  return touching && !wasTouching;
}
