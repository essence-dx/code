import { NextResponse, type NextRequest } from "next/server";
import { createSplineViewerHtml } from "@/features/editor/utils/spline-import";

export function GET(request: NextRequest) {
  const runtimeUrl = request.nextUrl.searchParams.get("url");

  if (!runtimeUrl) {
    return NextResponse.json({ error: "Missing Spline runtime URL." }, { status: 400 });
  }

  try {
    return new NextResponse(createSplineViewerHtml(runtimeUrl), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Spline viewer could not be created." }, { status: 422 });
  }
}
