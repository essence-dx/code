export async function writeClipboardText(value: string) {
  if (!navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export async function readClipboardText() {
  if (!navigator.clipboard?.readText) {
    return null;
  }

  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

export async function readClipboardFiles() {
  if (!navigator.clipboard?.read) {
    return [];
  }

  try {
    const items = await navigator.clipboard.read();
    const files: File[] = [];

    for (const item of items) {
      const type = item.types.find(isClipboardMediaType);

      if (!type) {
        continue;
      }

      const blob = await item.getType(type);
      files.push(
        new File([blob], getClipboardMediaFileName(type, files.length), {
          type: blob.type || type,
          lastModified: Date.now(),
        }),
      );
    }

    return files;
  } catch {
    return [];
  }
}

export async function writeClipboardBlob(blob: Blob) {
  if (!navigator.clipboard?.write || !("ClipboardItem" in window)) {
    return false;
  }

  try {
    const item = new ClipboardItem({ [blob.type]: blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}

export function looksLikeSvg(value: string) {
  return /^\s*<svg[\s>]/i.test(value);
}

export function looksLikeJson(value: string) {
  return /^\s*[\[{]/.test(value);
}

function isClipboardMediaType(type: string) {
  return type !== "image/svg+xml" && (type.startsWith("image/") || type.startsWith("video/"));
}

function getClipboardMediaFileName(type: string, index: number) {
  const fallbackExtension = type.startsWith("video/") ? "mp4" : "png";
  const extension = type.split("/")[1]?.split(";")[0] || fallbackExtension;
  return `clipboard-media-${index + 1}.${extension}`;
}
