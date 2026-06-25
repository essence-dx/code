import { sceneDocumentSchema, type SceneDocument } from "../types";
import { createExportManifest } from "./export-manifest";
import { createGlbBlob } from "./gltf-export";
import { createStlBlob } from "./stl-export";
import { createUsdzBlob } from "./usdz-export";

function getSafeSceneBaseName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "scene";
}

export function getSafeSceneFileName(name: string, extension: string) {
  return `${getSafeSceneBaseName(name)}.${extension}`;
}

export function serializeSceneDocument(document: SceneDocument) {
  return JSON.stringify(document, null, 2);
}

export function downloadScene(document: SceneDocument) {
  const blob = new Blob([serializeSceneDocument(document)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");

  anchor.href = url;
  anchor.download = getSafeSceneFileName(document.name, "json");
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readSceneFile(file: File) {
  const text = await file.text();
  const parsed = sceneDocumentSchema.safeParse(JSON.parse(text));

  if (!parsed.success) {
    throw new Error("This file is not a valid scene document.");
  }

  return parsed.data;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function getViewportCanvas() {
  const canvas = window.document.querySelector("canvas");

  if (!canvas) {
    throw new Error("Viewport canvas is not ready.");
  }

  return canvas;
}

export function getViewportImageDataUrl() {
  return getViewportCanvas().toDataURL("image/png", 1);
}

async function getCanvasPngBlob(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png", 1);
  });

  if (!blob) {
    throw new Error("Could not export the viewport image.");
  }

  return blob;
}

function waitForAnimationFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function waitForDelay(delayMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

export async function exportViewportImage(name: string) {
  downloadBlob(await getCanvasPngBlob(getViewportCanvas()), getSafeSceneFileName(name, "png"));
}

type ImageSequenceExportOptions = {
  frameCount?: number;
  intervalMs?: number;
};

export async function exportViewportImageSequence(name: string, options: ImageSequenceExportOptions = {}) {
  const canvas = getViewportCanvas();
  const frameCount = options.frameCount ?? 16;
  const intervalMs = options.intervalMs ?? 125;
  const baseName = getSafeSceneBaseName(name);

  if (frameCount < 1) {
    throw new Error("Image sequence export needs at least one frame.");
  }

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    await waitForAnimationFrame();
    downloadBlob(await getCanvasPngBlob(canvas), `${baseName}-sequence-${String(frameIndex + 1).padStart(3, "0")}.png`);

    if (frameIndex < frameCount - 1) {
      await waitForDelay(intervalMs);
    }
  }

  return frameCount;
}

export async function exportViewportVideo(name: string, durationMs = 5000) {
  const canvas = getViewportCanvas();

  if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
    throw new Error("Viewport video export is not supported in this browser.");
  }

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
  const recorder = new MediaRecorder(canvas.captureStream(60), { mimeType });
  const chunks: BlobPart[] = [];

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  const completed = new Promise<void>((resolve, reject) => {
    recorder.addEventListener("stop", () => resolve(), { once: true });
    recorder.addEventListener("error", () => reject(new Error("Viewport video export failed.")), { once: true });
  });

  recorder.start();
  window.setTimeout(() => {
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, durationMs);
  await completed;

  if (chunks.length === 0) {
    throw new Error("Could not export the viewport video.");
  }

  downloadBlob(new Blob(chunks, { type: "video/webm" }), getSafeSceneFileName(name, "webm"));
}

export async function exportSceneGlb(document: SceneDocument) {
  downloadBlob(await createGlbBlob(document), getSafeSceneFileName(document.name, "glb"));
}

export async function exportSceneStl(document: SceneDocument) {
  downloadBlob(await createStlBlob(document), getSafeSceneFileName(document.name, "stl"));
}

export async function exportSceneUsdz(document: SceneDocument) {
  downloadBlob(await createUsdzBlob(document), getSafeSceneFileName(document.name, "usdz"));
}

export function exportSceneManifest(document: SceneDocument) {
  downloadBlob(
    new Blob([JSON.stringify(createExportManifest(document), null, 2)], {
      type: "application/json",
    }),
    getSafeSceneFileName(`${document.name}-export-manifest`, "json"),
  );
}
