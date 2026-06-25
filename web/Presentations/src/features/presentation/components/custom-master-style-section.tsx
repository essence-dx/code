"use client"

import { useEffect, useRef, useState } from "react"
import { FileDown, FileUp, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { saveTextFileWithPicker } from "../browser-downloads"
import {
  customMasterStylePresetsFileName,
  deleteCustomMasterStylePreset,
  importCustomMasterStylePresetsFromText,
  readCustomMasterStylePresets,
  saveCustomMasterStylePreset,
  serializeCustomMasterStylePresets,
  type CustomMasterStylePreset,
} from "../custom-master-style-presets"
import { masterStylePresetMatches } from "../master-style-presets"
import type { DeckMaster } from "../types"
import { MasterStylePreview } from "./master-style-preview"

type CustomMasterStyleSectionProps = {
  master: DeckMaster
  onChange: (patch: Partial<DeckMaster>) => void
}

const masterStyleJsonPickerTypes = [
  {
    description: "Essence master styles",
    accept: {
      "application/json": [".json"],
    },
  },
]

export function CustomMasterStyleSection({
  master,
  onChange,
}: CustomMasterStyleSectionProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [customPresets, setCustomPresets] = useState<
    CustomMasterStylePreset[]
  >([])
  const [message, setMessage] = useState("")
  const [presetName, setPresetName] = useState("House footer")

  useEffect(() => {
    setCustomPresets(readCustomMasterStylePresets())
  }, [])

  function savePreset() {
    setCustomPresets(saveCustomMasterStylePreset(master, presetName))
    setMessage("Saved master style.")
  }

  function deletePreset(presetId: string) {
    setCustomPresets(deleteCustomMasterStylePreset(presetId))
    setMessage("Deleted master style.")
  }

  async function exportPresets() {
    if (!customPresets.length) {
      setMessage("No saved master styles to export.")
      return
    }

    await saveTextFileWithPicker(
      customMasterStylePresetsFileName,
      serializeCustomMasterStylePresets(customPresets),
      "application/json",
      masterStyleJsonPickerTypes,
    )
    setMessage(
      `Exported ${customPresets.length} master style${
        customPresets.length === 1 ? "" : "s"
      }.`,
    )
  }

  async function importPresetFile(file: File | undefined) {
    if (!file) return

    const result = importCustomMasterStylePresetsFromText(await file.text())
    setCustomPresets(result.presets)
    setMessage(
      result.added
        ? `Imported ${result.added} master style${
            result.added === 1 ? "" : "s"
          }.`
        : "No new master styles found.",
    )

    if (importInputRef.current) {
      importInputRef.current.value = ""
    }
  }

  return (
    <div className="grid gap-2 rounded-md border bg-muted/30 p-2">
      <input
        ref={importInputRef}
        className="hidden"
        type="file"
        accept="application/json"
        onChange={(event) =>
          void importPresetFile(event.currentTarget.files?.[0])
        }
      />
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Saved master styles
        </div>
        <Badge variant="outline">{customPresets.length}</Badge>
      </div>
      <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
        Save current master style
        <div className="flex gap-1.5">
          <Input
            value={presetName}
            onChange={(event) => setPresetName(event.currentTarget.value)}
          />
          <Button type="button" size="sm" onClick={savePreset}>
            Save
          </Button>
        </div>
      </label>
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => importInputRef.current?.click()}
        >
          <FileUp className="size-3.5" />
          Import
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void exportPresets()}
        >
          <FileDown className="size-3.5" />
          Export
        </Button>
      </div>
      {message ? (
        <span className="text-[11px] text-muted-foreground">{message}</span>
      ) : null}
      {customPresets.length ? (
        <div className="grid gap-1.5">
          {customPresets.map((preset) => {
            const active = masterStylePresetMatches(master, preset)

            return (
              <div
                key={preset.id}
                className="grid gap-1.5 rounded-md border bg-background p-2"
              >
                <Button
                  type="button"
                  variant={active ? "secondary" : "outline"}
                  size="sm"
                  className="h-auto justify-start gap-2 px-2 py-2 text-left"
                  aria-pressed={active}
                  onClick={() => onChange(preset.patch)}
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-fit gap-1.5 px-1.5 text-[11px]"
                  onClick={() => deletePreset(preset.id)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
