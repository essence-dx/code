import {
  canvasToBlob,
  renderDocumentToCanvas,
} from "@/features/editor/exporters/raster-exporter";
import type { DesignDocument } from "@/features/editor/types";

export async function exportDocumentToJpegBlob(
  document: DesignDocument,
  scale = 1,
) {
  return canvasToBlob(
    await renderDocumentToCanvas(document, scale),
    "image/jpeg",
    0.92,
  );
}
