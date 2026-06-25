import { NextResponse } from "next/server";

import {
  listProjectVersions,
  restoreProjectVersion,
} from "@/db/project-versions";
import { auth } from "@/lib/auth";

type RestoreProjectVersionRouteContext = {
  params: Promise<{
    projectId: string;
    versionId: string;
  }>;
};

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function POST(
  request: Request,
  context: RestoreProjectVersionRouteContext,
) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, versionId } = await context.params;
  const project = await restoreProjectVersion({
    userId: session.user.id,
    projectId,
    versionId,
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const versions = await listProjectVersions({
    userId: session.user.id,
    projectId,
  });

  return NextResponse.json({ project, versions });
}
