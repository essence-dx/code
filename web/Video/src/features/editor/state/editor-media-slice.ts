"use client";

import { createId } from "@/lib/editor/factory";
import type { EditorProject, MediaAsset, MediaCollection } from "@/lib/editor/types";
import type {
  EditorState,
  EditorStoreGet,
  EditorStoreSet,
  RemovedMediaRecovery,
} from "@/features/editor/state/editor-store-types";

type EditorMediaSlice = Pick<
  EditorState,
  | "addMediaAsset"
  | "toggleFavoriteMediaAsset"
  | "createMediaCollection"
  | "removeMediaCollection"
  | "toggleMediaAssetCollection"
  | "removeMediaAsset"
  | "restoreLastRemovedMedia"
>;

type EditorMediaDeps = {
  commit: (mutator: (project: EditorProject) => EditorProject) => void;
  mediaCollections: (project: EditorProject) => MediaCollection[];
  cleanMediaCollectionName: (name: string) => string;
  upsertAsset: (assets: MediaAsset[], asset: MediaAsset) => MediaAsset[];
  revokeRemovedMediaRecovery: (recovery: RemovedMediaRecovery | null) => void;
  projectDurationForLayers: (baseDuration: number, layers: EditorProject["layers"]) => number;
  clamp: (value: number, min: number, max: number) => number;
};

export function createEditorMediaSlice(set: EditorStoreSet, get: EditorStoreGet, deps: EditorMediaDeps): EditorMediaSlice {
  return {
    addMediaAsset: (asset) => set((state) => ({ mediaAssets: deps.upsertAsset(state.mediaAssets, asset) })),
    toggleFavoriteMediaAsset: (assetId) => {
      const state = get();
      const exists = state.mediaAssets.some((asset) => asset.id === assetId);
      if (!exists) return false;

      const favorites = new Set(state.favoriteMediaAssetIds);
      const isFavorite = favorites.has(assetId);
      if (isFavorite) {
        favorites.delete(assetId);
      } else {
        favorites.add(assetId);
      }

      set({ favoriteMediaAssetIds: [...favorites] });
      return !isFavorite;
    },
    createMediaCollection: (name) => {
      const cleanName = deps.cleanMediaCollectionName(name);
      if (!cleanName) return null;

      const now = new Date().toISOString();
      const collection: MediaCollection = {
        id: createId("collection"),
        name: cleanName,
        assetIds: [],
        createdAt: now,
        updatedAt: now,
      };

      deps.commit((project) => ({
        ...project,
        mediaCollections: [...deps.mediaCollections(project), collection],
        updatedAt: now,
      }));
      return collection;
    },
    removeMediaCollection: (collectionId) => {
      const state = get();
      if (!deps.mediaCollections(state.project).some((collection) => collection.id === collectionId)) return;

      const now = new Date().toISOString();
      deps.commit((project) => ({
        ...project,
        mediaCollections: deps.mediaCollections(project).filter((collection) => collection.id !== collectionId),
        updatedAt: now,
      }));
    },
    toggleMediaAssetCollection: (collectionId, assetId) => {
      const state = get();
      if (!state.mediaAssets.some((asset) => asset.id === assetId)) return false;

      let nextMembership = false;
      const now = new Date().toISOString();
      deps.commit((project) => ({
        ...project,
        mediaCollections: deps.mediaCollections(project).map((collection) => {
          if (collection.id !== collectionId) return collection;

          const assetIds = new Set(collection.assetIds);
          if (assetIds.has(assetId)) {
            assetIds.delete(assetId);
            nextMembership = false;
          } else {
            assetIds.add(assetId);
            nextMembership = true;
          }

          return {
            ...collection,
            assetIds: [...assetIds],
            updatedAt: now,
          };
        }),
        updatedAt: now,
      }));

      return nextMembership;
    },
    removeMediaAsset: (assetId) => {
      const state = get();
      const asset = state.mediaAssets.find((item) => item.id === assetId);
      if (!asset) {
        return { removedAsset: false, removedLayerCount: 0 };
      }

      const removedLayerIds = new Set(
        state.project.layers.filter((layer) => layer.assetId === assetId).map((layer) => layer.id),
      );
      const removedLayers = state.project.layers.filter((layer) => removedLayerIds.has(layer.id));
      const layers = state.project.layers.filter((layer) => !removedLayerIds.has(layer.id));
      const selectedLayerIds = state.selectedLayerIds.filter((layerId) => !removedLayerIds.has(layerId));
      const duration = deps.projectDurationForLayers(state.project.duration, layers);
      const now = new Date().toISOString();

      deps.revokeRemovedMediaRecovery(state.lastRemovedMedia);
      set({
        mediaAssets: state.mediaAssets.filter((item) => item.id !== assetId),
        favoriteMediaAssetIds: state.favoriteMediaAssetIds.filter((id) => id !== assetId),
        lastRemovedMedia: {
          asset,
          layers: removedLayers,
          removedAt: now,
        },
        project: {
          ...state.project,
          layers,
          mediaCollections: deps.mediaCollections(state.project).map((collection) => ({
            ...collection,
            assetIds: collection.assetIds.filter((id) => id !== assetId),
            updatedAt: now,
          })),
          duration,
          updatedAt: now,
        },
        selectedLayerId: removedLayerIds.has(state.selectedLayerId ?? "")
          ? (selectedLayerIds.at(-1) ?? null)
          : state.selectedLayerId,
        selectedLayerIds,
        currentTime: deps.clamp(state.currentTime, 0, duration),
        isPlaying: state.isPlaying && state.currentTime < duration,
        past: [],
        future: [],
      });

      return { removedAsset: true, removedLayerCount: removedLayerIds.size };
    },
    restoreLastRemovedMedia: () => {
      const state = get();
      const recovery = state.lastRemovedMedia;
      if (!recovery) return false;

      const existingLayerIds = new Set(state.project.layers.map((layer) => layer.id));
      const restoredLayers = recovery.layers.filter((layer) => !existingLayerIds.has(layer.id));
      const layers = [...state.project.layers, ...restoredLayers];
      const now = new Date().toISOString();

      set({
        mediaAssets: deps.upsertAsset(state.mediaAssets, recovery.asset),
        lastRemovedMedia: null,
        project: {
          ...state.project,
          layers,
          duration: deps.projectDurationForLayers(state.project.duration, layers),
          updatedAt: now,
        },
        selectedLayerId: restoredLayers.at(-1)?.id ?? state.selectedLayerId,
        selectedLayerIds: restoredLayers.map((layer) => layer.id),
        past: [],
        future: [],
      });
      return true;
    },
  };
}
