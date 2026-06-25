import { NextResponse } from "next/server";
import {
  getSplineAuthorizedImportHealth,
  probeSplineAuthorizedImportProvider,
  readSplineAuthorizedImportConfig,
} from "@/features/editor/utils/spline-authorized-import";

export async function GET(request?: Request) {
  const config = readSplineAuthorizedImportConfig();
  const health = getSplineAuthorizedImportHealth(config);
  const shouldProbe = request ? new URL(request.url).searchParams.get("probe") === "1" : false;

  if (shouldProbe && health.privateEditorFileImport.configured) {
    try {
      const probe = await probeSplineAuthorizedImportProvider(config);

      health.privateEditorFileImport = {
        ...health.privateEditorFileImport,
        ...probe,
      };
    } catch (error) {
      health.privateEditorFileImport = {
        ...health.privateEditorFileImport,
        message: error instanceof Error ? error.message : "Authorized Spline export service health check failed.",
        status: "unreachable",
      };
    }
  }

  return NextResponse.json(
    {
      health,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
