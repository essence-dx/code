export type SlideshowMode = "none" | "laser" | "ink"

export type SlideshowBlankMode = "none" | "black" | "white"

export type StagePoint = {
  x: number
  y: number
}

export type InkStroke = {
  id: string
  color: string
  width: number
  points: StagePoint[]
}

export type InkStrokesBySlide = Record<string, InkStroke[]>

export type SlideTimings = Record<string, number>

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function pointFromClient(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): StagePoint {
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
    y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
  }
}

export function buildInkPath(points: StagePoint[]) {
  if (!points.length) return ""
  const [first, ...rest] = points
  return rest.reduce(
    (path, point) => `${path} L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`,
  )
}

export function addTiming(
  timings: SlideTimings,
  slideId: string,
  elapsedMs: number,
): SlideTimings {
  if (elapsedMs < 250) return timings

  return {
    ...timings,
    [slideId]: (timings[slideId] ?? 0) + elapsedMs,
  }
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
