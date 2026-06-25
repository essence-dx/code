"use client";

import { formatTime } from "@/lib/editor/factory";
import type { MediaAsset, TimelineLayer } from "@/lib/editor/types";
import { saveBrowserMedia } from "@/lib/media/browser-media-store";

interface CaptureFreezeFrameInput {
  layer: TimelineLayer;
  asset: MediaAsset;
  currentTime: number;
}

export interface CaptureFreezeFrameResult {
  asset: MediaAsset;
  localTime: number;
}

export async function captureVideoFreezeFrame({ layer, asset, currentTime }: CaptureFreezeFrameInput): Promise<CaptureFreezeFrameResult> {
  if (layer.kind !== "video" || asset.type !== "video" || !asset.objectUrl) {
    throw new Error("A connected video layer is required.");
  }

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = asset.objectUrl;

  await waitForMetadata(video);
  const localTime = clampVideoTime((currentTime - layer.start) * layer.playbackRate + layer.trimStart, video.duration || asset.duration || layer.duration);
  await seekVideo(video, localTime);

  const width = video.videoWidth || asset.width || 1280;
  const height = video.videoHeight || asset.height || 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available.");
  context.drawImage(video, 0, 0, width, height);

  const blob = await canvasToPng(canvas);
  const file = new File([blob], freezeFrameName(asset.name, localTime), { type: "image/png" });
  const freezeAsset = await saveBrowserMedia(file);
  return { asset: freezeAsset, localTime };
}

function waitForMetadata(video: HTMLVideoElement) {
  if (video.readyState >= 1) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    video.addEventListener("loadedmetadata", () => resolve(), { once: true });
    video.addEventListener("error", () => reject(new Error("Video metadata could not be loaded.")), { once: true });
  });
}

function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video frame could not be read."));
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError, { once: true });
    timeout = setTimeout(onSeeked, 600);
    video.currentTime = time;
  });
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Freeze frame could not be encoded."))), "image/png");
  });
}

function clampVideoTime(value: number, duration: number) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  return Math.min(Math.max(0, safeDuration - 0.01), Math.max(0, Number.isFinite(value) ? value : 0));
}

function freezeFrameName(name: string, localTime: number) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "video";
  return `${base}-freeze-${formatTime(localTime).replace(/[:.]/g, "-")}.png`;
}
