import { NextResponse } from "next/server";
import { normalizeWorkbookCollaborationSyncRequest } from "@/features/spreadsheet/workbook-collaboration";
import { syncWorkbookCollaboration } from "@/features/workbooks/workbook-collaboration-service";
import { getCurrentSession } from "@/lib/session";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ workbookId: string }>;
  },
) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return errorResponse("Authentication required.", 401);
  }

  const { workbookId } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid collaboration request.", 400);
  }

  const payload = normalizeWorkbookCollaborationSyncRequest(body);

  try {
    const result = await syncWorkbookCollaboration({
      afterSequence: payload.afterSequence,
      clientId: payload.clientId,
      currentUser: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      events: payload.events,
      presence: payload.presence,
      workbookId,
    });

    if (!result) {
      return errorResponse("Workbook not found.", 404);
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "forbidden") {
      return errorResponse("Editor access is required for this update.", 403);
    }

    return errorResponse("Collaboration sync failed.", 500);
  }
}
