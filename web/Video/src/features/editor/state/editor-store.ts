"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createProject } from "@/lib/editor/factory";
import { createEditorExportSlice } from "@/features/editor/state/editor-export-slice";
import { createEditorHistorySlice } from "@/features/editor/state/editor-history-slice";
import { createEditorLayerCommandSlice } from "@/features/editor/state/editor-layer-command-slice";
import { createEditorLayerCreationSlice } from "@/features/editor/state/editor-layer-creation-slice";
import { createEditorMediaSlice } from "@/features/editor/state/editor-media-slice";
import { createEditorPresetBrandSlice } from "@/features/editor/state/editor-preset-brand-slice";
import { createEditorProjectPlaybackSlice } from "@/features/editor/state/editor-project-playback-slice";
import { createEditorSelectionSlice } from "@/features/editor/state/editor-selection-slice";
import { createEditorLayerWriters, createEditorProjectCommit } from "@/features/editor/state/editor-store-core";
import { createEditorTemplateSlice } from "@/features/editor/state/editor-template-slice";
import { createEditorTimelineEditSlice } from "@/features/editor/state/editor-timeline-edit-slice";
import type { EditorState } from "@/features/editor/state/editor-store-types";
import {
  audioMixPresets,
  brandTypographyPresets,
  cleanAudioMixPresetName,
  cleanBrandTypographyName,
  cleanFontFamily,
  cleanLayerStylePresetName,
  cleanMarkerLabel,
  cleanMediaCollectionName,
  clamp,
  cloneLayer,
  createReplacementAudioLayer,
  createTimelineMarker,
  duplicatedGroupId,
  formatFreezeFrameTime,
  getSelectedLayerIds,
  groupAwareLayerIds,
  isTextLikeLayer,
  layerStylePresets,
  mediaCollections,
  nextTrack,
  normalizeHexColor,
  normalizeProjectTimeline,
  normalizeSnapInterval,
  normalizeTimelineMarkers,
  projectDurationForLayers,
  projectSnapInterval,
  revokeMediaAssetObjectUrls,
  revokeRemovedMediaRecovery,
  snapProjectTime,
  timelineMarkers,
  timelineOrderedLayers,
  typographyRoleStyle,
  upsertAsset,
} from "@/features/editor/state/editor-store-utils";

const initialProject = createProject("Untitled reel", "16:9");

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => {
      const commit = createEditorProjectCommit(set);
      const { addLayer, addLayers } = createEditorLayerWriters(set, commit);

      return {
        project: initialProject,
        mediaAssets: [],
        selectedLayerId: null,
        selectedLayerIds: [],
        currentTime: 0,
        isPlaying: false,
        exportJobs: [],
        brandColors: ["#ffffff", "#e5e5e5", "#a3a3a3", "#525252", "#0a0a0a"],
        favoriteMediaAssetIds: [],
        savedTemplates: [],
        lastRemovedMedia: null,
        showSafeZones: false,
        past: [],
        future: [],
        ...createEditorProjectPlaybackSlice(set, get, {
          commit,
          normalizeProjectTimeline,
          revokeMediaAssetObjectUrls,
          revokeRemovedMediaRecovery,
          normalizeSnapInterval,
          createTimelineMarker,
          timelineMarkers,
          normalizeTimelineMarkers,
          cleanMarkerLabel,
          clamp,
        }),
        ...createEditorMediaSlice(set, get, {
          commit,
          mediaCollections,
          cleanMediaCollectionName,
          upsertAsset,
          revokeRemovedMediaRecovery,
          projectDurationForLayers,
          clamp,
        }),
        ...createEditorLayerCreationSlice(set, get, {
          addLayer,
          addLayers,
          commit,
          cloneLayer,
          createReplacementAudioLayer,
          formatFreezeFrameTime,
          getSelectedLayerIds,
          groupAwareLayerIds,
          nextTrack,
          projectDurationForLayers,
        }),
        ...createEditorTemplateSlice(set, get, {
          addLayers,
          nextTrack,
        }),
        ...createEditorPresetBrandSlice(set, get, {
          audioMixPresets,
          brandTypographyPresets,
          cleanAudioMixPresetName,
          cleanBrandTypographyName,
          cleanFontFamily,
          cleanLayerStylePresetName,
          commit,
          getSelectedLayerIds,
          isTextLikeLayer,
          layerStylePresets,
          normalizeHexColor,
          typographyRoleStyle,
        }),
        ...createEditorSelectionSlice(set, get, {
          commit,
          getSelectedLayerIds,
          groupAwareLayerIds,
          timelineOrderedLayers,
        }),
        ...createEditorTimelineEditSlice(set, get, {
          commit,
          getSelectedLayerIds,
          groupAwareLayerIds,
          projectDurationForLayers,
          snapProjectTime,
        }),
        ...createEditorLayerCommandSlice(set, get, {
          commit,
          getSelectedLayerIds,
          projectDurationForLayers,
          cloneLayer,
          duplicatedGroupId,
          snapProjectTime,
          projectSnapInterval,
        }),
        ...createEditorHistorySlice(set, get, {
          clamp,
          normalizeProjectTimeline,
        }),
        ...createEditorExportSlice(set, get),
      };
    },
    {
      name: "essence-kapwing-editor",
      partialize: (state) => ({
        project: state.project,
        mediaAssets: state.mediaAssets.map((asset) => ({ ...asset, objectUrl: undefined })),
        exportJobs: state.exportJobs,
        brandColors: state.brandColors,
        favoriteMediaAssetIds: state.favoriteMediaAssetIds,
        savedTemplates: state.savedTemplates,
        showSafeZones: state.showSafeZones,
      }),
    },
  ),
);
