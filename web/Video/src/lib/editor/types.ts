export const PROJECT_FORMAT_VERSION = 1;

export type MediaType = "video" | "image" | "audio";
export type LayerKind = MediaType | "text" | "subtitle" | "shape" | "sticker" | "progress" | "timer";
export type LayerReviewStatus = "none" | "needs-review" | "changes-requested" | "approved";
export type TimelineAlignmentMode = "start" | "end" | "center" | "playhead";
export type TimelineDurationDistributionMode = "equal" | "fill-selection";
export type LayerMotionPreset = "none" | "slow-zoom" | "pan-left" | "pan-right" | "settle";
export type LayerTransitionPreset = "none" | "fade" | "slide" | "crossfade" | "push" | "zoom" | "pop" | "wipe-left" | "wipe-up";
export type LayerFramingMode = "fit" | "fill" | "stretch";
export type LayerSpeedRampMode = "linear";
export type ExportFormat = "mp4" | "webm" | "mov" | "avi" | "mpeg" | "gif" | "png" | "jpg" | "webp" | "wav" | "mp3" | "m4a" | "json";
export type ExportStatus = "queued" | "rendering" | "complete" | "failed" | "cancelled";

export interface AspectPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  mimeType: string;
  size: number;
  duration: number;
  width?: number;
  height?: number;
  waveformPeaks?: number[];
  storageKey: string;
  source: "browser-indexeddb" | "browser-opfs" | "tauri-fs" | "self-hosted-url";
  objectUrl?: string;
  attribution?: MediaAttribution;
  createdAt: string;
}

export type MediaAttributionSourceType = "stock" | "self-hosted" | "browser" | "desktop";

export interface MediaAttribution {
  sourceType: MediaAttributionSourceType;
  providerLabel: string;
  title: string;
  sourceUrl?: string;
  pageUrl?: string;
  licenseLabel?: string;
  licenseUrl?: string;
  attributionText?: string;
  usageNote?: string;
  capturedAt: string;
}

