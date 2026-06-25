import { NextResponse } from "next/server";
import { z } from "zod";

import { updatePresentationRemoteState } from "@/db/presentation-remote-sessions";
import { auth } from "@/lib/auth";

const stateSchema = z.object({
  activeIndex: z.number().int().min(0),
  slideCount: z.number().int().min(1).max(1000),
  pageName: z.string().min(1).max(160),
});

type PresentationSessionStateRouteContext = {
  params: Promise<{
    projectId: string;
    sessionId: string;
  }>;
};

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function PATCH(
  request: Request,
  context: PresentationSessionStateRouteContext,
) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, sessionId } = await context.params;
  const body = stateSchema.parse(await request.json());
  const remoteSession = await updatePresentationRemoteState({
    userId: session.user.id,
    projectId,
    sessionId,
    activeIndex: Math.min(body.activeIndex, body.slideCount - 1),
    slideCount: body.slideCount,
    pageName: body.pageName,
  });

  if (!remoteSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ session: remoteSession });
}
