import type { PresentationElement } from "./types"

const MAX_TRIM_SECONDS = 86_400

type MediaTrimElement = Pick<
  PresentationElement,
  "mediaStartSeconds" | "mediaEndSeconds"
>

export function normalizeMediaTrimSeconds(value: number | undefined) {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.max(0, Math.min(MAX_TRIM_SECONDS, value ?? 0)) * 10) / 10
}

export function mediaTrimStart(element: MediaTrimElement) {
  return normalizeMediaTrimSeconds(element.mediaStartSeconds)
}

export function mediaTrimEnd(element: MediaTrimElement) {
  return normalizeMediaTrimSeconds(element.mediaEndSeconds)
}

export function hasMediaTrim(element: MediaTrimElement) {
  const start = mediaTrimStart(element)
  const end = mediaTrimEnd(element)

  return start > 0 || end > start
}

export function mediaTrimLabel(element: MediaTrimElement) {
  const start = mediaTrimStart(element)
  const end = mediaTrimEnd(element)

  if (end > start) return `${start}s - ${end}s`
  if (start > 0) return `from ${start}s`
  return ""
}
