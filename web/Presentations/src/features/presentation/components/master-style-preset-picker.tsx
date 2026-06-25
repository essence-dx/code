"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  applyMasterStylePreset,
  masterStylePresetMatches,
  masterStylePresets,
} from "../master-style-presets"
import type { DeckMaster } from "../types"
import { CustomMasterStyleSection } from "./custom-master-style-section"
import { MasterStylePreview } from "./master-style-preview"

type MasterStylePresetPickerProps = {
  master: DeckMaster
  onChange: (patch: Partial<DeckMaster>) => void
}

export function MasterStylePresetPicker({
  master,
  onChange,
}: MasterStylePresetPickerProps) {
  return (
    <div className="grid gap-2 rounded-md border bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Master styles
        </span>
        <Badge variant="outline">{masterStylePresets.length}</Badge>
      </div>
      <CustomMasterStyleSection master={master} onChange={onChange} />
      <div className="grid grid-cols-2 gap-2">
        {masterStylePresets.map((preset) => {
          const active = masterStylePresetMatches(master, preset)

          return (
            <Button
              key={preset.id}
              type="button"
              variant={active ? "secondary" : "outline"}
              size="sm"
              className="h-auto justify-start gap-2 px-2 py-2 text-left"
              aria-pressed={active}
              onClick={() => onChange(applyMasterStylePreset(master, preset.id))}
            >
              <MasterStylePreview preset={preset} />
              <span className="grid min-w-0 gap-0.5">
                <span className="flex items-center gap-1">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full border"
                    style={{ backgroundColor: preset.accent }}
                  />
                  <span className="truncate text-xs font-medium">
                    {preset.label}
                  </span>
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {preset.description}
                </span>
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
