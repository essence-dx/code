import type {
  BrandKitSettings,
  BrandFontAsset,
  BrandTypographyPreset,
  EditorProject,
  ExportFormat,
  ExportJob,
  MediaAsset,
  MediaCollection,
  SubtitleCue,
  TimelineAlignmentMode,
  TimelineDurationDistributionMode,
  TimelineLayer,
  TimelineMarker,
} from "@/lib/editor/types";
import type { MediaLayoutMode } from "@/lib/editor/media-layouts";
import type { MemeStyle } from "@/lib/editor/meme";
import type { SavedEditorTemplate } from "@/lib/editor/templates";
import type { TimelineCutRange } from "@/lib/editor/timeline-cuts";
import type { AutoDuckingSummary } from "@/lib/audio/auto-ducking";

export interface RemovedMediaRecovery {
  asset: MediaAsset;
  layers: TimelineLayer[];
  removedAt: string;
}

export interface EditorState {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  selectedLayerId: string | null;
  selectedLayerIds: string[];
  currentTime: number;
  isPlaying: boolean;
  exportJobs: ExportJob[];
  brandColors: string[];
  favoriteMediaAssetIds: string[];
  savedTemplates: SavedEditorTemplate[];
  lastRemovedMedia: RemovedMediaRecovery | null;
  showSafeZones: boolean;
  past: EditorProject[];
  future: EditorProject[];
  createNewProject: (title?: string, aspectRatio?: string) => void;
  loadProject: (project: EditorProject, mediaAssets?: MediaAsset[]) => void;
  setProjectTitle: (title: string) => void;
  setAspectRatio: (aspectRatio: string) => void;
  setTimelineSnapInterval: (seconds: number) => void;
  setTimelineRippleMode: (enabled: boolean) => void;
  setCurrentTime: (time: number) => void;
  addTimelineMarker: (time?: number) => TimelineMarker;
  updateTimelineMarker: (markerId: string, patch: Partial<Pick<TimelineMarker, "time" | "label" | "color">>) => void;
  removeTimelineMarker: (markerId: string) => void;
  setPlayback: (playing: boolean) => void;
  togglePlayback: () => void;
  addMediaAsset: (asset: MediaAsset) => void;
  toggleFavoriteMediaAsset: (assetId: string) => boolean;
  createMediaCollection: (name: string) => MediaCollection | null;
  removeMediaCollection: (collectionId: string) => void;
  toggleMediaAssetCollection: (collectionId: string, assetId: string) => boolean;
  removeMediaAsset: (assetId: string) => { removedAsset: boolean; removedLayerCount: number };
  restoreLastRemovedMedia: () => boolean;
  addLayerFromAsset: (
    assetId: string,
    options?: Partial<Pick<TimelineLayer, "start" | "duration" | "track" | "name" | "notes" | "transform" | "volume" | "fadeIn" | "fadeOut" | "muted">>,
  ) => string | null;
  addTextLayer: () => void;
  addSubtitleLayer: () => void;
  addSubtitleLayerFromCues: (input: { name: string; cues: SubtitleCue[] }) => string | null;
  addShapeLayer: () => void;
  addProgressLayer: () => void;
  addTimerLayer: () => void;
  createFreezeFramesFromSelectedVideoLayers: () => Promise<{ created: number; skipped: number }>;
  extractAudioFromSelectedVideoLayers: () => number;
  replaceSelectedVideoAudio: (assetId: string) => number;
  addTemplate: (templateId: string) => void;
  addSavedTemplate: (templateId: string) => { addedLayerCount: number; missingAssetCount: number };
  saveCurrentTimelineAsTemplate: (label?: string) => { saved: boolean; layerCount: number; templateName?: string };
  removeSavedTemplate: (templateId: string) => void;
  saveSelectedLayerStylePreset: (name?: string) => { saved: boolean; presetName?: string };
  applyLayerStylePreset: (presetId: string) => number;
  removeLayerStylePreset: (presetId: string) => void;
  saveSelectedAudioMixPreset: (name?: string) => { saved: boolean; presetName?: string };
  applyAudioMixPreset: (presetId: string) => number;
  removeAudioMixPreset: (presetId: string) => void;
  saveBrandTypographyPreset: (input: {
    name: string;
    headingFontFamily: string;
    bodyFontFamily: string;
    captionFontFamily: string;
  }) => BrandTypographyPreset | null;
  applyBrandTypographyPreset: (presetId: string, role: "heading" | "body" | "caption") => number;
  removeBrandTypographyPreset: (presetId: string) => void;
  updateBrandKitSettings: (patch: Partial<BrandKitSettings>) => void;
  addBrandLogoAsset: (assetId: string) => boolean;
  removeBrandLogoAsset: (assetId: string) => void;
  addBrandFontAsset: (asset: BrandFontAsset) => boolean;
  removeBrandFontAsset: (assetId: string) => void;
  applyBrandKitToSelected: () => number;
  addSticker: (stickerId: string) => void;
  addMemeLayout: (input: { assetId?: string; topText: string; bottomText: string; duration: number; style: MemeStyle }) => void;
  addMediaLayout: (input: { assetIds: string[]; mode: MediaLayoutMode; clipSeconds: number }) => void;
  addBrandColor: (color: string) => void;
  applyBrandColorToSelected: (color: string) => void;
  toggleSafeZones: () => void;
  isolateSelectedLayers: () => void;
  showAllLayers: () => void;
  setSelectedLayersHidden: (hidden: boolean) => number;
  setSelectedLayersLocked: (locked: boolean) => number;
  groupSelectedLayers: () => { grouped: boolean; layerCount: number };
  ungroupSelectedLayers: () => number;
  selectLayerGroup: (groupId: string) => void;
  addAiCaptions: (captions: Array<{ start: number; end: number; text: string; emphasis?: "normal" | "strong" | "quiet" }>) => void;
  selectLayer: (layerId: string | null, additive?: boolean) => void;
  selectLayerRange: (layerId: string) => void;
  updateLayer: (layerId: string, patch: Partial<TimelineLayer>, options?: { history?: boolean }) => void;
  updateSelectedLayerTiming: (
    layerId: string,
    patch: Partial<Pick<TimelineLayer, "start" | "duration" | "trimStart" | "track">>,
    options?: { history?: boolean; snap?: boolean },
  ) => void;
  updateSelectedLayersBounds: (patch: Partial<{ start: number; end: number; duration: number }>) => number;
  nudgeSelectedLayers: (input: { timeDelta?: number; trackDelta?: number }) => number;
  alignSelectedLayers: (mode: TimelineAlignmentMode) => number;
  distributeSelectedLayerDurations: (mode: TimelineDurationDistributionMode) => number;
  centerSelectedLayers: () => number;
  fitSelectedLayersToCanvas: (mode: "cover" | "contain") => number;
  addBlurredBackgroundForSelectedMediaLayers: () => number;
  applyTimelineCutRanges: (ranges: TimelineCutRange[]) => {
    changedLayerCount: number;
    removedLayerCount: number;
    createdLayerCount: number;
    rangeCount: number;
  };
  applyAutoDuckingToLayer: (layerId: string) => AutoDuckingSummary;
  pushHistorySnapshot: () => void;
  removeSelectedLayer: () => void;
  removeSelectedLayers: () => void;
  duplicateSelectedLayer: () => void;
  duplicateSelectedLayers: () => void;
  splitSelectedLayer: () => void;
  splitSelectedLayers: () => void;
  moveLayerTrack: (layerId: string, direction: -1 | 1) => void;
  undo: () => void;
  redo: () => void;
  queueExport: (
    format: ExportFormat,
    preset: string,
    options?: { exportQaSnapshot?: ExportJob["exportQaSnapshot"]; mediaAttributionSummary?: ExportJob["mediaAttributionSummary"] },
  ) => ExportJob;
  updateExportJob: (jobId: string, patch: Partial<ExportJob>) => void;
  removeExportJob: (jobId: string) => void;
  clearFinishedExportJobs: () => number;
}

export type EditorStoreGet = () => EditorState;
export type EditorStoreSet = (partial: Partial<EditorState> | ((state: EditorState) => Partial<EditorState>)) => void;
