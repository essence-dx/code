import {
  MAX_INSERTED_OBJECT_IMAGE_BYTES,
  type InsertedObjectCreateInput,
} from "@/features/spreadsheet/inserted-objects";

type ClipboardImageFileLike = Pick<File, "name" | "size" | "type">;

type ClipboardImageDataTransfer = {
  files?: ArrayLike<File>;
  items?: ArrayLike<{
    getAsFile?: () => File | null;
    kind?: string;
    type?: string;
  }>;
};

const supportedWorksheetImageTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

export type WorksheetImageValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateWorksheetImageFile(
  file: ClipboardImageFileLike,
): WorksheetImageValidationResult {
  if (!supportedWorksheetImageTypes.has(file.type)) {
    return {
      ok: false,
      message: "Paste a PNG, JPEG, GIF, WebP, or SVG image.",
    };
  }

  if (file.size > MAX_INSERTED_OBJECT_IMAGE_BYTES) {
    return {
      ok: false,
      message: "Image objects are limited to 1.5 MB for workbook portability.",
    };
  }

  return { ok: true };
}

export function getClipboardImageFile(
  dataTransfer: ClipboardImageDataTransfer,
) {
  const itemFile = Array.from(dataTransfer.items ?? []).flatMap((item) => {
    if (item.kind !== "file" || !item.type?.startsWith("image/")) {
      return [];
    }

    const file = item.getAsFile?.();

    return file ? [file] : [];
  })[0];

  if (itemFile) {
    return itemFile;
  }

  return Array.from(dataTransfer.files ?? []).find((file) =>
    file.type.startsWith("image/"),
  ) ?? null;
}

export function createInsertedImageInputFromClipboard({
  dataUrl,
  file,
}: {
  dataUrl: string;
  file: ClipboardImageFileLike;
}): InsertedObjectCreateInput | null {
  const validation = validateWorksheetImageFile(file);

  if (!validation.ok || !dataUrl.startsWith("data:image/")) {
    return null;
  }

  if (dataUrl.length > MAX_INSERTED_OBJECT_IMAGE_BYTES * 2) {
    return null;
  }

  return {
    kind: "image",
    dataUrl,
    fileName: file.name || "Pasted image",
    mimeType: file.type,
    originalSizeBytes: file.size,
  };
}
