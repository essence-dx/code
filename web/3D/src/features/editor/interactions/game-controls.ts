import type { GameControlsDirection, GameControlsTrigger } from "../types";

export const DEFAULT_GAME_CONTROLS_COOLDOWN_MS = 120;
export const DEFAULT_GAME_CONTROLS_DEADZONE = 0.35;
export const gameControlsDirections: GameControlsDirection[] = ["any", "up", "down", "left", "right", "primary", "secondary"];

const directionKeyMap: Record<Exclude<GameControlsDirection, "any">, string[]> = {
  down: ["arrowdown", "keyS", "s"],
  left: ["arrowleft", "keyA", "a"],
  primary: ["space", "enter", "numpadenter"],
  right: ["arrowright", "keyD", "d"],
  secondary: ["shiftleft", "shiftright", "controlleft", "controlright", "shift", "control"],
  up: ["arrowup", "keyW", "w"],
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function hasMappedKey(activeKeys: Set<string>, direction: Exclude<GameControlsDirection, "any">) {
  return directionKeyMap[direction].some((key) => activeKeys.has(normalizeKey(key)));
}

function hasPressedButton(gamepad: Gamepad, indexes: number[]) {
  return indexes.some((index) => gamepad.buttons[index]?.pressed === true);
}

export function resolveGameControlsCooldownMs(trigger: GameControlsTrigger | undefined) {
  return trigger?.cooldownMs ?? DEFAULT_GAME_CONTROLS_COOLDOWN_MS;
}

export function resolveGameControlsDeadzone(trigger: GameControlsTrigger | undefined) {
  return trigger?.deadzone ?? DEFAULT_GAME_CONTROLS_DEADZONE;
}

export function collectGameControlDirections(activeKeys: Set<string>, deadzone: number) {
  const directions = new Set<GameControlsDirection>();

  for (const direction of gameControlsDirections) {
    if (direction !== "any" && hasMappedKey(activeKeys, direction)) {
      directions.add(direction);
    }
  }

  const gamepads = typeof navigator === "undefined" || !navigator.getGamepads ? [] : navigator.getGamepads();

  for (const gamepad of gamepads) {
    if (!gamepad) {
      continue;
    }

    const xAxis = gamepad.axes[0] ?? 0;
    const yAxis = gamepad.axes[1] ?? 0;

    if (yAxis < -deadzone || hasPressedButton(gamepad, [12])) {
      directions.add("up");
    }

    if (yAxis > deadzone || hasPressedButton(gamepad, [13])) {
      directions.add("down");
    }

    if (xAxis < -deadzone || hasPressedButton(gamepad, [14])) {
      directions.add("left");
    }

    if (xAxis > deadzone || hasPressedButton(gamepad, [15])) {
      directions.add("right");
    }

    if (hasPressedButton(gamepad, [0, 9])) {
      directions.add("primary");
    }

    if (hasPressedButton(gamepad, [1, 6, 7])) {
      directions.add("secondary");
    }
  }

  if (directions.size > 0) {
    directions.add("any");
  }

  return directions;
}

export function matchesGameControlsTrigger(trigger: GameControlsTrigger | undefined, directions: Set<GameControlsDirection>) {
  if (trigger?.enabled !== true) {
    return false;
  }

  return directions.has(trigger.direction ?? "any");
}
