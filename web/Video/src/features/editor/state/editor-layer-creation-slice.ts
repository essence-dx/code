"use client";

import { createLayerFromAsset, createProgressLayer, createShapeLayer, createTextLayer, createTimerLayer, cuesFromAi } from "@/lib/editor/factory";
import type { EditorProject, MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { createMediaLayoutLayers, type MediaLayoutMode } from "@/lib/editor/media-layouts";
import { createMemeLayers, type MemeStyle } from "@/lib/editor/meme";
import { createStickerLayer, stickerPresets } from "@/lib/editor/templates";
import { TIMELINE_MIN_LAYER_SECONDS } from "@/lib/editor/timeline";
import { normalizeLayerTransition } from "@/lib/editor/transitions";
import { normalizeLayerVisualStyle } from "@/lib/editor/visual-effects";
import { captureVideoFreezeFrame } from "@/lib/media/freeze-frame";
import type { EditorState, EditorStoreGet, EditorStoreSet } from "@/features/editor/state/editor-store-types";

type EditorLayerCreationSlice = Pick<
  EditorState,
  | "addLayerFromAsset"
  | "addTextLayer"
  | "addSubtitleLayer"
  | "addSubtitleLayerFromCues"
  | "addShapeLayer"
  | "addProgressLayer"
  | "addTimerLayer"
  | "createFreezeFramesFromSelectedVideoLayers"
  | "extractAudioFromSelectedVideoLayers"
  | "replaceSelectedVideoAudio"
  | "addSticker"
  | "addMemeLayout"
  | "addMediaLayout"
  | "addAiCaptions"
>;

type EditorLayerCreationDeps = {
  addLayer: (layer: TimelineLayer) => void;
  addLayers: (layers: TimelineLayer[]) => void;
  commit: (mutator: (project: EditorProject) => EditorProject) => void;
  cloneLayer: (layer: TimelineLayer, patch: Partial<TimelineLayer>) => TimelineLayer;
  createReplacementAudioLayer: (
    sourceLayer: TimelineLayer,
    assetId: string,
    assetName: string,
    track: number,
    duration: number,
    now: string,
  ) => TimelineLayer;
  formatFreezeFrameTime: (seconds: number) => string;
  getSelectedLayerIds: (state: Pick<EditorState, "selectedLayerId" | "selectedLayerIds">) => string[];
  groupAwareLayerIds: (layers: TimelineLayer[], layerIds: string[]) => string[];
  nextTrack: (layers: TimelineLayer[]) => number;
  projectDurationForLayers: (baseDuration: number, layers: TimelineLayer[]) => number;
};

export function createEditorLayerCreationSlice(
  set: EditorStoreSet,
  get: EditorStoreGet,
  deps: EditorLayerCreationDeps,
): EditorLayerCreationSlice {
  return {
    addLayerFromAsset: (assetId, options) => {
      const asset = get().mediaAssets.find((item) => item.id === assetId);
      if (!asset) return null;
      const now = new Date().toISOString();
      const layer = createLayerFromAsset(asset, options?.track ?? deps.nextTrack(get().project.layers));
      const optionTransform = options?.transform;
      const nextLayer = {
        ...layer,
        start: Math.max(0, options?.start ?? layer.start),
        duration: Math.max(TIMELINE_MIN_LAYER_SECONDS, options?.duration ?? layer.duration),
        name: options?.name?.trim() || layer.name,
        notes: options?.notes ?? layer.notes,
        volume: options?.volume ?? layer.volume,
        fadeIn: options?.fadeIn ?? layer.fadeIn,
        fadeOut: options?.fadeOut ?? layer.fadeOut,
        muted: options?.muted ?? layer.muted,
        transform: optionTransform
          ? {
              ...layer.transform,
              ...optionTransform,
              crop: optionTransform.crop ? { ...optionTransform.crop } : layer.transform.crop,
            }
          : layer.transform,
        updatedAt: now,
      };
      deps.addLayer(nextLayer);
      return nextLayer.id;
    },
    addTextLayer: () =>
      deps.addLayer(placeLayerAtPlayhead(createTextLayer("text", deps.nextTrack(get().project.layers)), get().currentTime)),
    addSubtitleLayer: () =>
      deps.addLayer(placeLayerAtPlayhead(createTextLayer("subtitle", deps.nextTrack(get().project.layers)), get().currentTime)),
    addSubtitleLayerFromCues: (input) => {
      const cues = input.cues.filter((cue) => cue.end > cue.start && cue.text.trim());
      if (!cues.length) return null;

      const layer = createTextLayer("subtitle", deps.nextTrack(get().project.layers));
      layer.name = input.name.trim() || "Imported captions";
      layer.cues = cues;
      layer.duration = Math.max(...cues.map((cue) => cue.end), 5);
      deps.addLayer(layer);
      return layer.id;
    },
    addShapeLayer: () =>
      deps.addLayer(placeLayerAtPlayhead(createShapeLayer(deps.nextTrack(get().project.layers)), get().currentTime)),
    addProgressLayer: () =>
      deps.addLayer(placeLayerAtPlayhead(createProgressLayer(deps.nextTrack(get().project.layers)), get().currentTime)),
    addTimerLayer: () =>
      deps.addLayer(placeLayerAtPlayhead(createTimerLayer(deps.nextTrack(get().project.layers)), get().currentTime)),
    createFreezeFramesFromSelectedVideoLayers: async () => {
      const state = get();
      const selectedIds = deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state));
      const sourceLayers = state.project.layers.filter((layer) => selectedIds.includes(layer.id) && layer.kind === "video" && layer.assetId && !layer.locked);
      const now = new Date().toISOString();
      const createdAssets: MediaAsset[] = [];
      const createdLayers: TimelineLayer[] = [];
      let skipped = 0;
      let track = deps.nextTrack(state.project.layers);

      for (const sourceLayer of sourceLayers) {
        const sourceAsset = state.mediaAssets.find((asset) => asset.id === sourceLayer.assetId);
        if (!sourceAsset?.objectUrl) {
          skipped += 1;
          continue;
        }

        try {
          const frame = await captureVideoFreezeFrame({ layer: sourceLayer, asset: sourceAsset, currentTime: state.currentTime });
          const start = Math.min(
            sourceLayer.start + sourceLayer.duration - TIMELINE_MIN_LAYER_SECONDS,
            Math.max(sourceLayer.start, state.currentTime),
          );
          const duration = Math.max(TIMELINE_MIN_LAYER_SECONDS, Math.min(2, sourceLayer.start + sourceLayer.duration - start));
          const freezeLayer = createLayerFromAsset(frame.asset, track++);
          createdAssets.push(frame.asset);
          createdLayers.push({
            ...freezeLayer,
            name: `${sourceLayer.name} freeze frame`,
            start,
            duration,
            transform: { ...sourceLayer.transform },
            motion: { preset: "none", intensity: 1 },
            transition: normalizeLayerTransition(sourceLayer.transition, duration),
            style: normalizeLayerVisualStyle(sourceLayer.style),
            notes: `Freeze frame from ${sourceLayer.name} at ${deps.formatFreezeFrameTime(frame.localTime)}.`,
            createdAt: now,
            updatedAt: now,
          });
        } catch {
          skipped += 1;
        }
      }

      if (createdAssets.length > 0) {
        set((current) => ({ mediaAssets: [...current.mediaAssets, ...createdAssets] }));
        deps.addLayers(createdLayers);
      }

      return { created: createdLayers.length, skipped };
    },
    extractAudioFromSelectedVideoLayers: () => {
      const state = get();
      const selectedIds = deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state));
      const sourceLayers = state.project.layers.filter((layer) => selectedIds.includes(layer.id) && layer.kind === "video" && layer.assetId && !layer.locked);
      if (!sourceLayers.length) return 0;

      const now = new Date().toISOString();
      const sourceIds = new Set(sourceLayers.map((layer) => layer.id));
      const firstTrack = deps.nextTrack(state.project.layers);
      const audioLayers = sourceLayers.map((layer, index) =>
        deps.cloneLayer(layer, {
          id: crypto.randomUUID(),
          kind: "audio",
          name: `${layer.name} audio`,
          track: firstTrack + index,
          transform: { ...layer.transform },
          muted: false,
          hidden: false,
          createdAt: now,
          updatedAt: now,
        }),
      );

      deps.commit((project) => {
        const layers = [
          ...project.layers.map((layer) => (sourceIds.has(layer.id) ? { ...layer, muted: true, updatedAt: now } : layer)),
          ...audioLayers,
        ];

        return {
          ...project,
          layers,
          duration: deps.projectDurationForLayers(project.duration, layers),
          updatedAt: now,
        };
      });

      set({ selectedLayerId: audioLayers.at(-1)?.id ?? null, selectedLayerIds: audioLayers.map((layer) => layer.id) });
      return audioLayers.length;
    },
    replaceSelectedVideoAudio: (assetId) => {
      const state = get();
      const asset = state.mediaAssets.find((item) => item.id === assetId && item.type === "audio");
      if (!asset) return 0;

      const selectedIds = deps.groupAwareLayerIds(state.project.layers, deps.getSelectedLayerIds(state));
      const sourceLayers = state.project.layers.filter((layer) => selectedIds.includes(layer.id) && layer.kind === "video" && !layer.locked);
      if (!sourceLayers.length) return 0;

      const now = new Date().toISOString();
      const sourceIds = new Set(sourceLayers.map((layer) => layer.id));
      const firstTrack = deps.nextTrack(state.project.layers);
      const audioLayers = sourceLayers.map((layer, index) => {
        const duration = Math.min(layer.duration, Math.max(asset.duration || layer.duration, TIMELINE_MIN_LAYER_SECONDS));

        return deps.createReplacementAudioLayer(layer, asset.id, asset.name, firstTrack + index, duration, now);
      });

      deps.commit((project) => {
        const layers = [
          ...project.layers.map((layer) => (sourceIds.has(layer.id) ? { ...layer, muted: true, updatedAt: now } : layer)),
          ...audioLayers,
        ];

        return {
          ...project,
          layers,
          duration: deps.projectDurationForLayers(project.duration, layers),
          updatedAt: now,
        };
      });

      set({ selectedLayerId: audioLayers.at(-1)?.id ?? null, selectedLayerIds: audioLayers.map((layer) => layer.id) });
      return audioLayers.length;
    },
    addSticker: (stickerId) => {
      const preset = stickerPresets.find((item) => item.id === stickerId);
      if (!preset) return;

      deps.addLayer(createStickerLayer(preset, deps.nextTrack(get().project.layers)));
    },
    addMemeLayout: (input: { assetId?: string; topText: string; bottomText: string; duration: number; style: MemeStyle }) => {
      const asset = input.assetId ? get().mediaAssets.find((item) => item.id === input.assetId) : undefined;
      const layers = createMemeLayers({
        project: get().project,
        asset,
        topText: input.topText,
        bottomText: input.bottomText,
        duration: input.duration,
        style: input.style,
        track: deps.nextTrack(get().project.layers),
      });
      deps.addLayers(layers);
    },
    addMediaLayout: (input: { assetIds: string[]; mode: MediaLayoutMode; clipSeconds: number }) => {
      const assets = input.assetIds
        .map((assetId) => get().mediaAssets.find((asset) => asset.id === assetId))
        .filter((asset): asset is MediaAsset => Boolean(asset));
      const layers = createMediaLayoutLayers({
        project: get().project,
        assets,
        mode: input.mode,
        clipSeconds: input.clipSeconds,
        track: deps.nextTrack(get().project.layers),
      });
      deps.addLayers(layers);
    },
    addAiCaptions: (captions) => {
      const layer = createTextLayer("subtitle", deps.nextTrack(get().project.layers));
      layer.cues = cuesFromAi(captions);
      layer.duration = Math.max(...layer.cues.map((cue) => cue.end), 5);
      deps.addLayer(layer);
    },
  };
}

function placeLayerAtPlayhead(layer: TimelineLayer, currentTime: number): TimelineLayer {
  return {
    ...layer,
    start: Math.max(0, currentTime),
    updatedAt: new Date().toISOString(),
  };
}
