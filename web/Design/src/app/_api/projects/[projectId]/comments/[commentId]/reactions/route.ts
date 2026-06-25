import { NextResponse } from "next/server";
import { z } from "zod";

import {
  listProjectComments,
  toggleProjectCommentReaction,
} from "@/db/project-comments";
import { getProjectCommentAccess } from "@/db/project-access";
import { auth } from "@/lib/auth";

const reactionSchema = z.object({
  reaction: z.enum(["like", "agree", "love"]),
  editShareId: z.string().min(16).max(80).optional(),
});

type CommentReactionRouteContext = {
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

export async function POST(
  request: Request,
  context: CommentReactionRouteContext,
) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, commentId } = await context.params;
  const body = reactionSchema.parse(await request.json());
  const project = await getProjectCommentAccess({
    userId: session.user.id,
    projectId,
    editShareId: body.editShareId,
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const toggled = await toggleProjectCommentReaction({
    projectId,
    commentId,
    userId: session.user.id,
    reaction: body.reaction,
  });

  if (!toggled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comments = await listProjectComments({
    projectId,
    viewerUserId: session.user.id,
  });

  return NextResponse.json({ comments });
}
