import type { Dispatch, SetStateAction } from "react";
import { nanoid } from "nanoid";
import type { CommandPaletteCommand } from "@/features/editor/components/command-palette";
import type { ToolShortcutPreferences } from "@/features/editor/shortcut-preferences";
import { getEffectStyleLayerPatch } from "@/features/editor/effect-styles";
import {
  canCreateConnector,
  createConnectorLayer,
} from "@/features/editor/connector-lines";
import {
  createStampLayer,
  stampOptions,
} from "@/features/editor/stamp-layers";
import {
  createInkPresetLayer,
  getInkPresetLayerPatch,
  inkPresetOptions,
} from "@/features/editor/ink-presets";
import {
  createAutoLayoutLayerPatches,
  createAutoLayoutParentPatches,
  defaultAutoLayout,
  defaultLayoutSizing,
  getAutoLayoutChildLayers,
} from "@/features/editor/auto-layout";
import {
  strokeLineCapOptions,
  strokeLineJoinOptions,
} from "@/features/editor/stroke-options";
import {
  fontFamilyOptions,
  textAlignOptions,
  textResizeModeOptions,
} from "@/features/editor/text-options";
import {
  getTextLayerResizeModePatches,
  getTextLayerTypographyPatch,
} from "@/features/editor/text-layer-review";
import { getTextStyleLayerPatch } from "@/features/editor/text-styles";
import { imageFitOptions } from "@/features/editor/image-options";
import { getPrimaryFillPaintPatch } from "@/features/editor/paint-stack";
import {
  createClosedVectorPathPatch,
  createOpenVectorPathPatch,
  createSnappedVectorPathPatch,
} from "@/features/editor/vector-path-editing";
import {
  canConvertLayerToPath,
  canOutlineStroke,
  canTransformPathLayer,
  canResizeLayerMask,
  canUseLayerAsMask,
  centerLayerMask,
  createBooleanVectorLayer,
  createEditablePathLayer,
  createFlippedPathPatch,
  createLayerMask,
  createNormalizedPathPatch,
  createOutlinedStrokeLayer,
  fitLayerMaskToLayer,
  type VectorBooleanOperation,
} from "@/features/editor/vector-operations";
import {
  layoutGridPresetOptions,
  normalizeLayoutGrid,
  styleToGrid,
} from "@/features/editor/layout-grids";
import { getLayoutPresetLayerPatch } from "@/features/editor/layout-preset-styles";
import type { useEditorDocument } from "@/features/editor/use-editor-document";
import type {
  CanvasView,
  DesignLayer,
  DesignLayoutSizingMode,
  DesignTextResizeMode,
  EditorTool,
  LayerAlignment,
  LayerDistribution,
  LayerType,
} from "@/features/editor/types";
import {
  fitLayersToViewport,
  zoomView,
  type ViewportSize,
} from "@/features/editor/viewport-utils";

type EditorController = ReturnType<typeof useEditorDocument>;
type SelectionStatePatch = Partial<
  Pick<
    DesignLayer,
    | "visible"
    | "locked"
    | "readyForDev"
    | "clipContent"
    | "fill"
    | "blendMode"
    | "rotation"
    | "opacity"
    | "strokeDash"
    | "strokeLineCap"
    | "strokeLineJoin"
    | "shadowEnabled"
    | "shadowColor"
    | "shadowX"
    | "shadowY"
    | "shadowBlur"
    | "shadowSpread"
    | "layerBlur"
    | "backgroundBlur"
    | "effectsVisible"
    | "imageFit"
    | "mask"
    | "maskSource"
  >
>;
type TextStatePatch = Partial<
  Pick<
    DesignLayer,
    | "fontFamily"
    | "fontSize"
    | "fontWeight"
    | "lineHeight"
    | "letterSpacing"
    | "textAlign"
    | "textColor"
  >
>;

type CreateEditorCommandsInput = {
  editor: EditorController;
  markDirty: (action: () => void) => void;
  save: () => void;
  setTool: Dispatch<SetStateAction<EditorTool>>;
  view: CanvasView;
  setView: Dispatch<SetStateAction<CanvasView>>;
  viewportSize: ViewportSize;
  openExport: () => void;
  insertComponent: (componentId: string, variantId?: string) => void;
  toolShortcuts: ToolShortcutPreferences;
};

const booleanPreviewLayerNamePrefix = "Boolean Preview:";

const vectorBooleanOperationLabels: Record<VectorBooleanOperation, string> = {
  union: "Union",
  subtract: "Subtract",
  intersect: "Intersect",
  exclude: "Exclude",
};

function isBooleanPreviewLayer(layer: DesignLayer) {
  return (
    layer.type === "path" && layer.name.startsWith(booleanPreviewLayerNamePrefix)
  );
}

