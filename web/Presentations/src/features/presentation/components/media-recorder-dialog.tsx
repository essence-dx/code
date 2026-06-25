"use client"

import { useEffect, useRef, useState } from "react"
import {
  Camera,
  CircleDot,
  Mic,
  MonitorUp,
  Plus,
  RefreshCcw,
  Square,
  Trash2,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

import { readMediaBlobAsDataUrl } from "../media-files"
import {
  mediaRecordingDurationLabel,
  mediaRecordingFileName,
  mediaRecordingModeReadiness,
  mediaRecordingModes,
  mediaRecordingOutputType,
  mediaRecordingReplacementPlan,
  preferredMediaRecordingMimeType,
  type MediaRecordingMode,
} from "../media-recording"
import type { MediaRecordingRuntime } from "../media-handoff"
import { usePresentationStore } from "../use-presentation-store"

type RecordingPhase = "idle" | "requesting" | "recording" | "recorded" | "error"

const maxRecordingMs = 10 * 60 * 1000

const modeIcons: Record<MediaRecordingMode, LucideIcon> = {
  audio: Mic,
  camera: Camera,
  screen: MonitorUp,
}

function browserRecordingRuntime(): MediaRecordingRuntime {
  if (typeof window === "undefined") return {}

  const mediaDevices = navigator.mediaDevices

  return {
    displayMedia: Boolean(mediaDevices?.getDisplayMedia),
    mediaRecorder: typeof MediaRecorder !== "undefined",
    userMedia: Boolean(mediaDevices?.getUserMedia),
  }
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function revokeUrl(url: string) {
  if (url) URL.revokeObjectURL(url)
}

async function recordingStream(mode: MediaRecordingMode) {
  if (mode === "screen") {
    return navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    })
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video:
      mode === "camera"
        ? {
            height: { ideal: 720 },
            width: { ideal: 1280 },
          }
        : false,
  })
}

