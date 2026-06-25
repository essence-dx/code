import { NextResponse } from "next/server";
import { z } from "zod";

import {
  listProjectPresence,
  updateProjectPresence,
} from "@/db/project-presence";
import { getProjectCommentAccess } from "@/db/project-access";
import { auth } from "@/lib/auth";

const cursorSchema = z.object({
  x: z.number().min(0).max(20000),
  y: z.number().min(0).max(20000),
});

const presenceSchema = z.object({
  pageId: z.string().min(1).max(120),
  cursor: cursorSchema.nullable().optional(),
  editShareId: z.string().min(16).max(80).optional(),
});

type PresenceRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function GET(request: Request, context: PresenceRouteContext) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const editShareId = new URL(request.url).searchParams.get("editShareId");
  const project = await getProjectCommentAccess({
    userId: session.user.id,
    projectId,
    editShareId,
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const presence = await listProjectPresence({
    projectId,
    viewerUserId: session.user.id,
  });

  return NextResponse.json({ presence });
}

export async function POST(request: Request, context: PresenceRouteContext) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const body = presenceSchema.parse(await request.json());
  const project = await getProjectCommentAccess({
    userId: session.user.id,
    projectId,
    editShareId: body.editShareId,
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await updateProjectPresence({
    projectId,
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Collaborator",
    pageId: body.pageId,
    cursor: body.cursor ?? null,
  });

  const presence = await listProjectPresence({
    projectId,
    viewerUserId: session.user.id,
  });

  return NextResponse.json({ presence });
}
