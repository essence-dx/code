import { NextResponse, type NextRequest } from "next/server";
import { resolveSplineImportRequest } from "@/features/editor/utils/spline-import";

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON with an input field containing a Spline URL, embed snippet, or API payload." }, { status: 400 });
  }

  try {
    return NextResponse.json(
      {
        spline: resolveSplineImportRequest(payload),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Spline import could not be resolved." }, { status: 422 });
  }
}
