"use client"

import { useState } from "react"
import { Shapes } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { shapeKindLabels, shapeKinds } from "../shape-formatting"
import {
  shapeConnectorPath,
  shapePath,
  shapePolygonPoints,
} from "../shape-geometry"
import type { ShapeKind } from "../types"
import { usePresentationStore } from "../use-presentation-store"

function ShapeGlyph({ kind }: { kind: ShapeKind }) {
  const polygonPoints = shapePolygonPoints(kind, {
    x: 4,
    y: 4,
    width: 56,
    height: 56,
  })
  const connectorPath = shapeConnectorPath(kind, {
    x: 4,
    y: 4,
    width: 56,
    height: 56,
  })
  const customPath = shapePath(kind, {
    x: 4,
    y: 4,
    width: 56,
    height: 56,
  })

  return (
    <svg
      aria-hidden="true"
      className="size-10 text-primary"
      fill="rgb(219 234 254)"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3"
      viewBox="0 0 64 64"
    >
      {kind === "ellipse" ? (
        <ellipse cx="32" cy="32" rx="27" ry="24" />
      ) : polygonPoints ? (
        <polygon points={polygonPoints} />
      ) : customPath ? (
        <path d={customPath} />
      ) : kind === "line" ? (
        <line x1="8" x2="56" y1="32" y2="32" />
      ) : kind === "arrow" ? (
        <>
          <line x1="8" x2="48" y1="32" y2="32" />
          <path d="M44 22 56 32 44 42" fill="none" />
        </>
      ) : kind === "doubleArrow" ? (
        <>
          <path d="M20 22 8 32 20 42" fill="none" />
          <line x1="10" x2="54" y1="32" y2="32" />
          <path d="M44 22 56 32 44 42" fill="none" />
        </>
      ) : connectorPath ? (
        <path d={connectorPath} fill="none" />
      ) : (
        <rect height="46" rx={kind === "rounded" ? 9 : 0} width="52" x="6" y="9" />
      )}
    </svg>
  )
}

export function ShapeGallery() {
  const addShapeElement = usePresentationStore((state) => state.addShapeElement)
  const [open, setOpen] = useState(false)

  function insertShape(kind: ShapeKind) {
    addShapeElement(kind)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        <Shapes className="size-4" />
        Shapes
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Shapes</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-3">
          {shapeKinds.map((kind) => (
            <button
              key={kind}
              type="button"
              className="flex items-center gap-3 rounded-md border bg-background p-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => insertShape(kind)}
            >
              <ShapeGlyph kind={kind} />
              <span className="font-medium">{shapeKindLabels[kind]}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
