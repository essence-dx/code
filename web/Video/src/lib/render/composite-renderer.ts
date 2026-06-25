"use client";

import type { EditorProject, ExportFormat, LayerStyle, MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { loadBrowserMediaBlob } from "@/lib/media/browser-media-store";
import { isSelfHostedMediaAsset } from "@/lib/media/self-hosted-media";
import { loadTauriMediaBlob } from "@/lib/media/tauri-media";
import type { RenderPlan } from "@/lib/render/export-planner";
import { downloadRenderedBlob, renderPngFrameSequenceAsGif, transcodeRecordedBlob, type BrowserRenderOptions } from "@/lib/render/browser-renderer";
import { createCompositeRenderManifest } from "@/lib/render/composite-manifest";
import { exportExtension } from "@/lib/render/export-filenames";
import { layerAudioGainAtTime } from "@/lib/audio/mix";
import { formatTime } from "@/lib/editor/factory";
import { drawChromaKeyedMedia } from "@/lib/editor/chroma-key";
import { transformScaleForFlips } from "@/lib/editor/motion";
import { keyframedLayerOpacity } from "@/lib/editor/keyframes";
import {
  layerPlaybackRateAtProjectTime,
  layerRequiresTimelineSeeking,
  layerSourceTimeAtProjectTime,
  normalizeLayerSpeed,
} from "@/lib/editor/speed";
import { trackedLayerTransform } from "@/lib/editor/tracking";
import { applyTransitionClip, layerTransitionFrame } from "@/lib/editor/transitions";
import { normalizeLayerVisualStyle, visualEffectsFilter, visualEffectsVignette } from "@/lib/editor/visual-effects";

type RenderableMedia = HTMLImageElement | HTMLVideoElement | HTMLAudioElement;

interface PreparedLayer {
  layer: TimelineLayer;
  media?: RenderableMedia;
  objectUrlToRevoke?: string;
  gain?: GainNode;
}

export async function renderCompositeWithCanvas(
  plan: RenderPlan,
  project: EditorProject,
  assets: MediaAsset[],
  options: BrowserRenderOptions = {},
) {
  const canvas = document.createElement("canvas");
  const manifest = createCompositeRenderManifest(plan, project, assets);
  const width = manifest.width;
  const height = manifest.height;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas rendering is not available in this browser.");
  }
  const renderContext = context;

  if (plan.format === "gif" && manifest.transparentBackground) {
    return renderTransparentCompositeGifWithCanvas(plan, project, manifest, canvas, renderContext, options);
  }

  const audioContext = new AudioContext();
  const audioDestination = audioContext.createMediaStreamDestination();
  let layers: PreparedLayer[] = [];
  let stream: MediaStream | null = null;
  const fps = manifest.fps;

  try {
    layers = await prepareLayers(manifest.layers, audioContext, audioDestination);
    stream = new MediaStream([
      ...canvas.captureStream(fps).getVideoTracks(),
      ...audioDestination.stream.getAudioTracks(),
    ]);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    const recorded = await new Promise<Blob>((resolve, reject) => {
      const startedAt = performance.now();
      let animationFrame = 0;
      let interval: ReturnType<typeof setInterval> | null = null;
      let settled = false;

      const cleanupTimeline = () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        if (interval) clearInterval(interval);
        options.signal?.removeEventListener("abort", abort);
        for (const item of layers) {
          if (isPlayable(item.media)) item.media.pause();
        }
      };

      const complete = () => {
        if (settled) return;
        settled = true;
        cleanupTimeline();
        resolve(new Blob(chunks, { type: mimeType }));
      };

      const fail = (error: Error | DOMException) => {
        if (settled) return;
        settled = true;
        cleanupTimeline();
        if (recorder.state !== "inactive") recorder.stop();
        reject(error);
      };

      const stop = () => {
        cleanupTimeline();
        if (recorder.state !== "inactive") recorder.stop();
      };

      const abort = () => {
        fail(new DOMException("Export cancelled.", "AbortError"));
      };

      options.signal?.addEventListener("abort", abort, { once: true });
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      recorder.addEventListener("error", () => fail(new Error("Composite recording failed.")));
      recorder.addEventListener("stop", complete);

      try {
        recorder.start(250);
      } catch {
        fail(new Error("Composite recording failed."));
        return;
      }

      void audioContext.resume().catch(() => undefined);
      drawFrameSafely();
      if (settled) return;
      interval = setInterval(drawFrameSafely, 1000 / fps);

      const tick = () => {
        if (settled) return;
        try {
          const elapsed = (performance.now() - startedAt) / 1000;
          options.onProgress?.(Math.min(74, Math.round((elapsed / plan.duration) * 74)));
          if (elapsed >= plan.duration) {
            stop();
            return;
          }
          animationFrame = requestAnimationFrame(tick);
        } catch {
          fail(new Error("Composite rendering failed."));
        }
      };
      animationFrame = requestAnimationFrame(tick);

      function drawFrameSafely() {
        try {
          drawFrame();
        } catch {
          fail(new Error("Composite rendering failed."));
        }
      }

      function drawFrame() {
        const elapsed = Math.min(plan.duration, (performance.now() - startedAt) / 1000);
        drawCompositeFrame(renderContext, project, layers, elapsed, width, height, manifest.transparentBackground);
      }
    });

    if (plan.format === "webm") {
      return downloadRenderedBlob(recorded, `${safeName(project.title)}.webm`, "webm");
    }

    return transcodeRecordedBlob(recorded, plan, options);
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
    releasePreparedLayers(layers);
    await closeAudioContext(audioContext);
  }
}

