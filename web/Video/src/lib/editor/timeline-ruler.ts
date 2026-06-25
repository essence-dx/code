export interface TimelineRulerTick {
  id: string;
  time: number;
  percent: number;
  kind: "major" | "minor";
}

const rulerIntervals = [0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
const targetMajorTickPixels = 88;
const maxRulerTicks = 180;

export function createTimelineRulerTicks(duration: number, width: number): TimelineRulerTick[] {
  const safeDuration = Math.max(1, Number.isFinite(duration) ? duration : 1);
  const safeWidth = Math.max(1, Number.isFinite(width) ? width : 1);
  const majorInterval = chooseMajorInterval(safeDuration, safeWidth);
  const minorInterval = chooseMinorInterval(majorInterval, safeDuration);
  const ticks: TimelineRulerTick[] = [];
  const rawCount = Math.floor(safeDuration / minorInterval);
  const tickStep = Math.max(1, Math.ceil(rawCount / maxRulerTicks));

  for (let index = 0; index <= rawCount; index += tickStep) {
    const time = roundTime(index * minorInterval);
    ticks.push(toTick(time, safeDuration, majorInterval));
  }

  const lastTime = ticks.at(-1)?.time ?? 0;
  if (Math.abs(lastTime - safeDuration) > minorInterval * 0.5) {
    ticks.push(toTick(safeDuration, safeDuration, majorInterval, "major"));
  }

  return ticks;
}

function chooseMajorInterval(duration: number, width: number) {
  const secondsPerPixel = duration / width;
  return rulerIntervals.find((interval) => interval / secondsPerPixel >= targetMajorTickPixels) ?? rulerIntervals.at(-1) ?? 600;
}

function chooseMinorInterval(majorInterval: number, duration: number) {
  const divisor = majorInterval <= 0.5 ? 2 : 4;
  const interval = majorInterval / divisor;
  return Math.max(duration / maxRulerTicks, interval);
}

function toTick(time: number, duration: number, majorInterval: number, forcedKind?: TimelineRulerTick["kind"]): TimelineRulerTick {
  const clampedTime = Math.min(duration, Math.max(0, time));
  const isMajor = forcedKind === "major" || isNearMultiple(clampedTime, majorInterval) || clampedTime === 0;

  return {
    id: `${clampedTime}-${isMajor ? "major" : "minor"}`,
    time: clampedTime,
    percent: (clampedTime / duration) * 100,
    kind: forcedKind ?? (isMajor ? "major" : "minor"),
  };
}

function isNearMultiple(value: number, interval: number) {
  const ratio = value / interval;
  return Math.abs(ratio - Math.round(ratio)) < 0.0001;
}

function roundTime(value: number) {
  return Math.round(value * 1000) / 1000;
}
