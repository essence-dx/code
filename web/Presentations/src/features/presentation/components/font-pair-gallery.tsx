"use client"

import { useState } from "react"
import { Type } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  fontFamilyLabels,
  fontFamilyStyle,
  fontPairPresets,
  type FontPairPreset,
  type FontPairScope,
} from "../font-pairs"
import { usePresentationStore } from "../use-presentation-store"

function FontPairPreview({ preset }: { preset: FontPairPreset }) {
  return (
    <span className="grid gap-1 rounded-md border bg-muted/20 p-3">
      <span
        className="truncate text-xl font-semibold"
        style={{ fontFamily: fontFamilyStyle(preset.titleFontFamily) }}
      >
        Slide headline
      </span>
      <span
        className="truncate text-sm text-muted-foreground"
        style={{ fontFamily: fontFamilyStyle(preset.bodyFontFamily) }}
      >
        Body copy and chart labels
      </span>
      <span className="text-[11px] text-muted-foreground">
        {fontFamilyLabels[preset.titleFontFamily]} +{" "}
        {fontFamilyLabels[preset.bodyFontFamily]}
      </span>
    </span>
  )
}

export function FontPairGallery() {
  const applyFontPair = usePresentationStore((state) => state.applyFontPair)
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<FontPairScope>("slide")

  function applyPreset(preset: FontPairPreset) {
    applyFontPair({ preset, scope })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <Type className="size-4" />
        Fonts
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Font pairs</DialogTitle>
        </DialogHeader>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground sm:w-56">
          Apply to
          <select
            className="h-8 rounded-md border bg-background px-2 text-foreground"
            value={scope}
            onChange={(event) =>
              setScope(event.currentTarget.value as FontPairScope)
            }
          >
            <option value="slide">Current slide</option>
            <option value="deck">Whole deck and master</option>
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {fontPairPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="grid gap-2 rounded-md border bg-background p-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => applyPreset(preset)}
            >
              <FontPairPreview preset={preset} />
              <span className="font-medium">{preset.label}</span>
              <span className="text-xs text-muted-foreground">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
