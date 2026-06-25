"use client";

import { Sparkles } from "lucide-react";

import {
  vectorPackCategories,
  vectorPackItems,
  type VectorPackItem,
} from "@/features/editor/vector-packs";

type VectorPackGridProps = {
  onAddVector: (item: VectorPackItem) => void;
};

export function VectorPackGrid({ onAddVector }: VectorPackGridProps) {
  return (
    <div className="space-y-4">
      {vectorPackCategories.map((category) => (
        <div key={category} className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            {category}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {vectorPackItems
              .filter((item) => item.category === category)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="group aspect-square overflow-hidden rounded-md border border-border bg-background p-2 text-left transition hover:border-foreground"
                  onClick={() => onAddVector(item)}
                  aria-label={`Add ${item.name}`}
                  title={item.name}
                >
                  <span
                    className="flex h-full w-full items-center justify-center [&_svg]:h-full [&_svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: item.svgText }}
                  />
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
