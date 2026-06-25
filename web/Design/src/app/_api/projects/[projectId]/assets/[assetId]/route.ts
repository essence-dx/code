import { NextResponse } from "next/server";

import { getProjectById } from "@/db/projects";
import {
  dataUrlToBytes,
  findHostedProjectAsset,
} from "@/features/email/email-assets";
import {
  createNoStoreJsonHeaders,
  createPublicAssetHeaders,
  isValidProjectAssetId,
  isValidProjectRouteId,
} from "@/features/security/public-access-security";

type ProjectAssetContext = {
  params: Promise<{
    projectId: string;
    assetId: string;
  }>;
};

export async function GET(_request: Request, context: ProjectAssetContext) {
  const { projectId, assetId } = await context.params;
  const project =
    isValidProjectRouteId(projectId) && isValidProjectAssetId(assetId)
      ? await getProjectById(projectId)
      : null;

  if (!project) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: createNoStoreJsonHeaders() },
    );
  }

  const asset = findHostedProjectAsset(project, assetId);
  const bytes = asset ? dataUrlToBytes(asset.dataUrl) : null;

  if (!asset || !bytes) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: createNoStoreJsonHeaders() },
    );
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: createPublicAssetHeaders(asset.mimeType),
  });
}
