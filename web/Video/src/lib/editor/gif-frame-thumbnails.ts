"use client";

import type { GifFramePreviewFrame } from "@/lib/editor/gif-frame-preview";
import type { MediaAsset } from "@/lib/editor/types";

export interface GifFrameThumbnail {
  frameIndex: number;
  sourceTime: number;
  dataUrl: string;
}

export interface GifFrameThumbnailInput {
  asset?: Pick<MediaAsset, "type" | "mimeType" | "objectUrl" | "duration">;
  frames: GifFramePreviewFrame[];
  width?: number;
  height?: number;
  signal?: AbortSignal;
}

const defaultThumbnailWidth = 96;
const defaultThumbnailHeight = 54;

export function canExtractGifFrameThumbnails(asset?: Pick<MediaAsset, "type" | "objectUrl">) {
  return Boolean(asset?.objectUrl && (asset.type === "video" || asset.type === "image"));
}

export async function createGifFrameThumbnails({
  asset,
  frames,
  width = defaultThumbnailWidth,
  height = defaultThumbnailHeight,
  signal,
}: GifFrameThumbnailInput): Promise<GifFrameThumbnail[]> {
  if (!asset || !canExtractGifFrameThumbnails(asset) || frames.length === 0) return [];
  throwIfAborted(signal);

  if (asset.type === "video") {
    return createVideoFrameThumbnails({ asset, frames, width, height, signal });
  }

  return createImageFrameThumbnails({ asset, frames, width, height, signal });
}

async function createVideoFrameThumbnails({
  asset,
  frames,
  width,
  height,
  signal,
}: Required<Pick<GifFrameThumbnailInput, "frames" | "width" | "height">> & {
  asset: Pick<MediaAsset, "objectUrl" | "duration">;
  signal?: AbortSignal;
}) {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.src = asset.objectUrl ?? "";

  await waitForMedia(video, "loadedmetadata", signal);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return [];
  canvas.width = width;
  canvas.height = height;

  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : asset.duration;
  const thumbnails: GifFrameThumbnail[] = [];

  for (const frame of frames) {
    throwIfAborted(signal);
    await seekVideo(video, Math.min(Math.max(0, frame.sourceTime), Math.max(0, duration - 0.04)), signal);
    drawMediaFrame(context, video.videoWidth || width, video.videoHeight || height, width, height, () => context.drawImage(video, 0, 0));
    thumbnails.push({
      frameIndex: frame.index,
      sourceTime: frame.sourceTime,
      dataUrl: canvas.toDataURL("image/webp", 0.82),
    });
  }

  video.removeAttribute("src");
  video.load();
  return thumbnails;
}

async function createImageFrameThumbnails({
  asset,
  frames,
  width,
  height,
  signal,
}: Required<Pick<GifFrameThumbnailInput, "frames" | "width" | "height">> & {
  asset: Pick<MediaAsset, "objectUrl">;
  signal?: AbortSignal;
}) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = asset.objectUrl ?? "";
  await waitForImage(image, signal);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return [];
  canvas.width = width;
  canvas.height = height;
  drawMediaFrame(context, image.naturalWidth || width, image.naturalHeight || height, width, height, () => context.drawImage(image, 0, 0));
  const dataUrl = canvas.toDataURL("image/webp", 0.82);

  return frames.map((frame) => ({
    frameIndex: frame.index,
    sourceTime: frame.sourceTime,
    dataUrl,
  }));
}

async function seekVideo(video: HTMLVideoElement, time: number, signal?: AbortSignal) {
  throwIfAborted(signal);
  if (Math.abs(video.currentTime - time) < 0.03 && video.readyState >= 2) return;

  const seeked = waitForMedia(video, "seeked", signal);
  video.currentTime = time;
  await seeked;
}

function waitForImage(image: HTMLImageElement, signal?: AbortSignal) {
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();
  if ("decode" in image) {
    return image.decode().catch(() => waitForMedia(image, "load", signal));
  }
  return waitForMedia(image, "load", signal);
}

function waitForMedia<T extends EventTarget>(target: T, eventName: string, signal?: AbortSignal) {
  throwIfAborted(signal);

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(eventName, complete);
      target.removeEventListener("error", fail);
      signal?.removeEventListener("abort", abort);
    };
    const complete = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error("Frame thumbnail could not be extracted."));
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Frame thumbnail extraction cancelled.", "AbortError"));
    };

    target.addEventListener(eventName, complete, { once: true });
    target.addEventListener("error", fail, { once: true });
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function drawMediaFrame(
  context: CanvasRenderingContext2D,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  draw: () => void,
) {
  context.clearRect(0, 0, width, height);
  context.save();
  const scale = Math.max(width / Math.max(1, sourceWidth), height / Math.max(1, sourceHeight));
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.translate((width - drawWidth) / 2, (height - drawHeight) / 2);
  context.scale(scale, scale);
  draw();
  context.restore();
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Frame thumbnail extraction cancelled.", "AbortError");
  }
}
