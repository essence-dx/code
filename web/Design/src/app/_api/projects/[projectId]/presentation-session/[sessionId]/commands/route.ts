import { NextResponse } from "next/server";

import { listPresentationRemoteCommands } from "@/db/presentation-remote-sessions";
import { auth } from "@/lib/auth";

type PresentationSessionCommandsRouteContext = {
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

export async function GET(
  request: Request,
  context: PresentationSessionCommandsRouteContext,
) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, sessionId } = await context.params;
  const commands = await listPresentationRemoteCommands({
    userId: session.user.id,
    projectId,
    sessionId,
  });

  if (!commands) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ commands });
}
