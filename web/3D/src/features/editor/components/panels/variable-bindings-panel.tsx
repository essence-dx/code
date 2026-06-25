"use client";

import { nanoid } from "nanoid";
import { Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { objectPropertyBindingTargetValues } from "../../types";
import { isNumericPropertyBindingTarget } from "../../scene/variable-bindings";
import { useEditorStore } from "../../store/editor-store";
import type { ObjectPropertyBinding, ObjectPropertyBindingTarget, SceneObject, SceneVariable } from "../../types";

const propertyLabels: Record<ObjectPropertyBindingTarget, string> = {
  "light.angle": "Light angle",
  "light.color": "Light color",
  "light.distance": "Light distance",
  "light.intensity": "Light intensity",
  "light.penumbra": "Light penumbra",
  "material.color": "Material color",
  "material.metalness": "Material metalness",
  "material.opacity": "Material opacity",
  "material.roughness": "Material roughness",
  "text.content": "Text content",
  "text.fontSize": "Text size",
  "text.maxWidth": "Text width",
  "transform.position.x": "Position X",
  "transform.position.y": "Position Y",
  "transform.position.z": "Position Z",
  "transform.rotation.x": "Rotation X",
  "transform.rotation.y": "Rotation Y",
  "transform.rotation.z": "Rotation Z",
  "transform.scale.x": "Scale X",
  "transform.scale.y": "Scale Y",
  "transform.scale.z": "Scale Z",
};

function createBinding(variableId: string): ObjectPropertyBinding {
  return {
    id: nanoid(),
    property: "transform.position.x",
    variableId,
  };
}

export function VariableBindingsPanel({ object, variables }: { object: SceneObject; variables: SceneVariable[] }) {
  const updateObject = useEditorStore((state) => state.updateObject);
  const bindings = object.variableBindings ?? [];
  const firstVariableId = variables[0]?.id;

  function updateBinding(id: string, patch: Partial<Omit<ObjectPropertyBinding, "id">>) {
    updateObject(object.id, (entry) => ({
      ...entry,
      variableBindings: (entry.variableBindings ?? []).map((binding) => (binding.id === id ? { ...binding, ...patch } : binding)),
    }));
  }

  function deleteBinding(id: string) {
    updateObject(object.id, (entry) => {
      const variableBindings = (entry.variableBindings ?? []).filter((binding) => binding.id !== id);

      return {
        ...entry,
        variableBindings: variableBindings.length ? variableBindings : undefined,
      };
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Link2 className="size-3.5" />
          Variable bindings
        </div>
        <Button
          disabled={!firstVariableId}
          size="sm"
          variant="outline"
          onClick={() =>
            firstVariableId
              ? updateObject(object.id, (entry) => ({
                  ...entry,
                  variableBindings: [...(entry.variableBindings ?? []), createBinding(firstVariableId)],
                }))
              : undefined
          }
        >
          <Plus className="mr-1 size-3.5" />
          Add
        </Button>
      </div>

      {bindings.length ? (
        <div className="space-y-2">
          {bindings.map((binding) => (
            <div key={binding.id} className="space-y-2 rounded-md border border-border p-2">
              <div className="grid grid-cols-[1fr_1fr_32px] items-center gap-2">
                <Select value={binding.property} onValueChange={(value) => value && updateBinding(binding.id, { property: value as ObjectPropertyBindingTarget })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {objectPropertyBindingTargetValues.map((property) => (
                      <SelectItem key={property} value={property}>
                        {propertyLabels[property]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={binding.variableId ?? ""} onValueChange={(variableId) => variableId && updateBinding(binding.id, { variableId })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {variables.map((variable) => (
                      <SelectItem key={variable.id} value={variable.id}>
                        {variable.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button aria-label="Remove binding" className="size-8" size="icon" variant="ghost" onClick={() => deleteBinding(binding.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {isNumericPropertyBindingTarget(binding.property) ? (
                <Input
                  placeholder="Optional expression, e.g. {{Variable 1}} * 2"
                  value={binding.expression ?? ""}
                  onChange={(event) => updateBinding(binding.id, { expression: event.target.value.trim() ? event.target.value : undefined })}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          {variables.length ? "Bind a variable to a transform, material, light, or text property." : "Create a variable before adding property bindings."}
        </div>
      )}
    </div>
  );
}
