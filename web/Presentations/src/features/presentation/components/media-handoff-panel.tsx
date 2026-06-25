"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

import {
  mediaHandoffReport,
  mediaRecordingReadiness,
  type MediaRecordingRuntime,
} from "../media-handoff"
import { mediaEditingReview } from "../media-editing-review"
import type { PresentationElement } from "../types"

type MediaHandoffPanelProps = {
  element: PresentationElement
}

const statusVariant = {
  attention: "destructive",
  ready: "default",
  warning: "secondary",
} as const

function readBrowserRecordingRuntime(): MediaRecordingRuntime {
  if (typeof window === "undefined") return {}

  const mediaDevices = navigator.mediaDevices

  return {
    displayMedia: Boolean(mediaDevices?.getDisplayMedia),
    mediaRecorder: typeof MediaRecorder !== "undefined",
    userMedia: Boolean(mediaDevices?.getUserMedia),
  }
}

export function MediaHandoffPanel({ element }: MediaHandoffPanelProps) {
  const [runtime, setRuntime] = useState<MediaRecordingRuntime>({})

  useEffect(() => {
    setRuntime(readBrowserRecordingRuntime())
  }, [])

  const report = mediaHandoffReport(element, runtime)
  const recording = mediaRecordingReadiness(runtime)
  const editing = mediaEditingReview(element)

  return (
    <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">
          PowerPoint handoff
        </div>
        <Badge variant={statusVariant[report.status]}>{report.title}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div className="rounded-md border bg-background p-2">
          <div className="font-medium text-foreground">Source</div>
          <div>{report.sourceKind}</div>
        </div>
        <div className="rounded-md border bg-background p-2">
          <div className="font-medium text-foreground">Media type</div>
          <div>{report.mimeType || "Unknown"}</div>
        </div>
        <div className="rounded-md border bg-background p-2">
          <div className="font-medium text-foreground">Native candidate</div>
          <div>{report.nativeSourceCandidate ? "Yes" : "No"}</div>
        </div>
        <div className="rounded-md border bg-background p-2">
          <div className="font-medium text-foreground">PPTX mode</div>
          <div>{report.currentPptxMode}</div>
        </div>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>{recording.title}</span>
          <Badge variant={statusVariant[recording.status]}>
            {recording.status}
          </Badge>
        </div>
        <p className="text-[11px]">{recording.detail}</p>
      </div>
      <div className="grid gap-1 rounded-md border bg-background p-2 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-foreground">Editing review</span>
          <Badge variant={statusVariant[editing.status]}>{editing.status}</Badge>
        </div>
        <p>{editing.summary}</p>
        <p>{editing.presenterHandoffSummary}</p>
      </div>
      {report.issues.length ? (
        <ul className="grid gap-1 text-[11px] text-muted-foreground">
          {report.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground">{report.detail}</p>
      )}
    </div>
  )
}
