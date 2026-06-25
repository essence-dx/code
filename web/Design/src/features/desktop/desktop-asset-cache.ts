import {
  collectElementDataUrlAssets,
  createDataUrlAssetId,
  estimateDataUrlSizeBytes,
  getDataUrlMimeType,
  isCacheableDataUrl,
  mimeExtension,
  slugifyAssetName,
} from "@/features/assets/data-url-assets";
import type { OfflineAssetCacheRequest } from "@/features/desktop/desktop-file-bridge";
import type { DesignDocument } from "@/features/editor/types";

export {
  estimateDataUrlSizeBytes,
  getDataUrlMimeType,
  isCacheableDataUrl,
} from "@/features/assets/data-url-assets";

export function collectOfflineAssetCacheRequests(document: DesignDocument) {
  const requests = new Map<string, OfflineAssetCacheRequest>();

  for (const page of document.pages) {
    for (const element of page.elements) {
      for (const asset of collectElementDataUrlAssets(element)) {
        const cacheKey = createDataUrlAssetId(asset.dataUrl);

        if (requests.has(cacheKey)) continue;

        requests.set(cacheKey, {
          cacheKey,
          fileName: createOfflineAssetFileName({
            pageName: page.name,
            elementId: element.id,
            fieldName: asset.fieldName,
            mimeType: asset.mimeType,
          }),
          mimeType: asset.mimeType,
          dataUrl: asset.dataUrl,
          sourcePageId: page.id,
          sourceElementId: element.id,
        });
      }
    }
  }

  return Array.from(requests.values());
}

function createOfflineAssetFileName({
  pageName,
  elementId,
  fieldName,
  mimeType,
}: {
  pageName: string;
  elementId: string;
  fieldName: string;
  mimeType: string;
}) {
  return `${slugifyAssetName(pageName)}-${slugifyAssetName(fieldName)}-${elementId}.${mimeExtension(
    mimeType,
  )}`;
}
