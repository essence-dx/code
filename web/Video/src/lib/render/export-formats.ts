import type { ExportFormat } from "@/lib/editor/types";

export const videoExportFormats = ["mp4", "webm", "mov", "avi", "mpeg"] satisfies ExportFormat[];
export const animatedImageExportFormats = ["gif"] satisfies ExportFormat[];
export const stillImageExportFormats = ["png", "jpg", "webp"] satisfies ExportFormat[];
export const audioExportFormats = ["wav", "mp3", "m4a"] satisfies ExportFormat[];

export function isVideoExportFormat(format: ExportFormat) {
  return (videoExportFormats as string[]).includes(format);
}

export function isAnimatedImageExportFormat(format: ExportFormat) {
  return (animatedImageExportFormats as string[]).includes(format);
}

export function isStillImageExportFormat(format: ExportFormat) {
  return (stillImageExportFormats as string[]).includes(format);
}

export function isImageExportFormat(format: ExportFormat) {
  return isStillImageExportFormat(format) || isAnimatedImageExportFormat(format);
}

export function isAudioExportFormat(format: ExportFormat) {
  return (audioExportFormats as string[]).includes(format);
}

export function formatSupportsEmbeddedAudio(format: ExportFormat) {
  return isVideoExportFormat(format) || isAudioExportFormat(format);
}
