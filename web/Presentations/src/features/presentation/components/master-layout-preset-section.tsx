"use client"

import { useRef, useState } from "react"
import { FileDown, FileUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { saveTextFileWithPicker } from "../browser-downloads"
import {
  deckLayoutPresetsFileName,
  deleteDeckLayoutPreset,
  importDeckLayoutPresetsToMaster,
  recommendedDeckLayoutPresets,
  saveDeckLayoutPreset,
  serializeDeckLayoutPresets,
  updateDeckLayoutPreset,
  updateDeckLayoutPresetSlot,
} from "../deck-layout-presets"
import { masterLayoutVariantsForPreset } from "../master-layout-variants"
import type { SlideLayoutPresetLike } from "../custom-slide-layouts"
import type { DeckLayoutPreset, DeckMaster, Slide } from "../types"

const presetJsonPickerTypes = [
  {
    description: "Essence master layout presets",
    accept: {
      "application/json": [".json"],
    },
  },
]

type MasterLayoutPresetSectionProps = {
  master: DeckMaster
  slide: Slide
  selectedSlideIds: string[]
  selectedSlideCount: number
  onApplyPreset: (preset: SlideLayoutPresetLike, slideIds: string[]) => void
  onUpdateMaster: (patch: Partial<DeckMaster>) => void
}

function slotColor(role: DeckLayoutPreset["slots"][number]["placeholderRole"]) {
  if (role === "title") return "rgb(59 130 246 / 0.75)"
  if (role === "body") return "rgb(16 185 129 / 0.75)"
  if (role === "media") return "rgb(168 85 247 / 0.75)"
  return "rgb(245 158 11 / 0.75)"
}

function MasterPresetPreview({ preset }: { preset: DeckLayoutPreset }) {
  return (
    <span className="relative block aspect-video overflow-hidden rounded border bg-muted/30">
      {preset.slots.slice(0, 12).map((slot, index) => (
        <span
          key={`${slot.placeholderRole}-${index}`}
          className="absolute rounded-sm border border-background/70"
          style={{
            backgroundColor: slotColor(slot.placeholderRole),
            height: `${slot.height}%`,
            left: `${slot.x}%`,
            top: `${slot.y}%`,
            width: `${slot.width}%`,
          }}
        />
      ))}
    </span>
  )
}

function presetUsedLabel(preset: DeckLayoutPreset) {
  if (!preset.useCount) return "Never used"

  const usedAt = preset.lastUsedAt ? Date.parse(preset.lastUsedAt) : NaN
  const when = Number.isFinite(usedAt)
    ? new Date(usedAt).toLocaleDateString()
    : "recently"

  return `Used ${preset.useCount} time${preset.useCount === 1 ? "" : "s"} - ${when}`
}

function presetSortTime(preset: DeckLayoutPreset) {
  const lastUsed = preset.lastUsedAt ? Date.parse(preset.lastUsedAt) : NaN
  if (Number.isFinite(lastUsed)) return lastUsed

  const created = Date.parse(preset.createdAt)
  return Number.isFinite(created) ? created : 0
}

export function MasterLayoutPresetSection({
  master,
  slide,
  selectedSlideIds,
  selectedSlideCount,
  onApplyPreset,
  onUpdateMaster,
}: MasterLayoutPresetSectionProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [editingPresetId, setEditingPresetId] = useState<
    DeckLayoutPreset["id"] | null
  >(null)
  const [presetName, setPresetName] = useState("")
  const [message, setMessage] = useState("")
  const visiblePresets = [...master.layoutPresets].sort(
    (left, right) => presetSortTime(right) - presetSortTime(left),
  )
  const blankSlideWorkflow = slide.layout === "blank" || slide.elements.length === 0
  const recommendedPresets = blankSlideWorkflow
    ? recommendedDeckLayoutPresets(master, { limit: 3 })
    : []
  const recommendedPresetIds = new Set(
    recommendedPresets.map((preset) => preset.id),
  )
  const remainingPresets = recommendedPresetIds.size
    ? visiblePresets.filter((preset) => !recommendedPresetIds.has(preset.id))
    : visiblePresets

  function savePreset() {
    const result = saveDeckLayoutPreset(master, slide, presetName)

    onUpdateMaster({ layoutPresets: result.master.layoutPresets })
    setMessage(
      result.saved
        ? "Saved master layout preset."
        : "Tag title, body, media, or caption placeholders first.",
    )

    if (result.saved) {
      setPresetName("")
    }
  }

  function applyPreset(preset: DeckLayoutPreset, slideIds = [slide.id]) {
    onApplyPreset(preset, slideIds)
    setMessage(
      slideIds.length > 1
        ? `Applied ${preset.label} to ${slideIds.length} slides.`
        : `Applied ${preset.label}.`,
    )
  }

  function applyPresetVariant(
    variant: SlideLayoutPresetLike,
    slideIds = [slide.id],
  ) {
    onApplyPreset(variant, slideIds)
    setMessage(
      slideIds.length > 1
        ? `Applied ${variant.label} to ${slideIds.length} slides.`
        : `Applied ${variant.label}.`,
    )
  }

  function deletePreset(presetId: DeckLayoutPreset["id"]) {
    onUpdateMaster({
      layoutPresets: deleteDeckLayoutPreset(master, presetId).layoutPresets,
    })
    setMessage("Deleted master layout preset.")
  }

  function updatePreset(
    presetId: DeckLayoutPreset["id"],
    patch: Parameters<typeof updateDeckLayoutPreset>[2],
  ) {
    onUpdateMaster({
      layoutPresets: updateDeckLayoutPreset(master, presetId, patch)
        .layoutPresets,
    })
  }

  function updatePresetSlot(
    presetId: DeckLayoutPreset["id"],
    slotIndex: number,
    patch: Parameters<typeof updateDeckLayoutPresetSlot>[3],
  ) {
    onUpdateMaster({
      layoutPresets: updateDeckLayoutPresetSlot(
        master,
        presetId,
        slotIndex,
        patch,
      ).layoutPresets,
    })
  }

  function numberValue(value: string, fallback: number) {
    const nextValue = Number(value)
    return Number.isFinite(nextValue) ? nextValue : fallback
  }

  async function exportPresets() {
    if (!master.layoutPresets.length) {
      setMessage("No master layout presets to export.")
      return
    }

    await saveTextFileWithPicker(
      deckLayoutPresetsFileName,
      serializeDeckLayoutPresets(master.layoutPresets),
      "application/json",
      presetJsonPickerTypes,
    )
    setMessage(
      `Exported ${master.layoutPresets.length} master layout preset${
        master.layoutPresets.length === 1 ? "" : "s"
      }.`,
    )
  }

  async function importPresetFile(file: File | undefined) {
    if (!file) return

    const result = importDeckLayoutPresetsToMaster(master, await file.text())
    onUpdateMaster({ layoutPresets: result.master.layoutPresets })
    setMessage(
      result.added
        ? `Imported ${result.added} master layout preset${
            result.added === 1 ? "" : "s"
          }.`
        : "No new master layout presets found.",
    )

    if (importInputRef.current) {
      importInputRef.current.value = ""
    }
  }

  function presetCard(preset: DeckLayoutPreset) {
    const isEditing = editingPresetId === preset.id
    const variants = masterLayoutVariantsForPreset(preset).filter(
      (variant) => variant.variantId !== "original",
    )

    return (
      <div
        key={preset.id}
        className="grid gap-2 rounded-md border bg-background px-2 py-2"
      >
        <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
          <MasterPresetPreview preset={preset} />
          <div className="min-w-0">
            <div className="truncate text-xs font-medium">{preset.label}</div>
            <div className="text-[11px] text-muted-foreground">
              {preset.description}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {presetUsedLabel(preset)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset(preset)}
          >
            Current
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selectedSlideCount < 2}
            onClick={() => applyPreset(preset, selectedSlideIds)}
          >
            {selectedSlideCount > 1 ? `${selectedSlideCount} slides` : "Selected"}
          </Button>
          {variants.map((variant) => (
            <Button
              key={variant.id}
              type="button"
              variant="secondary"
              size="sm"
              title={variant.description}
              onClick={() => applyPresetVariant(variant)}
            >
              {variant.actionLabel}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setEditingPresetId(isEditing ? null : preset.id)
            }
          >
            {isEditing ? "Done" : "Edit"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => deletePreset(preset.id)}
          >
            Delete
          </Button>
        </div>
        {isEditing ? (
          <div className="grid gap-3 border-t pt-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
                Name
                <Input
                  className="h-7"
                  defaultValue={preset.label}
                  onBlur={(event) =>
                    updatePreset(preset.id, {
                      label: event.currentTarget.value,
                    })
                  }
                />
              </label>
              <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
                Description
                <Input
                  className="h-7"
                  defaultValue={preset.description}
                  onBlur={(event) =>
                    updatePreset(preset.id, {
                      description: event.currentTarget.value,
                    })
                  }
                />
              </label>
            </div>
            <div className="grid gap-3">
              {preset.slots.map((slot, index) => (
                <div
                  key={`${preset.id}-${slot.placeholderRole}-${index}`}
                  className="grid gap-2 border-t pt-2 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{slot.placeholderRole}</Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {slot.type}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        ["x", "X"],
                        ["y", "Y"],
                        ["width", "W"],
                        ["height", "H"],
                      ] as const
                    ).map(([field, label]) => (
                      <label
                        key={field}
                        className="grid gap-1 text-[11px] font-medium text-muted-foreground"
                      >
                        {label}
                        <Input
                          className="h-7 px-1.5 text-xs"
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={slot[field]}
                          onChange={(event) =>
                            updatePresetSlot(preset.id, index, {
                              [field]: numberValue(
                                event.currentTarget.value,
                                slot[field],
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
                    Text
                    <Input
                      className="h-7"
                      defaultValue={slot.content}
                      onBlur={(event) =>
                        updatePresetSlot(preset.id, index, {
                          content: event.currentTarget.value,
                        })
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
      <input
        ref={importInputRef}
        className="hidden"
        type="file"
        accept="application/json"
        onChange={(event) =>
          void importPresetFile(event.currentTarget.files?.[0])
        }
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Master layout presets
        </span>
        <Badge variant="outline">{master.layoutPresets.length} saved</Badge>
      </div>
      <div className="flex gap-2">
        <Input
          value={presetName}
          placeholder="Preset name"
          onChange={(event) => setPresetName(event.currentTarget.value)}
        />
        <Button type="button" size="sm" onClick={savePreset}>
          Save
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => importInputRef.current?.click()}
        >
          <FileUp className="size-4" />
          Import
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void exportPresets()}
        >
          <FileDown className="size-4" />
          Export
        </Button>
      </div>
      {master.layoutPresets.length ? (
        <div className="grid gap-2">
          {recommendedPresets.length ? (
            <div className="grid gap-2 rounded-md border border-primary/30 bg-primary/5 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                  Recommended
                </span>
                <Badge variant="outline">{recommendedPresets.length}</Badge>
              </div>
              {recommendedPresets.map((preset) => presetCard(preset))}
            </div>
          ) : null}
          {remainingPresets.map((preset) => presetCard(preset))}
        </div>
      ) : null}
      {message ? (
        <span className="text-xs text-muted-foreground">{message}</span>
      ) : null}
    </div>
  )
}
