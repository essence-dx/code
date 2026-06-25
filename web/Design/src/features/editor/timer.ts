import type { TimerElement } from "@/features/editor/types";

export const minTimerDurationSeconds = 1;
export const maxTimerDurationSeconds = 86_400;

export function getTimerElapsedSeconds(
  element: TimerElement,
  now = Date.now(),
) {
  const storedElapsed = Math.max(0, element.elapsedSeconds ?? 0);

  if (!element.running || !element.startedAt) {
    return storedElapsed;
  }

  return (
    storedElapsed + Math.max(0, Math.floor((now - element.startedAt) / 1000))
  );
}

export function getTimerDisplaySeconds(
  element: TimerElement,
  now = Date.now(),
) {
  const elapsed = getTimerElapsedSeconds(element, now);

  if (element.timerMode === "countdown") {
    return Math.max(0, clampTimerDuration(element.durationSeconds) - elapsed);
  }

  return elapsed;
}

export function formatTimerSeconds(seconds: number, showHours: boolean) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;

  if (showHours || hours > 0) {
    return [hours, minutes, remainder]
      .map((part) => part.toString().padStart(2, "0"))
      .join(":");
  }

  return [minutes, remainder]
    .map((part) => part.toString().padStart(2, "0"))
    .join(":");
}

export function clampTimerDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return 300;

  return Math.min(
    maxTimerDurationSeconds,
    Math.max(minTimerDurationSeconds, Math.round(seconds)),
  );
}

export function getPausedTimerUpdates(element: TimerElement) {
  return {
    elapsedSeconds: getTimerElapsedSeconds(element),
    running: false,
    startedAt: null,
  } satisfies Partial<TimerElement>;
}

export function getStartedTimerUpdates(element: TimerElement) {
  return {
    elapsedSeconds:
      element.timerMode === "countdown" &&
      getTimerElapsedSeconds(element) >=
        clampTimerDuration(element.durationSeconds)
        ? 0
        : getTimerElapsedSeconds(element),
    running: true,
    startedAt: Date.now(),
  } satisfies Partial<TimerElement>;
}

export function getResetTimerUpdates() {
  return {
    elapsedSeconds: 0,
    running: false,
    startedAt: null,
  } satisfies Partial<TimerElement>;
}
