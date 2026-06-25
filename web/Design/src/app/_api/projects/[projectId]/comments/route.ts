import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createProjectComment,
  listProjectComments,
} from "@/db/project-comments";
import {
  getProjectCommentAccess,
  getProjectViewAccess,
} from "@/db/project-access";
import { parseReviewTaskDueDate } from "@/features/review/review-tasks";
import { auth } from "@/lib/auth";

const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
  pageId: z.string().min(1).max(120),
  elementId: z.string().min(1).max(120).nullable().optional(),
  editShareId: z.string().min(16).max(80).optional(),
  taskStatus: z.enum(["none", "todo", "in-progress", "done"]).optional(),
  taskAssigneeName: z.string().trim().max(80).nullable().optional(),
  taskDueAt: z.string().max(40).nullable().optional(),
});

type CommentsRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function GET(request: Request, context: CommentsRouteContext) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const editShareId = new URL(request.url).searchParams.get("editShareId");
  const project = await getProjectViewAccess({
    userId: session.user.id,
    projectId,
    editShareId,
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comments = await listProjectComments({
    projectId,
    viewerUserId: session.user.id,
  });

  return NextResponse.json({ comments });
}

export async function POST(request: Request, context: CommentsRouteContext) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const body = createCommentSchema.parse(await request.json());
  const project = await getProjectCommentAccess({
    userId: session.user.id,
    projectId,
    editShareId: body.editShareId,
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comment = await createProjectComment({
    projectId,
    userId: session.user.id,
    pageId: body.pageId,
    elementId: body.elementId,
    authorName: session.user.name || session.user.email || "Collaborator",
    body: body.body,
    taskStatus: body.taskStatus,
    taskAssigneeName: body.taskAssigneeName,
    taskDueAt: parseReviewTaskDueDate(body.taskDueAt),
  });

  return NextResponse.json({ comment });
}
