"use client";

import { createId } from "@/lib/editor/factory";
import { applyAutoDuckingToLayers } from "@/lib/audio/auto-ducking";
import { normalizeLayerAudioMix } from "@/lib/audio/mix";
import { normalizeLayerMotion } from "@/lib/editor/motion";
import { normalizeLayerSpeed, normalizePlaybackRate } from "@/lib/editor/speed";
import { normalizeLayerTrackingAttachment } from "@/lib/editor/tracking";
import { normalizeLayerTransition } from "@/lib/editor/transitions";
import { clampLayerTiming, TIMELINE_MIN_LAYER_SECONDS } from "@/lib/editor/timeline";
import { applyTimelineCutRangesToLayers, shiftTimeAfterCuts, type TimelineCutRange } from "@/lib/editor/timeline-cuts";
import { normalizeLayerVisualStyle } from "@/lib/editor/visual-effects";
import type {
  EditorProject,
  MediaAsset,
  TimelineAlignmentMode,
  TimelineDurationDistributionMode,
  TimelineLayer,
} from "@/lib/editor/types";
import type { EditorState, EditorStoreGet, EditorStoreSet } from "@/features/editor/state/editor-store-types";

type EditorTimelineEditSlice = Pick<
  EditorState,
  | "updateLayer"
  | "updateSelectedLayerTiming"
  | "updateSelectedLayersBounds"
  | "nudgeSelectedLayers"
  | "alignSelectedLayers"
  | "distributeSelectedLayerDurations"
  | "centerSelectedLayers"
  | "fitSelectedLayersToCanvas"
  | "addBlurredBackgroundForSelectedMediaLayers"
  | "applyTimelineCutRanges"
  | "applyAutoDuckingToLayer"
>;

type EditorTimelineEditDeps = {
  commit: (mutator: (project: EditorProject) => EditorProject) => void;
  getSelectedLayerIds: (state: Pick<EditorState, "selectedLayerId" | "selectedLayerIds">) => string[];
  groupAwareLayerIds: (layers: TimelineLayer[], layerIds: string[]) => string[];
  projectDurationForLayers: (baseDuration: number, layers: TimelineLayer[]) => number;
  snapProjectTime: (project: EditorProject, time: number) => number;
};