export function createEditorCommands({
  editor,
  markDirty,
  save,
  setTool,
  view,
  setView,
  viewportSize,
  openExport,
  insertComponent,
  toolShortcuts,
}: CreateEditorCommandsInput): CommandPaletteCommand[] {
  const pageGrid = getPageGrid(editor.activePage);
  const selectedTextLayers = editor.selectedLayers.filter(
    (layer) => layer.text !== undefined,
  );
  const selectedImageLayers = editor.selectedLayers.filter(
    (layer) => layer.type === "image",
  );
  const selectedPathLayers = editor.selectedLayers.filter(
    (layer) => layer.type === "path",
  );
  const selectedTransformablePathLayers = editor.selectedLayers.filter(
    canTransformPathLayer,
  );
  const selectedVectorizableLayers = editor.selectedLayers.filter(
    (layer) => canConvertLayerToPath(layer) && !isBooleanPreviewLayer(layer),
  );
  const selectedOutlineableLayers =
    editor.selectedLayers.filter(canOutlineStroke);
  const selectedLayerOrder = editor.activePage.layers.filter((layer) =>
    editor.selectedLayerIds.includes(layer.id),
  );
  const maskSourceLayer = [...selectedLayerOrder].reverse().find(canUseLayerAsMask);
  const maskTargetLayers = maskSourceLayer
    ? selectedLayerOrder.filter(
        (layer) => layer.id !== maskSourceLayer.id && !layer.locked,
      )
    : [];
  const selectedMaskedLayers = editor.selectedLayers.filter(
    (layer) => layer.mask || layer.maskSource,
  );
  const selectedEditableMaskLayers = editor.selectedLayers.filter(canResizeLayerMask);
  const selectedFrame =
    editor.selectedLayer?.type === "frame" ? editor.selectedLayer : null;
  const selectedFrameAutoLayoutChildCount = selectedFrame
    ? getAutoLayoutChildLayers(selectedFrame, editor.activePage.layers).length
    : 0;
  const selectedFrameAutoLayoutAdoptCount = selectedFrame
    ? createAutoLayoutParentPatches(selectedFrame, editor.activePage.layers).length
    : 0;

  return [
    {
      id: "save",
      label: "Save",
      detail: "Persist the current file",
      shortcut: "Ctrl S",
      run: save,
    },
    {
      id: "export",
      label: "Export",
      detail: "Open batch export settings",
      run: openExport,
    },
    {
      id: "zoom-in",
      label: "Zoom in",
      detail: "Increase canvas zoom",
      shortcut: "Ctrl +",
      run: () => setView((current) => zoomView(current, 0.1)),
    },
    {
      id: "zoom-out",
      label: "Zoom out",
      detail: "Decrease canvas zoom",
      shortcut: "Ctrl -",
      run: () => setView((current) => zoomView(current, -0.1)),
    },
    {
      id: "zoom-100",
      label: "Zoom to 100%",
      detail: `Current zoom ${Math.round(view.zoom * 100)}%`,
      shortcut: "Ctrl 0",
      run: () => setView((current) => ({ ...current, zoom: 1 })),
    },
    {
      id: "zoom-fit-page",
      label: "Zoom to fit page",
      detail: "Fit visible layers on the active page",
      shortcut: "Shift 1",
      disabled: !editor.activePage.layers.some((layer) => layer.visible),
      run: () => {
        const nextView = fitLayersToViewport(editor.activePage.layers, viewportSize);

        if (nextView) {
          setView(nextView);
        }
      },
    },
    {
      id: "zoom-fit-selection",
      label: "Zoom to selection",
      detail: "Fit selected visible layers in the viewport",
      shortcut: "Shift 2",
      disabled: !editor.selectedLayers.some((layer) => layer.visible),
      run: () => {
        const nextView = fitLayersToViewport(editor.selectedLayers, viewportSize);

        if (nextView) {
          setView(nextView);
        }
      },
    },
    {
      id: "toggle-page-grid",
      label: pageGrid.visible ? "Hide page grid" : "Show page grid",
      detail: `Grid size ${pageGrid.size}px`,
      shortcut: "Shift G",
      run: () =>
        markDirty(() =>
          editor.updateActivePage({
            grid: { ...pageGrid, visible: !pageGrid.visible },
          }),
        ),
    },
    {
      id: "toggle-snap-to-grid",
      label: pageGrid.snap ? "Disable snap to grid" : "Enable snap to grid",
      detail: "Snap drawing, moving, resizing, and guides to the page grid",
      shortcut: "Shift S",
      run: () =>
        markDirty(() =>
          editor.updateActivePage({
            grid: { ...pageGrid, snap: !pageGrid.snap },
          }),
        ),
    },
    {
      id: "toggle-object-snap",
      label: pageGrid.objectSnap ? "Disable object snap" : "Enable object snap",
      detail: "Snap moved layers to nearby layer edges and centers",
      shortcut: "Shift O",
      run: () =>
        markDirty(() =>
          editor.updateActivePage({
            grid: { ...pageGrid, objectSnap: !pageGrid.objectSnap },
          }),
        ),
    },
    {
      id: "add-page",
      label: "Add page",
      detail: "Create a blank page in this file",
      run: () => markDirty(editor.addPage),
    },
    {
      id: "duplicate-page",
      label: "Duplicate active page",
      detail: "Copy the current page and make it active",
      run: () => markDirty(editor.duplicateActivePage),
    },
    {
      id: "move-page-up",
      label: "Move page up",
      detail: "Move the active page earlier in the page list",
      disabled: getActivePageIndex(editor) <= 0,
      run: () =>
        markDirty(() => editor.reorderPage(editor.document.activePageId, "up")),
    },
    {
      id: "move-page-down",
      label: "Move page down",
      detail: "Move the active page later in the page list",
      disabled:
        getActivePageIndex(editor) < 0 ||
        getActivePageIndex(editor) >= editor.pages.length - 1,
      run: () =>
        markDirty(() => editor.reorderPage(editor.document.activePageId, "down")),
    },
    ...editor.pages.map((page) => ({
      id: `switch-page-${page.id}`,
      label: `Switch to ${page.name}`,
      detail: `${page.layers.length} layers`,
      disabled: page.id === editor.document.activePageId,
      run: () => markDirty(() => editor.setActivePage(page.id)),
    })),
    {
      id: "select-all-layers",
      label: "Select all layers",
      detail: "Select every layer on the active page",
      shortcut: "Ctrl A",
      disabled: editor.activePage.layers.length === 0,
      run: editor.selectAllLayers,
    },
    {
      id: "clear-selection",
      label: "Clear selection",
      detail: "Deselect every selected layer",
      shortcut: "Esc",
      disabled: editor.selectedLayerIds.length === 0,
      run: editor.clearSelection,
    },
    {
      id: "select-inverse",
      label: "Select inverse",
      detail: "Select visible layers outside the current selection",
      disabled:
        editor.selectedLayerIds.length === 0 ||
        !editor.activePage.layers.some(
          (layer) =>
            layer.visible && !editor.selectedLayerIds.includes(layer.id),
        ),
      run: () => selectInverseVisibleLayers(editor),
    },
    ...layerStateCommands.map((command) => ({
      id: command.id,
      label: command.label,
      detail: command.detail,
      disabled: !editor.activePage.layers.some(command.matches),
      run: () => selectLayersWhere(editor, command.matches),
    })),
    {
      id: "select-next-layer",
      label: "Select next layer",
      detail: "Cycle to the next visible layer on the active page",
      shortcut: "Tab",
      disabled: !editor.activePage.layers.some((layer) => layer.visible),
      run: () => editor.selectAdjacentLayer("next"),
    },
    {
      id: "select-previous-layer",
      label: "Select previous layer",
      detail: "Cycle to the previous visible layer on the active page",
      shortcut: "Shift Tab",
      disabled: !editor.activePage.layers.some((layer) => layer.visible),
      run: () => editor.selectAdjacentLayer("previous"),
    },
    {
      id: "select-back-layer",
      label: "Select back layer",
      detail: "Jump to the backmost visible layer on the active page",
      shortcut: "Home",
      disabled: !editor.activePage.layers.some((layer) => layer.visible),
      run: () => editor.selectEdgeLayer("back"),
    },
    {
      id: "select-front-layer",
      label: "Select front layer",
      detail: "Jump to the frontmost visible layer on the active page",
      shortcut: "End",
      disabled: !editor.activePage.layers.some((layer) => layer.visible),
      run: () => editor.selectEdgeLayer("front"),
    },
    {
      id: "select-same-type",
      label: "Select same type",
      detail: "Select visible layers with the same layer type",
      disabled: !editor.selectedLayer,
      run: () =>
        selectLayersMatching(editor, (layer, selectedLayer) =>
          layer.visible && layer.type === selectedLayer.type,
        ),
    },
    {
      id: "select-same-fill",
      label: "Select same fill",
      detail: "Select visible layers with the same fill paint",
      disabled: !editor.selectedLayer,
      run: () =>
        selectLayersMatching(editor, (layer, selectedLayer) =>
          layer.visible && layer.fill === selectedLayer.fill,
        ),
    },
    {
      id: "select-same-stroke",
      label: "Select same stroke",
      detail: "Select visible layers with the same stroke paint",
      disabled: !editor.selectedLayer,
      run: () =>
        selectLayersMatching(editor, (layer, selectedLayer) =>
          layer.visible && layer.stroke === selectedLayer.stroke,
        ),
    },
    {
      id: "select-same-blend-mode",
      label: "Select same blend mode",
      detail: "Select visible layers with the same blend mode",
      disabled: !editor.selectedLayer,
      run: () =>
        selectLayersMatching(editor, (layer, selectedLayer) =>
          layer.visible &&
          (layer.blendMode ?? "normal") ===
            (selectedLayer.blendMode ?? "normal"),
        ),
    },
    {
      id: "select-same-font",
      label: "Select same font",
      detail: "Select visible text layers with the same font family",
      disabled: !editor.selectedLayer || editor.selectedLayer.text === undefined,
      run: () =>
        selectLayersMatching(editor, (layer, selectedLayer) =>
          layer.visible &&
          layer.text !== undefined &&
          (layer.fontFamily ?? "Inter, Arial, sans-serif") ===
            (selectedLayer.fontFamily ?? "Inter, Arial, sans-serif"),
        ),
    },
    {
      id: "select-same-image-fit",
      label: "Select same image fit",
      detail: "Select visible image layers with the same fit mode",
      disabled: !editor.selectedLayer || editor.selectedLayer.type !== "image",
      run: () =>
        selectLayersMatching(editor, (layer, selectedLayer) =>
          layer.visible &&
          layer.type === "image" &&
          (layer.imageFit ?? "cover") === (selectedLayer.imageFit ?? "cover"),
        ),
    },
    {
      id: "select-same-effects",
      label: "Select same effects",
      detail: "Select visible layers with matching shadow and blur settings",
      disabled: !editor.selectedLayer,
      run: () =>
        selectLayersMatching(editor, (layer, selectedLayer) =>
          layer.visible && getEffectSignature(layer) === getEffectSignature(selectedLayer),
        ),
    },
    ...layerTypeCommands.map((command) => ({
      ...command,
      disabled: !editor.activePage.layers.some(
        (layer) => layer.visible && layer.type === command.layerType,
      ),
      run: () => selectVisibleLayersByType(editor, command.layerType),
    })),
    {
      id: "frame-auto-layout-horizontal",
      label: "Set frame auto layout horizontal",
      detail: "Enable horizontal auto layout on the selected frame",
      disabled: !selectedFrame,
      run: () =>
        markDirty(() =>
          setSelectedFrameAutoLayout(editor, selectedFrame, "horizontal"),
        ),
    },
    {
      id: "frame-auto-layout-vertical",
      label: "Set frame auto layout vertical",
      detail: "Enable vertical auto layout on the selected frame",
      disabled: !selectedFrame,
      run: () =>
        markDirty(() =>
          setSelectedFrameAutoLayout(editor, selectedFrame, "vertical"),
        ),
    },
    {
      id: "frame-auto-layout-wrap-enable",
      label: "Enable frame auto layout wrap",
      detail: "Wrap auto-layout children onto additional rows or columns",
      disabled: !selectedFrame,
      run: () =>
        markDirty(() =>
          setSelectedFrameAutoLayoutWrap(editor, selectedFrame, "wrap"),
        ),
    },
    {
      id: "frame-auto-layout-wrap-disable",
      label: "Disable frame auto layout wrap",
      detail: "Keep auto-layout children in a single row or column",
      disabled: !selectedFrame?.autoLayout,
      run: () =>
        markDirty(() =>
          setSelectedFrameAutoLayoutWrap(editor, selectedFrame, "nowrap"),
        ),
    },
    {
      id: "frame-auto-layout-disable",
      label: "Disable frame auto layout",
      detail: "Remove auto-layout metadata from the selected frame",
      disabled: !selectedFrame?.autoLayout,
      run: () =>
        markDirty(() => {
          if (selectedFrame) {
            editor.updateLayer(selectedFrame.id, { autoLayout: undefined });
          }
        }),
    },
    {
      id: "frame-auto-layout-apply",
      label: "Apply selected frame auto layout",
      detail: `${selectedFrameAutoLayoutChildCount} contained children`,
      disabled: !selectedFrame?.autoLayout || selectedFrameAutoLayoutChildCount === 0,
      run: () =>
        markDirty(() => {
          if (!selectedFrame) {
            return;
          }

          const patches = createAutoLayoutLayerPatches(
            selectedFrame,
            editor.activePage.layers,
          );

          if (patches.length > 0) {
            editor.updateLayers(patches);
          }
        }),
    },
    {
      id: "frame-auto-layout-adopt-contained",
      label: "Adopt contained layers into frame",
      detail: `${selectedFrameAutoLayoutAdoptCount} contained layers`,
      disabled: !selectedFrame || selectedFrameAutoLayoutAdoptCount === 0,
      run: () =>
        markDirty(() => {
          if (!selectedFrame) {
            return;
          }

          editor.updateLayers(
            createAutoLayoutParentPatches(
              selectedFrame,
              editor.activePage.layers,
            ),
          );
        }),
    },
    {
      id: "frame-auto-layout-detach-selection",
      label: "Detach selection from parent frame",
      detail: "Remove selected layers from auto-layout parent ownership",
      disabled: !editor.selectedLayers.some((layer) => layer.parentId),
      run: () =>
        markDirty(() =>
          editor.updateLayers(
            editor.selectedLayers
              .filter((layer) => layer.parentId)
              .map((layer) => ({
                layerId: layer.id,
                patch: { parentId: undefined },
              })),
          ),
        ),
    },
    {
      id: "frame-auto-layout-toggle-absolute-child",
      label: "Toggle absolute position in parent frame",
      detail: "Keep selected frame children owned but out of auto layout",
      disabled: !editor.selectedLayers.some((layer) => layer.parentId),
      run: () =>
        markDirty(() => toggleSelectionAbsolutePositioning(editor)),
    },
    ...layoutSizingCommands.map((command) => ({
      id: `layout-sizing-${command.axis}-${command.mode}`,
      label: `Set ${command.axis} sizing ${command.mode}`,
      detail: "Apply sizing behavior to selected layers",
      disabled: editor.selectedLayerIds.length === 0,
      run: () =>
        markDirty(() =>
          updateSelectionLayoutSizing(editor, command.axis, command.mode),
        ),
    })),
    ...layoutGridPresetOptions.map((preset) => ({
      id: `frame-layout-grid-${preset.id}`,
      label: `Add ${preset.grid.name} layout grid`,
      detail: "Add a visible layout grid to the selected frame",
      disabled: !selectedFrame,
      run: () =>
        markDirty(() => {
          if (!selectedFrame) {
            return;
          }

          editor.updateLayer(selectedFrame.id, {
            layoutGrids: [
              ...(selectedFrame.layoutGrids ?? []),
              normalizeLayoutGrid({
                ...preset.grid,
                id: nanoid(),
                visible: true,
              }),
            ],
          });
        }),
    })),
    ...Object.values(editor.document.layoutGridStyles ?? {}).map((style) => ({
      id: `frame-layout-grid-style-${style.id}`,
      label: `Apply ${style.name} grid style`,
      detail: "Apply a saved grid style to the selected frame",
      disabled: !selectedFrame,
      run: () =>
        markDirty(() => {
          if (!selectedFrame) {
            return;
          }

          editor.updateLayer(selectedFrame.id, {
            layoutGrids: [
              ...(selectedFrame.layoutGrids ?? []),
              normalizeLayoutGrid({
                ...styleToGrid(style),
                id: nanoid(),
                name: style.name,
              }),
            ],
          });
        }),
    })),
    ...Object.values(editor.document.layoutPresetStyles ?? {}).map((style) => ({
      id: `frame-layout-preset-style-${style.id}`,
      label: `Apply ${style.name} layout preset`,
      detail: "Apply saved auto-layout and sizing to the selected frame",
      disabled: !selectedFrame,
      run: () =>
        markDirty(() => {
          if (!selectedFrame) {
            return;
          }

          editor.updateLayer(
            selectedFrame.id,
            getLayoutPresetLayerPatch(style),
          );
        }),
    })),
    ...Object.values(editor.document.paintStyles ?? {}).map((style) => ({
      id: `paint-style-${style.id}`,
      label: `Apply ${style.name} paint style`,
      detail: "Apply a saved paint style to selected layers",
      disabled: editor.selectedLayerIds.length === 0,
      run: () =>
        markDirty(() => {
          editor.updateLayers(
            editor.selectedLayers.map((layer) => ({
              layerId: layer.id,
              patch: getPrimaryFillPaintPatch(layer, {
                value: style.value,
                blendMode: style.blendMode,
              }),
            })),
          );
        }),
    })),
    ...Object.values(editor.document.textStyles ?? {}).map((style) => ({
      id: `text-style-${style.id}`,
      label: `Apply ${style.name} text style`,
      detail: "Apply a saved text style to selected text layers",
      disabled: selectedTextLayers.length === 0,
      run: () =>
        markDirty(() =>
          updateSelectedTextState(editor, getTextStyleLayerPatch(style)),
        ),
    })),
    ...Object.values(editor.document.effectStyles ?? {}).map((style) => ({
      id: `effect-style-${style.id}`,
      label: `Apply ${style.name} effect style`,
      detail: "Apply a saved effect style to selected layers",
      disabled: editor.selectedLayerIds.length === 0,
      run: () =>
        markDirty(() =>
          updateSelectionState(editor, getEffectStyleLayerPatch(style)),
        ),
    })),
    {
      id: "frame-layout-grids-toggle",
      label: selectedFrame?.layoutGrids?.some((grid) => grid.visible)
        ? "Hide frame layout grids"
        : "Show frame layout grids",
      detail: "Toggle layout grid visibility on the selected frame",
      disabled: !selectedFrame?.layoutGrids?.length,
      run: () =>
        markDirty(() => {
          if (!selectedFrame?.layoutGrids?.length) {
            return;
          }

          const shouldShow = !selectedFrame.layoutGrids.some(
            (grid) => grid.visible,
          );

          editor.updateLayer(selectedFrame.id, {
            layoutGrids: selectedFrame.layoutGrids.map((grid) => ({
              ...grid,
              visible: shouldShow,
            })),
          });
        }),
    },
    ...toolCommands.map((command) => ({
      ...command,
      shortcut: toolShortcuts[command.tool].toUpperCase(),
      run: () => setTool(command.tool),
    })),
    ...editor.components.map((component) => ({
      id: `insert-component-${component.id}`,
      label: `Insert ${component.name}`,
      detail: `${component.layers.length} layers / ${component.width} x ${component.height}`,
      run: () => insertComponent(component.id),
    })),
    ...editor.components.flatMap((component) =>
      (component.variants ?? []).map((variant) => ({
        id: `insert-component-${component.id}-${variant.id}`,
        label: `Insert ${component.name} / ${variant.name}`,
        detail: `${variant.layers.length} layers / ${variant.width} x ${variant.height}`,
        run: () => insertComponent(component.id, variant.id),
      })),
    ),
    ...editor.components.map((component) => ({
      id: `create-component-variant-${component.id}`,
      label: `Create variant for ${component.name}`,
      detail: "Save selected layers as a component variant",
      disabled: editor.selectedLayerIds.length === 0,
      run: () =>
        markDirty(() => editor.createComponentVariantFromSelection(component.id)),
    })),
    ...editor.components.flatMap((component) =>
      (component.variants ?? []).map((variant) => ({
        id: `switch-instance-${component.id}-${variant.id}`,
        label: `Switch instance to ${component.name} / ${variant.name}`,
        detail: "Apply a saved component variant to the selected instance",
        disabled: editor.selectedLayer?.componentId !== component.id,
        run: () => {
          const layerId = editor.selectedLayer?.id;

          if (layerId) {
            markDirty(() =>
              editor.switchComponentInstanceVariant(layerId, variant.id),
            );
          }
        },
      })),
    ),
    {
      id: "create-component",
      label: "Create component",
      detail: "Save selected layers as a reusable asset",
      disabled: editor.selectedLayerIds.length === 0,
      run: () => markDirty(editor.createComponentFromSelection),
    },
    {
      id: "reset-component-instance",
      label: "Reset component instance",
      detail: "Restore selected instance properties from its source",
      disabled: !editor.selectedLayer?.componentId,
      run: () => {
        const layerId = editor.selectedLayer?.id;

        if (layerId) {
          markDirty(() => editor.resetComponentInstance(layerId));
        }
      },
    },
    {
      id: "detach-component-instance",
      label: "Detach component instance",
      detail: "Remove selected instance link while keeping its layers",
      disabled: !editor.selectedLayer?.componentId,
      run: () => {
        const layerId = editor.selectedLayer?.id;

        if (layerId) {
          markDirty(() => editor.detachComponentInstance(layerId));
        }
      },
    },
    {
      id: "group",
      label: "Group selection",
      detail: "Group selected layers",
      shortcut: "Ctrl G",
      disabled: editor.selectedLayerIds.length < 2,
      run: () => markDirty(editor.groupSelectedLayers),
    },
    {
      id: "ungroup",
      label: "Ungroup selection",
      detail: "Ungroup selected layers",
      shortcut: "Ctrl Shift G",
      disabled: !editor.selectedLayers.some((layer) => layer.groupId),
      run: () => markDirty(editor.ungroupSelectedLayers),
    },
    {
      id: "duplicate",
      label: "Duplicate selection",
      detail: "Duplicate selected layers",
      shortcut: "Ctrl D",
      disabled: editor.selectedLayerIds.length === 0,
      run: () => markDirty(editor.duplicateSelectedLayer),
    },
    {
      id: "convert-selection-to-path",
      label: "Convert to editable path",
      detail: "Convert selected rectangles, ellipses, and vectors to path layers",
      disabled: selectedVectorizableLayers.length === 0,
      run: () =>
        markDirty(() => {
          const replacements = selectedVectorizableLayers.flatMap((layer) => {
            const pathLayer = createEditablePathLayer(layer);
            return pathLayer ? [pathLayer] : [];
          });

          editor.replaceLayers(
            selectedVectorizableLayers.map((layer) => layer.id),
            replacements,
          );
        }),
    },
    {
      id: "outline-selection-stroke",
      label: "Outline stroke",
      detail: "Convert selected rectangle and ellipse strokes into filled vector outlines",
      disabled: selectedOutlineableLayers.length === 0,
      run: () =>
        markDirty(() => {
          const replacements = selectedOutlineableLayers.flatMap((layer) => {
            const outlineLayer = createOutlinedStrokeLayer(layer);
            return outlineLayer ? [outlineLayer] : [];
          });

          editor.replaceLayers(
            selectedOutlineableLayers.map((layer) => layer.id),
            replacements,
          );
        }),
    },
    {
      id: "normalize-vector-paths",
      label: "Normalize vector paths",
      detail: "Rewrite selected path coordinates into each layer bounds",
      disabled: selectedTransformablePathLayers.length === 0,
      run: () =>
        markDirty(() =>
          updateSelectedPathTransform(
            editor,
            selectedTransformablePathLayers,
            createNormalizedPathPatch,
          ),
        ),
    },
    {
      id: "flip-vector-paths-horizontal",
      label: "Flip vector paths horizontally",
      detail: "Mirror selected paths inside their layer bounds",
      disabled: selectedTransformablePathLayers.length === 0,
      run: () =>
        markDirty(() =>
          updateSelectedPathTransform(
            editor,
            selectedTransformablePathLayers,
            (layer) => createFlippedPathPatch(layer, "horizontal"),
          ),
        ),
    },
    {
      id: "flip-vector-paths-vertical",
      label: "Flip vector paths vertically",
      detail: "Mirror selected paths inside their layer bounds",
      disabled: selectedTransformablePathLayers.length === 0,
      run: () =>
        markDirty(() =>
          updateSelectedPathTransform(
            editor,
            selectedTransformablePathLayers,
            (layer) => createFlippedPathPatch(layer, "vertical"),
          ),
        ),
    },
    {
      id: "snap-vector-path-nodes",
      label: "Snap vector path nodes",
      detail: "Round selected path anchors and handles to whole pixels",
      disabled: selectedTransformablePathLayers.length === 0,
      run: () =>
        markDirty(() =>
          updateSelectedPathTransform(
            editor,
            selectedTransformablePathLayers,
            createSnappedVectorPathPatch,
          ),
        ),
    },
    {
      id: "close-vector-paths",
      label: "Close vector paths",
      detail: "Add a closing segment to selected open vector paths",
      disabled: selectedTransformablePathLayers.length === 0,
      run: () =>
        markDirty(() =>
          updateSelectedPathTransform(
            editor,
            selectedTransformablePathLayers,
            createClosedVectorPathPatch,
          ),
        ),
    },
    {
      id: "open-vector-paths",
      label: "Open vector paths",
      detail: "Remove the trailing close command from selected vector paths",
      disabled: selectedTransformablePathLayers.length === 0,
      run: () =>
        markDirty(() =>
          updateSelectedPathTransform(
            editor,
            selectedTransformablePathLayers,
            createOpenVectorPathPatch,
          ),
        ),
    },
    {
      id: "create-connector",
      label: "Create connector",
      detail: "Draw an editable connector between two selected layers",
      disabled: !canCreateConnector(editor.selectedLayers),
      run: () =>
        markDirty(() => {
          const connector = createConnectorLayer(editor.selectedLayers);

          if (connector) {
            editor.addLayer(connector);
          }
        }),
    },
    ...stampOptions.map((stamp) => ({
      id: `insert-stamp-${stamp.value}`,
      label: `Insert ${stamp.label} stamp`,
      detail: "Add an editable FigJam-style decision marker near the selection",
      run: () =>
        markDirty(() =>
          editor.addLayer(
            createStampLayer(
              stamp.value,
              editor.selectedLayers,
              editor.activePage.layers,
            ),
          ),
        ),
    })),
    ...inkPresetOptions.map((preset) => ({
      id: `insert-ink-${preset.value}`,
      label: `Insert ${preset.label} stroke`,
      detail: "Add an editable FigJam-style annotation stroke near the selection",
      run: () =>
        markDirty(() =>
          editor.addLayer(
            createInkPresetLayer(
              preset.value,
              editor.selectedLayers,
              editor.activePage.layers,
            ),
          ),
        ),
    })),
    ...inkPresetOptions.map((preset) => ({
      id: `apply-ink-${preset.value}`,
      label: `Apply ${preset.label} preset`,
      detail: "Convert selected path layers to marker or highlighter styling",
      disabled: selectedPathLayers.length === 0,
      run: () =>
        markDirty(() =>
          editor.updateLayers(
            selectedPathLayers.map((layer) => ({
              layerId: layer.id,
              patch: getInkPresetLayerPatch(preset.value),
            })),
          ),
        ),
    })),
    ...createVectorBooleanCommands(
      editor,
      markDirty,
      selectedVectorizableLayers,
    ),
    {
      id: "delete",
      label: "Delete selection",
      detail: "Remove selected layers",
      disabled: editor.selectedLayerIds.length === 0,
      run: () => markDirty(editor.deleteSelectedLayer),
    },
    {
      id: "hide-selection",
      label: "Hide selection",
      detail: "Make selected layers invisible",
      disabled: editor.selectedLayerIds.length === 0,
      run: () => markDirty(() => updateSelectionState(editor, { visible: false })),
    },
    {
      id: "show-selection",
      label: "Show selection",
      detail: "Make selected layers visible",
      disabled: editor.selectedLayerIds.length === 0,
      run: () => markDirty(() => updateSelectionState(editor, { visible: true })),
    },
    {
      id: "lock-selection",
      label: "Lock selection",
      detail: "Prevent selected layers from moving on the canvas",
      disabled: editor.selectedLayerIds.length === 0,
      run: () => markDirty(() => updateSelectionState(editor, { locked: true })),
    },
    {
      id: "unlock-selection",
      label: "Unlock selection",
      detail: "Allow selected layers to move on the canvas",
      disabled: editor.selectedLayerIds.length === 0,
      run: () => markDirty(() => updateSelectionState(editor, { locked: false })),
    },
    {
      id: "mark-selection-ready-for-dev",
      label: "Mark selection ready for dev",
      detail: "Mark selected layers as ready for engineering handoff",
      disabled:
        editor.selectedLayerIds.length === 0 ||
        editor.selectedLayers.every((layer) => layer.readyForDev),
      run: () =>
        markDirty(() => updateSelectionState(editor, { readyForDev: true })),
    },
    {
      id: "clear-selection-ready-for-dev",
      label: "Clear ready for dev",
      detail: "Remove ready-for-dev status from selected layers",
      disabled:
        editor.selectedLayerIds.length === 0 ||
        editor.selectedLayers.every((layer) => !layer.readyForDev),
      run: () =>
        markDirty(() => updateSelectionState(editor, { readyForDev: false })),
    },
    {
      id: "clip-selection",
      label: "Clip selection content",
      detail: "Clip selected layers to their bounds",
      disabled:
        editor.selectedLayerIds.length === 0 ||
        editor.selectedLayers.every((layer) => layer.clipContent),
      run: () => markDirty(() => updateSelectionState(editor, { clipContent: true })),
    },
    {
      id: "unclip-selection",
      label: "Unclip selection content",
      detail: "Allow selected layers to draw beyond their bounds",
      disabled:
        editor.selectedLayerIds.length === 0 ||
        editor.selectedLayers.every((layer) => !layer.clipContent),
      run: () => markDirty(() => updateSelectionState(editor, { clipContent: false })),
    },
    {
      id: "use-front-layer-as-mask",
      label: "Use front layer as mask",
      detail: "Clip selected layers with the frontmost selected layer",
      disabled: !maskSourceLayer || maskTargetLayers.length === 0,
      run: () =>
        markDirty(() => {
          if (!maskSourceLayer) {
            return;
          }

          const maskPatches = maskTargetLayers.flatMap((layer) => {
            const mask = createLayerMask(maskSourceLayer, layer);

            return mask ? [{ layerId: layer.id, patch: { mask } }] : [];
          });

          editor.updateLayers([
            ...maskPatches,
            {
              layerId: maskSourceLayer.id,
              patch: {
                maskSource: true,
                visible: false,
                locked: true,
              },
            },
          ]);
        }),
    },
    {
      id: "release-layer-masks",
      label: "Release masks",
      detail: "Remove mask clipping from selected layers",
      disabled: selectedMaskedLayers.length === 0,
      run: () =>
        markDirty(() =>
          editor.updateLayers(
            selectedMaskedLayers.map((layer) => ({
              layerId: layer.id,
              patch: layer.maskSource
                ? { mask: undefined, maskSource: false, visible: true }
                : { mask: undefined },
            })),
          ),
        ),
    },
    {
      id: "fit-layer-masks",
      label: "Fit masks to layers",
      detail: "Resize selected rectangle and ellipse masks to their layer bounds",
      disabled: selectedEditableMaskLayers.length === 0,
      run: () =>
        markDirty(() =>
          editor.updateLayers(
            selectedEditableMaskLayers.flatMap((layer) => {
              const mask = fitLayerMaskToLayer(layer);

              return mask ? [{ layerId: layer.id, patch: { mask } }] : [];
            }),
          ),
        ),
    },
    {
      id: "center-layer-masks",
      label: "Center masks in layers",
      detail: "Move selected rectangle and ellipse masks to the center of their layers",
      disabled: selectedEditableMaskLayers.length === 0,
      run: () =>
        markDirty(() =>
          editor.updateLayers(
            selectedEditableMaskLayers.flatMap((layer) => {
              const mask = centerLayerMask(layer);

              return mask ? [{ layerId: layer.id, patch: { mask } }] : [];
            }),
          ),
        ),
    },
    {
      id: "hide-unselected-layers",
      label: "Hide unselected layers",
      detail: "Hide every visible layer outside the current selection",
      disabled:
        editor.selectedLayerIds.length === 0 ||
        !editor.activePage.layers.some(
          (layer) =>
            layer.visible && !editor.selectedLayerIds.includes(layer.id),
        ),
      run: () =>
        markDirty(() =>
          updateLayersMatching(
            editor,
            (layer) =>
              layer.visible && !editor.selectedLayerIds.includes(layer.id),
            { visible: false },
          ),
        ),
    },
    {
      id: "lock-unselected-layers",
      label: "Lock unselected layers",
      detail: "Lock every unlocked layer outside the current selection",
      disabled:
        editor.selectedLayerIds.length === 0 ||
        !editor.activePage.layers.some(
          (layer) =>
            !layer.locked && !editor.selectedLayerIds.includes(layer.id),
        ),
      run: () =>
        markDirty(() =>
          updateLayersMatching(
            editor,
            (layer) =>
              !layer.locked && !editor.selectedLayerIds.includes(layer.id),
            { locked: true },
          ),
        ),
    },
    {
      id: "show-all-layers",
      label: "Show all layers",
      detail: "Reveal all hidden layers on the active page",
      disabled: !editor.activePage.layers.some((layer) => !layer.visible),
      run: () =>
        markDirty(() =>
          updateLayersMatching(editor, (layer) => !layer.visible, {
            visible: true,
          }),
        ),
    },
    {
      id: "unlock-all-layers",
      label: "Unlock all layers",
      detail: "Unlock all locked layers on the active page",
      disabled: !editor.activePage.layers.some((layer) => layer.locked),
      run: () =>
        markDirty(() =>
          updateLayersMatching(editor, (layer) => layer.locked, {
            locked: false,
          }),
        ),
    },
    {
      id: "reset-selection-rotation",
      label: "Reset selection rotation",
      detail: "Set selected layers back to 0 degrees",
      disabled:
        editor.selectedLayerIds.length === 0 ||
        editor.selectedLayers.every((layer) => layer.rotation === 0),
      run: () => markDirty(() => updateSelectionState(editor, { rotation: 0 })),
    },
    {
      id: "reset-selection-opacity",
      label: "Reset selection opacity",
      detail: "Set selected layers back to 100% opacity",
      disabled:
        editor.selectedLayerIds.length === 0 ||
        editor.selectedLayers.every((layer) => layer.opacity === 1),
      run: () => markDirty(() => updateSelectionState(editor, { opacity: 1 })),
    },
    ...strokeStyleCommands.map((command) => ({
      id: command.id,
      label: command.label,
      detail: command.detail,
      disabled:
        editor.selectedLayerIds.length === 0 ||
        editor.selectedLayers.every(command.matches),
      run: () => markDirty(() => updateSelectionState(editor, command.patch)),
    })),
    ...effectStyleCommands.map((command) => ({
      id: command.id,
      label: command.label,
      detail: command.detail,
      disabled:
        editor.selectedLayerIds.length === 0 ||
        editor.selectedLayers.every(command.matches),
      run: () => markDirty(() => updateSelectionState(editor, command.patch)),
    })),
    ...textStyleCommands.map((command) => ({
      id: command.id,
      label: command.label,
      detail: command.detail,
      disabled:
        selectedTextLayers.length === 0 ||
        selectedTextLayers.every(command.matches),
      run: () => markDirty(() => updateSelectedTextState(editor, command.patch)),
    })),
    ...textResizeModeCommands.map((command) => ({
      id: command.id,
      label: command.label,
      detail: command.detail,
      disabled:
        selectedTextLayers.length === 0 ||
        selectedTextLayers.every(command.matches),
      run: () =>
        markDirty(() =>
          editor.updateLayers(
            getTextLayerResizeModePatches(selectedTextLayers, command.mode),
          ),
        ),
    })),
    ...imageFitCommands.map((command) => ({
      id: command.id,
      label: command.label,
      detail: command.detail,
      disabled:
        selectedImageLayers.length === 0 ||
        selectedImageLayers.every(command.matches),
      run: () => markDirty(() => updateSelectedImageState(editor, command.patch)),
    })),
    {
      id: "bring-to-front",
      label: "Bring to front",
      detail: "Move selected layer to the front",
      shortcut: "Ctrl Shift ]",
      disabled: editor.selectedLayerIds.length === 0,
      run: () => markDirty(() => editor.reorderSelectedLayer("front")),
    },
    {
      id: "bring-forward",
      label: "Bring forward",
      detail: "Move selected layer forward",
      shortcut: "Ctrl ]",
      disabled: editor.selectedLayerIds.length === 0,
      run: () => markDirty(() => editor.reorderSelectedLayer("forward")),
    },
    {
      id: "send-backward",
      label: "Send backward",
      detail: "Move selected layer backward",
      shortcut: "Ctrl [",
      disabled: editor.selectedLayerIds.length === 0,
      run: () => markDirty(() => editor.reorderSelectedLayer("backward")),
    },
    {
      id: "send-to-back",
      label: "Send to back",
      detail: "Move selected layer to the back",
      shortcut: "Ctrl Shift [",
      disabled: editor.selectedLayerIds.length === 0,
      run: () => markDirty(() => editor.reorderSelectedLayer("back")),
    },
    ...alignmentCommands.map((command) => ({
      ...command,
      disabled: editor.selectedLayerIds.length < 2,
      run: () => markDirty(() => editor.alignSelectedLayers(command.alignment)),
    })),
    ...distributionCommands.map((command) => ({
      ...command,
      disabled: editor.selectedLayerIds.length < 3,
      run: () =>
        markDirty(() => editor.distributeSelectedLayers(command.distribution)),
    })),
    ...tidySelectionCommands.map((command) => ({
      id: command.id,
      label: command.label,
      detail: command.detail,
      disabled:
        editor.selectedLayers.filter((layer) => !layer.locked).length <
        command.minLayers,
      run: () =>
        markDirty(() =>
          editor.updateLayers(
            getTidySelectionPatches(editor.selectedLayers, command.mode),
          ),
        ),
    })),
  ];
}

