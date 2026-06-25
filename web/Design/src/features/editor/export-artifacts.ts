"use client";

export type ClientExportArtifact = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
};

export function createDataUrlExportArtifact(input: {
  fileName: string;
  mimeType: string;
  dataUrl: string;
}): ClientExportArtifact {
  return {
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: estimateDataUrlSizeBytes(input.dataUrl),
    dataUrl: input.dataUrl,
  };
}

export function createTextExportArtifact(input: {
  fileName: string;
  mimeType: string;
  text: string;
}): ClientExportArtifact {
  return {
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: new Blob([input.text], { type: input.mimeType }).size,
    dataUrl: `data:${input.mimeType},${encodeURIComponent(input.text)}`,
  };
}

export async function createBlobExportArtifact(input: {
  blob: Blob;
  fileName: string;
}): Promise<ClientExportArtifact> {
  return {
    fileName: input.fileName,
    mimeType: input.blob.type || "application/octet-stream",
    sizeBytes: input.blob.size,
    dataUrl: await blobToDataUrl(input.blob),
  };
}

export function downloadDataUrl(input: { dataUrl: string; fileName: string }) {
  const link = document.createElement("a");

  link.download = input.fileName;
  link.href = input.dataUrl;
  link.click();
}

export function downloadBlob(input: { blob: Blob; fileName: string }) {
  const blobUrl = URL.createObjectURL(input.blob);
  const link = document.createElement("a");

  link.download = input.fileName;
  link.href = blobUrl;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Export artifact could not be encoded."));
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Export artifact could not be read."));
    });
    reader.readAsDataURL(blob);
  });
}

function estimateDataUrlSizeBytes(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",", 2);

  if (dataUrl.includes(";base64,")) {
    return Math.ceil((payload.length * 3) / 4);
  }

  try {
    return new Blob([decodeURIComponent(payload)]).size;
  } catch {
    return new Blob([payload]).size;
  }
}
