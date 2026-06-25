import { NextResponse } from "next/server";
import { z } from "zod";

import { setProjectEditShare } from "@/db/projects";
import { auth } from "@/lib/auth";

const editShareProjectSchema = z.object({
  enabled: z.boolean(),
  permission: z.enum(["view", "comment", "edit"]).optional(),
});

type EditShareProjectRouteContext = {
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
  context: EditShareProjectRouteContext,
) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const body = editShareProjectSchema.parse(await request.json());
  const project = await setProjectEditShare({
    userId: session.user.id,
    projectId,
    enabled: body.enabled,
    permission: body.permission,
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    editShareId: project.editShareId,
    editSharePermission: project.editSharePermission,
  });
}