async function renderTransparentCompositeGifWithCanvas(
  plan: RenderPlan,
  project: EditorProject,
  manifest: ReturnType<typeof createCompositeRenderManifest>,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  options: BrowserRenderOptions,
) {
  let layers: PreparedLayer[] = [];
  const frames: Blob[] = [];
  const fps = manifest.fps;
  const frameCount = Math.max(1, Math.ceil(plan.duration * fps));

  try {
    layers = await prepareFrameLayers(manifest.layers);

    for (let index = 0; index < frameCount; index += 1) {
      if (options.signal?.aborted) {
        throw new DOMException("Export cancelled.", "AbortError");
      }

      const currentTime = Math.min(plan.duration, index / fps);
      await seekFrameMedia(layers, currentTime);
      drawCompositeFrame(context, project, layers, currentTime, canvas.width, canvas.height, true);
      frames.push(await canvasToImageBlob(canvas, "png"));
      options.onProgress?.(Math.min(70, Math.round(((index + 1) / frameCount) * 70)));
    }

    return renderPngFrameSequenceAsGif(frames, plan, options);
  } finally {
    releasePreparedLayers(layers);
  }
}

export async function renderCurrentFramePng(
  plan: RenderPlan,
  project: EditorProject,
  assets: MediaAsset[],
  currentTime: number,
  options: BrowserRenderOptions = {},
) {
  return renderCurrentFrameImage(plan, project, assets, currentTime, options);
}

export async function renderCurrentFrameImage(
  plan: RenderPlan,
  project: EditorProject,
  assets: MediaAsset[],
  currentTime: number,
  options: BrowserRenderOptions = {},
) {
  if (options.signal?.aborted) {
    throw new DOMException("Export cancelled.", "AbortError");
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas rendering is not available in this browser.");
  }

  const manifest = createCompositeRenderManifest(plan, project, assets);
  canvas.width = manifest.width;
  canvas.height = manifest.height;
  let layers: PreparedLayer[] = [];

  try {
    layers = await prepareFrameLayers(manifest.layers);
    await seekFrameMedia(layers, currentTime);
    drawCompositeFrame(context, project, layers, currentTime, manifest.width, manifest.height, manifest.transparentBackground);
    options.onProgress?.(90);
    const blob = await canvasToImageBlob(canvas, plan.format);
    const frameLabel = manifest.transparentBackground ? "transparent-frame" : "frame";
    const extension = exportExtension(plan.format);
    const saved = await downloadRenderedBlob(
      blob,
      `${safeName(project.title)}-${frameLabel}-${formatTime(currentTime).replace(/[:.]/g, "-")}.${extension}`,
      plan.format,
    );
    options.onProgress?.(100);
    return saved;
  } finally {
    releasePreparedLayers(layers);
  }
}

