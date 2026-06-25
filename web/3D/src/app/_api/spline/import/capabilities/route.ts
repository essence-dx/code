import { NextResponse } from "next/server";
import { getSplineAuthorizedImportCapabilities, readSplineAuthorizedImportConfig } from "@/features/editor/utils/spline-authorized-import";

export function GET() {
  return NextResponse.json(
    {
      capabilities: getSplineAuthorizedImportCapabilities(readSplineAuthorizedImportConfig()),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
