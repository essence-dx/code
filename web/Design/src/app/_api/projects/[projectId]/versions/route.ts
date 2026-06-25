import { NextResponse } from "next/server";

import { listProjectVersions } from "@/db/project-versions";
import { getProject } from "@/db/projects";
import { auth } from "@/lib/auth";

type ProjectVersionsRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function GET(
  request: Request,
  context: ProjectVersionsRouteContext,
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

  const versions = await listProjectVersions({
    userId: session.user.id,
    projectId,
  });

  return NextResponse.json({ versions });
}