async function prepareLayers(
  renderLayers: ReturnType<typeof createCompositeRenderManifest>["layers"],
  audioContext: AudioContext,
  audioDestination: MediaStreamAudioDestinationNode,
) {
  const layers: PreparedLayer[] = [];

  try {
    for (const { layer, asset } of renderLayers) {
      if (!asset) {
        layers.push({ layer });
        continue;
      }

      const { media, objectUrlToRevoke } = await createMedia(asset);
      const prepared: PreparedLayer = { layer, media, objectUrlToRevoke };
      layers.push(prepared);

      if (isPlayable(media)) {
        media.loop = false;
        media.muted = true;
        media.playbackRate = layerPlaybackRateAtProjectTime(layer, layer.start);
        (media as HTMLMediaElement & { preservesPitch?: boolean }).preservesPitch = normalizeLayerSpeed(layer.speed, layer.playbackRate).preservePitch;
        const source = audioContext.createMediaElementSource(media);
        const gain = audioContext.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(audioDestination);
        prepared.gain = gain;
      }
    }
  } catch (error) {
    releasePreparedLayers(layers);
    throw error;
  }

  return layers;
}

async function prepareFrameLayers(renderLayers: ReturnType<typeof createCompositeRenderManifest>["layers"]) {
  const layers: PreparedLayer[] = [];

  try {
    for (const { layer, asset } of renderLayers) {
      if (!asset) {
        layers.push({ layer });
        continue;
      }

      const { media, objectUrlToRevoke } = await createMedia(asset);
      layers.push({ layer, media, objectUrlToRevoke });
    }
  } catch (error) {
    releasePreparedLayers(layers);
    throw error;
  }

  return layers;
}

async function createMedia(asset: MediaAsset) {
  const storedObjectUrl = asset.objectUrl ? undefined : await objectUrlFromStorage(asset);
  const objectUrl = asset.objectUrl ?? storedObjectUrl;
  if (!objectUrl) {
    throw new Error(`${asset.name} is not available for rendering.`);
  }

  try {
    if (asset.type === "image") {
      const image = new Image();
      if (isSelfHostedMediaAsset(asset)) {
        image.crossOrigin = "anonymous";
      }
      image.src = objectUrl;
      await image.decode();
      return { media: image, objectUrlToRevoke: storedObjectUrl };
    }

    const element = document.createElement(asset.type === "audio" ? "audio" : "video");
    if (isSelfHostedMediaAsset(asset)) {
      element.crossOrigin = "anonymous";
    }
    element.src = objectUrl;
    element.preload = "auto";
    if (element instanceof HTMLVideoElement) {
      element.playsInline = true;
    }
    await waitForMetadata(element);
    return { media: element, objectUrlToRevoke: storedObjectUrl };
  } catch (error) {
    if (storedObjectUrl) revokeObjectUrl(storedObjectUrl);
    throw error;
  }
}

async function objectUrlFromStorage(asset: MediaAsset) {
  if (isSelfHostedMediaAsset(asset)) {
    return asset.storageKey;
  }

  const blob = asset.source === "tauri-fs" ? await loadTauriMediaBlob(asset) : await loadBrowserMediaBlob(asset.storageKey);
  if (!blob) {
    throw new Error(`${asset.name} is not available in local storage.`);
  }
  return URL.createObjectURL(blob);
}

async function seekFrameMedia(layers: PreparedLayer[], currentTime: number) {
  await Promise.all(
    layers.map(async ({ layer, media }) => {
      if (!isPlayable(media) || layer.kind === "audio" || currentTime < layer.start || currentTime > layer.start + layer.duration) return;
      const localTime = layerSourceTimeAtProjectTime(layer, currentTime);
      await seekPlayable(media, localTime);
    }),
  );
}

function seekPlayable(media: HTMLVideoElement | HTMLAudioElement, localTime: number) {
  const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : localTime;
  const targetTime = Math.min(Math.max(0, duration - 0.01), Math.max(0, localTime));

  return new Promise<void>((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      media.removeEventListener("seeked", onSeeked);
      media.removeEventListener("error", onError);
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Frame media could not be read."));
    };

    media.addEventListener("seeked", onSeeked);
    media.addEventListener("error", onError, { once: true });
    timeout = setTimeout(onSeeked, 600);
    media.currentTime = targetTime;
  });
}

function drawCompositeFrame(
  context: CanvasRenderingContext2D,
  project: EditorProject,
  layers: PreparedLayer[],
  currentTime: number,
  width: number,
  height: number,
  transparentBackground = false,
) {
  context.save();
  context.clearRect(0, 0, width, height);
  if (!transparentBackground) {
    context.fillStyle = project.background;
    context.fillRect(0, 0, width, height);
  }

  for (const prepared of layers) {
    const { layer, media } = prepared;
    if (currentTime < layer.start || currentTime > layer.start + layer.duration) {
      if (isPlayable(media) && !media.paused) media.pause();
      continue;
    }

    const localTime = layerSourceTimeAtProjectTime(layer, currentTime);
    syncAudioGain(prepared, currentTime);
    syncMedia(media, layer, currentTime, localTime);
    if (layer.kind === "audio") continue;

    drawLayer(context, project, layer, media, localTime, currentTime, width, height);
  }

  context.restore();
}

