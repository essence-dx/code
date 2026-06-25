"use client"

import { useEffect, useRef, useState } from "react"
import { FileDown, FileUp, Palette, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  designPalettes,
  type DesignPalette,
  type DesignPaletteScope,
} from "../theme-palettes"
import {
  customDesignPalettesFileName,
  deleteCustomDesignPalette,
  importCustomDesignPalettesFromText,
  readCustomDesignPalettes,
  recommendedCustomDesignPalettes,
  saveCustomDesignPalette,
  serializeCustomDesignPalettes,
  type CustomDesignPalette,
} from "../custom-design-palettes"
import { saveTextFileWithPicker } from "../browser-downloads"
import { usePresentationStore } from "../use-presentation-store"

const paletteJsonPickerTypes = [
  {
    description: "Essence design palettes",
    accept: {
      "application/json": [".json"],
    },
  },
]

function PalettePreview({ palette }: { palette: DesignPalette }) {
  return (
    <span
      className="grid h-16 rounded-md border p-2"
      style={{
        backgroundColor: palette.background,
        borderColor: palette.border,
      }}
    >
      <span
        className="h-3 w-2/3 rounded"
        style={{ backgroundColor: palette.text }}
      />
      <span className="mt-2 grid grid-cols-4 gap-1">
        {[palette.accent, palette.secondary, ...palette.chartColors.slice(2, 4)].map(
          (color) => (
            <span
              key={color}
              className="h-5 rounded"
              style={{ backgroundColor: color }}
            />
          ),
        )}
      </span>
    </span>
  )
}

type CustomPaletteCardProps = {
  onApplyPalette: (palette: DesignPalette) => void
  onDeletePalette: (paletteId: string) => void
  palette: CustomDesignPalette
}

function CustomPaletteCard({
  onApplyPalette,
  onDeletePalette,
  palette,
}: CustomPaletteCardProps) {
  return (
    <div className="grid gap-2 rounded-md border bg-background p-3">
      <button
        type="button"
        className="grid gap-2 text-left transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onApplyPalette(palette)}
      >
        <PalettePreview palette={palette} />
        <span className="font-medium">{palette.label}</span>
        <span className="text-xs text-muted-foreground">
          Saved {new Date(palette.createdAt).toLocaleDateString()}
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start gap-2"
        onClick={() => onDeletePalette(palette.id)}
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
    </div>
  )
}

export function ThemePaletteGallery() {
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const applyDesignPalette = usePresentationStore(
    (state) => state.applyDesignPalette,
  )
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<DesignPaletteScope>("slide")
  const [paletteName, setPaletteName] = useState("")
  const [customPalettes, setCustomPalettes] = useState<CustomDesignPalette[]>([])
  const [message, setMessage] = useState("")
  const recommendedPalettes = recommendedCustomDesignPalettes(customPalettes, {
    limit: 2,
  })
  const recommendedPaletteIds = new Set(
    recommendedPalettes.map((palette) => palette.id),
  )
  const remainingCustomPalettes = recommendedPaletteIds.size
    ? customPalettes.filter((palette) => !recommendedPaletteIds.has(palette.id))
    : customPalettes

  useEffect(() => {
    if (open) {
      setCustomPalettes(readCustomDesignPalettes())
      setPaletteName(`${deck.title || "Deck"} palette`)
      setMessage("")
    }
  }, [deck.title, open])

  function applyPalette(palette: DesignPalette) {
    applyDesignPalette({ palette, scope })
    setOpen(false)
  }

  function savePalette() {
    setCustomPalettes(saveCustomDesignPalette(deck, selectedSlideId, paletteName))
    setMessage("Saved palette.")
  }

  function deletePalette(paletteId: string) {
    setCustomPalettes(deleteCustomDesignPalette(paletteId))
    setMessage("Deleted palette.")
  }

  async function exportPalettes() {
    if (!customPalettes.length) {
      setMessage("No saved palettes to export.")
      return
    }

    await saveTextFileWithPicker(
      customDesignPalettesFileName,
      serializeCustomDesignPalettes(customPalettes),
      "application/json",
      paletteJsonPickerTypes,
    )
    setMessage(
      `Exported ${customPalettes.length} palette${
        customPalettes.length === 1 ? "" : "s"
      }.`,
    )
  }

  async function importPaletteFile(file: File | undefined) {
    if (!file) return

    const result = importCustomDesignPalettesFromText(await file.text())
    setCustomPalettes(result.palettes)
    setMessage(
      result.added
        ? `Imported ${result.added} palette${result.added === 1 ? "" : "s"}.`
        : "No new palettes found.",
    )

    if (importInputRef.current) {
      importInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <Palette className="size-4" />
        Palettes
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Design palettes</DialogTitle>
        </DialogHeader>
        <input
          ref={importInputRef}
          className="hidden"
          type="file"
          accept="application/json"
          onChange={(event) =>
            void importPaletteFile(event.currentTarget.files?.[0])
          }
        />
        <label className="grid gap-1 text-xs font-medium text-muted-foreground sm:w-52">
          Apply to
          <select
            className="h-8 rounded-md border bg-background px-2 text-foreground"
            value={scope}
            onChange={(event) =>
              setScope(event.currentTarget.value as DesignPaletteScope)
            }
          >
            <option value="slide">Current slide</option>
            <option value="deck">Whole deck</option>
          </select>
        </label>
        <div className="grid gap-2 rounded-md border p-3">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Save current deck palette
            <div className="flex gap-2">
              <Input
                value={paletteName}
                onChange={(event) => setPaletteName(event.currentTarget.value)}
              />
              <Button type="button" size="sm" onClick={savePalette}>
                Save
              </Button>
            </div>
          </label>
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
              onClick={() => void exportPalettes()}
            >
              <FileDown className="size-4" />
              Export
            </Button>
          </div>
          {message ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
        </div>
        {recommendedPalettes.length ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recommended
              </div>
              <Badge variant="outline">{recommendedPalettes.length}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {recommendedPalettes.map((palette) => (
                <CustomPaletteCard
                  key={palette.id}
                  palette={palette}
                  onApplyPalette={applyPalette}
                  onDeletePalette={deletePalette}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {remainingCustomPalettes.map((palette) => (
            <CustomPaletteCard
              key={palette.id}
              palette={palette}
              onApplyPalette={applyPalette}
              onDeletePalette={deletePalette}
            />
          ))}
          {designPalettes.map((palette) => (
            <button
              key={palette.id}
              type="button"
              className="grid gap-2 rounded-md border bg-background p-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => applyPalette(palette)}
            >
              <PalettePreview palette={palette} />
              <span className="font-medium">{palette.label}</span>
              <span className="text-xs text-muted-foreground">
                {palette.description}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
