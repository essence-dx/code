"use client";

import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/editor/components/property-fields";
import { getImageAltTextStatus } from "@/features/editor/image-accessibility";
import type { DesignElement, ImageElement } from "@/features/editor/types";

export function ImageAltTextControls({
  element,
  onUpdateElement,
}: {
  element: ImageElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const status = getImageAltTextStatus(element.alt);

  return (
    <Field label="Alt text">
      <div className="space-y-2">
        <Textarea
          value={element.alt}
          rows={3}
          onChange={(event) =>
            onUpdateElement({
              alt: event.target.value,
            } as Partial<DesignElement>)
          }
        />
        <div className="flex items-center justify-between gap-2">
          <Badge variant={status.tone === "good" ? "secondary" : "outline"}>
            {status.message}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {element.alt.trim().length}/140
          </span>
        </div>
      </div>
    </Field>
  );
}
