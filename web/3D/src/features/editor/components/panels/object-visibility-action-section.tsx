"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "../../store/editor-store";
import type { ObjectVisibilityActionOperation, SceneObject } from "../../types";

const visibilityActionOperations: ObjectVisibilityActionOperation[] = ["toggle", "show", "hide"];

function VisibilityIcon({ visible }: { visible: boolean }) {
  const Icon = visible ? Eye : EyeOff;

  return <Icon className="size-3.5 shrink-0" />;
}

export function ObjectVisibilityActionSection({ object }: { object: SceneObject }) {
  const objects = useEditorStore((state) => state.document.objects);
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const action = object.interaction?.objectVisibilityAction;
  const selectedTarget = objects.find((entry) => entry.id === action?.targetObjectId);

  function chooseTarget(target: SceneObject) {
    updateInteraction(object.id, {
      objectVisibilityAction: {
        targetObjectId: target.id,
        operation: action?.operation ?? "toggle",
      },
    });
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Object visibility</Label>
          {action?.targetObjectId ? (
            <Button size="sm" variant="ghost" onClick={() => updateInteraction(object.id, { objectVisibilityAction: undefined })}>
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
                <VisibilityIcon visible={target.visible} />
                <span className="truncate">{target.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Create an object before assigning a visibility action.</div>
        )}
      </div>

      {selectedTarget ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <VisibilityIcon visible={selectedTarget.visible} />
            <span className="min-w-0 truncate">{selectedTarget.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {visibilityActionOperations.map((operation) => (
              <Button
                key={operation}
                size="sm"
                variant={(action?.operation ?? "toggle") === operation ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    objectVisibilityAction: {
                      targetObjectId: selectedTarget.id,
                      operation,
                    },
                  })
                }
              >
                {operation}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
