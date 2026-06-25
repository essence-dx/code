import type { KeyboardTrigger, KeyboardTriggerEvent } from "../types";

export const DEFAULT_KEYBOARD_TRIGGER_EVENT: KeyboardTriggerEvent = "down";
export const DEFAULT_KEYBOARD_TRIGGER_COOLDOWN_MS = 120;
export const keyboardTriggerEvents: KeyboardTriggerEvent[] = ["down", "up", "press"];

export function normalizeKeyboardKey(value: string) {
  const key = value.trim();

  if (key.length === 1) {
    return key.toLowerCase();
  }

  return key.toLowerCase().replace(/\s+/g, " ");
}

export function resolveKeyboardTriggerEvent(trigger: KeyboardTrigger | undefined): KeyboardTriggerEvent {
  return trigger?.event ?? DEFAULT_KEYBOARD_TRIGGER_EVENT;
}

export function resolveKeyboardTriggerCooldownMs(trigger: KeyboardTrigger | undefined) {
  return trigger?.cooldownMs ?? DEFAULT_KEYBOARD_TRIGGER_COOLDOWN_MS;
}

export function matchesKeyboardTrigger(
  trigger: KeyboardTrigger | undefined,
  event: Pick<KeyboardEvent, "code" | "key">,
  triggerEvent: KeyboardTriggerEvent = DEFAULT_KEYBOARD_TRIGGER_EVENT,
) {
  if (!trigger?.key.trim()) {
    return false;
  }

  if (resolveKeyboardTriggerEvent(trigger) !== triggerEvent) {
    return false;
  }

  const expected = normalizeKeyboardKey(trigger.key);

  return expected === normalizeKeyboardKey(event.key) || expected === normalizeKeyboardKey(event.code);
}

export function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
}
