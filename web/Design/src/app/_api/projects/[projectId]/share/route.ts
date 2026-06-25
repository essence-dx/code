import { NextResponse } from "next/server";
import { z } from "zod";

import { setProjectPublicShare } from "@/db/projects";
import { auth } from "@/lib/auth";

const shareProjectSchema = z.object({
  enabled: z.boolean(),
});

type ShareProjectRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function PATCH(
  request: Request,
  context: ShareProjectRouteContext,
) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const body = shareProjectSchema.parse(await request.json());
  const project = await setProjectPublicShare({
    userId: session.user.id,
    projectId,
    enabled: body.enabled,
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    publicShareId: project.publicShareId,
  });
}
