import type { DesignLayer, DesignPage } from "@/features/editor/types";
import type { InteractionHarnessRow } from "@/features/editor/interaction-test-harness-types";

export function getPointerHarnessRows(activePage: DesignPage) {
  const visibleLayers = getVisibleLayers(activePage);
  const pointerTargets = visibleLayers.filter((layer) => !layer.locked);
  const smallTargets = pointerTargets.filter(
    (layer) => layer.width < 8 || layer.height < 8,
  );

  return [
    {
      id: "pointer:hit-test-targets",
      category: "pointer",
      status:
        pointerTargets.length === 0
          ? visibleLayers.length === 0
            ? "blocked"
            : "review"
          : "ready",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: pointerTargets.slice(0, 8).map((layer) => layer.id),
      label: "Pointer hit-test targets",
      detail:
        pointerTargets.length > 0
          ? `${pointerTargets.length} visible unlocked layer targets can be pointer-tested.`
          : "The active page has no visible unlocked layer target for pointer selection.",
      evidence: `visible=${visibleLayers.length}; unlocked=${pointerTargets.length}`,
      steps: [
        "Click the top visible layer and confirm it becomes selected.",
        "Right-click the same layer and confirm the context menu targets the clicked layer.",
      ],
    },
    {
      id: "pointer:target-size",
      category: "pointer",
      status: smallTargets.length > 0 ? "review" : "ready",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: smallTargets.slice(0, 8).map((layer) => layer.id),
      label: "Pointer target size",
      detail:
        smallTargets.length > 0
          ? `${smallTargets.length} visible target${smallTargets.length === 1 ? "" : "s"} are smaller than 8px on one axis.`
          : "Visible pointer targets are large enough for reliable hit testing.",
      evidence: `${smallTargets.length} small targets`,
      steps: [
        "Click the smallest visible target at 100% zoom.",
        "Zoom in and confirm the same target remains selectable.",
      ],
    },
  ] satisfies InteractionHarnessRow[];
}

export function getSelectionHarnessRows(
  activePage: DesignPage,
  selectedLayerIds: string[],
) {
  const selectableLayers = getVisibleLayers(activePage).filter(
    (layer) => !layer.locked,
  );
  const selectedMissingCount = selectedLayerIds.filter(
    (layerId) => !activePage.layers.some((layer) => layer.id === layerId),
  ).length;

  return [
    {
      id: "selection:single",
      category: "selection",
      status: selectableLayers.length > 0 ? "ready" : "blocked",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: selectableLayers.slice(0, 8).map((layer) => layer.id),
      label: "Single selection",
      detail:
        selectableLayers.length > 0
          ? "The active page has selectable visible layers for single-click selection."
          : "Add a visible unlocked layer before testing selection.",
      evidence: `selectable=${selectableLayers.length}`,
      steps: [
        "Click one layer and confirm the Properties panel shows that layer.",
        "Press Escape or clear selection and confirm the page controls return.",
      ],
    },
    {
      id: "selection:multi",
      category: "selection",
      status:
        selectedMissingCount > 0
          ? "blocked"
          : selectableLayers.length >= 2
            ? "ready"
            : "review",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: selectableLayers.slice(0, 8).map((layer) => layer.id),
      label: "Multi-selection",
      detail:
        selectedMissingCount > 0
          ? `${selectedMissingCount} selected layer id${selectedMissingCount === 1 ? "" : "s"} no longer exist on the active page.`
          : selectableLayers.length >= 2
            ? "The active page has enough unlocked visible layers for shift-click and marquee selection."
            : "Add a second visible unlocked layer before validating multi-selection.",
      evidence: `selected=${selectedLayerIds.length}; missing=${selectedMissingCount}`,
      steps: [
        "Shift-click two layers and confirm a shared selection outline appears.",
        "Drag a marquee around both layers and confirm the same selection set.",
      ],
    },
  ] satisfies InteractionHarnessRow[];
}

