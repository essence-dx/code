"use client"

import { useState } from "react"
import {
  ChevronsLeft,
  ChevronsRight,
  CornerDownLeft,
  CornerDownRight,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  actionButtonInsertPayload,
  actionButtonStylePayload,
  actionButtonStyleVariants,
  actionButtonTemplates,
  type ActionButtonTemplate,
  type ActionButtonTemplateId,
  type ActionButtonStyleVariantId,
} from "../action-button-templates"
import { usePresentationStore } from "../use-presentation-store"

const actionIcons: Record<ActionButtonTemplateId, LucideIcon> = {
  first: ChevronsLeft,
  previous: CornerDownLeft,
  next: CornerDownRight,
  last: ChevronsRight,
}

export function ActionButtonGallery() {
  const deck = usePresentationStore((state) => state.deck)
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const addActionButton = usePresentationStore((state) => state.addActionButton)
  const [open, setOpen] = useState(false)
  const [styleVariant, setStyleVariant] =
    useState<ActionButtonStyleVariantId>("solid")

  function insertActionButton(template: ActionButtonTemplate) {
    const payload = actionButtonInsertPayload(
      template,
      deck.slides,
      selectedSlideId,
      styleVariant,
    )
    if (!payload) return

    addActionButton(payload)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <MousePointerClick className="size-4" />
        Actions
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Action buttons</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Style
          </div>
          <div className="flex flex-wrap gap-2">
            {actionButtonStyleVariants.map((variant) => (
              <Button
                key={variant.id}
                type="button"
                variant={styleVariant === variant.id ? "secondary" : "outline"}
                size="sm"
                title={variant.description}
                onClick={() => setStyleVariant(variant.id)}
              >
                {variant.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {actionButtonTemplates.map((template) => {
            const Icon = actionIcons[template.id]
            const payload = actionButtonInsertPayload(
              template,
              deck.slides,
              selectedSlideId,
              styleVariant,
            )
            const preview = actionButtonStylePayload(template, styleVariant)
            const disabled = !payload

            return (
              <button
                key={template.id}
                type="button"
                className="grid gap-2 rounded-md border bg-background p-3 text-left transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={disabled}
                onClick={() => insertActionButton(template)}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="flex size-7 items-center justify-center rounded-sm border text-white"
                    style={{
                      backgroundColor: preview.background,
                      borderColor: preview.stroke,
                      color: preview.foreground,
                    }}
                  >
                    <Icon className="size-4" />
                  </span>
                  {template.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {template.description}
                </span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
