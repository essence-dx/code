import { exportDocumentToSvg } from "@/features/editor/exporters/svg-exporter";
import type { DesignDocument } from "@/features/editor/types";

export async function renderDocumentToCanvas(
  document: DesignDocument,
  scale = 1,
) {
  const svg = exportDocumentToSvg(document);
  const image = await loadSvgImage(svg);
  const canvas = window.document.createElement("canvas");
  const exportScale = Math.max(1, scale);
  canvas.width = Math.max(1, Math.round(image.naturalWidth * exportScale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * exportScale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas rendering is not available.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`${type} export failed.`));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function loadSvgImage(svg: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const blob = new Blob([svg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG preview image failed to load."));
    };
    image.src = url;
  });
}