function getActivePageIndex(editor: EditorController) {
  return editor.pages.findIndex((page) => page.id === editor.document.activePageId);
}

function getPageGrid(page: EditorController["activePage"]) {
  return {
    visible: page.grid?.visible ?? true,
    snap: page.grid?.snap ?? false,
    objectSnap: page.grid?.objectSnap ?? true,
    size: Math.max(4, page.grid?.size ?? 24),
  };
}

function updateSelectionState(
  editor: EditorController,
  patch: SelectionStatePatch,
) {
  editor.updateLayers(
    editor.selectedLayerIds.map((layerId) => ({
      layerId,
      patch,
    })),
  );
}

function updateSelectedTextState(
  editor: EditorController,
  patch: TextStatePatch,
) {
  editor.updateLayers(
    editor.selectedLayers
      .filter((layer) => layer.text !== undefined)
      .map((layer) => ({
        layerId: layer.id,
        patch: getTextLayerTypographyPatch(layer, patch),
      })),
  );
}

function updateSelectedImageState(
  editor: EditorController,
  patch: SelectionStatePatch,
) {
  editor.updateLayers(
    editor.selectedLayers
      .filter((layer) => layer.type === "image")
      .map((layer) => ({
        layerId: layer.id,
        patch,
      })),
  );
}

