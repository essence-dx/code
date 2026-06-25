"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  BrandFontRole,
  BrandFontSummary,
  DesignElement,
  TextElement,
} from "@/features/editor/types";

const brandFontRoles = [
  {
    value: "heading",
    label: "Heading",
  },
  {
    value: "subheading",
    label: "Subheading",
  },
  {
    value: "body",
    label: "Body",
  },
  {
    value: "caption",
    label: "Caption",
  },
] satisfies Array<{
  value: BrandFontRole;
  label: string;
}>;

type BrandFontControlsProps = {
  element: TextElement;
  brandFonts: BrandFontSummary[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
  onSaveBrandFont: (
    font: Omit<BrandFontSummary, "id" | "createdAt" | "updatedAt">,
  ) => void;
};

export function BrandFontControls({
  element,
  brandFonts,
  onUpdateElement,
  onSaveBrandFont,
}: BrandFontControlsProps) {
  const [selectedRole, setSelectedRole] = useState<BrandFontRole>("heading");
  const fontsByRole = new Map(brandFonts.map((font) => [font.role, font]));

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">
          Brand fonts
        </h3>
        <span className="text-xs text-muted-foreground">
          {brandFonts.length}/4
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Select
          value={selectedRole}
          onValueChange={(value) => setSelectedRole(value as BrandFontRole)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {brandFontRoles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onSaveBrandFont({
              role: selectedRole,
              fontFamily: element.fontFamily,
              fontSize: element.fontSize,
              fontWeight: element.fontWeight,
              letterSpacing: element.letterSpacing,
              lineHeight: element.lineHeight,
            })
          }
        >
          Save
        </Button>
      </div>
      {brandFonts.length ? (
        <div className="grid gap-2">
          {brandFontRoles.map((role) => {
            const font = fontsByRole.get(role.value);

            if (!font) return null;

            return (
              <Button
                key={font.id}
                type="button"
                variant="outline"
                className="h-auto justify-start px-3 py-2 text-left"
                onClick={() =>
                  onUpdateElement({
                    fontFamily: font.fontFamily,
                    fontSize: font.fontSize,
                    fontWeight: font.fontWeight,
                    letterSpacing: font.letterSpacing,
                    lineHeight: font.lineHeight,
                  } as Partial<DesignElement>)
                }
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-sm font-medium">
                    {role.label}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {font.fontFamily} / {font.fontSize}px / {font.fontWeight}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No brand fonts saved.</p>
      )}
    </div>
  );
}
