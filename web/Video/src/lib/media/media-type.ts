import type { MediaType } from "@/lib/editor/types";

const supportedMediaExtensions = {
  video: [".mp4", ".mov", ".webm", ".m4v"],
  audio: [".mp3", ".wav", ".m4a"],
  image: [".png", ".jpg", ".jpeg", ".webp", ".gif"],
} as const;

export function inferMediaTypeFromFile(file: Pick<File, "name" | "type">): MediaType {
  const mimeType = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (mimeType.startsWith("video/") || hasExtension(name, supportedMediaExtensions.video)) return "video";
  if (mimeType.startsWith("audio/") || hasExtension(name, supportedMediaExtensions.audio)) return "audio";
  if (mimeType.startsWith("image/") || hasExtension(name, supportedMediaExtensions.image)) return "image";

  throw new UnsupportedMediaTypeError();
}

export class UnsupportedMediaTypeError extends Error {
  constructor() {
    super("Choose a supported video, audio, image, or GIF file.");
    this.name = "UnsupportedMediaTypeError";
  }
}

function hasExtension(name: string, extensions: readonly string[]) {
  return extensions.some((extension) => name.endsWith(extension));
}
