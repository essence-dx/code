"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/editor/components/inspector-fields";
import type { TimelineLayer } from "@/lib/editor/types";

type InspectorTextSectionProps = {
  layer: TimelineLayer;
  onUpdateLayer: (layerId: string, patch: Partial<TimelineLayer>) => void;
};

export function InspectorTextSection({ layer, onUpdateLayer }: InspectorTextSectionProps) {
  return (
    <>
      <Field label="Name">
        <Input value={layer.name} onChange={(event) => onUpdateLayer(layer.id, { name: event.target.value })} />
      </Field>
      {"text" in layer || layer.kind === "text" ? (
        <Field label="Text">
          <Textarea value={layer.text ?? ""} onChange={(event) => onUpdateLayer(layer.id, { text: event.target.value })} />
        </Field>
      ) : null}
    </>
  );
}
