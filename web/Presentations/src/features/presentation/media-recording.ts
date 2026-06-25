import type { MediaRecordingRuntime } from "./media-handoff"

export type MediaRecordingMode = "audio" | "camera" | "screen"

export type MediaRecordingOutputType = "audio" | "video"

export type MediaRecordingModeOption = {
  description: string
  id: MediaRecordingMode
  label: string
  outputType: MediaRecordingOutputType
}

export const mediaRecordingModes: MediaRecordingModeOption[] = [
  {
    description: "Microphone",
    id: "audio",
    label: "Audio",
    outputType: "audio",
  },
  {
    description: "Camera and microphone",
    id: "camera",
    label: "Camera",
    outputType: "video",
  },
  {
    description: "Screen and system audio when available",
    id: "screen",
    label: "Screen",
    outputType: "video",
  },
]

const audioMimeCandidates = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
]

const videoMimeCandidates = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
]

const mimeExtensions: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/webm": "webm",
  "audio/webm;codecs=opus": "webm",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/webm;codecs=vp8,opus": "webm",
  "video/webm;codecs=vp9,opus": "webm",
}

export function mediaRecordingOutputType(mode: MediaRecordingMode) {
  return mode === "audio" ? "audio" : "video"
}

export function mediaRecordingReplacementPlan(
  mode: MediaRecordingMode,
  selectedType?: string | null,
) {
  const outputType = mediaRecordingOutputType(mode)
  const canReplace = selectedType === outputType

  return {
    actionLabel: canReplace ? "Replace selected" : "Insert new",
    canReplace,
    outputType,
  }
}

export function mediaRecordingMimeCandidates(mode: MediaRecordingMode) {
  return mediaRecordingOutputType(mode) === "audio"
    ? audioMimeCandidates
    : videoMimeCandidates
}

export function preferredMediaRecordingMimeType(
  mode: MediaRecordingMode,
  isTypeSupported: (mimeType: string) => boolean,
) {
  return (
    mediaRecordingMimeCandidates(mode).find((mimeType) =>
      isTypeSupported(mimeType),
    ) ?? ""
  )
}

export function mediaRecordingModeReadiness(
  runtime: MediaRecordingRuntime,
  mode: MediaRecordingMode,
) {
  if (!runtime.mediaRecorder) {
    return {
      disabled: true,
      detail: "MediaRecorder is unavailable.",
    }
  }

  if (mode === "screen" && !runtime.displayMedia) {
    return {
      disabled: true,
      detail: "Screen capture is unavailable.",
    }
  }

  if (mode !== "screen" && !runtime.userMedia) {
    return {
      disabled: true,
      detail: "Device capture is unavailable.",
    }
  }

  return {
    disabled: false,
    detail: "Ready",
  }
}

function dateStamp(date: Date) {
  const value = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "-",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ]

  return value.join("")
}

export function mediaRecordingFileExtension(mimeType: string) {
  return mimeExtensions[mimeType] ?? "webm"
}

export function mediaRecordingFileName(
  mode: MediaRecordingMode,
  date: Date,
  mimeType: string,
) {
  return `recorded-${mode}-${dateStamp(date)}.${mediaRecordingFileExtension(mimeType)}`
}

export function mediaRecordingDurationLabel(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
