"use client";

import { Separator } from "@/components/ui/separator";
import { DataInteractiveControls } from "@/features/editor/components/data-interactive-property-controls";
import { ConnectorControls } from "@/features/editor/components/connector-property-controls";
import { StickyNoteControls } from "@/features/editor/components/diagram-property-controls";
import { DocumentControls } from "@/features/editor/components/document-property-controls";
import { DrawControls } from "@/features/editor/components/draw-property-controls";
import { ImageControls } from "@/features/editor/components/image-property-controls";
import {
  LayerAlignmentControls,
  LayerGeometryControls,
  LayerLinkControls,
} from "@/features/editor/components/layer-property-controls";
import { LayerMotionControls } from "@/features/editor/components/layer-motion-controls";
import { MediaControls } from "@/features/editor/components/media-property-controls";
import { ShapeControls } from "@/features/editor/components/shape-property-controls";
import { TextControls } from "@/features/editor/components/text-property-controls";
import { VectorPathControls } from "@/features/editor/components/vector-path-property-controls";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import type {
  BrandFontSummary,
  DesignElement,
} from "@/features/editor/types";

export function SelectedLayerPropertyControls({
  element,
  pageElements,
  palettes,
  brandFonts,
  canvasSize,
  pageBackground,
  onUpdateElement,
  onSaveBrandFont,
}: {
  element: DesignElement;
  pageElements: readonly DesignElement[];
  palettes: readonly EditorColorPalette[];
  brandFonts: BrandFontSummary[];
  canvasSize: {
    width: number;
    height: number;
  };
  pageBackground: string;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
  onSaveBrandFont: (
    font: Omit<BrandFontSummary, "id" | "createdAt" | "updatedAt">,
  ) => void;
}) {
  return (
    <>
      <Separator />
      <LayerGeometryControls
        element={element}
        onUpdateElement={onUpdateElement}
      />
      <LayerAlignmentControls
        element={element}
        canvasSize={canvasSize}
        onUpdateElement={onUpdateElement}
      />
      <LayerLinkControls element={element} onUpdateElement={onUpdateElement} />
      <LayerMotionControls
        element={element}
        pageElements={pageElements}
        onUpdateElement={onUpdateElement}
      />

      {element.type === "text" ? (
        <TextControls
          element={element}
          palettes={palettes}
          brandFonts={brandFonts}
          pageBackground={pageBackground}
          onUpdateElement={onUpdateElement}
          onSaveBrandFont={onSaveBrandFont}
        />
      ) : null}

      {element.type === "document" ? (
        <DocumentControls
          element={element}
          onUpdateElement={onUpdateElement}
        />
      ) : null}

      {element.type === "shape" ? (
        <ShapeControls
          element={element}
          palettes={palettes}
          onUpdateElement={onUpdateElement}
        />
      ) : null}

      {element.type === "sticky-note" ? (
        <StickyNoteControls
          element={element}
          palettes={palettes}
          onUpdateElement={onUpdateElement}
        />
      ) : null}

      {element.type === "connector" ? (
        <ConnectorControls
          element={element}
          palettes={palettes}
          pageElements={pageElements}
          onUpdateElement={onUpdateElement}
        />
      ) : null}

      {element.type === "image" ? (
        <ImageControls element={element} onUpdateElement={onUpdateElement} />
      ) : null}

      {element.type === "draw" ? (
        <DrawControls
          element={element}
          palettes={palettes}
          onUpdateElement={onUpdateElement}
        />
      ) : null}

      {element.type === "path" ? (
        <VectorPathControls
          element={element}
          palettes={palettes}
          onUpdateElement={onUpdateElement}
        />
      ) : null}

      <MediaControls
        element={element}
        palettes={palettes}
        onUpdateElement={onUpdateElement}
      />

      <DataInteractiveControls
        element={element}
        pageElements={pageElements}
        palettes={palettes}
        onUpdateElement={onUpdateElement}
      />
    </>
  );
}
