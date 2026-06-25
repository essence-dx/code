import { z } from "zod";
import { PROJECT_FORMAT_VERSION } from "@/lib/editor/types";
import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import type { ProjectSyncConflictPolicy } from "@/lib/projects/project-sync-conflicts";

const idSchema = z.string().min(1).max(160);
const nameSchema = z.string().min(1).max(240);
const colorSchema = z.string().min(1).max(64);
const dateStringSchema = z.string().min(1).max(80);
const secondsSchema = z.number().finite().min(0).max(7200);
const dimensionSchema = z.number().finite().int().min(1).max(7680);
const trackSchema = z.number().finite().int().min(0).max(128);
const playbackRateSchema = z.number().finite().min(0.05).max(16);
const volumeSchema = z.number().finite().min(0).max(2);

const subtitleCueSchema = z
  .object({
    id: idSchema,
    start: secondsSchema,
    end: secondsSchema,
    text: z.string().min(1).max(2000),
    emphasis: z.enum(["normal", "strong", "quiet"]).optional(),
  })
  .refine((cue) => cue.end > cue.start, "Caption end time must be after the start time.");

const layerTransformSchema = z.object({
  x: z.number().finite().min(-10).max(10),
  y: z.number().finite().min(-10).max(10),
  width: z.number().finite().min(1).max(20000),
  height: z.number().finite().min(1).max(20000),
  rotation: z.number().finite().min(-3600).max(3600),
  scale: z.number().finite().min(0.01).max(100),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  framing: z.enum(["fit", "fill", "stretch"]).optional(),
  crop: z
    .object({
      x: z.number().finite().min(0).max(1),
      y: z.number().finite().min(0).max(1),
      width: z.number().finite().min(0.01).max(1),
      height: z.number().finite().min(0.01).max(1),
    })
    .optional(),
});

const layerMotionSchema = z.object({
  preset: z.enum(["none", "slow-zoom", "pan-left", "pan-right", "settle"]),
  intensity: z.number().finite().min(0.1).max(3),
});

const layerKeyframeSchema = z.object({
  id: idSchema,
  time: secondsSchema,
  easing: z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]),
  transform: z
    .object({
      x: z.number().finite().min(-10).max(10).optional(),
      y: z.number().finite().min(-10).max(10).optional(),
      width: z.number().finite().min(1).max(20000).optional(),
      height: z.number().finite().min(1).max(20000).optional(),
      rotation: z.number().finite().min(-3600).max(3600).optional(),
      scale: z.number().finite().min(0.01).max(100).optional(),
      crop: z
        .object({
          x: z.number().finite().min(0).max(1),
          y: z.number().finite().min(0).max(1),
          width: z.number().finite().min(0.01).max(1),
          height: z.number().finite().min(0.01).max(1),
        })
        .optional(),
    })
    .optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
});

const layerTransitionSchema = z.object({
  in: z.enum(["none", "fade", "slide", "crossfade", "push", "zoom", "pop", "wipe-left", "wipe-up"]),
  out: z.enum(["none", "fade", "slide", "crossfade", "push", "zoom", "pop", "wipe-left", "wipe-up"]),
  duration: z.number().finite().min(0).max(3),
});

const layerSpeedSchema = z.object({
  reversed: z.boolean(),
  preservePitch: z.boolean(),
  ramp: z.object({
    enabled: z.boolean(),
    mode: z.enum(["linear"]),
    startRate: playbackRateSchema,
    endRate: playbackRateSchema,
  }),
});

const layerTrackingAttachmentSchema = z.object({
  enabled: z.boolean(),
  targetLayerId: idSchema,
  targetMaskId: idSchema.optional(),
  offsetX: z.number().finite().min(-1).max(1),
  offsetY: z.number().finite().min(-1).max(1),
  scaleWithTarget: z.boolean(),
});