export function createEditorTimelineEditSlice(
  set: EditorStoreSet,
  get: EditorStoreGet,
  deps: EditorTimelineEditDeps,
): EditorTimelineEditSlice {
  return {
    updateLayer: (layerId, patch, options) => {
      const mutator = (project: EditorProject) => {
        const now = new Date().toISOString();
        const layers = project.layers.map((layer) => (layer.id === layerId ? applyLayerPatch(layer, patch, now) : layer));

        return {
          ...project,
          layers,
          duration: deps.projectDurationForLayers(project.duration, layers),
          updatedAt: now,
        };
      };

      if (options?.history === false) {
        set((state) => ({ project: mutator(state.project) }));
        return;
      }

      deps.commit(mutator);
    },
    updateSelectedLayerTiming: (layerId, patch, options) => {
      const state = get();
      const baseSelectedIds = state.selectedLayerIds.includes(layerId) ? state.selectedLayerIds : [layerId];
      const selectedIds = deps.groupAwareLayerIds(state.project.layers, baseSelectedIds);
      const source = state.project.layers.find((layer) => layer.id === layerId);
      if (!source || source.locked) return;

      const startDelta = patch.start === undefined ? 0 : patch.start - source.start;
      const durationDelta = patch.duration === undefined ? 0 : patch.duration - source.duration;
      const trimStartDelta = patch.trimStart === undefined ? 0 : patch.trimStart - source.trimStart;
      const trackDelta = patch.track === undefined ? 0 : patch.track - source.track;
      const mutator = (project: EditorProject) => {
        let maxEnd = project.duration;
        const rippleBoundary = rippleMoveBoundary(project, selectedIds, startDelta, patch);
        const layers = project.layers.map((layer) => {
          if (rippleBoundary !== null && !selectedIds.includes(layer.id) && !layer.locked && layer.start >= rippleBoundary) {
            const nextStart = Math.max(0, layer.start + startDelta);
            maxEnd = Math.max(maxEnd, nextStart + layer.duration);
            return {
              ...layer,
              start: nextStart,
              updatedAt: new Date().toISOString(),
            };
          }

          if (!selectedIds.includes(layer.id) || layer.locked) {
            maxEnd = Math.max(maxEnd, layer.start + layer.duration);
            return layer;
          }

          const requestedStart =
            layer.id === layerId && patch.start !== undefined
              ? patch.start
              : patch.start !== undefined
                ? layer.start + startDelta
                : layer.start;
          const requestedDuration =
            patch.duration === undefined
              ? layer.duration
              : layer.id === layerId
                ? patch.duration
                : layer.duration + durationDelta;
          const timing = clampLayerTiming(
            options?.snap === false ? requestedStart : deps.snapProjectTime(project, requestedStart),
            requestedDuration,
          );
          maxEnd = Math.max(maxEnd, timing.start + timing.duration);

          return {
            ...layer,
            start: timing.start,
            duration: timing.duration,
            trimStart:
              patch.trimStart === undefined
                ? layer.trimStart
                : Math.max(0, layer.id === layerId ? patch.trimStart : layer.trimStart + trimStartDelta),
            track: Math.max(0, layer.track + trackDelta),
            updatedAt: new Date().toISOString(),
          };
        });

        return {
          ...project,
          layers,
          duration: deps.projectDurationForLayers(maxEnd, layers),
          updatedAt: new Date().toISOString(),
        };
      };

      if (options?.history === false) {
        set((current) => ({ project: mutator(current.project) }));
        return;
      }

      deps.commit(mutator);
    },
    updateSelectedLayersBounds: (patch) => {
      const state = get();
      const selectedIds = deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state));
      const editableLayers = state.project.layers.filter((layer) => selectedIds.includes(layer.id) && !layer.locked);
      const bounds = selectedLayerBounds(editableLayers);
      if (!bounds) return 0;

      const targetStart = finiteNumber(patch.start, bounds.start);
      const targetEnd = finiteNumber(patch.end, bounds.end);
      const targetDuration = Math.max(
        TIMELINE_MIN_LAYER_SECONDS,
        finiteNumber(patch.duration, patch.end === undefined ? bounds.duration : targetEnd - targetStart),
      );
      const scale = targetDuration / Math.max(bounds.duration, TIMELINE_MIN_LAYER_SECONDS);
      const editableIds = new Set(editableLayers.map((layer) => layer.id));
      const now = new Date().toISOString();
      let changedCount = 0;

      deps.commit((project) => {
        const layers = project.layers.map((layer) => {
          if (!editableIds.has(layer.id)) return layer;

          const nextStart = targetStart + (layer.start - bounds.start) * scale;
          const nextDuration = Math.max(TIMELINE_MIN_LAYER_SECONDS, layer.duration * scale);
          if (nextStart === layer.start && nextDuration === layer.duration) return layer;

          changedCount += 1;
          return {
            ...layer,
            start: nextStart,
            duration: nextDuration,
            updatedAt: now,
          };
        });

        return {
          ...project,
          layers,
          duration: deps.projectDurationForLayers(project.duration, layers),
          updatedAt: changedCount > 0 ? now : project.updatedAt,
        };
      });

      return changedCount;
    },
    nudgeSelectedLayers: (input) => {
      const state = get();
      const selectedIds = deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state));
      if (!selectedIds.length) return 0;

      const selected = new Set(selectedIds);
      const selectedBounds = selectedLayerBounds(state.project.layers.filter((layer) => selected.has(layer.id)));
      const rippleBoundary =
        state.project.rippleMode && selectedBounds && typeof input.timeDelta === "number" && input.timeDelta !== 0
          ? selectedBounds.end
          : null;
      let movedCount = 0;
      const now = new Date().toISOString();
      deps.commit((project) => {
        const layers = project.layers.map((layer) => {
          if (rippleBoundary !== null && !selected.has(layer.id) && !layer.locked && layer.start >= rippleBoundary) {
            movedCount += 1;
            return {
              ...layer,
              start: Math.max(0, layer.start + (input.timeDelta ?? 0)),
              updatedAt: now,
            };
          }

          if (!selected.has(layer.id) || layer.locked) return layer;

          const nextStart = deps.snapProjectTime(project, Math.max(0, layer.start + (input.timeDelta ?? 0)));
          const nextTrack = Math.max(0, layer.track + (input.trackDelta ?? 0));
          if (nextStart === layer.start && nextTrack === layer.track) return layer;

          movedCount += 1;
          return {
            ...layer,
            start: nextStart,
            track: nextTrack,
            updatedAt: now,
          };
        });

        return {
          ...project,
          layers,
          duration: deps.projectDurationForLayers(project.duration, layers),
          updatedAt: movedCount > 0 ? now : project.updatedAt,
        };
      });
      return movedCount;
    },
    alignSelectedLayers: (mode) => {
      const state = get();
      const selectedIds = deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state));
      const editableLayers = state.project.layers.filter((layer) => selectedIds.includes(layer.id) && !layer.locked);
      const bounds = selectedLayerBounds(editableLayers);
      if (!bounds) return 0;

      const editableIds = new Set(editableLayers.map((layer) => layer.id));
      const now = new Date().toISOString();
      let alignedCount = 0;

      deps.commit((project) => {
        const layers = project.layers.map((layer) => {
          if (!editableIds.has(layer.id)) return layer;

          const nextStart = Math.max(0, alignedLayerStart(layer, bounds, mode, state.currentTime));
          if (Math.abs(nextStart - layer.start) < 0.0001) return layer;

          alignedCount += 1;
          return {
            ...layer,
            start: nextStart,
            updatedAt: now,
          };
        });

        return {
          ...project,
          layers,
          duration: deps.projectDurationForLayers(project.duration, layers),
          updatedAt: alignedCount > 0 ? now : project.updatedAt,
        };
      });

      return alignedCount;
    },
    distributeSelectedLayerDurations: (mode) => {
      const state = get();
      const selectedIds = deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state));
      const editableLayers = state.project.layers.filter((layer) => selectedIds.includes(layer.id) && !layer.locked);
      const bounds = selectedLayerBounds(editableLayers);
      if (!bounds || editableLayers.length < 2) return 0;

      const now = new Date().toISOString();
      const editableIds = new Set(editableLayers.map((layer) => layer.id));
      const distributedTiming =
        mode === "fill-selection" ? fillSelectionTiming(editableLayers, bounds) : equalDurationTiming(editableLayers);
      let distributedCount = 0;

      deps.commit((project) => {
        const layers = project.layers.map((layer) => {
          if (!editableIds.has(layer.id)) return layer;

          const timing = distributedTiming.get(layer.id);
          if (!timing) return layer;
          if (Math.abs(timing.start - layer.start) < 0.0001 && Math.abs(timing.duration - layer.duration) < 0.0001) {
            return layer;
          }

          distributedCount += 1;
          return {
            ...layer,
            start: timing.start,
            duration: timing.duration,
            updatedAt: now,
          };
        });

        return {
          ...project,
          layers,
          duration: deps.projectDurationForLayers(project.duration, layers),
          updatedAt: distributedCount > 0 ? now : project.updatedAt,
        };
      });

      return distributedCount;
    },
    centerSelectedLayers: () => {
      const state = get();
      const selectedIds = deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state));
      const editableIds = new Set(
        state.project.layers.filter((layer) => selectedIds.includes(layer.id) && !layer.locked).map((layer) => layer.id),
      );
      if (!editableIds.size) return 0;

      const now = new Date().toISOString();
      let centeredCount = 0;
      deps.commit((project) => ({
        ...project,
        layers: project.layers.map((layer) => {
          if (!editableIds.has(layer.id)) return layer;
          if (layer.transform.x === 0.5 && layer.transform.y === 0.5) return layer;

          centeredCount += 1;
          return {
            ...layer,
            transform: { ...layer.transform, x: 0.5, y: 0.5 },
            updatedAt: now,
          };
        }),
        updatedAt: centeredCount > 0 ? now : project.updatedAt,
      }));

      return centeredCount;
    },
    fitSelectedLayersToCanvas: (mode) => {
      const state = get();
      const selectedIds = deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state));
      const editableIds = new Set(
        state.project.layers.filter((layer) => selectedIds.includes(layer.id) && !layer.locked).map((layer) => layer.id),
      );
      if (!editableIds.size) return 0;

      const now = new Date().toISOString();
      let fittedCount = 0;
      deps.commit((project) => ({
        ...project,
        layers: project.layers.map((layer) => {
          if (!editableIds.has(layer.id)) return layer;

          const source = layerSourceDimensions(layer, state.mediaAssets);
          const scale =
            mode === "cover"
              ? Math.max(project.width / source.width, project.height / source.height)
              : Math.min(project.width / source.width, project.height / source.height);
          fittedCount += 1;
          return {
            ...layer,
            transform: {
              ...layer.transform,
              x: 0.5,
              y: 0.5,
              width: Math.max(1, Math.round(source.width * scale)),
              height: Math.max(1, Math.round(source.height * scale)),
              framing: mode === "cover" ? "fill" : "fit",
            },
            updatedAt: now,
          };
        }),
        updatedAt: fittedCount > 0 ? now : project.updatedAt,
      }));

      return fittedCount;
    },
    addBlurredBackgroundForSelectedMediaLayers: () => {
      const state = get();
      const selectedIds = new Set(deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state)));
      if (!selectedIds.size) return 0;

      const now = new Date().toISOString();
      const createdIds: string[] = [];
      let createdCount = 0;

      deps.commit((project) => {
        const layers = project.layers.flatMap((layer) => {
          if (!selectedIds.has(layer.id) || layer.locked || (layer.kind !== "image" && layer.kind !== "video") || !layer.assetId) {
            return [layer];
          }

          const background = createBlurredBackgroundLayer(layer, project, now);
          createdIds.push(background.id);
          createdCount += 1;
          return [background, layer];
        });

        return {
          ...project,
          layers,
          updatedAt: createdCount > 0 ? now : project.updatedAt,
        };
      });

      if (createdIds.length) {
        set({ selectedLayerId: createdIds[0], selectedLayerIds: createdIds });
      }

      return createdCount;
    },
    applyTimelineCutRanges: (ranges: TimelineCutRange[]) => {
      const state = get();
      const result = applyTimelineCutRangesToLayers(state.project.layers, ranges);
      const rangeCount = result.ranges.length;
      const hasTimelineChange = result.changedLayerCount > 0 || result.removedLayerCount > 0;

      if (!rangeCount || !hasTimelineChange) {
        return {
          changedLayerCount: result.changedLayerCount,
          removedLayerCount: result.removedLayerCount,
          createdLayerCount: result.createdLayerCount,
          rangeCount,
        };
      }

      const nextCurrentTime = shiftTimeAfterCuts(state.currentTime, result.ranges);

      deps.commit((project) => {
        const nextDuration = deps.projectDurationForLayers(
          Math.max(TIMELINE_MIN_LAYER_SECONDS, project.duration - result.durationRemoved),
          result.layers,
        );

        return {
          ...project,
          layers: result.layers,
          duration: nextDuration,
          updatedAt: new Date().toISOString(),
        };
      });

      const selectedLayerIds = result.changedLayerIds.slice(0, 24);
      set({
        selectedLayerId: selectedLayerIds.at(-1) ?? null,
        selectedLayerIds,
        currentTime: Math.max(0, Math.min(nextCurrentTime, get().project.duration)),
      });

      return {
        changedLayerCount: result.changedLayerCount,
        removedLayerCount: result.removedLayerCount,
        createdLayerCount: result.createdLayerCount,
        rangeCount,
      };
    },
    applyAutoDuckingToLayer: (layerId) => {
      const state = get();
      const result = applyAutoDuckingToLayers({
        layers: state.project.layers,
        mediaAssets: state.mediaAssets,
        targetLayerId: layerId,
      });
      if (result.summary.changedLayerCount === 0) return result.summary;

      deps.commit((project) => ({
        ...project,
        layers: result.layers,
        duration: deps.projectDurationForLayers(project.duration, result.layers),
        updatedAt: new Date().toISOString(),
      }));

      return result.summary;
    },
  };
}