export function getResizeHarnessRows(
  activePage: DesignPage,
  selectedLayerIds: string[],
) {
  const visibleLayers = getVisibleLayers(activePage);
  const unlockedResizable = visibleLayers.filter(
    (layer) => !layer.locked && layer.width > 0 && layer.height > 0,
  );
  const invalidBounds = activePage.layers.filter(
    (layer) => layer.width <= 0 || layer.height <= 0,
  );
  const selectedLocked = activePage.layers.filter(
    (layer) => selectedLayerIds.includes(layer.id) && layer.locked,
  );

  return [
    {
      id: "resize:handles",
      category: "resize",
      status: unlockedResizable.length > 0 ? "ready" : "blocked",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: unlockedResizable.slice(0, 8).map((layer) => layer.id),
      label: "Resize handles",
      detail:
        unlockedResizable.length > 0
          ? `${unlockedResizable.length} visible unlocked layer${unlockedResizable.length === 1 ? "" : "s"} can exercise resize handles.`
          : "No visible unlocked layer has positive bounds for resize testing.",
      evidence: `resizable=${unlockedResizable.length}`,
      steps: [
        "Drag a corner resize handle and confirm width and height update.",
        "Hold Shift during resize and confirm aspect-ratio constraint behavior.",
      ],
    },
    {
      id: "resize:bounds-sanity",
      category: "resize",
      status:
        invalidBounds.length > 0
          ? "blocked"
          : selectedLocked.length > 0
            ? "review"
            : "ready",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: [...invalidBounds, ...selectedLocked]
        .slice(0, 8)
        .map((layer) => layer.id),
      label: "Resize bounds sanity",
      detail:
        invalidBounds.length > 0
          ? `${invalidBounds.length} layer${invalidBounds.length === 1 ? "" : "s"} have invalid width or height.`
          : selectedLocked.length > 0
            ? "The current selection includes locked layers; verify locked resize affordances are disabled."
            : "Layer bounds are positive and selected locked layers are not blocking resize tests.",
      evidence: `invalidBounds=${invalidBounds.length}; selectedLocked=${selectedLocked.length}`,
      steps: [
        "Select a locked layer and confirm resize handles are not active.",
        "Select an unlocked layer and confirm resize handles are active.",
      ],
    },
  ] satisfies InteractionHarnessRow[];
}

export function getTextEditHarnessRows(activePage: DesignPage) {
  const textLayers = activePage.layers.filter(
    (layer) => layer.type === "text" || layer.type === "sticky",
  );
  const emptyTextLayers = textLayers.filter((layer) => !layer.text?.trim());

  return [
    {
      id: "text-edit:direct-edit",
      category: "text-edit",
      status: textLayers.length > 0 ? "ready" : "review",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: textLayers.slice(0, 8).map((layer) => layer.id),
      label: "Direct text editing",
      detail:
        textLayers.length > 0
          ? `${textLayers.length} text-capable layer${textLayers.length === 1 ? "" : "s"} can exercise double-click editing.`
          : "No text or sticky layers exist on the active page.",
      evidence: `textLayers=${textLayers.length}`,
      steps: [
        "Double-click a text layer and edit the value.",
        "Press Enter or blur the field and confirm the canvas text updates.",
      ],
    },
    {
      id: "text-edit:empty-content",
      category: "text-edit",
      status: emptyTextLayers.length > 0 ? "review" : "ready",
      pageId: activePage.id,
      pageName: activePage.name,
      layerIds: emptyTextLayers.slice(0, 8).map((layer) => layer.id),
      label: "Empty text content",
      detail:
        emptyTextLayers.length > 0
          ? `${emptyTextLayers.length} text layer${emptyTextLayers.length === 1 ? "" : "s"} need content before edit QA is meaningful.`
          : "Text-capable layers have non-empty content.",
      evidence: `emptyTextLayers=${emptyTextLayers.length}`,
      steps: [
        "Select each empty text layer and enter visible content.",
        "Confirm text resize mode still keeps the layer selectable.",
      ],
    },
  ] satisfies InteractionHarnessRow[];
}

function getVisibleLayers(page: DesignPage): DesignLayer[] {
  return page.layers.filter((layer) => layer.visible);
}
