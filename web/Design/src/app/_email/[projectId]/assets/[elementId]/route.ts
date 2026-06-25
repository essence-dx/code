import { NextResponse } from "next/server";

import { getProjectById } from "@/db/projects";
import {
  dataUrlToBytes,
  findEmailImageAsset,
} from "@/features/email/email-assets";
import {
  createNoStoreJsonHeaders,
  createPublicAssetHeaders,
  isValidElementRouteToken,
  isValidProjectRouteId,
} from "@/features/security/public-access-security";

type EmailAssetContext = {
  params: Promise<{
    projectId: string;
    elementId: string;
  }>;
};

export async function GET(_request: Request, context: EmailAssetContext) {
  const { projectId, elementId } = await context.params;
  const project =
    isValidProjectRouteId(projectId) && isValidElementRouteToken(elementId)
      ? await getProjectById(projectId)
      : null;

  if (!project) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: createNoStoreJsonHeaders() },
    );
  }

  const asset = findEmailImageAsset(project, elementId);
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
