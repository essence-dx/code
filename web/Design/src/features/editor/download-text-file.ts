"use client";

import { formatFileName } from "@/features/editor/export-design";

export function downloadTextFile(input: {
  fileName: string;
  text: string;
  type?: string;
}) {
  const blobUrl = URL.createObjectURL(
    new Blob([input.text], {
      type: input.type ?? "text/plain;charset=utf-8",
    }),
  );
  const link = document.createElement("a");

  link.download = formatTextDownloadFileName(input.fileName);
  link.href = blobUrl;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

function formatTextDownloadFileName(fileName: string) {
  const extensionMatch = fileName.match(/^(.*)\.([a-z0-9]{1,10})$/i);

  if (!extensionMatch) return formatFileName(fileName);

  const [, name, extension] = extensionMatch;

  return `${formatFileName(name)}.${extension.toLowerCase()}`;
}
