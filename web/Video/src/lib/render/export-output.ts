"use client";

import type { ExportFormat, RenderedExportFile } from "@/lib/editor/types";
import { isTauriRuntime } from "@/lib/media/tauri-media";
import { exportExtension } from "@/lib/render/export-filenames";
export { exportFilename, exportJobOutputName, projectBundleFilename, safeExportBaseName } from "@/lib/render/export-filenames";

const exportFormatDetails: Record<
  ExportFormat,
  {
    filterName: string;
    mimeType: string;
  }
> = {
  mp4: {
    filterName: "MP4 Video",
    mimeType: "video/mp4",
  },
  webm: {
    filterName: "WebM Video",
    mimeType: "video/webm",
  },
  mov: {
    filterName: "QuickTime MOV",
    mimeType: "video/quicktime",
  },
  avi: {
    filterName: "AVI Video",
    mimeType: "video/x-msvideo",
  },
  mpeg: {
    filterName: "MPEG Video",
    mimeType: "video/mpeg",
  },
  gif: {
    filterName: "GIF",
    mimeType: "image/gif",
  },
  png: {
    filterName: "PNG Image",
    mimeType: "image/png",
  },
  jpg: {
    filterName: "JPG Image",
    mimeType: "image/jpeg",
  },
  webp: {
    filterName: "WebP Image",
    mimeType: "image/webp",
  },
  wav: {
    filterName: "WAV Audio",
    mimeType: "audio/wav",
  },
  mp3: {
    filterName: "MP3 Audio",
    mimeType: "audio/mpeg",
  },
  m4a: {
    filterName: "M4A Audio",
    mimeType: "audio/mp4",
  },
  json: {
    filterName: "Project Bundle",
    mimeType: "application/json",
  },
};

export interface SaveRenderedBlobResult extends RenderedExportFile {
  saved: boolean;
}

export function exportMimeType(format: ExportFormat) {
  return exportFormatDetails[format].mimeType;
}

export function exportDialogFilter(format: ExportFormat) {
  const details = exportFormatDetails[format];
  return {
    name: details.filterName,
    extensions: [exportExtension(format)],
  };
}

export async function saveRenderedBlob(
  blob: Blob,
  filename: string,
  format: ExportFormat,
): Promise<SaveRenderedBlobResult> {
  const savedAt = new Date().toISOString();
  const details = {
    saved: true,
    filename,
    format,
    mimeType: exportMimeType(format),
    size: blob.size,
    savedAt,
  };

  if (isTauriRuntime()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const path = await save({
      title: "Save export",
      defaultPath: filename,
      filters: [exportDialogFilter(format)],
    });

    if (!path) {
      throw new ExportSaveCancelledError();
    }

    await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    return { ...details, path };
  }

  downloadBlob(blob, filename);
  return details;
}

export class ExportSaveCancelledError extends Error {
  constructor() {
    super("Export save was cancelled.");
    this.name = "ExportSaveCancelledError";
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