function updateSelectedPathTransform(
  editor: EditorController,
  layers: DesignLayer[],
  createPatch: (layer: DesignLayer) => Partial<DesignLayer> | null,
) {
  const patches = layers.flatMap((layer) => {
    const patch = createPatch(layer);

    return patch
      ? [
          {
            layerId: layer.id,
            patch,
          },
        ]
      : [];
  });

  if (patches.length > 0) {
    editor.updateLayers(patches);
  }
}

function createVectorBooleanCommands(
  editor: EditorController,
  markDirty: (action: () => void) => void,
  selectedVectorizableLayers: DesignLayer[],
): CommandPaletteCommand[] {
  const operations = [
    {
      operation: "union",
      label: "Union selection",
      detail: "Merge selected vectorizable layers into one compound path",
    },
    {
      operation: "subtract",
      label: "Subtract selection",
      detail: "Use the first selected layer as the base and cut following paths with even-odd fill",
    },
    {
      operation: "intersect",
      label: "Intersect selection",
      detail: "Create a vector from the overlapping selected bounds",
    },
    {
      operation: "exclude",
      label: "Exclude selection",
      detail: "Create an even-odd compound path from selected layers",
    },
  ] satisfies Array<{
    operation: VectorBooleanOperation;
    label: string;
    detail: string;
  }>;

  const previewLayerIds = getBooleanPreviewLayerIds(editor.activePage.layers);

  return [
    ...operations.flatMap(({ operation, label, detail }) => [
      {
        id: `vector-preview-${operation}`,
        label: `Preview ${vectorBooleanOperationLabels[operation]}`,
        detail: `${detail} without replacing source layers`,
        disabled: selectedVectorizableLayers.length < 2,
        run: () =>
          markDirty(() =>
            previewBooleanOperation(editor, selectedVectorizableLayers, operation),
          ),
      },
      {
        id: `vector-${operation}`,
        label: `Apply ${label.toLowerCase()}`,
        detail: `${detail} and remove any active boolean preview`,
        disabled: selectedVectorizableLayers.length < 2,
        run: () =>
          markDirty(() =>
            applyBooleanOperation(editor, selectedVectorizableLayers, operation),
          ),
      },
    ]),
    {
      id: "vector-clear-boolean-preview",
      label: "Clear boolean preview",
      detail: "Remove locked boolean preview layers from the active page",
      disabled: previewLayerIds.length === 0,
      run: () =>
        markDirty(() => {
          editor.deleteLayers(previewLayerIds);
        }),
    },
  ];
}

