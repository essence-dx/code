export function downloadAudioBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function audioExtension(mimeType: string) {
  if (mimeType.includes("wav")) {
    return "wav";
  }

  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
    return "mp3";
  }

  if (mimeType.includes("webm")) {
    return "webm";
  }

  if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
    return "m4a";
  }

  return "audio";
}
