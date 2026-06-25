"use client"

import { useState } from "react"
import { Tag } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  stickerTemplates,
  type StickerTemplate,
} from "../sticker-templates"
import { usePresentationStore } from "../use-presentation-store"

function StickerPreview({ template }: { template: StickerTemplate }) {
  const isDiamond = template.shapeKind === "diamond"

  return (
    <span className="relative flex h-14 items-center justify-center rounded-md bg-muted/40">
      <span
        aria-hidden="true"
        className="absolute h-8 w-20"
        style={{
          backgroundColor: template.fill,
          border: `2px solid ${template.stroke}`,
          borderRadius:
            template.shapeKind === "ellipse"
              ? "999px"
              : template.shapeKind === "rounded"
                ? "12px"
                : "4px",
          transform: isDiamond ? "rotate(45deg) scale(0.75)" : undefined,
        }}
      />
      <span
        className="relative text-sm font-bold"
        style={{ color: template.color }}
      >
        {template.text}
      </span>
    </span>
  )
}

export function StickerGallery() {
  const addSticker = usePresentationStore((state) => state.addSticker)
  const [open, setOpen] = useState(false)

  function insertSticker(template: StickerTemplate) {
    addSticker(template)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <Tag className="size-4" />
        Stickers
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Stickers</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {stickerTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="grid gap-2 rounded-md border bg-background p-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => insertSticker(template)}
            >
              <StickerPreview template={template} />
              <span className="font-medium">{template.label}</span>
              <span className="text-xs text-muted-foreground">
                {template.description}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
