"use client"

import { useState } from "react"
import { Sigma } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

import { symbolGroups, type SymbolSnippet } from "../symbol-snippets"
import { usePresentationStore } from "../use-presentation-store"

export function SymbolGallery() {
  const addTextElement = usePresentationStore((state) => state.addTextElement)
  const [open, setOpen] = useState(false)

  function insertSnippet(snippet: SymbolSnippet) {
    addTextElement({
      content: snippet.value,
      fontSize: snippet.fontSize,
      width: snippet.value.length > 12 ? 52 : 18,
      height: snippet.value.length > 12 ? 12 : 10,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <Sigma className="size-4" />
        Symbols
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Symbols</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[68vh] pr-3">
          <div className="grid gap-4">
            {symbolGroups.map((group) => (
              <section key={group.title} className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.items.map((snippet) => (
                    <button
                      key={`${group.title}-${snippet.label}`}
                      type="button"
                      className="grid gap-1 rounded-md border bg-background p-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => insertSnippet(snippet)}
                    >
                      <span className="font-medium">{snippet.label}</span>
                      <span className="truncate font-mono text-lg">
                        {snippet.value}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
