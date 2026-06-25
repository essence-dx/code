"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { iconDefinition, iconOptions } from "../icon-library"
import type { IconName } from "../types"
import { usePresentationStore } from "../use-presentation-store"

export function IconGallery() {
  const addIconElement = usePresentationStore((state) => state.addIconElement)
  const [open, setOpen] = useState(false)

  function insertIcon(iconName: IconName, label: string) {
    addIconElement({ iconName, alt: `${label} icon` })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <Sparkles className="size-4" />
        Icons
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Icons</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-3">
          {iconOptions.map((icon) => {
            const definition = iconDefinition(icon.name)

            return (
              <button
                key={icon.name}
                type="button"
                className="grid gap-2 rounded-md border bg-background p-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => insertIcon(icon.name, icon.label)}
              >
                <svg
                  aria-hidden="true"
                  className="size-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  {definition.paths.map((path) => (
                    <path key={path} d={path} />
                  ))}
                </svg>
                <span className="font-medium">{icon.label}</span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