const layerStyleSchema = z.object({
  fill: colorSchema,
  stroke: colorSchema,
  background: colorSchema,
  fontFamily: z.string().min(1).max(120),
  fontSize: z.number().finite().min(1).max(300),
  fontWeight: z.number().finite().min(100).max(1000),
  radius: z.number().finite().min(0).max(1000),
  opacity: z.number().finite().min(0).max(1),
  blur: z.number().finite().min(0).max(100),
  brightness: z.number().finite().min(0).max(2).optional(),
  contrast: z.number().finite().min(0).max(2).optional(),
  saturation: z.number().finite().min(0).max(2).optional(),
  exposure: z.number().finite().min(-1).max(1).optional(),
  temperature: z.number().finite().min(-1).max(1).optional(),
  tint: z.number().finite().min(-1).max(1).optional(),
  vignette: z.number().finite().min(0).max(1).optional(),
  lookPreset: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/i).optional(),
  borderWidth: z.number().finite().min(0).max(80).optional(),
  shadowBlur: z.number().finite().min(0).max(120).optional(),
  shadowColor: colorSchema.optional(),
  chromaKey: z
    .object({
      enabled: z.boolean(),
      color: z.string().regex(/^#[0-9a-f]{6}$/i),
      similarity: z.number().finite().min(0).max(1),
      smoothness: z.number().finite().min(0).max(0.5),
      spill: z.number().finite().min(0).max(1),
    })
    .optional(),
  backgroundReplacement: z
    .object({
      enabled: z.boolean(),
      mode: z.enum(["transparent", "color"]),
      color: z.string().regex(/^#[0-9a-f]{6}$/i),
      opacity: z.number().finite().min(0).max(1),
    })
    .optional(),
  objectMasks: z
    .array(
      z.object({
        id: idSchema,
        enabled: z.boolean(),
        mode: z.enum(["blur", "solid"]),
        x: z.number().finite().min(0).max(1),
        y: z.number().finite().min(0).max(1),
        width: z.number().finite().min(0.01).max(1),
        height: z.number().finite().min(0.01).max(1),
        intensity: z.number().finite().min(1).max(48),
        color: z.string().regex(/^#[0-9a-f]{6}$/i),
        opacity: z.number().finite().min(0).max(1),
        tracking: z.enum(["none", "center"]),
      }),
    )
    .max(20)
    .optional(),
});

const audioMixPresetSchema = z.object({
  id: idSchema,
  name: nameSchema,
  volume: volumeSchema,
  fadeIn: secondsSchema,
  fadeOut: secondsSchema,
  muted: z.boolean(),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

const timelineLayerSchema = z
  .object({
    id: idSchema,
    kind: z.enum(["video", "image", "audio", "text", "subtitle", "shape", "sticker", "progress", "timer"]),
    name: nameSchema,
    track: trackSchema,
    start: secondsSchema,
    duration: secondsSchema,
    trimStart: secondsSchema,
    playbackRate: playbackRateSchema,
    speed: layerSpeedSchema.optional(),
    volume: volumeSchema.optional(),
    fadeIn: secondsSchema.optional(),
    fadeOut: secondsSchema.optional(),
    assetId: idSchema.optional(),
    groupId: idSchema.optional(),
    text: z.string().max(12000).optional(),
    cues: z.array(subtitleCueSchema).max(2000).optional(),
    notes: z.string().max(12000).optional(),
    reviewStatus: z.enum(["none", "needs-review", "changes-requested", "approved"]).optional(),
    reviewUpdatedAt: dateStringSchema.optional(),
    locked: z.boolean(),
    muted: z.boolean(),
    hidden: z.boolean(),
    transform: layerTransformSchema,
    motion: layerMotionSchema.optional(),
    keyframes: z.array(layerKeyframeSchema).max(200).optional(),
    tracking: layerTrackingAttachmentSchema.optional(),
    transition: layerTransitionSchema.optional(),
    style: layerStyleSchema,
    createdAt: dateStringSchema,
    updatedAt: dateStringSchema,
  })
  .refine((layer) => layer.start + layer.duration <= 7200, "Layer end time exceeds the project limit.");

const timelineMarkerSchema = z.object({
  id: idSchema,
  time: secondsSchema,
  label: z.string().min(1).max(80),
  color: colorSchema,
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

const mediaCollectionSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(80),
  assetIds: z.array(idSchema).max(1000),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

const layerStylePresetSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(80),
  style: layerStyleSchema,
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

const brandTypographyPresetSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(80),
  headingFontFamily: z.string().min(1).max(160),
  bodyFontFamily: z.string().min(1).max(160),
  captionFontFamily: z.string().min(1).max(160),
  headingWeight: z.number().finite().min(100).max(1000),
  bodyWeight: z.number().finite().min(100).max(1000),
  captionWeight: z.number().finite().min(100).max(1000),
  createdAt: dateStringSchema,
  updatedAt: dateStringSchema,
});

const brandFontAssetSchema = z.object({
  id: idSchema,
  name: nameSchema,
  family: z.string().min(1).max(160),
  mimeType: z.string().min(1).max(120),
  size: z.number().finite().int().min(1).max(25 * 1024 * 1024),
  storageKey: z.string().min(1).max(2000),
  source: z.enum(["browser-indexeddb", "tauri-fs"]),
  createdAt: dateStringSchema,
});

const brandKitSchema = z.object({
  logoAssetIds: z.array(idSchema).max(24),
  fontAssets: z.array(brandFontAssetSchema).max(24).default([]),
  defaultLogoAssetId: idSchema.optional(),
  defaultFontAssetId: idSchema.optional(),
  defaultPrimaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  defaultSecondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  defaultTypographyPresetId: idSchema.optional(),
  enforceColors: z.boolean(),
  enforceTypography: z.boolean(),
  enforceLogo: z.boolean(),
});

export const mediaAssetSchema = z.object({
  id: idSchema,
  name: nameSchema,
  type: z.enum(["video", "image", "audio"]),
  mimeType: z.string().min(1).max(120),
  size: z.number().finite().int().min(0).max(50 * 1024 * 1024 * 1024),
  duration: secondsSchema,
  width: dimensionSchema.optional(),
  height: dimensionSchema.optional(),
  waveformPeaks: z.array(z.number().finite().min(0).max(1)).max(2048).optional(),
  storageKey: z.string().min(1).max(2000),
  source: z.enum(["browser-indexeddb", "browser-opfs", "tauri-fs", "self-hosted-url"]),
  attribution: z
    .object({
      sourceType: z.enum(["stock", "self-hosted", "browser", "desktop"]),
      providerLabel: z.string().min(1).max(160),
      title: z.string().min(1).max(240),
      sourceUrl: z.string().url().max(2000).optional(),
      pageUrl: z.string().url().max(2000).optional(),
      licenseLabel: z.string().min(1).max(160).optional(),
      licenseUrl: z.string().url().max(2000).optional(),
      attributionText: z.string().min(1).max(500).optional(),
      usageNote: z.string().min(1).max(500).optional(),
      capturedAt: dateStringSchema,
    })
    .optional(),
  createdAt: dateStringSchema,
});

export const projectSchema = z.object({
  formatVersion: z.literal(PROJECT_FORMAT_VERSION),
  id: idSchema,
  title: z.string().min(1).max(160),
  aspectRatio: z.string().min(1).max(16),
  socialFormatId: z.string().min(1).max(80).optional(),
  width: dimensionSchema,
  height: dimensionSchema,
  duration: secondsSchema,
  fps: z.number().finite().min(1).max(120),
  background: colorSchema,
  snapInterval: z.number().finite().min(0.05).max(5).optional(),
  rippleMode: z.boolean().optional(),
  layers: z.array(timelineLayerSchema).max(1000),
  markers: z.array(timelineMarkerSchema).max(500).optional(),
  mediaCollections: z.array(mediaCollectionSchema).max(100).optional(),
  layerStylePresets: z.array(layerStylePresetSchema).max(100).optional(),
  audioMixPresets: z.array(audioMixPresetSchema).max(100).optional(),
  brandTypographyPresets: z.array(brandTypographyPresetSchema).max(100).optional(),
  brandKit: brandKitSchema.optional(),
  updatedAt: dateStringSchema,
}) satisfies z.ZodType<EditorProject>;

export const syncedProjectPayloadSchema = z.object({
  project: projectSchema,
  mediaAssets: z.array(mediaAssetSchema),
  sync: z
    .object({
      baseUpdatedAt: dateStringSchema.optional(),
      mode: z.enum(["reject-stale", "force"]).optional(),
    })
    .optional(),
});

export const projectBundleSchema = z
  .object({
    project: projectSchema,
    mediaAssets: z.array(mediaAssetSchema).optional(),
    assets: z.array(mediaAssetSchema).optional(),
  })
  .transform((bundle) => ({
    project: bundle.project,
    mediaAssets: sanitizeMediaAssets(bundle.mediaAssets ?? bundle.assets ?? []),
  }));

export type SyncedProjectPayload = {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  sync?: ProjectSyncConflictPolicy;
};

export type ProjectBundlePayload = SyncedProjectPayload;

export function sanitizeMediaAssets(mediaAssets: MediaAsset[]) {
  return mediaAssets.map((asset) => ({ ...asset, objectUrl: undefined }));
}
