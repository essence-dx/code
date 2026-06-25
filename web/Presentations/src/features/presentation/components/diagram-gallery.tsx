"use client"

import { useState } from "react"
import {
  CircleDotDashed,
  GitBranch,
  Network,
  Repeat2,
  Workflow,
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
  diagramTemplates,
  type DiagramTemplate,
  type DiagramTemplateId,
} from "../diagram-templates"
import { usePresentationStore } from "../use-presentation-store"

const diagramIcons: Record<DiagramTemplateId, LucideIcon> = {
  process: Workflow,
  cycle: Repeat2,
  hierarchy: Network,
  matrix: Workflow,
  pyramid: Network,
  relationship: CircleDotDashed,
}

export function DiagramGallery() {
  const addDiagram = usePresentationStore((state) => state.addDiagram)
  const [open, setOpen] = useState(false)

  function insertDiagram(template: DiagramTemplate) {
    addDiagram(template.id)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <GitBranch className="size-4" />
        Diagrams
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Diagrams</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-3">
          {diagramTemplates.map((template) => {
            const Icon = diagramIcons[template.id]

            return (
              <button
                key={template.id}
                type="button"
                className="grid gap-2 rounded-md border bg-background p-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => insertDiagram(template)}
              >
                <span className="flex items-center gap-2 font-medium">
                  <Icon className="size-4" />
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
