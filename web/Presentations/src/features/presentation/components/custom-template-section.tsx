"use client"

import { useEffect, useRef, useState } from "react"
import { FileDown, FileUp, Save, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { saveTextFileWithPicker } from "../browser-downloads"
import { ReusableAssetAuditPanel } from "./reusable-asset-audit-panel"
import { SlideMiniPreview } from "./slide-mini-preview"
import { deleteDeckLayoutPreset } from "../deck-layout-presets"
import {
  createDeckFromCustomTemplate,
  customDeckTemplateStats,
  customDeckTemplatesFileName,
  deleteCustomDeckTemplate,
  importCustomDeckTemplatesFromText,
  markCustomDeckTemplateUsed,
  readCustomDeckTemplates,
  recommendedCustomDeckTemplates,
  saveCustomDeckTemplate,
  serializeCustomDeckTemplates,
  type CustomDeckTemplate,
} from "../custom-deck-templates"
import {
  serializeTemplatePackageManifest,
  templatePackageManifest,
} from "../template-package-manifest"
import type { Deck, DeckLayoutPreset, DeckMaster } from "../types"

const templateJsonPickerTypes = [
  {
    description: "Essence deck templates",
    accept: {
      "application/json": [".json"],
    },
  },
]

type CustomTemplateSectionProps = {
  deck: Deck
  open: boolean
  selectedSlideId: string | null
  onUpdateMaster: (patch: Partial<DeckMaster>) => void
  onUseDeck: (deck: Deck) => void
}

function TemplateThemeSwatches({ template }: { template: CustomDeckTemplate }) {
  const bundle = template.themeBundle
  if (!bundle) return null

  return (
    <div className="flex items-center justify-between gap-2">
      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
        Theme paired
      </Badge>
      <span className="flex items-center gap-1" title={bundle.label}>
        {[
          bundle.palette.accent,
          bundle.palette.secondary,
          bundle.palette.surface,
          bundle.master.color,
        ].map((color) => (
          <span
            key={color}
            className="size-3 rounded-full border"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
    </div>
  )
}

function templateUsedLabel(template: CustomDeckTemplate) {
  if (!template.useCount) return "Never used"

  const usedAt = template.lastUsedAt ? Date.parse(template.lastUsedAt) : NaN
  const when = Number.isFinite(usedAt)
    ? new Date(usedAt).toLocaleDateString()
    : "recently"

  return `Used ${template.useCount} time${template.useCount === 1 ? "" : "s"} - ${when}`
}

type CustomTemplateCardProps = {
  template: CustomDeckTemplate
  onDeleteTemplate: (templateId: string) => void
  onUseTemplate: (template: CustomDeckTemplate) => void
}

function CustomTemplateCard({
  template,
  onDeleteTemplate,
  onUseTemplate,
}: CustomTemplateCardProps) {
  const firstSlide = template.deck.slides[0]

  return (
    <div className="grid gap-3 rounded-md border bg-background p-3">
      {firstSlide ? (
        <SlideMiniPreview
          slide={firstSlide}
          assets={template.deck.assets}
          master={template.deck.master}
          slideCount={template.deck.slides.length}
          className="border-border"
        />
      ) : null}
      <div className="grid gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium">{template.name}</div>
          <Badge variant="outline">{template.deck.slides.length} slides</Badge>
        </div>
        <div className="text-xs leading-5 text-muted-foreground">
          Saved {new Date(template.createdAt).toLocaleDateString()}
        </div>
        <div className="text-xs leading-5 text-muted-foreground">
          {templateUsedLabel(template)}
        </div>
      </div>
      <TemplateThemeSwatches template={template} />
      <div className="flex items-center justify-between gap-2">
        <Button type="button" size="sm" onClick={() => onUseTemplate(template)}>
          Use template
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${template.name}`}
          onClick={() => onDeleteTemplate(template.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function CustomTemplateSection({
  deck,
  onUpdateMaster,
  open,
  selectedSlideId,
  onUseDeck,
}: CustomTemplateSectionProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [templateName, setTemplateName] = useState("")
  const [templates, setTemplates] = useState<CustomDeckTemplate[]>([])
  const [message, setMessage] = useState("")
  const stats = customDeckTemplateStats(templates)
  const recommendedTemplates = recommendedCustomDeckTemplates(templates, {
    limit: 3,
  })
  const recommendedTemplateIds = new Set(
    recommendedTemplates.map((template) => template.id),
  )
  const remainingTemplates = recommendedTemplateIds.size
    ? templates.filter((template) => !recommendedTemplateIds.has(template.id))
    : templates

  useEffect(() => {
    if (!open) return

    setTemplates(readCustomDeckTemplates())
    setTemplateName(`${deck.title || "Untitled deck"} template`)
    setMessage("")
  }, [deck.title, open])

  function saveCurrentTemplate() {
    try {
      setTemplates(saveCustomDeckTemplate(deck, templateName, selectedSlideId))
      setMessage("Saved current deck as a template.")
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save this template locally.",
      )
    }
  }

  function deleteTemplate(templateId: string) {
    setTemplates(deleteCustomDeckTemplate(templateId))
    setMessage("")
  }

  function deleteLayoutPreset(presetId: DeckLayoutPreset["id"]) {
    onUpdateMaster({
      layoutPresets: deleteDeckLayoutPreset(deck.master, presetId).layoutPresets,
    })
    setMessage("Deleted master layout preset.")
  }

  function useTemplate(template: CustomDeckTemplate) {
    setTemplates(markCustomDeckTemplateUsed(template.id))
    onUseDeck(createDeckFromCustomTemplate(template))
  }

  async function exportTemplates() {
    if (!templates.length) {
      setMessage("No custom templates to export.")
      return
    }

    await saveTextFileWithPicker(
      customDeckTemplatesFileName,
      serializeCustomDeckTemplates(templates),
      "application/json",
      templateJsonPickerTypes,
    )
    setMessage(
      `Exported ${templates.length} custom template${
        templates.length === 1 ? "" : "s"
      }.`,
    )
  }

  async function exportTemplateManifest() {
    if (!templates.length && !deck.master.layoutPresets.length) {
      setMessage("No template package assets to report.")
      return
    }

    const manifest = templatePackageManifest({
      layoutPresets: deck.master.layoutPresets,
      packageName: `${deck.title || "Essence"} templates`,
      templates,
    })

    await saveTextFileWithPicker(
      manifest.packageFileName,
      serializeTemplatePackageManifest(manifest),
      "application/json",
      templateJsonPickerTypes,
    )
    setMessage(
      `Exported template manifest with ${manifest.issueCount} issue${
        manifest.issueCount === 1 ? "" : "s"
      }.`,
    )
  }

  async function importTemplateFile(file: File | undefined) {
    if (!file) return

    const result = importCustomDeckTemplatesFromText(await file.text())
    setTemplates(result.templates)
    setMessage(
      result.added
        ? `Imported ${result.added} custom template${
            result.added === 1 ? "" : "s"
          }.`
        : "No new custom templates found.",
    )

    if (importInputRef.current) {
      importInputRef.current.value = ""
    }
  }

  return (
    <section className="grid gap-3">
      <input
        ref={importInputRef}
        className="hidden"
        type="file"
        accept="application/json"
        onChange={(event) =>
          void importTemplateFile(event.currentTarget.files?.[0])
        }
      />
      <div className="flex items-end gap-2">
        <label className="grid flex-1 gap-1 text-xs font-medium text-muted-foreground">
          Save current deck
          <Input
            value={templateName}
            onChange={(event) => setTemplateName(event.currentTarget.value)}
          />
        </label>
        <Button type="button" size="sm" onClick={saveCurrentTemplate}>
          <Save className="size-4" />
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
          onClick={() => void exportTemplates()}
        >
          <FileDown className="size-4" />
          Export
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void exportTemplateManifest()}
        >
          <FileDown className="size-4" />
          Manifest
        </Button>
      </div>
      {message ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {message}
        </div>
      ) : null}

      {templates.length ? (
        <>
          <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Template health
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <Badge variant="outline">{stats.total} saved</Badge>
              <Badge variant="outline">{stats.pairedThemeCount} paired themes</Badge>
              <Badge variant="outline">{stats.importedCount} imported</Badge>
              <Badge variant={stats.staleCount ? "secondary" : "outline"}>
                {stats.staleCount} stale
              </Badge>
            </div>
          </div>
          <ReusableAssetAuditPanel
            layoutPresets={deck.master.layoutPresets}
            onDeleteLayoutPreset={deleteLayoutPreset}
            onDeleteTemplate={deleteTemplate}
            templates={templates}
          />
          {recommendedTemplates.length ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommended
                </div>
                <Badge variant="outline">{recommendedTemplates.length}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {recommendedTemplates.map((template) => (
                  <CustomTemplateCard
                    key={template.id}
                    template={template}
                    onDeleteTemplate={deleteTemplate}
                    onUseTemplate={useTemplate}
                  />
                ))}
              </div>
            </>
          ) : null}
          {remainingTemplates.length ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {remainingTemplates.map((template) => (
                  <CustomTemplateCard
                    key={template.id}
                    template={template}
                    onDeleteTemplate={deleteTemplate}
                    onUseTemplate={useTemplate}
                  />
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
