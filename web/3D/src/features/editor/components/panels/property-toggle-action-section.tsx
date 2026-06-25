"use client";

import { Box, Film, Lightbulb, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getTogglePropertiesForObject, propertyToggleTargetLabels } from "../../interactions/property-toggle-actions";
import { useEditorStore } from "../../store/editor-store";
import type { PropertyToggleTarget, SceneObject } from "../../types";

function PropertyIcon({ property }: { property: PropertyToggleTarget }) {
  const Icon = property.startsWith("audio.") ? Volume2 : property.startsWith("video.") ? Film : property.startsWith("light.") ? Lightbulb : Box;

  return <Icon className="size-3.5 shrink-0" />;
}

export function PropertyToggleActionSection({ object }: { object: SceneObject }) {
  const objects = useEditorStore((state) => state.document.objects);
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const action = object.interaction?.propertyToggleAction;
  const targets = objects
    .map((target) => ({
      object: target,
      properties: getTogglePropertiesForObject(target),
    }))
    .filter((target) => target.properties.length > 0);
  const selectedTarget = targets.find((target) => target.object.id === action?.targetObjectId);
  const selectedProperty = selectedTarget?.properties.includes(action?.property ?? "material.wireframe")
    ? (action?.property ?? "material.wireframe")
    : selectedTarget?.properties[0];

  function chooseTarget(target: SceneObject, properties: PropertyToggleTarget[]) {
    updateInteraction(object.id, {
      propertyToggleAction: {
        targetObjectId: target.id,
        property: properties.includes(action?.property ?? "material.wireframe") ? (action?.property ?? "material.wireframe") : properties[0],
      },
    });
  }

  function chooseProperty(property: PropertyToggleTarget) {
    if (!selectedTarget) {
      return;
    }

    updateInteraction(object.id, {
      propertyToggleAction: {
        targetObjectId: selectedTarget.object.id,
        property,
      },
    });
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Toggle property</Label>
          {action?.targetObjectId ? (
            <Button size="sm" variant="ghost" onClick={() => updateInteraction(object.id, { propertyToggleAction: undefined })}>
              Clear
            </Button>
          ) : null}
        </div>
        {targets.length ? (
          <div className="grid grid-cols-2 gap-2">
            {targets.map((target) => (
              <Button
                key={target.object.id}
                className="min-w-0 justify-start gap-2"
                size="sm"
                variant={target.object.id === action?.targetObjectId ? "default" : "outline"}
                onClick={() => chooseTarget(target.object, target.properties)}
              >
                <PropertyIcon property={target.properties[0]} />
                <span className="truncate">{target.object.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Create a renderable, light, video, or audio object before assigning a property toggle.</div>
        )}
      </div>

      {selectedTarget && selectedProperty ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PropertyIcon property={selectedProperty} />
            <span className="min-w-0 truncate">{selectedTarget.object.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {selectedTarget.properties.map((property) => (
              <Button key={property} className="justify-start gap-2" size="sm" variant={selectedProperty === property ? "default" : "outline"} onClick={() => chooseProperty(property)}>
                <PropertyIcon property={property} />
                <span className="truncate">{propertyToggleTargetLabels[property]}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