function applyLayerPatch(layer: TimelineLayer, patch: Partial<TimelineLayer>, updatedAt: string): TimelineLayer {
  const next = { ...layer, ...patch, updatedAt };
  const timing = clampLayerTiming(finiteNumber(next.start, layer.start), finiteNumber(next.duration, layer.duration));

  return {
    ...next,
    start: timing.start,
    duration: timing.duration,
    trimStart: Math.max(0, finiteNumber(next.trimStart, layer.trimStart)),
    playbackRate: normalizePlaybackRate(finiteNumber(next.playbackRate, layer.playbackRate), layer.playbackRate),
    speed: normalizeLayerSpeed(next.speed, finiteNumber(next.playbackRate, layer.playbackRate)),
    ...normalizeLayerAudioMix(next),
    motion: normalizeLayerMotion(next.motion),
    tracking: normalizeLayerTrackingAttachment(next.tracking),
    transition: normalizeLayerTransition(next.transition, timing.duration),
    style: normalizeLayerVisualStyle(next.style),
    track: Math.max(0, Math.round(finiteNumber(next.track, layer.track))),
  };
}

function createBlurredBackgroundLayer(sourceLayer: TimelineLayer, project: EditorProject, now: string): TimelineLayer {
  return {
    ...sourceLayer,
    id: createId("layer"),
    name: `${sourceLayer.name} blurred background`,
    transform: {
      ...sourceLayer.transform,
      x: 0.5,
      y: 0.5,
      width: project.width,
      height: project.height,
      rotation: 0,
      scale: 1,
      flipX: false,
      flipY: false,
      framing: "fill",
      crop: { x: 0, y: 0, width: 1, height: 1 },
    },
    motion: { preset: "none", intensity: 1 },
    transition: { in: "none", out: "none", duration: 0.5 },
    style: normalizeLayerVisualStyle({
      ...sourceLayer.style,
      opacity: 0.72,
      blur: Math.max(24, sourceLayer.style.blur),
      brightness: 0.72,
      saturation: 0.9,
      borderWidth: 0,
      shadowBlur: 0,
    }),
    muted: true,
    locked: false,
    hidden: false,
    notes: `Blurred background generated from ${sourceLayer.name}.`,
    createdAt: now,
    updatedAt: now,
  };
}

