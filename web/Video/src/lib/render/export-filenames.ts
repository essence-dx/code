import type { ExportFormat } from "@/lib/editor/types";

const exportExtensions: Record<ExportFormat, string> = {
  mp4: "mp4",
  webm: "webm",
  mov: "mov",
  avi: "avi",
  mpeg: "mpeg",
  gif: "gif",
  png: "png",
  jpg: "jpg",
  webp: "webp",
  wav: "wav",
  mp3: "mp3",
  m4a: "m4a",
  json: "json",
};

export function exportExtension(format: ExportFormat) {
  return exportExtensions[format];
}

export function exportFilename(name: string, format: ExportFormat) {
  return `${safeExportBaseName(name)}.${exportExtension(format)}`;
}

export function exportJobOutputName(name: string, format: ExportFormat, preset: string) {
  return format === "json" || preset === "project-bundle" ? projectBundleFilename(name) : exportFilename(name, format);
}

export function projectBundleFilename(name: string) {
  return `${safeExportBaseName(name)}.essence-studio.json`;
}

export function safeExportBaseName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
}
