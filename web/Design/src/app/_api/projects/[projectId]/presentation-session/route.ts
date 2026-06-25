import { NextResponse } from "next/server";
import { z } from "zod";

import { createPresentationRemoteSession } from "@/db/presentation-remote-sessions";
import { getProject } from "@/db/projects";
import { auth } from "@/lib/auth";

const sessionSchema = z.object({
  activeIndex: z.number().int().min(0),
  slideCount: z.number().int().min(1).max(1000),
  pageName: z.string().min(1).max(160),
});

type PresentationSessionRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function POST(
  request: Request,
  context: PresentationSessionRouteContext,
) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const project = await getProject({ userId: session.user.id, projectId });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = sessionSchema.parse(await request.json());
  const remoteSession = await createPresentationRemoteSession({
    userId: session.user.id,
    projectId,
    activeIndex: Math.min(body.activeIndex, body.slideCount - 1),
    slideCount: body.slideCount,
    pageName: body.pageName,
  });

  if (!remoteSession) {
    return NextResponse.json({ error: "Could not start" }, { status: 500 });
  }

  return NextResponse.json({ session: remoteSession }, { status: 201 });
}
