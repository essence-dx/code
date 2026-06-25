"use client";

import type { EditorProject, TimelineLayer } from "@/lib/editor/types";
import type { EditorState, EditorStoreGet, EditorStoreSet } from "@/features/editor/state/editor-store-types";

type EditorLayerCommandSlice = Pick<
  EditorState,
  | "pushHistorySnapshot"
  | "removeSelectedLayer"
  | "removeSelectedLayers"
  | "duplicateSelectedLayer"
  | "duplicateSelectedLayers"
  | "splitSelectedLayer"
  | "splitSelectedLayers"
  | "moveLayerTrack"
>;

type EditorLayerCommandDeps = {
  commit: (mutator: (project: EditorProject) => EditorProject) => void;
  getSelectedLayerIds: (state: Pick<EditorState, "selectedLayerId" | "selectedLayerIds">) => string[];
  projectDurationForLayers: (baseDuration: number, layers: TimelineLayer[]) => number;
  cloneLayer: (layer: TimelineLayer, patch: Partial<TimelineLayer>) => TimelineLayer;
  duplicatedGroupId: (groupId: string | undefined, groupIds: Map<string, string>) => string | undefined;
  snapProjectTime: (project: EditorProject, time: number) => number;
  projectSnapInterval: (project: Pick<EditorProject, "snapInterval">) => number;
};

export function createEditorLayerCommandSlice(
  set: EditorStoreSet,
  get: EditorStoreGet,
  deps: EditorLayerCommandDeps,
): EditorLayerCommandSlice {
  return {
    pushHistorySnapshot: () =>
      set((state) => ({
        past: [...state.past, state.project].slice(-40),
        future: [],
      })),
    removeSelectedLayer: () => get().removeSelectedLayers(),
    removeSelectedLayers: () => {
      const state = get();
      const selectedIds = deps.getSelectedLayerIds(state);
      if (!selectedIds.length) return;

      const removableIds = new Set(
        state.project.layers
          .filter((layer) => selectedIds.includes(layer.id) && !layer.locked)
          .map((layer) => layer.id),
      );
      if (!removableIds.size) return;

      deps.commit((project) => {
        const layers = project.layers.filter((layer) => !removableIds.has(layer.id));

        return {
          ...project,
          layers,
          duration: deps.projectDurationForLayers(project.duration, layers),
          updatedAt: new Date().toISOString(),
        };
      });
      set({ selectedLayerId: null, selectedLayerIds: [] });
    },
    duplicateSelectedLayer: () => get().duplicateSelectedLayers(),
    duplicateSelectedLayers: () => {
      const state = get();
      const selectedIds = deps.getSelectedLayerIds(state);
      const now = new Date().toISOString();
      const duplicateGroupIds = new Map<string, string>();
      const duplicates = state.project.layers
        .filter((layer) => selectedIds.includes(layer.id) && !layer.locked)
        .map((layer) =>
          deps.cloneLayer(layer, {
            id: crypto.randomUUID(),
            name: `${layer.name} copy`,
            groupId: deps.duplicatedGroupId(layer.groupId, duplicateGroupIds),
            start: deps.snapProjectTime(state.project, layer.start + deps.projectSnapInterval(state.project)),
            track: layer.track + 1,
            createdAt: now,
            updatedAt: now,
          }),
        );
      if (!duplicates.length) return;

      deps.commit((project) => ({
        ...project,
        duration: Math.max(project.duration, ...duplicates.map((layer) => layer.start + layer.duration)),
        layers: [...project.layers, ...duplicates],
        updatedAt: now,
      }));
      set({ selectedLayerId: duplicates.at(-1)?.id ?? null, selectedLayerIds: duplicates.map((layer) => layer.id) });
    },
    splitSelectedLayer: () => get().splitSelectedLayers(),
    splitSelectedLayers: () => {
      const state = get();
      const selectedIds = deps.getSelectedLayerIds(state);
      const time = deps.snapProjectTime(state.project, state.currentTime);
      if (!selectedIds.length) return;

      const rightIds: string[] = [];
      deps.commit((project) => ({
        ...project,
        layers: project.layers.flatMap((layer) => {
          if (
            !selectedIds.includes(layer.id) ||
            layer.locked ||
            time <= layer.start ||
            time >= layer.start + layer.duration
          ) {
            return [layer];
          }

          const now = new Date().toISOString();
          const leftDuration = time - layer.start;
          const rightDuration = layer.duration - leftDuration;
          const right = deps.cloneLayer(layer, {
            id: crypto.randomUUID(),
            name: `${layer.name} split`,
            start: time,
            duration: rightDuration,
            trimStart: layer.trimStart + leftDuration * layer.playbackRate,
            createdAt: now,
            updatedAt: now,
          });
          rightIds.push(right.id);

          return [{ ...layer, duration: leftDuration, updatedAt: now }, right];
        }),
        updatedAt: new Date().toISOString(),
      }));
      if (rightIds.length) {
        set({ selectedLayerId: rightIds.at(-1) ?? null, selectedLayerIds: rightIds });
      }
    },
    moveLayerTrack: (layerId, direction) => {
      const layer = get().project.layers.find((item) => item.id === layerId);
      if (!layer || layer.locked) return;

      get().updateSelectedLayerTiming(layerId, { track: Math.max(0, layer.track + direction) });
    },
  };
}
