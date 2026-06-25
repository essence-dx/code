"use client"

import { useEffect, useRef, useState } from "react"
import { FileDown, FileUp, Paintbrush, Trash2 } from "lucide-react"

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
  brandKitPresets,
  type BrandKitPreset,
  type BrandKitScope,
} from "../brand-kits"
import { saveTextFileWithPicker } from "../browser-downloads"
import {
  customBrandKitsFileName,
  deleteCustomBrandKit,
  importCustomBrandKitsFromText,
  readCustomBrandKits,
  recommendedCustomBrandKits,
  saveCustomBrandKit,
  serializeCustomBrandKits,
  type CustomBrandKit,
} from "../custom-brand-kits"
import { fontFamilyStyle } from "../font-pairs"
import { usePresentationStore } from "../use-presentation-store"

const brandKitJsonPickerTypes = [
  {
    description: "Essence brand kits",
    accept: {
      "application/json": [".json"],
    },
  },
]

function BrandKitPreview({ kit }: { kit: BrandKitPreset }) {
  return (
    <span
      className="grid h-24 gap-2 rounded-md border p-3"
      style={{
        backgroundColor: kit.palette.background,
        borderColor: kit.palette.border,
      }}
    >
      <span
        className="truncate text-lg font-semibold"
        style={{
          color: kit.palette.text,
          fontFamily: fontFamilyStyle(kit.fontPair.titleFontFamily),
        }}
      >
        {kit.label}
      </span>
      <span
        className="truncate text-xs"
        style={{
          color: kit.palette.mutedText,
          fontFamily: fontFamilyStyle(kit.fontPair.bodyFontFamily),
        }}
      >
        Palette + fonts + master defaults
      </span>
      <span className="grid grid-cols-5 gap-1">
        {[
          kit.palette.accent,
          kit.palette.secondary,
          kit.palette.text,
          kit.palette.surface,
          kit.palette.border,
        ].map((color) => (
          <span
            key={color}
            className="h-4 rounded"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
    </span>
  )
}

type CustomBrandKitCardProps = {
  kit: CustomBrandKit
  onApplyKit: (kit: BrandKitPreset) => void
  onDeleteKit: (kitId: string) => void
}

function CustomBrandKitCard({
  kit,
  onApplyKit,
  onDeleteKit,
}: CustomBrandKitCardProps) {
  return (
    <div className="grid gap-2 rounded-md border bg-background p-3">
      <button
        type="button"
        className="grid gap-2 text-left transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onApplyKit(kit)}
      >
        <BrandKitPreview kit={kit} />
        <span className="font-medium">{kit.label}</span>
        <span className="text-xs text-muted-foreground">
          Saved {new Date(kit.createdAt).toLocaleDateString()}
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start gap-2"
        onClick={() => onDeleteKit(kit.id)}
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
    </div>
  )
}

export function BrandKitGallery() {
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const applyBrandKit = usePresentationStore((state) => state.applyBrandKit)
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<BrandKitScope>("deck")
  const [kitName, setKitName] = useState("")
  const [customKits, setCustomKits] = useState<CustomBrandKit[]>([])
  const [message, setMessage] = useState("")
  const recommendedKits = recommendedCustomBrandKits(customKits, { limit: 2 })
  const recommendedKitIds = new Set(recommendedKits.map((kit) => kit.id))
  const remainingCustomKits = recommendedKitIds.size
    ? customKits.filter((kit) => !recommendedKitIds.has(kit.id))
    : customKits

  useEffect(() => {
    if (open) {
      setCustomKits(readCustomBrandKits())
      setKitName(`${deck.title || "Deck"} brand kit`)
      setMessage("")
    }
  }, [deck.title, open])

  function applyKit(kit: BrandKitPreset) {
    applyBrandKit({ kit, scope })
    setOpen(false)
  }

  function saveKit() {
    setCustomKits(saveCustomBrandKit(deck, selectedSlideId, kitName))
    setMessage("Saved brand kit.")
  }

  function deleteKit(kitId: string) {
    setCustomKits(deleteCustomBrandKit(kitId))
    setMessage("Deleted brand kit.")
  }

  async function exportKits() {
    if (!customKits.length) {
      setMessage("No saved brand kits to export.")
      return
    }

    await saveTextFileWithPicker(
      customBrandKitsFileName,
      serializeCustomBrandKits(customKits),
      "application/json",
      brandKitJsonPickerTypes,
    )
    setMessage(
      `Exported ${customKits.length} brand kit${
        customKits.length === 1 ? "" : "s"
      }.`,
    )
  }

  async function importKitFile(file: File | undefined) {
    if (!file) return

    const result = importCustomBrandKitsFromText(await file.text())
    setCustomKits(result.kits)
    setMessage(
      result.added
        ? `Imported ${result.added} brand kit${result.added === 1 ? "" : "s"}.`
        : "No new brand kits found.",
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
        <Paintbrush className="size-4" />
        Brand kits
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Brand kits</DialogTitle>
        </DialogHeader>
        <input
          ref={importInputRef}
          className="hidden"
          type="file"
          accept="application/json"
          onChange={(event) => void importKitFile(event.currentTarget.files?.[0])}
        />
        <label className="grid gap-1 text-xs font-medium text-muted-foreground sm:w-56">
          Apply to
          <select
            className="h-8 rounded-md border bg-background px-2 text-foreground"
            value={scope}
            onChange={(event) =>
              setScope(event.currentTarget.value as BrandKitScope)
            }
          >
            <option value="deck">Whole deck and master</option>
            <option value="slide">Current slide only</option>
          </select>
        </label>
        <div className="grid gap-2 rounded-md border p-3">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Save current deck brand kit
            <div className="flex gap-2">
              <Input
                value={kitName}
                onChange={(event) => setKitName(event.currentTarget.value)}
              />
              <Button type="button" size="sm" onClick={saveKit}>
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
              onClick={() => void exportKits()}
            >
              <FileDown className="size-4" />
              Export
            </Button>
          </div>
          {message ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
        </div>
        {recommendedKits.length ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recommended
              </div>
              <Badge variant="outline">{recommendedKits.length}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {recommendedKits.map((kit) => (
                <CustomBrandKitCard
                  key={kit.id}
                  kit={kit}
                  onApplyKit={applyKit}
                  onDeleteKit={deleteKit}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {remainingCustomKits.map((kit) => (
            <CustomBrandKitCard
              key={kit.id}
              kit={kit}
              onApplyKit={applyKit}
              onDeleteKit={deleteKit}
            />
          ))}
          {brandKitPresets.map((kit) => (
            <button
              key={kit.id}
              type="button"
              className="grid gap-2 rounded-md border bg-background p-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => applyKit(kit)}
            >
              <BrandKitPreview kit={kit} />
              <span className="font-medium">{kit.label}</span>
              <span className="text-xs text-muted-foreground">
                {kit.description}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
