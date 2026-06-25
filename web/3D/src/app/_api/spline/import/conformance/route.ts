import { NextResponse, type NextRequest } from "next/server";
import {
  assertSplinePrivateImportRequestAccess,
  readSplineAuthorizedImportConfig,
  verifySplineAuthorizedImportProviderConformance,
} from "@/features/editor/utils/spline-authorized-import";

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send JSON with an input field containing a private Spline editor-file URL." },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 400,
      },
    );
  }

  try {
    const config = readSplineAuthorizedImportConfig();

    assertSplinePrivateImportRequestAccess(payload, config, request.headers);

    const result = await verifySplineAuthorizedImportProviderConformance(payload, config);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: result.ok ? 200 : 422,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Spline import provider conformance could not be checked.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 422,
      },
    );
  }
}
