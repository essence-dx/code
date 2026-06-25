"use client";

import type { EditorProject, MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { loadBrowserMediaBlob } from "@/lib/media/browser-media-store";
import { checkSelfHostedMediaAvailable } from "@/lib/media/self-hosted-media";
import { isTauriRuntime, loadTauriMediaBlob } from "@/lib/media/tauri-media";
import { isAudioExportFormat, isStillImageExportFormat } from "@/lib/render/export-formats";
import type { RenderPlan } from "@/lib/render/export-planner";
import { planUsesTransparentBackground } from "@/lib/render/export-planner";

export interface RenderPreflightResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export async function preflightRenderPlan(plan: RenderPlan, project: EditorProject, assets: MediaAsset[]): Promise<RenderPreflightResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (plan.mode === "project-bundle") {
    return { ok: true, errors, warnings };
  }

  if (!plan.supported && plan.reason) {
    errors.push(plan.reason);
  }

  if (project.duration <= 0 || plan.duration <= 0) {
    errors.push("Project duration must be greater than 0 seconds before exporting.");
  }

  const visibleLayers = project.layers.filter((layer) => !layer.hidden);
  if (!visibleLayers.length) {
    errors.push("Add at least one visible layer before exporting media.");
  }

  const audioOnlyTimeline = visibleLayers.length > 0 && visibleLayers.every((layer) => layer.kind === "audio");
  if (audioOnlyTimeline && !isAudioExportFormat(plan.format)) {
    errors.push("Use an audio preset for audio-only export, or add a visual layer before exporting video, GIF, or image files.");
  }

  if (isAudioExportFormat(plan.format) && plan.mode !== "single-media-ffmpeg") {
    errors.push("Audio export currently supports one available audio or video layer. Export a project bundle for multi-layer audio projects.");
  }

  const usesTransparentCompositeGif = plan.mode === "composite" && plan.format === "gif" && planUsesTransparentBackground(plan);
  if (
    plan.mode === "composite" &&
    !usesTransparentCompositeGif &&
    !isStillImageExportFormat(plan.format) &&
    (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream)
  ) {
    errors.push("This browser cannot record canvas exports. Try the desktop app or a Chromium-based browser.");
  }

  if (plan.mode === "single-media-ffmpeg" && plan.primaryAsset?.type === "audio") {
    if (!isAudioExportFormat(plan.format)) {
      errors.push("Use an audio preset for audio-only export, or add a visual layer before video export.");
    }
  }

  if (plan.format === "gif" && planUsesTransparentBackground(plan) && !isTransparentGifSourcePlan(plan) && !usesTransparentCompositeGif) {
    errors.push("Transparent GIF export currently supports one imported GIF source without extra canvas layers.");
  }

  const mediaLayers = visibleLayers.filter(hasMediaReference);
  const missingAssets = mediaLayers.filter((layer) => !assets.some((asset) => asset.id === layer.assetId));
  errors.push(...missingAssets.map((layer) => `${layer.name} is missing its source media.`));

  const availableAssets = mediaLayers
    .map((layer) => assets.find((asset) => asset.id === layer.assetId))
    .filter((asset): asset is MediaAsset => Boolean(asset));
  const unavailableAssets = await findUnavailableAssets(uniqueAssets(availableAssets));
  errors.push(...unavailableAssets.map((asset) => `${asset.name} is not available. Reconnect it before exporting.`));

  if (plan.format !== "webm" && !isStillImageExportFormat(plan.format) && !isAudioExportFormat(plan.format)) {
    warnings.push("Non-WebM video and GIF exports transcode in the browser and can be slow on large projects.");
  }

  return {
    ok: errors.length === 0,
    errors: uniqueMessages(errors),
    warnings: uniqueMessages(warnings),
  };
}

function hasMediaReference(layer: TimelineLayer) {
  return ["audio", "image", "video"].includes(layer.kind) && Boolean(layer.assetId);
}

function uniqueAssets(assets: MediaAsset[]) {
  return [...new Map(assets.map((asset) => [asset.id, asset])).values()];
}

function uniqueMessages(messages: string[]) {
  return [...new Set(messages)];
}

async function findUnavailableAssets(assets: MediaAsset[]) {
  const unavailable: MediaAsset[] = [];

  for (const asset of assets) {
    const blob = await loadAssetBlob(asset);
    if (!blob) {
      unavailable.push(asset);
    }
  }

  return unavailable;
}

async function loadAssetBlob(asset: MediaAsset) {
  try {
    if (asset.source === "tauri-fs") {
      return isTauriRuntime() ? await loadTauriMediaBlob(asset) : null;
    }

    if (asset.source === "browser-indexeddb") {
      return loadBrowserMediaBlob(asset.storageKey);
    }

    if (asset.source === "self-hosted-url") {
      return (await checkSelfHostedMediaAvailable(asset)) ? new Blob() : null;
    }
  } catch {
    return null;
  }

  return null;
}

function isTransparentGifSourcePlan(plan: RenderPlan) {
  return plan.mode === "single-media-ffmpeg" && plan.primaryAsset?.mimeType.toLowerCase() === "image/gif";
}
