"use client";

import { createId } from "@/lib/editor/factory";
import type { EditorProject, TimelineLayer } from "@/lib/editor/types";
import type { EditorState, EditorStoreGet, EditorStoreSet } from "@/features/editor/state/editor-store-types";

type EditorSelectionSlice = Pick<
  EditorState,
  | "toggleSafeZones"
  | "isolateSelectedLayers"
  | "showAllLayers"
  | "setSelectedLayersHidden"
  | "setSelectedLayersLocked"
  | "groupSelectedLayers"
  | "ungroupSelectedLayers"
  | "selectLayerGroup"
  | "selectLayer"
  | "selectLayerRange"
>;

type EditorSelectionDeps = {
  commit: (mutator: (project: EditorProject) => EditorProject) => void;
  getSelectedLayerIds: (state: Pick<EditorState, "selectedLayerId" | "selectedLayerIds">) => string[];
  groupAwareLayerIds: (layers: TimelineLayer[], layerIds: string[]) => string[];
  timelineOrderedLayers: (layers: TimelineLayer[]) => TimelineLayer[];
};

export function createEditorSelectionSlice(
  set: EditorStoreSet,
  get: EditorStoreGet,
  deps: EditorSelectionDeps,
): EditorSelectionSlice {
  return {
    toggleSafeZones: () => set((state) => ({ showSafeZones: !state.showSafeZones })),
    isolateSelectedLayers: () => {
      const state = get();
      const selectedIds = deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state));
      if (!selectedIds.length) return;

      const selected = new Set(selectedIds);
      const now = new Date().toISOString();
      deps.commit((project) => ({
        ...project,
        layers: project.layers.map((layer) => ({
          ...layer,
          hidden: !selected.has(layer.id),
          updatedAt: now,
        })),
        updatedAt: now,
      }));
    },
    showAllLayers: () => {
      if (!get().project.layers.some((layer) => layer.hidden)) return;

      const now = new Date().toISOString();
      deps.commit((project) => ({
        ...project,
        layers: project.layers.map((layer) => ({
          ...layer,
          hidden: false,
          updatedAt: now,
        })),
        updatedAt: now,
      }));
    },
    setSelectedLayersHidden: (hidden) => updateSelectedLayerBoolean(get, deps, "hidden", hidden),
    setSelectedLayersLocked: (locked) => updateSelectedLayerBoolean(get, deps, "locked", locked),
    groupSelectedLayers: () => {
      const selectedIds = deps.getSelectedLayerIds(get());
      if (selectedIds.length < 2) return { grouped: false, layerCount: selectedIds.length };

      const selected = new Set(selectedIds);
      const groupId = createId("group");
      const now = new Date().toISOString();
      deps.commit((project) => ({
        ...project,
        layers: project.layers.map((layer) =>
          selected.has(layer.id)
            ? {
                ...layer,
                groupId,
                updatedAt: now,
              }
            : layer,
        ),
        updatedAt: now,
      }));
      return { grouped: true, layerCount: selectedIds.length };
    },
    ungroupSelectedLayers: () => {
      const state = get();
      const selectedIds = deps.getSelectedLayerIds(state);
      const groupIds = new Set(
        state.project.layers
          .filter((layer) => selectedIds.includes(layer.id) && layer.groupId)
          .map((layer) => layer.groupId as string),
      );
      if (!groupIds.size) return 0;

      const now = new Date().toISOString();
      let ungroupedCount = 0;
      deps.commit((project) => ({
        ...project,
        layers: project.layers.map((layer) => {
          if (!layer.groupId || !groupIds.has(layer.groupId)) return layer;
          ungroupedCount += 1;
          return {
            ...layer,
            groupId: undefined,
            updatedAt: now,
          };
        }),
        updatedAt: now,
      }));
      return ungroupedCount;
    },
    selectLayerGroup: (groupId) => {
      const selectedLayerIds = deps
        .timelineOrderedLayers(get().project.layers)
        .filter((layer) => layer.groupId === groupId)
        .map((layer) => layer.id);
      if (!selectedLayerIds.length) return;

      set({ selectedLayerId: selectedLayerIds.at(-1) ?? null, selectedLayerIds });
    },
    selectLayer: (layerId, additive = false) => {
      if (!layerId) {
        set({ selectedLayerId: null, selectedLayerIds: [] });
        return;
      }

      if (!get().project.layers.some((layer) => layer.id === layerId)) {
        return;
      }

      if (!additive) {
        set({ selectedLayerId: layerId, selectedLayerIds: [layerId] });
        return;
      }

      const selectedLayerIds = get().selectedLayerIds.includes(layerId)
        ? get().selectedLayerIds.filter((id) => id !== layerId)
        : [...get().selectedLayerIds, layerId];
      set({ selectedLayerId: selectedLayerIds.at(-1) ?? null, selectedLayerIds });
    },
    selectLayerRange: (layerId) => {
      const state = get();
      const orderedLayers = deps.timelineOrderedLayers(state.project.layers);
      const targetIndex = orderedLayers.findIndex((layer) => layer.id === layerId);
      if (targetIndex < 0) return;

      const anchorId = state.selectedLayerId ?? state.selectedLayerIds.at(-1);
      const anchorIndex = anchorId ? orderedLayers.findIndex((layer) => layer.id === anchorId) : -1;
      if (anchorIndex < 0) {
        set({ selectedLayerId: layerId, selectedLayerIds: [layerId] });
        return;
      }

      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      set({
        selectedLayerId: layerId,
        selectedLayerIds: orderedLayers.slice(start, end + 1).map((layer) => layer.id),
      });
    },
  };
}

function updateSelectedLayerBoolean(
  get: EditorStoreGet,
  deps: EditorSelectionDeps,
  property: "hidden" | "locked",
  value: boolean,
) {
  const state = get();
  const targetIds = deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state));
  if (!targetIds.length) return 0;

  const target = new Set(targetIds);
  const now = new Date().toISOString();
  let changedCount = 0;
  deps.commit((project) => ({
    ...project,
    layers: project.layers.map((layer) => {
      if (!target.has(layer.id) || layer[property] === value) return layer;

      changedCount += 1;
      return {
        ...layer,
        [property]: value,
        updatedAt: now,
      };
    }),
    updatedAt: changedCount > 0 ? now : project.updatedAt,
  }));

  return changedCount;
}