function getBooleanPreviewLayerIds(layers: DesignLayer[]) {
  return layers.filter(isBooleanPreviewLayer).map((layer) => layer.id);
}

function createBooleanPreviewLayer(
  layers: DesignLayer[],
  operation: VectorBooleanOperation,
) {
  const layer = createBooleanVectorLayer(layers, operation);

  if (!layer) {
    return null;
  }

  return {
    ...layer,
    name: `${booleanPreviewLayerNamePrefix} ${vectorBooleanOperationLabels[operation]}`,
    opacity: Math.min(0.58, layer.opacity),
    visible: true,
    locked: true,
    readyForDev: false,
    stroke: "#2563eb",
    strokeWidth: Math.max(1, layer.strokeWidth),
    strokeDash: "6 4",
  } satisfies DesignLayer;
}

function previewBooleanOperation(
  editor: EditorController,
  sourceLayers: DesignLayer[],
  operation: VectorBooleanOperation,
) {
  const previewLayer = createBooleanPreviewLayer(sourceLayers, operation);

  if (!previewLayer) {
    return;
  }

  const sourceLayerIds = sourceLayers.map((layer) => layer.id);
  const previewLayerIds = getBooleanPreviewLayerIds(editor.activePage.layers);

  if (previewLayerIds.length > 0) {
    editor.replaceLayers(previewLayerIds, [previewLayer]);
  } else {
    editor.addLayer(previewLayer);
  }

  editor.setSelectedLayerIds(sourceLayerIds);
}

