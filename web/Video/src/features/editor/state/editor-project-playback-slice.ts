"use client";

import { createProject } from "@/lib/editor/factory";
import { getAspectPreset } from "@/lib/editor/presets";
import type { EditorProject, MediaAsset, TimelineMarker } from "@/lib/editor/types";
import type {
  EditorState,
  EditorStoreGet,
  EditorStoreSet,
  RemovedMediaRecovery,
} from "@/features/editor/state/editor-store-types";

type EditorProjectPlaybackSlice = Pick<
  EditorState,
  | "createNewProject"
  | "loadProject"
  | "setProjectTitle"
  | "setAspectRatio"
  | "setTimelineSnapInterval"
  | "setTimelineRippleMode"
  | "setCurrentTime"
  | "addTimelineMarker"
  | "updateTimelineMarker"
  | "removeTimelineMarker"
  | "setPlayback"
  | "togglePlayback"
>;

type EditorProjectPlaybackDeps = {
  commit: (mutator: (project: EditorProject) => EditorProject) => void;
  normalizeProjectTimeline: (project: EditorProject) => EditorProject;
  revokeMediaAssetObjectUrls: (assets: MediaAsset[], keepAssets?: MediaAsset[]) => void;
  revokeRemovedMediaRecovery: (recovery: RemovedMediaRecovery | null) => void;
  normalizeSnapInterval: (seconds: number | undefined) => number;
  createTimelineMarker: (time: number, project: EditorProject) => TimelineMarker;
  timelineMarkers: (project: EditorProject, duration?: number) => TimelineMarker[];
  normalizeTimelineMarkers: (markers: TimelineMarker[], duration: number) => TimelineMarker[];
  cleanMarkerLabel: (label: string) => string;
  clamp: (value: number, min: number, max: number) => number;
};

export function createEditorProjectPlaybackSlice(
  set: EditorStoreSet,
  get: EditorStoreGet,
  deps: EditorProjectPlaybackDeps,
): EditorProjectPlaybackSlice {
  return {
    createNewProject: (title = "Untitled reel", aspectRatio = "16:9") => {
      const state = get();
      deps.revokeMediaAssetObjectUrls(state.mediaAssets);
      deps.revokeRemovedMediaRecovery(state.lastRemovedMedia);
      set({
        project: createProject(title, aspectRatio),
        mediaAssets: [],
        favoriteMediaAssetIds: [],
        lastRemovedMedia: null,
        selectedLayerId: null,
        selectedLayerIds: [],
        currentTime: 0,
        isPlaying: false,
        past: [],
        future: [],
      });
    },
    loadProject: (project, mediaAssets = []) => {
      const state = get();
      deps.revokeMediaAssetObjectUrls(state.mediaAssets, mediaAssets);
      deps.revokeRemovedMediaRecovery(state.lastRemovedMedia);
      set({
        project: deps.normalizeProjectTimeline(project),
        mediaAssets,
        favoriteMediaAssetIds: [],
        lastRemovedMedia: null,
        selectedLayerId: null,
        selectedLayerIds: [],
        currentTime: 0,
        isPlaying: false,
        past: [],
        future: [],
      });
    },
    setProjectTitle: (title) =>
      deps.commit((project) => ({
        ...project,
        title,
        updatedAt: new Date().toISOString(),
      })),
    setAspectRatio: (aspectRatio) =>
      deps.commit((project) => {
        const preset = getAspectPreset(aspectRatio);
        return {
          ...project,
          aspectRatio: preset.id,
          width: preset.width,
          height: preset.height,
          updatedAt: new Date().toISOString(),
        };
      }),
    setTimelineSnapInterval: (seconds) => {
      const snapInterval = deps.normalizeSnapInterval(seconds);
      deps.commit((project) => ({
        ...project,
        snapInterval,
        updatedAt: new Date().toISOString(),
      }));
    },
    setTimelineRippleMode: (enabled) => {
      deps.commit((project) => ({
        ...project,
        rippleMode: enabled,
        updatedAt: new Date().toISOString(),
      }));
    },
    setCurrentTime: (time) => set({ currentTime: deps.clamp(time, 0, get().project.duration) }),
    addTimelineMarker: (time = get().currentTime) => {
      const marker = deps.createTimelineMarker(time, get().project);
      deps.commit((project) => ({
        ...project,
        markers: deps.normalizeTimelineMarkers([...deps.timelineMarkers(project), marker], project.duration),
        updatedAt: new Date().toISOString(),
      }));
      return marker;
    },
    updateTimelineMarker: (markerId, patch) => {
      const now = new Date().toISOString();
      deps.commit((project) => ({
        ...project,
        markers: deps
          .timelineMarkers(project)
          .map((marker) =>
            marker.id === markerId
              ? {
                  ...marker,
                  ...patch,
                  time: deps.clamp(patch.time ?? marker.time, 0, project.duration),
                  label: deps.cleanMarkerLabel(patch.label ?? marker.label),
                  updatedAt: now,
                }
              : marker,
          )
          .sort((a, b) => a.time - b.time),
        updatedAt: now,
      }));
    },
    removeTimelineMarker: (markerId) => {
      if (!deps.timelineMarkers(get().project).some((marker) => marker.id === markerId)) return;

      deps.commit((project) => ({
        ...project,
        markers: deps.timelineMarkers(project).filter((marker) => marker.id !== markerId),
        updatedAt: new Date().toISOString(),
      }));
    },
    setPlayback: (playing) => set({ isPlaying: playing }),
    togglePlayback: () =>
      set((state) => ({
        isPlaying: !state.isPlaying,
        currentTime: !state.isPlaying && state.currentTime >= state.project.duration ? 0 : state.currentTime,
      })),
  };
}