function syncAudioGain(prepared: PreparedLayer, currentTime: number) {
  if (!prepared.gain) return;
  prepared.gain.gain.value = normalizeLayerSpeed(prepared.layer.speed, prepared.layer.playbackRate).reversed
    ? 0
    : layerAudioGainAtTime(prepared.layer, currentTime);
}

function drawLayer(
  context: CanvasRenderingContext2D,
  project: EditorProject,
  layer: TimelineLayer,
  media: RenderableMedia | undefined,
  localTime: number,
  currentTime: number,
  width: number,
  height: number,
) {
  const visualStyle = { ...normalizeLayerVisualStyle(layer.style), opacity: keyframedLayerOpacity(layer, currentTime) };
  const transform = trackedLayerTransform(layer, project.layers, currentTime, { width: project.width, height: project.height });
  const transformScale = transformScaleForFlips(transform);
  const transitionFrame = layerTransitionFrame(layer, currentTime);
  const box = {
    x: transform.x * width,
    y: transform.y * height,
    width: scaleX(transform.width, project.width, width) * transform.scale,
    height: scaleY(transform.height, project.height, height) * transform.scale,
  };

  context.save();
  context.globalAlpha = visualStyle.opacity * transitionFrame.opacity;
  context.translate(box.x + transitionFrame.offsetXRatio * box.width, box.y + transitionFrame.offsetYRatio * box.height);
  context.rotate((transform.rotation * Math.PI) / 180);
  context.scale((transformScale.scaleX < 0 ? -1 : 1) * transitionFrame.scale, (transformScale.scaleY < 0 ? -1 : 1) * transitionFrame.scale);
  context.filter = visualEffectsFilter(visualStyle);
  context.shadowBlur = visualStyle.shadowBlur ?? 0;
  context.shadowColor = visualStyle.shadowColor ?? "#000000";
  applyTransitionClip(context, transitionFrame.clip, -box.width / 2, -box.height / 2, box.width, box.height);

  if (layer.kind === "shape") {
    drawRoundedRect(context, -box.width / 2, -box.height / 2, box.width, box.height, visualStyle.radius, visualStyle.background || visualStyle.fill);
  } else if (layer.kind === "progress") {
    drawProgressLayer(context, { ...layer, style: visualStyle }, localTime, -box.width / 2, -box.height / 2, box.width, box.height);
  } else if ((layer.kind === "image" || layer.kind === "video") && media) {
    drawMedia(context, media, layer, -box.width / 2, -box.height / 2, box.width, box.height, visualStyle.radius);
  } else {
    drawTextLayer(context, { ...layer, style: visualStyle }, localTime, -box.width / 2, -box.height / 2, box.width, box.height);
  }

  drawVignette(context, visualStyle, -box.width / 2, -box.height / 2, box.width, box.height);

  if (visualStyle.borderWidth && visualStyle.borderWidth > 0 && visualStyle.stroke !== "transparent") {
    drawRoundedStroke(context, -box.width / 2, -box.height / 2, box.width, box.height, visualStyle.radius, visualStyle.stroke, visualStyle.borderWidth);
  }

  context.restore();
}

function drawVignette(context: CanvasRenderingContext2D, style: LayerStyle, x: number, y: number, width: number, height: number) {
  const vignette = visualEffectsVignette(style);
  if (vignette.alpha <= 0) return;

  const radius = Math.max(width, height) * 0.72;
  const gradient = context.createRadialGradient(0, 0, Math.min(width, height) * 0.24, 0, 0, radius);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${vignette.alpha})`);
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);
}

function drawRoundedStroke(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  stroke: string,
  lineWidth: number,
) {
  context.strokeStyle = stroke;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.roundRect(x, y, width, height, Math.max(0, radius));
  context.stroke();
}

function drawTextLayer(context: CanvasRenderingContext2D, layer: TimelineLayer, localTime: number, x: number, y: number, width: number, height: number) {
  const text = layer.kind === "subtitle" ? activeCueText(layer, localTime) : layer.kind === "timer" ? timerText(layer, localTime) : (layer.text ?? layer.name);
  if (!text) return;

  if (layer.style.background !== "transparent") {
    drawRoundedRect(context, x, y, width, height, layer.style.radius, layer.style.background);
  }

  context.fillStyle = layer.style.fill;
  context.font = `${layer.style.fontWeight} ${scaleFont(layer.style.fontSize)}px ${layer.style.fontFamily}, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  const lines = wrapText(context, text, width - 32);
  const lineHeight = scaleFont(layer.style.fontSize) * 1.15;
  const startY = -((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => context.fillText(line, 0, startY + index * lineHeight));
}

