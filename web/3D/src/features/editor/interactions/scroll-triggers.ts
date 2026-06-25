import type { ScrollTrigger, ScrollTriggerDirection } from "../types";

export const DEFAULT_SCROLL_TRIGGER_MIN_DELTA = 4;
export const DEFAULT_SCROLL_TRIGGER_COOLDOWN_MS = 250;
export const scrollTriggerDirections: ScrollTriggerDirection[] = ["any", "up", "down"];

export function resolveScrollTriggerDirection(trigger: ScrollTrigger | undefined): ScrollTriggerDirection {
  return trigger?.direction ?? "any";
}

export function resolveScrollTriggerMinDelta(trigger: ScrollTrigger | undefined) {
  return trigger?.minDelta ?? DEFAULT_SCROLL_TRIGGER_MIN_DELTA;
}

export function resolveScrollTriggerCooldownMs(trigger: ScrollTrigger | undefined) {
  return trigger?.cooldownMs ?? DEFAULT_SCROLL_TRIGGER_COOLDOWN_MS;
}

export function getScrollDirectionFromDelta(deltaY: number): Exclude<ScrollTriggerDirection, "any"> | null {
  if (deltaY > 0) {
    return "down";
  }

  if (deltaY < 0) {
    return "up";
  }

  return null;
}

export function matchesScrollTrigger(trigger: ScrollTrigger | undefined, direction: Exclude<ScrollTriggerDirection, "any">, deltaY: number) {
  if (trigger?.enabled !== true || Math.abs(deltaY) < resolveScrollTriggerMinDelta(trigger)) {
    return false;
  }

  const expectedDirection = resolveScrollTriggerDirection(trigger);

  return expectedDirection === "any" || expectedDirection === direction;
}
