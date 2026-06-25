"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import {
  canDeleteVectorPathPoint,
  canSetVectorPathNodeHandleMode,
  createClosedVectorPathPatch,
  createDeletedVectorPathPointPatch,
  createOpenVectorPathPatch,
  createSnappedVectorPathPatch,
  createVectorPathNodeHandleModePatch,
  getEditableVectorPathPoints,
  updateEditableVectorPathPoint,
  type EditableVectorPathPoint,
  type VectorPathNodeHandleMode,
} from "@/features/editor/vector-path-editing";
import type { DesignLayer } from "@/features/editor/types";

type VectorPathNodeSectionProps = {
  layer: DesignLayer;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
};

const visiblePointLimit = 18;
const handleModes: { mode: VectorPathNodeHandleMode; label: string }[] = [
  { mode: "corner", label: "Corner" },
  { mode: "mirrored", label: "Mirror" },
  { mode: "disconnected", label: "Free" },
];

export function VectorPathNodeSection({
  layer,
  onUpdateLayer,
}: VectorPathNodeSectionProps) {
  const points = getEditableVectorPathPoints(layer.pathData ?? "");
  const visiblePoints = points.slice(0, visiblePointLimit);
  const hasPathData = Boolean(layer.pathData?.trim());

  function updatePoint(
    point: EditableVectorPathPoint,
    patch: Pick<EditableVectorPathPoint, "x" | "y">,
  ) {
    if (!layer.pathData) {
      return;
    }

    onUpdateLayer(layer.id, {
      pathData: updateEditableVectorPathPoint(layer.pathData, point.id, patch),
    });
  }

  function deletePoint(point: EditableVectorPathPoint) {
    applyPathPatch(createDeletedVectorPathPointPatch(layer, point.id));
  }

  function setHandleMode(
    point: EditableVectorPathPoint,
    mode: VectorPathNodeHandleMode,
  ) {
    applyPathPatch(createVectorPathNodeHandleModePatch(layer, point.id, mode));
  }

  function snapNodes() {
    applyPathPatch(createSnappedVectorPathPatch(layer));
  }

  function applyPathPatch(patch: Partial<DesignLayer> | null) {
    if (patch) {
      onUpdateLayer(layer.id, patch);
    }
  }

  function closePath() {
    applyPathPatch(createClosedVectorPathPatch(layer));
  }

  function openPath() {
    applyPathPatch(createOpenVectorPathPatch(layer));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Vector nodes
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {points.length}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={points.length === 0}
          onClick={snapNodes}
        >
          Snap
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasPathData}
          onClick={closePath}
        >
          Close
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasPathData}
          onClick={openPath}
        >
          Open
        </Button>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {visiblePoints.map((point) => (
          <VectorPathPointRow
            key={point.id}
            point={point}
            canDelete={canDeleteVectorPathPoint(layer, point.id)}
            handleModes={handleModes.map((item) => ({
              ...item,
              enabled: canSetVectorPathNodeHandleMode(
                layer,
                point.id,
                item.mode,
              ),
            }))}
            onUpdate={(patch) => updatePoint(point, patch)}
            onDelete={() => deletePoint(point)}
            onHandleModeChange={(mode) => setHandleMode(point, mode)}
          />
        ))}
      </div>
      {points.length > visiblePointLimit ? (
        <div className="font-mono text-[10px] text-muted-foreground">
          {visiblePointLimit} / {points.length}
        </div>
      ) : null}
    </div>
  );
}

function VectorPathPointRow({
  point,
  canDelete,
  handleModes,
  onUpdate,
  onDelete,
  onHandleModeChange,
}: {
  point: EditableVectorPathPoint;
  canDelete: boolean;
  handleModes: {
    mode: VectorPathNodeHandleMode;
    label: string;
    enabled: boolean;
  }[];
  onUpdate: (patch: Pick<EditableVectorPathPoint, "x" | "y">) => void;
  onDelete: () => void;
  onHandleModeChange: (mode: VectorPathNodeHandleMode) => void;
}) {
  const canChangeHandles =
    point.kind === "anchor" && handleModes.some((mode) => mode.enabled);

  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <div className="truncate text-xs font-medium text-foreground">
          {point.label}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">
            {point.command}
            {point.relative ? " rel" : ""}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={!canDelete}
            onClick={onDelete}
            aria-label={`Remove ${point.label}`}
            title={`Remove ${point.label}`}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <LabeledPointInput
          label="X"
          value={point.x}
          onChange={(x) => onUpdate({ x })}
        />
        <LabeledPointInput
          label="Y"
          value={point.y}
          onChange={(y) => onUpdate({ y })}
        />
      </div>
      {point.kind === "anchor" ? (
        <div className="mt-2 grid grid-cols-3 gap-1">
          {handleModes.map((item) => (
            <Button
              key={item.mode}
              type="button"
              variant="outline"
              size="xs"
              disabled={!canChangeHandles || !item.enabled}
              onClick={() => onHandleModeChange(item.mode)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LabeledPointInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <NumberInput
        value={value ?? 0}
        step={1}
        disabled={value === undefined}
        onChange={onChange}
      />
    </label>
  );
}
