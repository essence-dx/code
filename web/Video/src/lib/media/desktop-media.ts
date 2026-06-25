export const SUPPORTED_DESKTOP_MEDIA_EXTENSIONS = [
  "mp4",
  "mov",
  "webm",
  "m4v",
  "mp3",
  "wav",
  "m4a",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
] as const;

export const DESKTOP_MEDIA_FILTER = {
  name: "Media",
  extensions: [...SUPPORTED_DESKTOP_MEDIA_EXTENSIONS],
};

export const DESKTOP_MEDIA_DIRECTORY = "media";

const supportedDesktopMediaExtensionSet = new Set<string>(SUPPORTED_DESKTOP_MEDIA_EXTENSIONS);

export function isSupportedDesktopMediaPath(path: string) {
  const extension = extensionFromPath(path);
  return Boolean(extension && supportedDesktopMediaExtensionSet.has(extension));
}

export function mediaNameFromPath(path: string) {
  return path.split(/[\\/]/).pop()?.trim() || "media";
}

export function desktopMediaStorageKey(assetId: string, name: string) {
  const extension = extensionFromPath(name) ?? "bin";
  return `${DESKTOP_MEDIA_DIRECTORY}/${assetId}.${extension}`;
}

export function isAppLocalDesktopMediaKey(storageKey: string) {
  return storageKey.startsWith(`${DESKTOP_MEDIA_DIRECTORY}/`) && !storageKey.includes("..") && !storageKey.includes("\\");
}

export function mimeTypeFromPath(path: string) {
  const extension = extensionFromPath(path);

  switch (extension) {
    case "mp4":
    case "m4v":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "m4a":
      return "audio/mp4";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

export function desktopImportFailureMessage(error: unknown) {
  if (error instanceof UnsupportedDesktopMediaError) {
    return "Choose a supported video, audio, image, or GIF file.";
  }

  return "Desktop import failed. Check the file and try again.";
}

export function desktopImportResultMessage(importedCount: number, failedCount: number) {
  if (failedCount === 0) return null;

  const failedLabel = failedCount === 1 ? "file" : "files";
  if (importedCount > 0) {
    return `${importedCount} imported. ${failedCount} ${failedLabel} could not be imported.`;
  }

  return `No files imported. ${failedCount} ${failedLabel} could not be imported.`;
}

export class UnsupportedDesktopMediaError extends Error {
  constructor(path: string) {
    super(`Unsupported desktop media file: ${path}`);
    this.name = "UnsupportedDesktopMediaError";
  }
}

function extensionFromPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension && extension !== path.toLowerCase() ? extension : undefined;
}