function applyBooleanOperation(
  editor: EditorController,
  sourceLayers: DesignLayer[],
  operation: VectorBooleanOperation,
) {
  const layer = createBooleanVectorLayer(sourceLayers, operation);

  if (!layer) {
    return;
  }

  editor.replaceLayers(
    uniqueLayerIds([
      ...sourceLayers.map((item) => item.id),
      ...getBooleanPreviewLayerIds(editor.activePage.layers),
    ]),
    [layer],
  );
}

function uniqueLayerIds(layerIds: string[]) {
  return Array.from(new Set(layerIds));
}

function selectLayersMatching(
  editor: EditorController,
  predicate: (layer: DesignLayer, selectedLayer: DesignLayer) => boolean,
) {
  const selectedLayer = editor.selectedLayer;

  if (!selectedLayer) {
    return;
  }

  editor.setSelectedLayerIds(
    editor.activePage.layers
      .filter((layer) => predicate(layer, selectedLayer))
      .map((layer) => layer.id),
  );
}

function selectVisibleLayersByType(editor: EditorController, layerType: LayerType) {
  editor.setSelectedLayerIds(
    editor.activePage.layers
      .filter((layer) => layer.visible && layer.type === layerType)
      .map((layer) => layer.id),
  );
}

function setSelectedFrameAutoLayout(
  editor: EditorController,
  frame: DesignLayer | null,
  mode: "horizontal" | "vertical",
) {
  if (!frame) {
    return;
  }

  editor.updateLayer(frame.id, {
    autoLayout: {
      ...defaultAutoLayout,
      ...frame.autoLayout,
      mode,
    },
  });
}

function setSelectedFrameAutoLayoutWrap(
  editor: EditorController,
  frame: DesignLayer | null,
  wrap: "nowrap" | "wrap",
) {
  if (!frame) {
    return;
  }

  editor.updateLayer(frame.id, {
    autoLayout: {
      ...defaultAutoLayout,
      ...frame.autoLayout,
      wrap,
    },
  });
}

function getEffectSignature(layer: DesignLayer) {
  return [
    layer.shadowEnabled ?? false,
    layer.shadowColor ?? "",
    layer.shadowX ?? 0,
    layer.shadowY ?? 12,
    layer.shadowBlur ?? 24,
    layer.shadowSpread ?? 0,
    layer.layerBlur ?? 0,
    layer.backgroundBlur ?? 0,
    layer.effectsVisible ?? true,
  ].join("|");
}

function selectLayersWhere(
  editor: EditorController,
  predicate: (layer: DesignLayer) => boolean,
) {
  editor.setSelectedLayerIds(
    editor.activePage.layers.filter(predicate).map((layer) => layer.id),
  );
}

function selectInverseVisibleLayers(editor: EditorController) {
  editor.setSelectedLayerIds(
    editor.activePage.layers
      .filter(
        (layer) =>
          layer.visible && !editor.selectedLayerIds.includes(layer.id),
      )
      .map((layer) => layer.id),
  );
}

function updateSelectionLayoutSizing(
  editor: EditorController,
  axis: "horizontal" | "vertical",
  mode: DesignLayoutSizingMode,
) {
  editor.updateLayers(
    editor.selectedLayers.map((layer) => {
      const nextSizing = {
        ...defaultLayoutSizing,
        ...layer.layoutSizing,
        [axis]: mode,
      };

      return {
        layerId: layer.id,
        patch: {
          layoutSizing:
            nextSizing.horizontal === "fixed" && nextSizing.vertical === "fixed"
              ? undefined
              : nextSizing,
        },
      };
    }),
  );
}

function toggleSelectionAbsolutePositioning(editor: EditorController) {
  const frameChildren = editor.selectedLayers.filter((layer) => layer.parentId);

  if (frameChildren.length === 0) {
    return;
  }

  const shouldEnable = frameChildren.some((layer) => !layer.absolutePositioned);

  editor.updateLayers(
    frameChildren.map((layer) => ({
      layerId: layer.id,
      patch: {
        absolutePositioned: shouldEnable ? true : undefined,
      },
    })),
  );
}

function updateLayersMatching(
  editor: EditorController,
  predicate: (layer: DesignLayer) => boolean,
  patch: Partial<Pick<DesignLayer, "visible" | "locked">>,
) {
  editor.updateLayers(
    editor.activePage.layers
      .filter(predicate)
      .map((layer) => ({
        layerId: layer.id,
        patch,
      })),
  );
}