export interface MediaCollection {
  id: string;
  name: string;
  assetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandTypographyPreset {
  id: string;
  name: string;
  headingFontFamily: string;
  bodyFontFamily: string;
  captionFontFamily: string;
  headingWeight: number;
  bodyWeight: number;
  captionWeight: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrandFontAsset {
  id: string;
  name: string;
  family: string;
  mimeType: string;
  size: number;
  storageKey: string;
  source: "browser-indexeddb" | "tauri-fs";
  createdAt: string;
}

export interface BrandKitSettings {
  logoAssetIds: string[];
  fontAssets: BrandFontAsset[];
  defaultLogoAssetId?: string;
  defaultFontAssetId?: string;
  defaultPrimaryColor?: string;
  defaultSecondaryColor?: string;
  defaultTypographyPresetId?: string;
  enforceColors: boolean;
  enforceTypography: boolean;
  enforceLogo: boolean;
}

export interface LayerStylePreset {
  id: string;
  name: string;
  style: LayerStyle;
  createdAt: string;
  updatedAt: string;
}

export interface AudioMixPreset {
  id: string;
  name: string;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  muted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubtitleCue {
  id: string;
  start: number;
  end: number;
  text: string;
  emphasis?: "normal" | "strong" | "quiet";
}

export interface LayerTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  flipX?: boolean;
  flipY?: boolean;
  framing?: LayerFramingMode;
  crop?: LayerCrop;
}

export interface LayerCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayerMotion {
  preset: LayerMotionPreset;
  intensity: number;
}

export type LayerKeyframeEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface LayerKeyframe {
  id: string;
  time: number;
  easing: LayerKeyframeEasing;
  transform?: Partial<Pick<LayerTransform, "x" | "y" | "width" | "height" | "rotation" | "scale" | "crop">>;
  opacity?: number;
}

export interface LayerTransition {
  in: LayerTransitionPreset;
  out: LayerTransitionPreset;
  duration: number;
}

export interface LayerSpeedRamp {
  enabled: boolean;
  mode: LayerSpeedRampMode;
  startRate: number;
  endRate: number;
}

export interface LayerSpeed {
  reversed: boolean;
  preservePitch: boolean;
  ramp: LayerSpeedRamp;
}

export interface LayerTrackingAttachment {
  enabled: boolean;
  targetLayerId: string;
  targetMaskId?: string;
  offsetX: number;
  offsetY: number;
  scaleWithTarget: boolean;
}

export interface LayerChromaKey {
  enabled: boolean;
  color: string;
  similarity: number;
  smoothness: number;
  spill: number;
}

export type LayerBackgroundReplacementMode = "transparent" | "color";

export interface LayerBackgroundReplacement {
  enabled: boolean;
  mode: LayerBackgroundReplacementMode;
  color: string;
  opacity: number;
}

export type LayerObjectMaskMode = "blur" | "solid";
export type LayerObjectMaskTracking = "none" | "center";

export interface LayerObjectMask {
  id: string;
  enabled: boolean;
  mode: LayerObjectMaskMode;
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
  color: string;
  opacity: number;
  tracking: LayerObjectMaskTracking;
}

export interface LayerStyle {
  fill: string;
  stroke: string;
  background: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  radius: number;
  opacity: number;
  blur: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  exposure?: number;
  temperature?: number;
  tint?: number;
  vignette?: number;
  lookPreset?: string;
  borderWidth?: number;
  shadowBlur?: number;
  shadowColor?: string;
  chromaKey?: LayerChromaKey;
  backgroundReplacement?: LayerBackgroundReplacement;
  objectMasks?: LayerObjectMask[];
}

export interface TimelineLayer {
  id: string;
  kind: LayerKind;
  name: string;
  track: number;
  start: number;
  duration: number;
  trimStart: number;
  playbackRate: number;
  speed?: LayerSpeed;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
  assetId?: string;
  groupId?: string;
  text?: string;
  cues?: SubtitleCue[];
  notes?: string;
  reviewStatus?: LayerReviewStatus;
  reviewUpdatedAt?: string;
  locked: boolean;
  muted: boolean;
  hidden: boolean;
  transform: LayerTransform;
  motion?: LayerMotion;
  keyframes?: LayerKeyframe[];
  tracking?: LayerTrackingAttachment;
  transition?: LayerTransition;
  style: LayerStyle;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface EditorProject {
  formatVersion: typeof PROJECT_FORMAT_VERSION;
  id: string;
  title: string;
  aspectRatio: string;
  socialFormatId?: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
  background: string;
  snapInterval?: number;
  rippleMode?: boolean;
  layers: TimelineLayer[];
  markers?: TimelineMarker[];
  mediaCollections?: MediaCollection[];
  layerStylePresets?: LayerStylePreset[];
  audioMixPresets?: AudioMixPreset[];
  brandTypographyPresets?: BrandTypographyPreset[];
  brandKit?: BrandKitSettings;
  updatedAt: string;
}

export interface ExportJob {
  id: string;
  projectId: string;
  format: ExportFormat;
  preset: string;
  status: ExportStatus;
  progress: number;
  outputName: string;
  sourceSnapshot?: ExportSourceSnapshot;
  reviewSnapshot?: ExportReviewSnapshot;
  exportQaSnapshot?: ExportQaSnapshot;
  mediaAttributionSummary?: MediaAttributionSummary;
  renderedFile?: RenderedExportFile;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportSourceSnapshot {
  projectTitle: string;
  projectUpdatedAt: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  layerCount: number;
  mediaAssetCount: number;
  capturedAt: string;
}

export interface ExportReviewSnapshot {
  status: "ready" | "review" | "blocked";
  issueCount: number;
  blockers: number;
  warnings: number;
  capturedAt: string;
}

export type ExportQaSnapshotStatus = "ready" | "review" | "blocked";

export type ExportQaSnapshotSectionId = "format" | "safe-zones" | "subtitles" | "audio-loudness" | "missing-media" | "render-route";

export interface ExportQaSnapshotSection {
  id: ExportQaSnapshotSectionId;
  label: string;
  status: ExportQaSnapshotStatus;
  summary: string;
  detail: string;
}

export interface ExportQaSnapshot {
  status: ExportQaSnapshotStatus;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  sections: ExportQaSnapshotSection[];
  capturedAt: string;
  preset: string;
  format: ExportFormat;
  renderRouteLabel: string;
  renderRouteStatus: string;
}

export type MediaAttributionStatus = "ready" | "review";

export interface MediaAttributionItem {
  assetId: string;
  assetName: string;
  sourceType: MediaAttributionSourceType;
  sourceLabel: string;
  status: MediaAttributionStatus;
  licenseLabel?: string;
  licenseUrl?: string;
  attributionText?: string;
  pageUrl?: string;
  sourceUrl?: string;
  detail: string;
}

export interface MediaAttributionSummary {
  status: MediaAttributionStatus;
  itemCount: number;
  stockCount: number;
  selfHostedCount: number;
  browserCount: number;
  desktopCount: number;
  reviewCount: number;
  generatedAt: string;
  items: MediaAttributionItem[];
}

export interface RenderedExportFile {
  filename: string;
  format: ExportFormat;
  mimeType: string;
  size: number;
  path?: string;
  savedAt: string;
}