function drawProgressLayer(context: CanvasRenderingContext2D, layer: TimelineLayer, localTime: number, x: number, y: number, width: number, height: number) {
  const progress = layer.duration > 0 ? Math.min(1, Math.max(0, localTime / layer.duration)) : 0;
  drawRoundedRect(context, x, y, width, height, layer.style.radius, layer.style.background);
  if (progress <= 0) return;
  drawRoundedRect(context, x, y, Math.max(1, width * progress), height, layer.style.radius, layer.style.fill);
}

function timerText(layer: TimelineLayer, localTime: number) {
  return formatTime(layer.text === "elapsed" ? localTime : layer.duration - localTime);
}

function syncMedia(media: RenderableMedia | undefined, layer: TimelineLayer, currentTime: number, localTime: number) {
  if (!isPlayable(media)) return;
  const speed = normalizeLayerSpeed(layer.speed, layer.playbackRate);
  media.playbackRate = layerPlaybackRateAtProjectTime(layer, currentTime);
  (media as HTMLMediaElement & { preservesPitch?: boolean }).preservesPitch = speed.preservePitch;
  media.muted = layer.muted;

  if (layerRequiresTimelineSeeking(layer) || Math.abs(media.currentTime - localTime) > 0.35) {
    media.currentTime = Math.max(0, localTime);
  }
  if (speed.reversed) {
    media.pause();
    return;
  }
  if (media.paused) {
    void media.play().catch(() => undefined);
  }
}

function drawMedia(
  context: CanvasRenderingContext2D,
  media: RenderableMedia,
  layer: TimelineLayer,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  if (media instanceof HTMLAudioElement) return;
  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, Math.max(0, radius));
  context.clip();
  drawChromaKeyedMedia(context, media, layer, x, y, width, height);
  context.restore();
}

function drawRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string) {
  context.fillStyle = fill;
  context.beginPath();
  context.roundRect(x, y, width, height, Math.max(0, radius));
  context.fill();
}

function activeCueText(layer: TimelineLayer, localTime: number) {
  return layer.cues?.find((cue) => localTime >= cue.start && localTime <= cue.end)?.text ?? "";
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function waitForMetadata(media: HTMLMediaElement) {
  if (media.readyState >= 1) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    media.addEventListener("loadedmetadata", () => resolve(), { once: true });
    media.addEventListener("error", () => reject(new Error("Media metadata could not be loaded.")), { once: true });
  });
}

function canvasToImageBlob(canvas: HTMLCanvasElement, format: ExportFormat) {
  const mimeType = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  const quality = format === "jpg" ? 0.92 : format === "webp" ? 0.86 : undefined;
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Frame could not be encoded."))), mimeType, quality);
  });
}

function isPlayable(media: RenderableMedia | undefined): media is HTMLVideoElement | HTMLAudioElement {
  return media instanceof HTMLVideoElement || media instanceof HTMLAudioElement;
}

function releasePreparedLayers(layers: PreparedLayer[]) {
  for (const item of layers) {
    if (isPlayable(item.media)) item.media.pause();
    if (item.objectUrlToRevoke) revokeObjectUrl(item.objectUrlToRevoke);
  }
}

async function closeAudioContext(audioContext: AudioContext) {
  if (audioContext.state === "closed") return;

  try {
    await audioContext.close();
  } catch {
    // Cleanup must not mask the original export failure.
  }
}

function revokeObjectUrl(objectUrl: string) {
  if (objectUrl.startsWith("blob:")) {
    URL.revokeObjectURL(objectUrl);
  }
}

function scaleX(value: number, projectWidth: number, outputWidth: number) {
  return (value / projectWidth) * outputWidth;
}

function scaleY(value: number, projectHeight: number, outputHeight: number) {
  return (value / projectHeight) * outputHeight;
}

function scaleFont(value: number) {
  return Math.max(8, value);
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
}