function getTidySelectionPatches(
  layers: DesignLayer[],
  mode: "horizontal" | "vertical" | "grid",
) {
  const unlockedLayers = layers.filter((layer) => !layer.locked);

  if (unlockedLayers.length < 2) {
    return [];
  }

  if (mode === "horizontal") {
    const sortedLayers = sortLayersByPosition(unlockedLayers, "horizontal");
    const top = Math.min(...sortedLayers.map((layer) => layer.y));
    let nextX = Math.min(...sortedLayers.map((layer) => layer.x));

    return sortedLayers.map((layer) => {
      const patch = {
        layerId: layer.id,
        patch: { x: Math.round(nextX), y: Math.round(top) },
      };
      nextX += layer.width + TIDY_GAP;
      return patch;
    });
  }

  if (mode === "vertical") {
    const sortedLayers = sortLayersByPosition(unlockedLayers, "vertical");
    const left = Math.min(...sortedLayers.map((layer) => layer.x));
    let nextY = Math.min(...sortedLayers.map((layer) => layer.y));

    return sortedLayers.map((layer) => {
      const patch = {
        layerId: layer.id,
        patch: { x: Math.round(left), y: Math.round(nextY) },
      };
      nextY += layer.height + TIDY_GAP;
      return patch;
    });
  }

  return getGridTidyPatches(unlockedLayers);
}

function getGridTidyPatches(layers: DesignLayer[]) {
  const sortedLayers = sortLayersByPosition(layers, "grid");
  const columns = Math.max(1, Math.ceil(Math.sqrt(sortedLayers.length)));
  const startX = Math.min(...sortedLayers.map((layer) => layer.x));
  const startY = Math.min(...sortedLayers.map((layer) => layer.y));
  const cellWidth = Math.max(...sortedLayers.map((layer) => layer.width)) + TIDY_GAP;
  const cellHeight =
    Math.max(...sortedLayers.map((layer) => layer.height)) + TIDY_GAP;

  return sortedLayers.map((layer, index) => ({
    layerId: layer.id,
    patch: {
      x: Math.round(startX + (index % columns) * cellWidth),
      y: Math.round(startY + Math.floor(index / columns) * cellHeight),
    },
  }));
}

function sortLayersByPosition(
  layers: DesignLayer[],
  mode: "horizontal" | "vertical" | "grid",
) {
  return [...layers].sort((first, second) => {
    if (mode === "horizontal") {
      return first.x - second.x || first.y - second.y;
    }

    return first.y - second.y || first.x - second.x;
  });
}

const layerTypeCommands = [
  {
    id: "select-frames",
    label: "Select frames",
    detail: "Select every visible frame layer",
    layerType: "frame",
  },
  {
    id: "select-rectangles",
    label: "Select rectangles",
    detail: "Select every visible rectangle layer",
    layerType: "rectangle",
  },
  {
    id: "select-ellipses",
    label: "Select ellipses",
    detail: "Select every visible ellipse layer",
    layerType: "ellipse",
  },
  {
    id: "select-images",
    label: "Select images",
    detail: "Select every visible image layer",
    layerType: "image",
  },
  {
    id: "select-vectors",
    label: "Select vectors",
    detail: "Select every visible vector path layer",
    layerType: "path",
  },
  {
    id: "select-text",
    label: "Select text layers",
    detail: "Select every visible text layer",
    layerType: "text",
  },
  {
    id: "select-sticky-notes",
    label: "Select sticky notes",
    detail: "Select every visible sticky note layer",
    layerType: "sticky",
  },
] satisfies Array<{
  id: string;
  label: string;
  detail: string;
  layerType: LayerType;
}>;

const layoutSizingCommands = [
  { axis: "horizontal", mode: "fixed" },
  { axis: "horizontal", mode: "hug" },
  { axis: "horizontal", mode: "fill" },
  { axis: "vertical", mode: "fixed" },
  { axis: "vertical", mode: "hug" },
  { axis: "vertical", mode: "fill" },
] satisfies Array<{
  axis: "horizontal" | "vertical";
  mode: DesignLayoutSizingMode;
}>;

const layerStateCommands = [
  {
    id: "select-visible-layers",
    label: "Select visible layers",
    detail: "Select every visible layer on the active page",
    matches: (layer) => layer.visible,
  },
  {
    id: "select-hidden-layers",
    label: "Select hidden layers",
    detail: "Select every hidden layer on the active page",
    matches: (layer) => !layer.visible,
  },
  {
    id: "select-locked-layers",
    label: "Select locked layers",
    detail: "Select every locked layer on the active page",
    matches: (layer) => layer.locked,
  },
  {
    id: "select-unlocked-layers",
    label: "Select unlocked layers",
    detail: "Select every unlocked layer on the active page",
    matches: (layer) => !layer.locked,
  },
  {
    id: "select-ready-for-dev-layers",
    label: "Select ready for dev layers",
    detail: "Select every layer marked ready for engineering handoff",
    matches: (layer) => layer.readyForDev === true,
  },
  {
    id: "select-not-ready-for-dev-layers",
    label: "Select not ready for dev layers",
    detail: "Select layers not yet marked ready for engineering handoff",
    matches: (layer) => layer.readyForDev !== true,
  },
  {
    id: "select-clipped-layers",
    label: "Select clipped layers",
    detail: "Select every layer clipping its content",
    matches: (layer) => layer.clipContent === true,
  },
  {
    id: "select-unclipped-layers",
    label: "Select unclipped layers",
    detail: "Select every layer drawing outside its bounds",
    matches: (layer) => !layer.clipContent,
  },
] satisfies Array<{
  id: string;
  label: string;
  detail: string;
  matches: (layer: DesignLayer) => boolean;
}>;

const strokeStyleCommands = [
  {
    id: "stroke-solid",
    label: "Set solid stroke",
    detail: "Clear dash patterns from selected layers",
    patch: { strokeDash: undefined },
    matches: (layer) => !layer.strokeDash?.trim(),
  },
  {
    id: "stroke-dashed",
    label: "Set dashed stroke",
    detail: "Apply an 8 4 dash pattern to selected layers",
    patch: { strokeDash: "8 4" },
    matches: (layer) => layer.strokeDash === "8 4",
  },
  {
    id: "stroke-dotted",
    label: "Set dotted stroke",
    detail: "Apply a 1 5 dot pattern to selected layers",
    patch: { strokeDash: "1 5", strokeLineCap: "round" },
    matches: (layer) =>
      layer.strokeDash === "1 5" && layer.strokeLineCap === "round",
  },
  ...strokeLineCapOptions.map((option) => ({
    id: `stroke-cap-${option.value}`,
    label: `Set stroke cap: ${option.label}`,
    detail: `Apply ${option.label.toLowerCase()} caps to selected paths`,
    patch: { strokeLineCap: option.value },
    matches: (layer: DesignLayer) =>
      (layer.strokeLineCap ?? "butt") === option.value,
  })),
  ...strokeLineJoinOptions.map((option) => ({
    id: `stroke-join-${option.value}`,
    label: `Set stroke join: ${option.label}`,
    detail: `Apply ${option.label.toLowerCase()} joins to selected paths`,
    patch: { strokeLineJoin: option.value },
    matches: (layer: DesignLayer) =>
      (layer.strokeLineJoin ?? "miter") === option.value,
  })),
] satisfies Array<{
  id: string;
  label: string;
  detail: string;
  patch: SelectionStatePatch;
  matches: (layer: DesignLayer) => boolean;
}>;

const tidySelectionCommands = [
  {
    id: "tidy-selection-horizontal",
    label: "Tidy selection horizontally",
    detail: "Pack selected unlocked layers into a clean row with 24px gaps",
    mode: "horizontal",
    minLayers: 2,
  },
  {
    id: "tidy-selection-vertical",
    label: "Tidy selection vertically",
    detail: "Pack selected unlocked layers into a clean column with 24px gaps",
    mode: "vertical",
    minLayers: 2,
  },
  {
    id: "tidy-selection-grid",
    label: "Tidy selection into grid",
    detail: "Pack selected unlocked layers into a compact grid",
    mode: "grid",
    minLayers: 3,
  },
] satisfies Array<{
  id: string;
  label: string;
  detail: string;
  mode: "horizontal" | "vertical" | "grid";
  minLayers: number;
}>;

const TIDY_GAP = 24;

const imageFitCommands = imageFitOptions.map((option) => ({
  id: `image-fit-${option.value}`,
  label: `Set image fit: ${option.label}`,
  detail: `Apply ${option.label.toLowerCase()} fitting to selected image layers`,
  patch: { imageFit: option.value },
  matches: (layer: DesignLayer) => (layer.imageFit ?? "cover") === option.value,
})) satisfies Array<{
  id: string;
  label: string;
  detail: string;
  patch: SelectionStatePatch;
  matches: (layer: DesignLayer) => boolean;
}>;

