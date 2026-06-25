"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/editor/components/property-fields";

export function BrandColorControls({
  currentColor,
  onCreateBrandColor,
}: {
  currentColor: string;
  onCreateBrandColor: (color: string) => void;
}) {
  const [color, setColor] = useState(currentColor);

  return (
    <Field label="Brand kit color">
      <div className="flex gap-2">
        <Input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-label="Brand kit color"
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => onCreateBrandColor(color)}
        >
          Save swatch
        </Button>
      </div>
    </Field>
  );
}
