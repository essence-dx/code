"use client";

import { useMemo } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "../../store/editor-store";
import type {
  AnimationActionOperation,
  AnimationTrack,
  SceneObject,
} from "../../types";

const animationActionOperations: AnimationActionOperation[] = [
  "toggle",
  "start",
  "pause",
  "restart",
];
const emptyAnimationTracks: AnimationTrack[] = [];

function AnimationIcon({ operation }: { operation: AnimationActionOperation }) {
  const Icon =
    operation === "pause" ? Pause : operation === "restart" ? RotateCcw : Play;

  return <Icon className="size-3.5 shrink-0" />;
}

export function AnimationActionSection({ object }: { object: SceneObject }) {
  const objects = useEditorStore((state) => state.document.objects);
  const animationTracks = useEditorStore(
    (state) => state.document.animationTracks,
  );
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const animatedObjects = useMemo(() => {
    const animatedObjectIds = new Set(
      (animationTracks ?? emptyAnimationTracks).map((track) => track.objectId),
    );

    return objects.filter((entry) => animatedObjectIds.has(entry.id));
  }, [animationTracks, objects]);
  const action = object.interaction?.animationAction;
  const selectedTarget = animatedObjects.find(
    (entry) => entry.id === action?.targetObjectId,
  );

  function chooseTarget(target: SceneObject) {
    updateInteraction(object.id, {
      animationAction: {
        targetObjectId: target.id,
        operation: action?.operation ?? "toggle",
      },
    });
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Animation action</Label>
          {action?.targetObjectId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                updateInteraction(object.id, { animationAction: undefined })
              }
            >
              Clear
            </Button>
          ) : null}
        </div>
        {animatedObjects.length ? (
          <div className="grid grid-cols-2 gap-2">
            {animatedObjects.map((target) => (
              <Button
                key={target.id}
                className="min-w-0 justify-start gap-2"
                size="sm"
                variant={
                  target.id === action?.targetObjectId ? "default" : "outline"
                }
                onClick={() => chooseTarget(target)}
              >
                <Play className="size-3.5 shrink-0" />
                <span className="truncate">{target.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            Add transform keyframes before assigning an animation action.
          </div>
        )}
      </div>

      {selectedTarget ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Play className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">{selectedTarget.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {animationActionOperations.map((operation) => (
              <Button
                key={operation}
                className="gap-2"
                size="sm"
                variant={
                  (action?.operation ?? "toggle") === operation
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  updateInteraction(object.id, {
                    animationAction: {
                      targetObjectId: selectedTarget.id,
                      operation,
                    },
                  })
                }
              >
                <AnimationIcon operation={operation} />
                {operation}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
