"use client"

import { useMemo, useState } from "react"
import { LayoutTemplate } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import { CustomTemplateSection } from "./custom-template-section"
import { SlideMiniPreview } from "./slide-mini-preview"
import { TemplateThemeStrip } from "./template-theme-strip"
import {
  createDeckFromTemplateVariant,
  deckTemplates,
  templatePreviewDeck,
  type DeckTemplateId,
} from "../deck-templates"
import type { TemplateThemeVariantId } from "../template-theme-variants"
import type { Deck } from "../types"
import { usePresentationStore } from "../use-presentation-store"

export function TemplateGallery() {
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const replaceDeck = usePresentationStore((state) => state.replaceDeck)
  const updateDeckMaster = usePresentationStore((state) => state.updateDeckMaster)
  const [open, setOpen] = useState(false)
  const [selectedVariants, setSelectedVariants] = useState<
    Partial<Record<DeckTemplateId, TemplateThemeVariantId>>
  >({})
  const previews = useMemo(
    () =>
      new Map(
        deckTemplates.map((template) => [
          template.id,
          templatePreviewDeck(
            template.id,
            selectedVariants[template.id] ?? "original",
          ),
        ]),
      ),
    [selectedVariants],
  )

  function selectedVariantFor(templateId: DeckTemplateId) {
    return selectedVariants[templateId] ?? "original"
  }

  function selectVariant(
    templateId: DeckTemplateId,
    variantId: TemplateThemeVariantId,
  ) {
    setSelectedVariants((current) => ({
      ...current,
      [templateId]: variantId,
    }))
  }

  function useTemplate(templateId: DeckTemplateId) {
    replaceDeck(
      createDeckFromTemplateVariant(templateId, selectedVariantFor(templateId)),
    )
    setOpen(false)
  }

  function useDeck(templateDeck: Deck) {
    replaceDeck(templateDeck)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <LayoutTemplate className="size-4" />
        Templates
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Templates</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[72vh] pr-3">
          <div className="grid gap-4">
            <CustomTemplateSection
              deck={deck}
              open={open}
              selectedSlideId={selectedSlideId}
              onUpdateMaster={updateDeckMaster}
              onUseDeck={useDeck}
            />

            <Separator />

            <section className="grid gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Built in
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {deckTemplates.map((template) => {
                  const preview = previews.get(template.id)
                  const firstSlide = preview?.slides[0]
                  const selectedVariantId = selectedVariantFor(template.id)

                  return (
                    <div
                      key={template.id}
                      className="grid gap-3 rounded-md border bg-background p-3"
                    >
                      {firstSlide && preview ? (
                        <SlideMiniPreview
                          slide={firstSlide}
                          master={preview.master}
                          slideCount={preview.slides.length}
                          className="border-border"
                        />
                      ) : null}
                      <div className="grid gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{template.name}</div>
                          <Badge variant="outline">
                            {template.slideCount} slides
                          </Badge>
                        </div>
                        <div className="text-xs leading-5 text-muted-foreground">
                          {template.description}
                        </div>
                      </div>
                      <TemplateThemeStrip
                        selectedVariantId={selectedVariantId}
                        onSelectVariant={(variantId) =>
                          selectVariant(template.id, variantId)
                        }
                      />
                      <div className="flex items-center justify-between gap-3">
                        <span
                          aria-hidden="true"
                          className="h-2 w-16 rounded-full"
                          style={{ background: template.accent }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => useTemplate(template.id)}
                        >
                          Use template
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
