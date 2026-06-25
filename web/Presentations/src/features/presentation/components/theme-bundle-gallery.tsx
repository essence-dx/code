"use client"

import { useEffect, useRef, useState } from "react"
import { FileDown, FileUp, Palette, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { saveTextFileWithPicker } from "../browser-downloads"
import { fontFamilyStyle } from "../font-pairs"
import {
  builtInThemeBundles,
  deleteThemeBundle,
  deleteThemeBundles,
  importThemeBundlesFromText,
  markThemeBundleUsed,
  readCustomThemeBundles,
  saveThemeBundle,
  serializeThemeBundles,
  themeBundlesFileName,
  type CustomThemeBundle,
  type ThemeBundlePreset,
} from "../theme-bundles"
import {
  serializeStandaloneThemeFile,
  standaloneThemeFileName,
  standaloneThemeFilePayloadFromDeck,
  themeBundleFromStandaloneThemeFile,
} from "../theme-file-portability"
import { usePresentationStore } from "../use-presentation-store"
import { ThemeBundleMaintenancePanel } from "./theme-bundle-maintenance-panel"

const themeBundleJsonPickerTypes = [
  {
    description: "Essence theme bundles",
    accept: {
      "application/json": [".json"],
    },
  },
]

const standaloneThemeJsonPickerTypes = [
  {
    description: "Essence theme file",
    accept: {
      "application/json": [".json"],
    },
  },
]

function ThemeBundlePreview({ bundle }: { bundle: ThemeBundlePreset }) {
  return (
    <span
      className="grid h-24 gap-2 rounded-md border p-3"
      style={{
        backgroundColor: bundle.palette.background,
        borderColor: bundle.palette.border,
      }}
    >
      <span
        className="truncate text-lg font-semibold"
        style={{
          color: bundle.palette.text,
          fontFamily: fontFamilyStyle(bundle.fontPair.titleFontFamily),
        }}
      >
        {bundle.label}
      </span>
      <span
        className="truncate text-xs"
        style={{
          color: bundle.palette.mutedText,
          fontFamily: fontFamilyStyle(bundle.fontPair.bodyFontFamily),
        }}
      >
        {bundle.fontPair.label} - {bundle.master.fontSize}px master
      </span>
      <span className="grid grid-cols-5 gap-1">
        {[
          bundle.palette.accent,
          bundle.palette.secondary,
          bundle.palette.text,
          bundle.palette.surface,
          bundle.master.color,
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

export function ThemeBundleGallery() {
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const themeFileInputRef = useRef<HTMLInputElement | null>(null)
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const applyThemeBundle = usePresentationStore(
    (state) => state.applyThemeBundle,
  )
  const [open, setOpen] = useState(false)
  const [bundleName, setBundleName] = useState("")
  const [customBundles, setCustomBundles] = useState<CustomThemeBundle[]>([])
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!open) return

    setCustomBundles(readCustomThemeBundles())
    setBundleName(`${deck.title || "Deck"} theme`)
    setMessage("")
  }, [deck.title, open])

  function applyBundle(bundle: ThemeBundlePreset) {
    applyThemeBundle({ bundle })
    if (bundle.id.startsWith("custom-theme:")) {
      setCustomBundles(markThemeBundleUsed(bundle.id))
    }
    setOpen(false)
  }

  function saveBundle() {
    setCustomBundles(saveThemeBundle(deck, selectedSlideId, bundleName))
    setMessage("Saved theme bundle.")
  }

  function deleteBundle(bundleId: string) {
    setCustomBundles(deleteThemeBundle(bundleId))
    setMessage("Deleted theme bundle.")
  }

  function deleteBundles(bundleIds: CustomThemeBundle["id"][]) {
    setCustomBundles(deleteThemeBundles(bundleIds))
    setMessage(
      `Deleted ${bundleIds.length} stale theme bundle${
        bundleIds.length === 1 ? "" : "s"
      }.`,
    )
  }

  async function exportBundles() {
    if (!customBundles.length) {
      setMessage("No saved theme bundles to export.")
      return
    }

    await saveTextFileWithPicker(
      themeBundlesFileName,
      serializeThemeBundles(customBundles),
      "application/json",
      themeBundleJsonPickerTypes,
    )
    setMessage(
      `Exported ${customBundles.length} theme bundle${
        customBundles.length === 1 ? "" : "s"
      }.`,
    )
  }

  async function exportStandaloneTheme() {
    const payload = standaloneThemeFilePayloadFromDeck(
      deck,
      selectedSlideId,
      bundleName,
    )

    await saveTextFileWithPicker(
      standaloneThemeFileName(deck),
      serializeStandaloneThemeFile(payload),
      "application/json",
      standaloneThemeJsonPickerTypes,
    )
    setMessage(`Exported ${payload.themeBundle.label} theme file.`)
  }

  async function importBundleFile(file: File | undefined) {
    if (!file) return

    const result = importThemeBundlesFromText(await file.text())
    setCustomBundles(result.bundles)
    setMessage(
      result.added
        ? `Imported ${result.added} theme bundle${
            result.added === 1 ? "" : "s"
          }.`
        : "No new theme bundles found.",
    )

    if (importInputRef.current) {
      importInputRef.current.value = ""
    }
  }

  async function importStandaloneThemeFile(file: File | undefined) {
    if (!file) return

    const bundle = themeBundleFromStandaloneThemeFile(await file.text())
    if (!bundle) {
      setMessage("No reusable theme file found.")
      return
    }

    const result = importThemeBundlesFromText(serializeThemeBundles([bundle]))
    setCustomBundles(result.bundles)
    setMessage(
      result.added
        ? `Imported ${bundle.label} theme file.`
        : "Theme file already exists.",
    )

    if (themeFileInputRef.current) {
      themeFileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <Palette className="size-4" />
        Theme bundles
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Theme bundles</DialogTitle>
        </DialogHeader>
        <input
          ref={importInputRef}
          className="hidden"
          type="file"
          accept="application/json"
          onChange={(event) =>
            void importBundleFile(event.currentTarget.files?.[0])
          }
        />
        <input
          ref={themeFileInputRef}
          className="hidden"
          type="file"
          accept="application/json"
          onChange={(event) =>
            void importStandaloneThemeFile(event.currentTarget.files?.[0])
          }
        />
        <div className="grid gap-2 rounded-md border p-3">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Save current deck theme
            <div className="flex gap-2">
              <Input
                value={bundleName}
                onChange={(event) => setBundleName(event.currentTarget.value)}
              />
              <Button type="button" size="sm" onClick={saveBundle}>
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
              onClick={() => void exportBundles()}
            >
              <FileDown className="size-4" />
              Export
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => themeFileInputRef.current?.click()}
            >
              <FileUp className="size-4" />
              Import theme file
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void exportStandaloneTheme()}
            >
              <FileDown className="size-4" />
              Export theme file
            </Button>
          </div>
          {message ? (
            <span className="text-xs text-muted-foreground">{message}</span>
          ) : null}
        </div>

        <div className="grid gap-3">
          {customBundles.length ? (
            <section className="grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Saved
              </div>
              <ThemeBundleMaintenancePanel
                bundles={customBundles}
                onDeleteBundle={deleteBundle}
                onDeleteBundles={deleteBundles}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                {customBundles.map((bundle) => (
                  <div
                    key={bundle.id}
                    className="grid gap-2 rounded-md border bg-background p-3"
                  >
                    <button
                      type="button"
                      className="grid gap-2 text-left transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => applyBundle(bundle)}
                    >
                      <ThemeBundlePreview bundle={bundle} />
                      <span className="font-medium">{bundle.label}</span>
                      <span className="text-xs text-muted-foreground">
                        Saved {new Date(bundle.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-self-start gap-2"
                      onClick={() => deleteBundle(bundle.id)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Built in
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {builtInThemeBundles.map((bundle) => (
                <button
                  key={bundle.id}
                  type="button"
                  className="grid gap-2 rounded-md border bg-background p-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => applyBundle(bundle)}
                >
                  <ThemeBundlePreview bundle={bundle} />
                  <span className="font-medium">{bundle.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {bundle.description}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
