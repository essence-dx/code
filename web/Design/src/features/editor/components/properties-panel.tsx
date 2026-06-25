"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LayerActionBar } from "@/features/editor/components/layer-property-controls";
import {
  getPalettesWithBrandColors,
  PagePropertyControls,
} from "@/features/editor/components/page-property-controls";
import { SelectedLayerPropertyControls } from "@/features/editor/components/selected-layer-property-controls";
import type {
  BrandColorSummary,
  BrandFontSummary,
  DesignElement,
} from "@/features/editor/types";
import { cn } from "@/lib/utils";

type PropertiesPanelProps = {
  selectedElement: DesignElement | null;
  pageElements: readonly DesignElement[];
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  canvasSize: {
    width: number;
    height: number;
  };
  pageBackground: string;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
  onDuplicateElement: () => void;
  onDeleteElement: () => void;
  onBackgroundChange: (color: string) => void;
  onCreateBrandColor: (color: string) => void;
  onSaveBrandFont: (
    font: Omit<BrandFontSummary, "id" | "createdAt" | "updatedAt">,
  ) => void;
  className?: string;
};

export function PropertiesPanel({
  selectedElement,
  pageElements,
  brandColors,
  brandFonts,
  canvasSize,
  pageBackground,
  onUpdateElement,
  onDuplicateElement,
  onDeleteElement,
  onBackgroundChange,
  onCreateBrandColor,
  onSaveBrandFont,
  className,
}: PropertiesPanelProps) {
  const palettes = getPalettesWithBrandColors(brandColors);

  return (
    <aside
      className={cn(
        "flex h-full w-full min-w-0 shrink-0 flex-col overflow-hidden border-l border-border bg-card",
        className,
      )}
    >
      <div className="p-3">
        <h2 className="text-sm font-semibold">Properties</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tune the selected layer or page.
        </p>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <div className="flex flex-col gap-4 p-3">
          <PagePropertyControls
            selectedElement={selectedElement}
            pageBackground={pageBackground}
            palettes={palettes}
            onBackgroundChange={onBackgroundChange}
            onCreateBrandColor={onCreateBrandColor}
          />

          {selectedElement ? (
            <SelectedLayerPropertyControls
              element={selectedElement}
              pageElements={pageElements}
              palettes={palettes}
              brandFonts={brandFonts}
              canvasSize={canvasSize}
              pageBackground={pageBackground}
              onUpdateElement={onUpdateElement}
              onSaveBrandFont={onSaveBrandFont}
            />
          ) : (
            <PropertiesPanelEmptyState />
          )}
        </div>
      </ScrollArea>
      {selectedElement ? (
        <>
          <Separator />
          <LayerActionBar
            element={selectedElement}
            onUpdateElement={onUpdateElement}
            onDuplicateElement={onDuplicateElement}
            onDeleteElement={onDeleteElement}
          />
        </>
      ) : null}
    </aside>
  );
}

function PropertiesPanelEmptyState() {
  return (
    <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      Select a layer to edit its position, text, colors, and sizing.
    </div>
  );
}
