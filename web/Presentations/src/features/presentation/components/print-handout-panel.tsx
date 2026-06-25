"use client"

import { useMemo, useState } from "react"
import { Printer } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import { downloadTextFile } from "../browser-downloads"
import {
  defaultHandoutSettings,
  handoutLayoutLabels,
  handoutOrientationLabels,
  type HandoutLayout,
  type HandoutOrientation,
  type HandoutSettings,
} from "../print-handout-settings"
import { sectionExportSummary } from "../section-export-summary"
import { deckPrintFileName, serializeDeckToPrintHtml } from "../slide-svg-export"
import type { Deck } from "../types"

type PrintHandoutPanelProps = {
  deck: Deck
}

function exportHandout(deck: Deck, settings: HandoutSettings) {
  downloadTextFile(
    deckPrintFileName(deck, settings),
    serializeDeckToPrintHtml(deck, settings),
    "text/html",
  )
}

export function PrintHandoutPanel({ deck }: PrintHandoutPanelProps) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState(defaultHandoutSettings)
  const sections = useMemo(() => sectionExportSummary(deck), [deck])

  function patchSettings(patch: Partial<HandoutSettings>) {
    setSettings((current) => ({ ...current, ...patch }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <Printer className="size-4" />
        Handout
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Print setup</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="handout-layout">Layout</Label>
            <select
              id="handout-layout"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={settings.layout}
              onChange={(event) =>
                patchSettings({
                  layout: event.currentTarget.value as HandoutLayout,
                })
              }
            >
              {Object.entries(handoutLayoutLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="handout-orientation">Orientation</Label>
            <select
              id="handout-orientation"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={settings.orientation}
              onChange={(event) =>
                patchSettings({
                  orientation: event.currentTarget.value as HandoutOrientation,
                })
              }
            >
              {Object.entries(handoutOrientationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 rounded-md border p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Speaker notes</span>
              <Switch
                checked={settings.includeNotes}
                onCheckedChange={(includeNotes) => patchSettings({ includeNotes })}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Open comments</span>
              <Switch
                checked={settings.includeComments}
                onCheckedChange={(includeComments) =>
                  patchSettings({ includeComments })
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Slide numbers</span>
              <Switch
                checked={settings.includeSlideNumbers}
                onCheckedChange={(includeSlideNumbers) =>
                  patchSettings({ includeSlideNumbers })
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Date footer</span>
              <Switch
                checked={settings.includeDate}
                onCheckedChange={(includeDate) => patchSettings({ includeDate })}
              />
            </label>
          </div>
          <div className="rounded-md border bg-muted/20 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">Sections</span>
              <Badge variant={sections.hasExplicitSections ? "secondary" : "outline"}>
                {sections.explicitSectionCount}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{sections.summary}</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              exportHandout(deck, settings)
              setOpen(false)
            }}
          >
            <Printer className="size-4" />
            Export handout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
