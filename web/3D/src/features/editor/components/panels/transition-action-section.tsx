"use client";

import { Move3D } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultTransitionDuration } from "../../interactions/transition-actions";
import { useEditorStore } from "../../store/editor-store";
import type { SceneObject, Transform, TransitionAction, Vec3 } from "../../types";

const transformGroups: Array<{ id: keyof Transform; label: string; step: number }> = [
  { id: "position", label: "Position", step: 0.1 },
  { id: "rotation", label: "Rotation", step: 0.05 },
  { id: "scale", label: "Scale", step: 0.1 },
];
const axes = ["X", "Y", "Z"] as const;

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function moveVec3(vector: Vec3, index: number, value: number): Vec3 {
  return vector.map((entry, entryIndex) => (entryIndex === index ? value : entry)) as Vec3;
}

function resolveTargetTransform(object: SceneObject, action?: TransitionAction): Transform {
  return {
    position: action?.position ?? object.transform.position,
    rotation: action?.rotation ?? object.transform.rotation,
    scale: action?.scale ?? object.transform.scale,
  };
}

export function TransitionActionSection({ object }: { object: SceneObject }) {
  const objects = useEditorStore((state) => state.document.objects);
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const action = object.interaction?.transitionAction;
  const selectedTarget = objects.find((entry) => entry.id === action?.targetObjectId);
  const targetTransform = selectedTarget ? resolveTargetTransform(selectedTarget, action) : null;

  function chooseTarget(target: SceneObject) {
    updateInteraction(object.id, {
      transitionAction: {
        targetObjectId: target.id,
        duration: action?.duration ?? defaultTransitionDuration,
        position: action?.position ?? target.transform.position,
        rotation: action?.rotation ?? target.transform.rotation,
        scale: action?.scale ?? target.transform.scale,
      },
    });
  }

  function updateTargetTransform(group: keyof Transform, value: Vec3) {
    if (!selectedTarget || !targetTransform) {
      return;
    }

    updateInteraction(object.id, {
      transitionAction: {
        targetObjectId: selectedTarget.id,
        duration: action?.duration ?? defaultTransitionDuration,
        ...targetTransform,
        [group]: value,
      },
    });
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Transition action</Label>
          {action?.targetObjectId ? (
            <Button size="sm" variant="ghost" onClick={() => updateInteraction(object.id, { transitionAction: undefined })}>
              Clear
            </Button>
          ) : null}
        </div>
        {objects.length ? (
          <div className="grid grid-cols-2 gap-2">
            {objects.map((target) => (
              <Button
                key={target.id}
                className="min-w-0 justify-start gap-2"
                size="sm"
                variant={target.id === action?.targetObjectId ? "default" : "outline"}
                onClick={() => chooseTarget(target)}
              >
                <Move3D className="size-3.5 shrink-0" />
                <span className="truncate">{target.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Create an object before assigning a transition action.</div>
        )}
      </div>

      {selectedTarget && targetTransform ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Move3D className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">{selectedTarget.name}</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`transition-${object.id}-duration`}>Duration</Label>
            <Input
              id={`transition-${object.id}-duration`}
              inputMode="decimal"
              max={30}
              min={0}
              step={0.05}
              type="number"
              value={Number((action?.duration ?? defaultTransitionDuration).toFixed(2))}
              onChange={(event) =>
                updateInteraction(object.id, {
                  transitionAction: {
                    targetObjectId: selectedTarget.id,
                    duration: clampNumber(toNumber(event.target.value, action?.duration ?? defaultTransitionDuration), 0, 30),
                    ...targetTransform,
                  },
                })
              }
            />
          </div>
          {transformGroups.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</div>
              <div className="grid grid-cols-3 gap-2">
                {axes.map((axis, index) => (
                  <div key={`${group.id}-${axis}`} className="space-y-1">
                    <Label htmlFor={`transition-${object.id}-${group.id}-${axis}`} className="text-[11px] text-muted-foreground">
                      {axis}
                    </Label>
                    <Input
                      id={`transition-${object.id}-${group.id}-${axis}`}
                      inputMode="decimal"
                      step={group.step}
                      type="number"
                      value={Number(targetTransform[group.id][index].toFixed(2))}
                      onChange={(event) => updateTargetTransform(group.id, moveVec3(targetTransform[group.id], index, toNumber(event.target.value, targetTransform[group.id][index])))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
