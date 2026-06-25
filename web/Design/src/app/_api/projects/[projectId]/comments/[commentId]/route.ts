import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveProjectComment } from "@/db/project-comments";
import { getProjectCommentAccess } from "@/db/project-access";
import { auth } from "@/lib/auth";

const resolveCommentSchema = z.object({
  resolved: z.literal(true),
  editShareId: z.string().min(16).max(80).optional(),
});

type CommentRouteContext = {
  params: Promise<{
    projectId: string;
    commentId: string;
  }>;
};

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function PATCH(request: Request, context: CommentRouteContext) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, commentId } = await context.params;
  const body = resolveCommentSchema.parse(await request.json());
  const project = await getProjectCommentAccess({
    userId: session.user.id,
    projectId,
    editShareId: body.editShareId,
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comment = await resolveProjectComment({
    projectId,
    commentId,
  });

  if (!comment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ comment });
}