const textStyleCommands = [
  ...textAlignOptions.map((option) => ({
    id: `text-align-${option.value}`,
    label: `Align text ${option.label.toLowerCase()}`,
    detail: `Set selected text layers to ${option.label.toLowerCase()} alignment`,
    patch: { textAlign: option.value },
    matches: (layer: DesignLayer) => (layer.textAlign ?? "left") === option.value,
  })),
  ...fontFamilyOptions.map((option) => ({
    id: `text-font-${option.label.toLowerCase().replace(/\s+/g, "-")}`,
    label: `Set font: ${option.label}`,
    detail: `Apply ${option.label} to selected text layers`,
    patch: { fontFamily: option.value },
    matches: (layer: DesignLayer) =>
      (layer.fontFamily ?? "Inter, Arial, sans-serif") === option.value,
  })),
  {
    id: "text-line-height-tight",
    label: "Set tight line height",
    detail: "Set selected text layers to 1.1 line height",
    patch: { lineHeight: 1.1 },
    matches: (layer) => layer.lineHeight === 1.1,
  },
  {
    id: "text-line-height-normal",
    label: "Set normal line height",
    detail: "Set selected text layers to 1.25 line height",
    patch: { lineHeight: 1.25 },
    matches: (layer) => (layer.lineHeight ?? 1.25) === 1.25,
  },
  {
    id: "text-tracking-reset",
    label: "Reset text tracking",
    detail: "Set selected text layers to 0px letter spacing",
    patch: { letterSpacing: 0 },
    matches: (layer) => (layer.letterSpacing ?? 0) === 0,
  },
  {
    id: "text-tracking-wide",
    label: "Set wide text tracking",
    detail: "Set selected text layers to 1px letter spacing",
    patch: { letterSpacing: 1 },
    matches: (layer) => layer.letterSpacing === 1,
  },
] satisfies Array<{
  id: string;
  label: string;
  detail: string;
  patch: TextStatePatch;
  matches: (layer: DesignLayer) => boolean;
}>;

const textResizeModeCommands = textResizeModeOptions.map((option) => ({
  id: `text-resize-${option.value}`,
  label: `Text resize: ${option.label}`,
  detail: `Set selected text layers to ${option.label.toLowerCase()} mode`,
  mode: option.value,
  matches: (layer: DesignLayer) =>
    (layer.textResizeMode ?? "fixed") === option.value,
})) satisfies Array<{
  id: string;
  label: string;
  detail: string;
  mode: DesignTextResizeMode;
  matches: (layer: DesignLayer) => boolean;
}>;

const effectStyleCommands = [
  {
    id: "effect-soft-shadow",
    label: "Apply soft shadow",
    detail: "Apply a soft drop shadow to selected layers",
    patch: {
      shadowEnabled: true,
      effectsVisible: true,
      shadowColor: "rgb(0 0 0 / 0.24)",
      shadowX: 0,
      shadowY: 12,
      shadowBlur: 24,
      shadowSpread: 0,
    },
    matches: (layer) =>
      layer.shadowEnabled === true &&
      layer.shadowX === 0 &&
      layer.shadowY === 12 &&
      layer.shadowBlur === 24 &&
      layer.shadowSpread === 0,
  },
  {
    id: "effect-tight-shadow",
    label: "Apply tight shadow",
    detail: "Apply a compact object shadow to selected layers",
    patch: {
      shadowEnabled: true,
      effectsVisible: true,
      shadowColor: "rgb(0 0 0 / 0.28)",
      shadowX: 0,
      shadowY: 4,
      shadowBlur: 10,
      shadowSpread: -2,
    },
    matches: (layer) =>
      layer.shadowEnabled === true &&
      layer.shadowX === 0 &&
      layer.shadowY === 4 &&
      layer.shadowBlur === 10 &&
      layer.shadowSpread === -2,
  },
  {
    id: "effect-layer-blur",
    label: "Apply layer blur",
    detail: "Set selected layers to 4px blur",
    patch: { effectsVisible: true, layerBlur: 4 },
    matches: (layer) => layer.layerBlur === 4,
  },
  {
    id: "effect-background-blur",
    label: "Apply background blur",
    detail: "Set selected layers to 12px background blur",
    patch: { effectsVisible: true, backgroundBlur: 12 },
    matches: (layer) => layer.backgroundBlur === 12,
  },
  {
    id: "effect-hide",
    label: "Hide layer effects",
    detail: "Disable rendering for selected layer effects without clearing values",
    patch: { effectsVisible: false },
    matches: (layer) => layer.effectsVisible === false,
  },
  {
    id: "effect-show",
    label: "Show layer effects",
    detail: "Enable rendering for selected layer effects",
    patch: { effectsVisible: true },
    matches: (layer) => layer.effectsVisible !== false,
  },
  {
    id: "effect-reset",
    label: "Reset layer effects",
    detail: "Clear shadow and blur from selected layers",
    patch: {
      shadowEnabled: false,
      shadowColor: undefined,
      shadowX: undefined,
      shadowY: undefined,
      shadowBlur: undefined,
      shadowSpread: undefined,
      layerBlur: undefined,
      backgroundBlur: undefined,
      effectsVisible: true,
    },
    matches: (layer) =>
      !layer.shadowEnabled && !layer.layerBlur && !layer.backgroundBlur,
  },
] satisfies Array<{
  id: string;
  label: string;
  detail: string;
  patch: SelectionStatePatch;
  matches: (layer: DesignLayer) => boolean;
}>;

const toolCommands = [
  {
    id: "tool-select",
    label: "Select tool",
    detail: "Switch to selection",
    shortcut: "V",
    tool: "select",
  },
  {
    id: "tool-hand",
    label: "Pan tool",
    detail: "Move around the canvas",
    shortcut: "H",
    tool: "hand",
  },
  {
    id: "tool-pen",
    label: "Pen tool",
    detail: "Create editable vector paths",
    shortcut: "P",
    tool: "pen",
  },
  {
    id: "tool-pencil",
    label: "Pencil tool",
    detail: "Draw refined freehand vector paths",
    shortcut: "B",
    tool: "pencil",
  },
  {
    id: "tool-cutter",
    label: "Cutter tool",
    detail: "Click layers to remove them from the canvas",
    shortcut: "X",
    tool: "cutter",
  },
  {
    id: "tool-measure",
    label: "Measure tool",
    detail: "Drag across the canvas to inspect distance and offsets",
    shortcut: "M",
    tool: "measure",
  },
  {
    id: "tool-frame",
    label: "Frame tool",
    detail: "Create a frame",
    shortcut: "F",
    tool: "frame",
  },
  {
    id: "tool-rectangle",
    label: "Rectangle tool",
    detail: "Create a rectangle",
    shortcut: "R",
    tool: "rectangle",
  },
  {
    id: "tool-ellipse",
    label: "Ellipse tool",
    detail: "Create an ellipse",
    shortcut: "O",
    tool: "ellipse",
  },
  {
    id: "tool-text",
    label: "Text tool",
    detail: "Create text",
    shortcut: "T",
    tool: "text",
  },
  {
    id: "tool-sticky",
    label: "Sticky note tool",
    detail: "Create a sticky note",
    shortcut: "N",
    tool: "sticky",
  },
  {
    id: "tool-comment",
    label: "Comment tool",
    detail: "Pin feedback on the canvas",
    shortcut: "C",
    tool: "comment",
  },
] satisfies Array<{
  id: string;
  label: string;
  detail: string;
  shortcut: string;
  tool: EditorTool;
}>;

const alignmentCommands = [
  {
    id: "align-left",
    label: "Align left",
    detail: "Align selected layers to the left edge",
    alignment: "left",
  },
  {
    id: "align-center-x",
    label: "Align horizontal center",
    detail: "Align selected layers on the horizontal center",
    alignment: "horizontal-center",
  },
  {
    id: "align-right",
    label: "Align right",
    detail: "Align selected layers to the right edge",
    alignment: "right",
  },
  {
    id: "align-top",
    label: "Align top",
    detail: "Align selected layers to the top edge",
    alignment: "top",
  },
  {
    id: "align-center-y",
    label: "Align vertical center",
    detail: "Align selected layers on the vertical center",
    alignment: "vertical-center",
  },
  {
    id: "align-bottom",
    label: "Align bottom",
    detail: "Align selected layers to the bottom edge",
    alignment: "bottom",
  },
] satisfies Array<{
  id: string;
  label: string;
  detail: string;
  alignment: LayerAlignment;
}>;

const distributionCommands = [
  {
    id: "distribute-horizontal",
    label: "Distribute horizontal spacing",
    detail: "Evenly space selected layers across the horizontal bounds",
    distribution: "horizontal",
  },
  {
    id: "distribute-vertical",
    label: "Distribute vertical spacing",
    detail: "Evenly space selected layers across the vertical bounds",
    distribution: "vertical",
  },
] satisfies Array<{
  id: string;
  label: string;
  detail: string;
  distribution: LayerDistribution;
}>;
