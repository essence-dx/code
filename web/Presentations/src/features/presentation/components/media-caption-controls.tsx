"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Captions, FileText, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import {
  mediaCaptionCueSummary,
  mediaCaptionCues,
  parseMediaCaptionCues,
  serializeMediaCaptionVtt,
} from "../media-captions"
import type { PresentationElement } from "../types"

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  )
}

type MediaCaptionControlsProps = {
  element: PresentationElement
  onChange: (patch: Partial<PresentationElement>) => void
}

export function MediaCaptionControls({
  element,
  onChange,
}: MediaCaptionControlsProps) {
  const cues = mediaCaptionCues(element)
  const [captionDraft, setCaptionDraft] = useState(() =>
    serializeMediaCaptionVtt(cues),
  )
  const [message, setMessage] = useState("")

  useEffect(() => {
    setCaptionDraft(serializeMediaCaptionVtt(mediaCaptionCues(element)))
    setMessage("")
  }, [element.id, element.mediaCaptionCues])

  function parseDraft() {
    const parsed = parseMediaCaptionCues(captionDraft)

    onChange({ mediaCaptionCues: parsed })
    setMessage(
      parsed.length
        ? `Imported ${parsed.length} timed cue${parsed.length === 1 ? "" : "s"}.`
        : "No valid timed cues found.",
    )
  }

  return (
    <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Captions className="size-4" />
          Captions
        </div>
        <Badge variant={cues.length ? "default" : "outline"}>
          {cues.length ? `${cues.length} timed` : "Plain"}
        </Badge>
      </div>
      <Field label="Caption">
        <Textarea
          value={element.mediaCaption}
          className="min-h-20"
          onChange={(event) =>
            onChange({
              mediaCaption: event.currentTarget.value,
            })
          }
        />
      </Field>
      <div className="grid gap-2 rounded-md border bg-background p-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-4" />
            Timed VTT/SRT cues
          </Label>
          <span className="text-[11px] text-muted-foreground">
            {mediaCaptionCueSummary(element)}
          </span>
        </div>
        <Textarea
          value={captionDraft}
          className="min-h-28 font-mono text-xs"
          placeholder={"WEBVTT\n\n1\n00:00:00.000 --> 00:00:03.000\nOpening caption"}
          onChange={(event) => setCaptionDraft(event.currentTarget.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={parseDraft}>
            Parse cues
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!cues.length}
            onClick={() => {
              onChange({ mediaCaptionCues: [] })
              setCaptionDraft("")
              setMessage("Cleared timed cues.")
            }}
          >
            <RotateCcw className="size-4" />
            Clear cues
          </Button>
        </div>
        {message ? <p className="text-[11px] text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  )
}
