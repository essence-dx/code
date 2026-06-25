"use client";

import { useState } from "react";
import {
  Camera,
  Clapperboard,
  Layers3,
  Play,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "../../store/editor-store";
import type { SceneState } from "../../types";

const emptySceneStates: SceneState[] = [];

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampDuration(value: number) {
  return Math.min(120, Math.max(0.05, value));
}

export function SceneStatesPanel() {
  const [animationDuration, setAnimationDuration] = useState(1.2);
  const sceneStates = useEditorStore(
    (state) => state.document.sceneStates ?? emptySceneStates,
  );
  const objects = useEditorStore((state) => state.document.objects);
  const addSceneState = useEditorStore((state) => state.addSceneState);
  const updateSceneStateName = useEditorStore(
    (state) => state.updateSceneStateName,
  );
  const captureSceneState = useEditorStore((state) => state.captureSceneState);
  const applySceneState = useEditorStore((state) => state.applySceneState);
  const createAnimationFromSceneState = useEditorStore(
    (state) => state.createAnimationFromSceneState,
  );
  const deleteSceneState = useEditorStore((state) => state.deleteSceneState);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Scene states
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            {sceneStates.length}
          </span>
        </div>
        <Button
          className="w-full justify-start gap-2"
          size="sm"
          variant="secondary"
          onClick={addSceneState}
        >
          <Layers3 className="size-3.5" />
          Capture current state
        </Button>
        <div className="space-y-1">
          <Label htmlFor="scene-state-animation-duration">
            Animation duration
          </Label>
          <Input
            id="scene-state-animation-duration"
            inputMode="decimal"
            max={120}
            min={0.05}
            step={0.05}
            type="number"
            value={Number(animationDuration.toFixed(2))}
            onChange={(event) =>
              setAnimationDuration(
                clampDuration(toNumber(event.target.value, animationDuration)),
              )
            }
          />
        </div>
      </div>

      {sceneStates.length ? (
        <div className="space-y-3">
          {sceneStates.map((sceneState) => {
            const camera = objects.find(
              (object) =>
                object.id === sceneState.activeCameraId &&
                object.kind === "camera",
            );

            return (
              <div
                key={sceneState.id}
                className="space-y-3 rounded-md border border-border p-3"
              >
                <div className="grid grid-cols-[1fr_36px] gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`scene-state-${sceneState.id}`}>Name</Label>
                    <Input
                      id={`scene-state-${sceneState.id}`}
                      value={sceneState.name}
                      onChange={(event) =>
                        updateSceneStateName(sceneState.id, event.target.value)
                      }
                    />
                  </div>
                  <Button
                    aria-label={`Delete ${sceneState.name}`}
                    className="mt-6 size-9"
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteSceneState(sceneState.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <Camera className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {camera?.name ?? "Default camera"}
                  </span>
                  <span className="font-mono">
                    {sceneState.objects.length} objects
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="gap-2"
                    size="sm"
                    variant="secondary"
                    onClick={() => applySceneState(sceneState.id)}
                  >
                    <Play className="size-3.5" />
                    Apply
                  </Button>
                  <Button
                    className="gap-2"
                    size="sm"
                    variant="secondary"
                    onClick={() => captureSceneState(sceneState.id)}
                  >
                    <RefreshCcw className="size-3.5" />
                    Recapture
                  </Button>
                </div>
                <Button
                  className="w-full gap-2"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    createAnimationFromSceneState(
                      sceneState.id,
                      animationDuration,
                    )
                  }
                >
                  <Clapperboard className="size-3.5" />
                  Create animation
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Capture a state after arranging objects, visibility, camera, and
          environment settings.
        </div>
      )}
    </div>
  );
}
