"use client";

import { Box, Boxes, Layers3, Lightbulb, PackageOpen, Shapes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { builtInSceneTemplates, type BuiltInTemplateCategory } from "../../scene/built-in-templates";
import { useEditorStore } from "../../store/editor-store";

const categoryIcons: Record<BuiltInTemplateCategory, typeof Box> = {
  Interface: Layers3,
  Lighting: Lightbulb,
  Product: PackageOpen,
  Samples: Shapes,
  Showcase: Boxes,
};

export function BuiltInTemplateLibrarySection() {
  const instantiateBuiltInTemplate = useEditorStore((state) => state.instantiateBuiltInTemplate);

  return (
    <div className="space-y-1 pt-1">
      <div className="flex items-center justify-between gap-2 px-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Built-in Templates</div>
        <Badge className="rounded-md text-[11px]" variant="secondary">
          {builtInSceneTemplates.length}
        </Badge>
      </div>
      <div className="space-y-1">
        {builtInSceneTemplates.map((template) => {
          const Icon = categoryIcons[template.category];

          return (
            <div key={template.id} className="grid grid-cols-[1fr_52px] items-center gap-1">
              <Button
                className="grid h-auto min-w-0 grid-cols-[24px_1fr] justify-start gap-2 px-2 py-2 text-left"
                type="button"
                variant="ghost"
                onClick={() => instantiateBuiltInTemplate(template.id)}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate">{template.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{template.description}</span>
                </span>
              </Button>
              <Button className="h-8 px-2 text-xs" size="sm" variant="secondary" onClick={() => instantiateBuiltInTemplate(template.id)}>
                Place
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
