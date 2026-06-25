import { nanoid } from "nanoid";
import { getAssetLibrarySourceHash } from "@/features/editor/asset-library-management";
import { assertImportKind } from "@/features/editor/importers/import-diagnostics";
import type { DesignLayer } from "@/features/editor/types";

const MAX_IMPORTED_IMAGE_SIZE = 560;
const MAX_IMPORTED_VIDEO_SIZE = 640;

export async function importImageFile(
  file: File,
  point: { x: number; y: number },
): Promise<DesignLayer> {
  assertImportKind(file, ["image"], "Image");

  const imageSrc = await readFileAsDataUrl(file);
  const imageSize = await readImageSize(imageSrc);
  const scale = Math.min(
    1,
    MAX_IMPORTED_IMAGE_SIZE / Math.max(imageSize.width, imageSize.height),
  );
  const width = Math.max(24, Math.round(imageSize.width * scale));
  const height = Math.max(24, Math.round(imageSize.height * scale));
  const name = getLayerName(file.name, "Image");

  return {
    id: nanoid(),
    type: "image",
    name,
    x: Math.round(point.x),
    y: Math.round(point.y),
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "transparent",
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 0,
    imageSrc,
    imageAlt: name,
    imageFit: "cover",
    assetMetadata: {
      sourceName: name,
      license: "Unverified upload",
      hash: getAssetLibrarySourceHash(imageSrc),
      mimeType: file.type || undefined,
      importedAt: new Date().toISOString(),
    },
  };
}

export async function importMediaFile(
  file: File,
  point: { x: number; y: number },
): Promise<DesignLayer> {
  const kind = assertImportKind(file, ["image", "video"], "Media");

  if (kind === "image") {
    return importImageFile(file, point);
  }

  return importVideoFile(file, point);
}

async function importVideoFile(
  file: File,
  point: { x: number; y: number },
): Promise<DesignLayer> {
  const videoSrc = await readFileAsDataUrl(file);
  const videoSize = await readVideoMetadata(videoSrc);
  const scale = Math.min(
    1,
    MAX_IMPORTED_VIDEO_SIZE / Math.max(videoSize.width, videoSize.height),
  );
  const width = Math.max(96, Math.round(videoSize.width * scale));
  const height = Math.max(72, Math.round(videoSize.height * scale));
  const name = getLayerName(file.name, "Video");

  return {
    id: nanoid(),
    type: "image",
    name,
    x: Math.round(point.x),
    y: Math.round(point.y),
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "#111111",
    stroke: "#27272a",
    strokeWidth: 1,
    cornerRadius: 8,
    imageSrc: videoSrc,
    imageAlt: name,
    imageFit: "contain",
    assetMetadata: {
      sourceName: name,
      license: "Unverified upload",
      hash: getAssetLibrarySourceHash(videoSrc),
      mimeType: file.type || "video/unknown",
      durationSeconds: Number.isFinite(videoSize.durationSeconds)
        ? Math.round(videoSize.durationSeconds * 100) / 100
        : undefined,
      importedAt: new Date().toISOString(),
    },
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error(`${file.name} could not be read as media.`));
    };
    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.readAsDataURL(file);
  });
}

function readImageSize(imageSrc: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth || MAX_IMPORTED_IMAGE_SIZE,
        height: image.naturalHeight || MAX_IMPORTED_IMAGE_SIZE,
      });
    };
    image.onerror = () => reject(new Error("Image dimensions could not be read."));
    image.src = imageSrc;
  });
}

function readVideoMetadata(
  videoSrc: string,
): Promise<{ width: number; height: number; durationSeconds: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || MAX_IMPORTED_VIDEO_SIZE,
        height: video.videoHeight || Math.round(MAX_IMPORTED_VIDEO_SIZE * 0.5625),
        durationSeconds: video.duration,
      });
    };
    video.onerror = () => reject(new Error("Video metadata could not be read."));
    video.src = videoSrc;
  });
}

function getLayerName(fileName: string, fallback: string) {
  const name = fileName.replace(/\.[^.]+$/, "").trim();
  return name.length > 0 ? name : fallback;
}
