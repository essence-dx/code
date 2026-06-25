import { findProjectAssetById } from "@/features/assets/project-asset-manifest";
import type { DesignElement, ProjectDetail } from "@/features/editor/types";

export type EmailImageAsset = {
  dataUrl: string;
  mimeType: string;
};

export function findEmailImageAsset(
  project: ProjectDetail,
  elementId: string,
): EmailImageAsset | null {
  for (const page of project.document.pages) {
    const element = page.elements.find(
      (item): item is Extract<DesignElement, { type: "image" }> =>
        item.type === "image" && item.id === elementId,
    );

    if (!element) continue;

    const mimeType = getDataImageMimeType(element.src);
    if (!mimeType) return null;

    return {
      dataUrl: element.src,
      mimeType,
    };
  }

  return null;
}

export function findHostedProjectAsset(
  project: ProjectDetail,
  assetId: string,
): EmailImageAsset | null {
  const asset = findProjectAssetById(project.document, assetId);

  if (!asset) return null;

  return {
    dataUrl: asset.dataUrl,
    mimeType: asset.mimeType,
  };
}

export function dataUrlToBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;

  return Buffer.from(match[2], "base64");
}

function getDataImageMimeType(value: string) {
  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,/i);

  return match?.[1]?.toLowerCase() ?? null;
}
