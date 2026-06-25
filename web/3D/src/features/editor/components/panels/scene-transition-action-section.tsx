"use client";

import { Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultSceneTransitionDuration } from "../../interactions/scene-transition-actions";
import { useEditorStore } from "../../store/editor-store";
import type { SceneObject, SceneState } from "../../types";

const emptySceneStates: SceneState[] = [];

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function SceneTransitionActionSection({
  object,
}: {
  object: SceneObject;
}) {
  const sceneStates = useEditorStore(
    (state) => state.document.sceneStates ?? emptySceneStates,
  );
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const action = object.interaction?.sceneTransitionAction;
  const selectedState = sceneStates.find(
    (sceneState) => sceneState.id === action?.targetStateId,
  );

  function chooseState(sceneState: SceneState) {
    updateInteraction(object.id, {
      sceneTransitionAction: {
        targetStateId: sceneState.id,
        duration: action?.duration ?? defaultSceneTransitionDuration,
      },
    });
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Scene transition</Label>
          {action?.targetStateId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                updateInteraction(object.id, {
                  sceneTransitionAction: undefined,
                })
              }
            >
              Clear
            </Button>
          ) : null}
        </div>
        {sceneStates.length ? (
          <div className="grid grid-cols-2 gap-2">
            {sceneStates.map((sceneState) => (
              <Button
                key={sceneState.id}
                className="min-w-0 justify-start gap-2"
                size="sm"
                variant={
                  sceneState.id === action?.targetStateId
                    ? "default"
                    : "outline"
                }
                onClick={() => chooseState(sceneState)}
              >
                <Layers3 className="size-3.5 shrink-0" />
                <span className="truncate">{sceneState.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            Capture a scene state before assigning a scene transition.
          </div>
        )}
      </div>

      {selectedState ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers3 className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">{selectedState.name}</span>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`scene-transition-${object.id}-duration`}>
              Duration
            </Label>
            <Input
              id={`scene-transition-${object.id}-duration`}
              inputMode="decimal"
              max={30}
              min={0}
              step={0.05}
              type="number"
              value={Number(
                (action?.duration ?? defaultSceneTransitionDuration).toFixed(2),
              )}
              onChange={(event) =>
                updateInteraction(object.id, {
                  sceneTransitionAction: {
                    targetStateId: selectedState.id,
                    duration: clampNumber(
                      toNumber(
                        event.target.value,
                        action?.duration ?? defaultSceneTransitionDuration,
                      ),
                      0,
                      30,
                    ),
                  },
                })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Moves saved objects, applies saved visibility and environment
            values, and switches to the state camera while the scene is running.
          </p>
        </div>
      ) : null}
    </>
  );
}
