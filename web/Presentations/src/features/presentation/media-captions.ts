import type { MediaCaptionCue, PresentationElement, Slide } from "./types"

const MAX_MEDIA_CAPTION_CUES = 120
const MAX_MEDIA_CAPTION_SECONDS = 86_400

type MediaCaptionElement = Pick<
  PresentationElement,
  "id" | "type" | "alt" | "mediaCaption" | "mediaCaptionCues"
>

function clampSeconds(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.max(0, Math.min(MAX_MEDIA_CAPTION_SECONDS, value)) * 10) / 10
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readSeconds(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? clampSeconds(value)
    : 0
}

function parseTimestamp(value: string) {
  const normalized = value.trim().replace(",", ".")
  const numeric = Number(normalized)

  if (Number.isFinite(numeric)) return clampSeconds(numeric)

  const parts = normalized.split(":").map((part) => Number(part))

  if (parts.some((part) => !Number.isFinite(part))) return null
  if (parts.length === 2) {
    return clampSeconds(parts[0]! * 60 + parts[1]!)
  }
  if (parts.length === 3) {
    return clampSeconds(parts[0]! * 3600 + parts[1]! * 60 + parts[2]!)
  }

  return null
}

function formatTimestamp(seconds: number) {
  const safeSeconds = clampSeconds(seconds)
  const wholeSeconds = Math.floor(safeSeconds)
  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = Math.floor((wholeSeconds % 3600) / 60)
  const remainingSeconds = wholeSeconds % 60
  const milliseconds = Math.round((safeSeconds - wholeSeconds) * 1000)

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(remainingSeconds).padStart(2, "0")}.${String(milliseconds).padStart(
    3,
    "0",
  )}`
}

export function normalizeMediaCaptionCues(value: unknown): MediaCaptionCue[] {
  const items = Array.isArray(value) ? value : []

  return items
    .slice(0, MAX_MEDIA_CAPTION_CUES)
    .map((item, index): MediaCaptionCue | null => {
      if (!isRecord(item)) return null
      const startSeconds = readSeconds(item.startSeconds)
      const endSeconds = readSeconds(item.endSeconds)
      const text = typeof item.text === "string" ? item.text.trim() : ""

      if (!text || endSeconds <= startSeconds) return null

      return {
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `caption-${index + 1}`,
        startSeconds,
        endSeconds,
        text,
      }
    })
    .filter((cue): cue is MediaCaptionCue => Boolean(cue))
}

export function parseMediaCaptionCues(value: string): MediaCaptionCue[] {
  const cleaned = value
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim() !== "WEBVTT" && !line.trim().startsWith("NOTE"))
    .join("\n")
  const blocks = cleaned.split(/\n{2,}/)
  const cues: MediaCaptionCue[] = []

  blocks.forEach((block) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    const timingIndex = lines.findIndex((line) => line.includes("-->"))
    if (timingIndex < 0) return

    const [startInput, endInput] = lines[timingIndex]!.split("-->").map((part) =>
      part.trim().split(/\s+/)[0] ?? "",
    )
    const startSeconds = parseTimestamp(startInput ?? "")
    const endSeconds = parseTimestamp(endInput ?? "")
    const text = lines.slice(timingIndex + 1).join("\n").trim()

    if (startSeconds === null || endSeconds === null || endSeconds <= startSeconds) {
      return
    }
    if (!text) return

    cues.push({
      id: `caption-${cues.length + 1}`,
      startSeconds,
      endSeconds,
      text,
    })
  })

  return normalizeMediaCaptionCues(cues)
}

export function mediaCaptionCues(element: MediaCaptionElement) {
  return normalizeMediaCaptionCues(element.mediaCaptionCues)
}

export function hasMediaCaptions(element: MediaCaptionElement) {
  return Boolean(element.mediaCaption.trim() || mediaCaptionCues(element).length)
}

export function serializeMediaCaptionVtt(cues: MediaCaptionCue[]) {
  const normalizedCues = normalizeMediaCaptionCues(cues)
  if (!normalizedCues.length) return ""

  return [
    "WEBVTT",
    "",
    ...normalizedCues.map((cue, index) =>
      [
        String(index + 1),
        `${formatTimestamp(cue.startSeconds)} --> ${formatTimestamp(cue.endSeconds)}`,
        cue.text,
      ].join("\n"),
    ),
  ].join("\n\n")
}

export function mediaCaptionCueSummary(element: MediaCaptionElement) {
  const cues = mediaCaptionCues(element)
  if (!cues.length) return "No timed cues"

  const start = cues[0]?.startSeconds ?? 0
  const end = cues[cues.length - 1]?.endSeconds ?? start

  return `${cues.length} timed cue${cues.length === 1 ? "" : "s"} (${formatTimestamp(
    start,
  )} - ${formatTimestamp(end)})`
}

export function serializeMediaCaptionHandoffNotes(slide: Slide) {
  const mediaElements = slide.elements.filter(
    (element) => element.type === "video" || element.type === "audio",
  )
  const lines = mediaElements.flatMap((element) => {
    const cues = mediaCaptionCues(element)
    if (!cues.length) return []

    return [
      `${element.type === "video" ? "Video" : "Audio"} captions for ${
        element.alt || element.id
      }: ${mediaCaptionCueSummary(element)}`,
      serializeMediaCaptionVtt(cues),
    ]
  })

  return lines.length ? `Timed media captions:\n${lines.join("\n\n")}` : ""
}
