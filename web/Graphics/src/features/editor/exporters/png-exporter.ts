import {
  canvasToBlob,
  renderDocumentToCanvas,
} from "@/features/editor/exporters/raster-exporter";
import type { DesignDocument } from "@/features/editor/types";

export async function exportDocumentToPngBlob(
  document: DesignDocument,
  scale = 1,
) {
  return canvasToBlob(await renderDocumentToCanvas(document, scale), "image/png");
}
