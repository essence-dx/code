"use client"

import type { ReactNode } from "react"

import { Input } from "@/components/ui/input"

import {
  defaultConnectorGeometryForShape,
  isConnectorShapeKind,
  shapeConnectorGeometry,
} from "../shape-geometry"
import type { PresentationElement, ShapeKind } from "../types"

type ConnectorGeometryControlsProps = {
  element: PresentationElement
  onChange: (patch: Partial<Omit<PresentationElement, "id">>) => void
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0

  return Math.max(0, Math.min(100, Math.round(value)))
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  )
}

function NumberInput({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: number) => void
  value: number
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => onChange(clampPercent(Number(event.currentTarget.value)))}
      />
    </Field>
  )
}

function geometryPatch(geometry: ReturnType<typeof shapeConnectorGeometry>) {
  return {
    shapeConnectorControlX: geometry.controlX,
    shapeConnectorControlY: geometry.controlY,
    shapeConnectorEndX: geometry.endX,
    shapeConnectorEndY: geometry.endY,
    shapeConnectorStartX: geometry.startX,
    shapeConnectorStartY: geometry.startY,
  } satisfies Partial<Omit<PresentationElement, "id">>
}

export function connectorGeometryDefaultsPatch(shapeKind: ShapeKind) {
  return geometryPatch(defaultConnectorGeometryForShape(shapeKind))
}

export function ConnectorGeometryControls({
  element,
  onChange,
}: ConnectorGeometryControlsProps) {
  const geometry = shapeConnectorGeometry(element)
  const isConnector = isConnectorShapeKind(element.shapeKind)

  return (
    <div className="grid gap-2 rounded-md border bg-background p-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Connector points
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          label="Start X"
          value={geometry.startX}
          onChange={(value) => onChange({ shapeConnectorStartX: value })}
        />
        <NumberInput
          label="Start Y"
          value={geometry.startY}
          onChange={(value) => onChange({ shapeConnectorStartY: value })}
        />
        {isConnector ? (
          <>
            <NumberInput
              label="Control X"
              value={geometry.controlX}
              onChange={(value) => onChange({ shapeConnectorControlX: value })}
            />
            <NumberInput
              label="Control Y"
              value={geometry.controlY}
              onChange={(value) => onChange({ shapeConnectorControlY: value })}
            />
          </>
        ) : null}
        <NumberInput
          label="End X"
          value={geometry.endX}
          onChange={(value) => onChange({ shapeConnectorEndX: value })}
        />
        <NumberInput
          label="End Y"
          value={geometry.endY}
          onChange={(value) => onChange({ shapeConnectorEndY: value })}
        />
      </div>
    </div>
  )
}