export function MediaRecorderDialog() {
  const addAudioElement = usePresentationStore((state) => state.addAudioElement)
  const addVideoElement = usePresentationStore((state) => state.addVideoElement)
  const updateElement = usePresentationStore((state) => state.updateElement)
  const selectedMediaElement = usePresentationStore((state) => {
    const selectedId = state.selectedElementId
    if (!selectedId) return null

    return (
      state.deck.slides
        .flatMap((slide) => slide.elements)
        .find((element) => {
          return (
            element.id === selectedId &&
            (element.type === "audio" || element.type === "video")
          )
        }) ?? null
    )
  })
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<MediaRecordingMode>("audio")
  const [runtime, setRuntime] = useState<MediaRecordingRuntime>({})
  const [phase, setPhase] = useState<RecordingPhase>("idle")
  const [message, setMessage] = useState("")
  const [durationMs, setDurationMs] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedMimeType, setRecordedMimeType] = useState("")
  const [recordedUrl, setRecordedUrl] = useState("")
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef(0)
  const recordedAtRef = useRef<Date>(new Date())
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (open) {
      setRuntime(browserRecordingRuntime())
    }
  }, [open])

  useEffect(() => {
    if (phase !== "recording") return

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current
      setDurationMs(elapsed)

      if (elapsed >= maxRecordingMs) {
        recorderRef.current?.stop()
      }
    }, 250)

    return () => window.clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (phase !== "recording" || !previewVideoRef.current) return

    previewVideoRef.current.srcObject = streamRef.current
    void previewVideoRef.current.play().catch(() => undefined)
  }, [phase, mode])

  useEffect(() => {
    if (open) return

    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop()
    }
    stopStream(streamRef.current)
    streamRef.current = null
    recorderRef.current = null
    chunksRef.current = []
    revokeUrl(recordedUrl)
    setRecordedUrl("")
    setRecordedBlob(null)
    setRecordedMimeType("")
    setPhase("idle")
    setMessage("")
    setDurationMs(0)
  }, [open, recordedUrl])

  const modeReadiness = mediaRecordingModeReadiness(runtime, mode)
  const replacementPlan = mediaRecordingReplacementPlan(
    mode,
    selectedMediaElement?.type,
  )
  const canStart =
    phase !== "requesting" && phase !== "recording" && !modeReadiness.disabled
  const canInsert = phase === "recorded" && Boolean(recordedBlob)
  const durationLabel = mediaRecordingDurationLabel(durationMs)

  function clearRecordedMedia() {
    revokeUrl(recordedUrl)
    setRecordedUrl("")
    setRecordedBlob(null)
    setRecordedMimeType("")
    setDurationMs(0)
    setPhase("idle")
    setMessage("")
  }

  async function startRecording() {
    if (!canStart) return

    try {
      clearRecordedMedia()
      setPhase("requesting")
      setMessage("")

      const stream = await recordingStream(mode)
      const mimeType = preferredMediaRecordingMimeType(mode, (value) =>
        MediaRecorder.isTypeSupported(value),
      )
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      )

      streamRef.current = stream
      recorderRef.current = recorder
      chunksRef.current = []
      startedAtRef.current = Date.now()
      recordedAtRef.current = new Date()

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      })

      recorder.addEventListener("stop", () => {
        stopStream(streamRef.current)
        streamRef.current = null
        recorderRef.current = null

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType,
        })
        chunksRef.current = []

        if (!blob.size) {
          setPhase("error")
          setMessage("No media was captured.")
          return
        }

        const url = URL.createObjectURL(blob)

        setRecordedBlob(blob)
        setRecordedMimeType(blob.type)
        setRecordedUrl(url)
        setDurationMs(Date.now() - startedAtRef.current)
        setPhase("recorded")
      })

      recorder.start(250)
      setPhase("recording")
    } catch (error) {
      stopStream(streamRef.current)
      streamRef.current = null
      recorderRef.current = null
      setPhase("error")
      setMessage(
        error instanceof Error ? error.message : "Could not start recording.",
      )
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop()
    }
  }

  async function insertRecording() {
    if (!recordedBlob) return

    const src = await readMediaBlobAsDataUrl(recordedBlob)
    const alt = mediaRecordingFileName(mode, recordedAtRef.current, recordedMimeType)

    if (replacementPlan.canReplace && selectedMediaElement) {
      updateElement(selectedMediaElement.id, {
        alt,
        mediaEndSeconds: 0,
        mediaStartSeconds: 0,
        src,
      })
    } else if (mediaRecordingOutputType(mode) === "audio") {
      addAudioElement({ alt, src })
    } else {
      addVideoElement({ alt, src })
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="sm" />}>
        <CircleDot className="size-4" />
        Record
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record media</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {mediaRecordingModes.map((option) => {
              const Icon = modeIcons[option.id]
              const readiness = mediaRecordingModeReadiness(runtime, option.id)

              return (
                <button
                  key={option.id}
                  type="button"
                  className="grid gap-2 rounded-md border bg-background p-3 text-left transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50 data-[active=true]:border-primary data-[active=true]:bg-primary/5"
                  data-active={mode === option.id}
                  disabled={
                    phase === "requesting" ||
                    phase === "recording" ||
                    phase === "recorded" ||
                    readiness.disabled
                  }
                  onClick={() => {
                    setMode(option.id)
                    setMessage("")
                  }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium">
                      <Icon className="size-4" />
                      {option.label}
                    </span>
                    <Badge variant={readiness.disabled ? "secondary" : "outline"}>
                      {readiness.disabled ? "Off" : "Ready"}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">{durationLabel}</div>
              <Badge variant={phase === "error" ? "destructive" : "secondary"}>
                {phase}
              </Badge>
            </div>

            {mode !== "audio" || recordedUrl ? (
              <div className="overflow-hidden rounded-md border bg-background">
                {recordedUrl ? (
                  mediaRecordingOutputType(mode) === "audio" ? (
                    <audio className="w-full p-3" controls src={recordedUrl} />
                  ) : (
                    <video
                      className="aspect-video w-full bg-black"
                      controls
                      src={recordedUrl}
                    />
                  )
                ) : mode === "audio" ? null : (
                  <video
                    ref={previewVideoRef}
                    className="aspect-video w-full bg-black"
                    muted
                    playsInline
                  />
                )}
              </div>
            ) : null}

            {message || modeReadiness.disabled ? (
              <p className="text-xs text-muted-foreground">
                {message || modeReadiness.detail}
              </p>
            ) : null}
            {replacementPlan.canReplace ? (
              <p className="text-xs text-muted-foreground">
                The selected {replacementPlan.outputType} source will be replaced
                and trim points reset.
              </p>
            ) : null}
          </div>

          <Separator />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={phase === "recording" || !recordedBlob}
              onClick={clearRecordedMedia}
            >
              <Trash2 className="size-4" />
              Discard
            </Button>
            {phase === "recording" ? (
              <Button type="button" variant="destructive" onClick={stopRecording}>
                <Square className="size-4" />
                Stop
              </Button>
            ) : (
              <Button type="button" disabled={!canStart} onClick={startRecording}>
                <CircleDot className="size-4" />
                Start
              </Button>
            )}
            <Button type="button" disabled={!canInsert} onClick={insertRecording}>
              {replacementPlan.canReplace ? (
                <RefreshCcw className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {replacementPlan.actionLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
