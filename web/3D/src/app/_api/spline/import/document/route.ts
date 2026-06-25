import { NextResponse, type NextRequest } from "next/server";
import {
  assertSplinePrivateImportRequestAccess,
  createAuthorizedSplineImportDocumentFromInput,
  readSplineAuthorizedImportConfig,
} from "@/features/editor/utils/spline-authorized-import";

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON with an input field containing a Spline URL, embed snippet, or API payload." }, { status: 400 });
  }

  try {
    const config = readSplineAuthorizedImportConfig();

    assertSplinePrivateImportRequestAccess(payload, config, request.headers);

    return NextResponse.json(await createAuthorizedSplineImportDocumentFromInput(payload, config), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Spline project import could not be resolved." }, { status: 422 });
  }
}