function selectedLayerBounds(layers: TimelineLayer[]) {
  if (layers.length === 0) return null;

  const start = Math.min(...layers.map((layer) => layer.start));
  const end = Math.max(...layers.map((layer) => layer.start + layer.duration));
  return {
    start,
    end,
    duration: Math.max(TIMELINE_MIN_LAYER_SECONDS, end - start),
  };
}

function layerSourceDimensions(layer: TimelineLayer, mediaAssets: MediaAsset[]) {
  const asset = layer.assetId ? mediaAssets.find((item) => item.id === layer.assetId) : undefined;
  const width = finiteNumber(asset?.width, layer.transform.width);
  const height = finiteNumber(asset?.height, layer.transform.height);
  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

function rippleMoveBoundary(
  project: EditorProject,
  selectedIds: string[],
  startDelta: number,
  patch: Partial<Pick<TimelineLayer, "start" | "duration" | "trimStart" | "track">>,
) {
  if (!project.rippleMode || Math.abs(startDelta) < 0.0001 || patch.duration !== undefined || patch.trimStart !== undefined) {
    return null;
  }

  const selected = new Set(selectedIds);
  return selectedLayerBounds(project.layers.filter((layer) => selected.has(layer.id)))?.end ?? null;
}

function alignedLayerStart(
  layer: TimelineLayer,
  bounds: { start: number; end: number; duration: number },
  mode: TimelineAlignmentMode,
  playheadTime: number,
) {
  if (mode === "end") return bounds.end - layer.duration;
  if (mode === "center") return bounds.start + bounds.duration / 2 - layer.duration / 2;
  if (mode === "playhead") return playheadTime;
  return bounds.start;
}

function equalDurationTiming(layers: TimelineLayer[]) {
  const averageDuration = Math.max(
    TIMELINE_MIN_LAYER_SECONDS,
    layers.reduce((sum, layer) => sum + layer.duration, 0) / Math.max(1, layers.length),
  );

  return new Map(layers.map((layer) => [layer.id, { start: layer.start, duration: averageDuration }]));
}

function fillSelectionTiming(layers: TimelineLayer[], bounds: { start: number; duration: number }) {
  const orderedLayers = timelineOrderedLayers(layers);
  const segmentDuration = Math.max(TIMELINE_MIN_LAYER_SECONDS, bounds.duration / Math.max(1, orderedLayers.length));

  return new Map(
    orderedLayers.map((layer, index) => [
      layer.id,
      {
        start: bounds.start + index * segmentDuration,
        duration: segmentDuration,
      },
    ]),
  );
}

function timelineOrderedLayers(layers: TimelineLayer[]) {
  return [...layers].sort((a, b) => a.track - b.track || a.start - b.start || a.name.localeCompare(b.name));
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
