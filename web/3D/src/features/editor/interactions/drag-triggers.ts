import type { DragTrigger, DragTriggerEvent } from "../types";

export const DEFAULT_DRAG_TRIGGER_COOLDOWN_MS = 80;
export const dragTriggerEvents: DragTriggerEvent[] = ["start", "drag", "drop"];

export function resolveDragTriggerEvent(trigger: DragTrigger | undefined): DragTriggerEvent {
  return trigger?.event ?? "drop";
}

export function resolveDragTriggerCooldownMs(trigger: DragTrigger | undefined) {
  return trigger?.cooldownMs ?? DEFAULT_DRAG_TRIGGER_COOLDOWN_MS;
}

export function matchesDragTrigger(trigger: DragTrigger | undefined, event: DragTriggerEvent) {
  return trigger?.enabled === true && resolveDragTriggerEvent(trigger) === event;
}
