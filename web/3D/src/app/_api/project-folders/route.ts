import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { projectFolder } from "@/db/schema";
import { ensureProjectAccessSchema, listAccessibleFolders } from "@/features/projects/server/project-access-service";
import { getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import { auth } from "@/lib/auth";

const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(60),
  workspaceId: z.string().trim().min(1).optional(),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  const folders = await listAccessibleFolders(userId, { workspaceId });

  return Response.json({ folders });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = createFolderSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid folder payload" }, { status: 400 });
  }

  await ensureProjectAccessSchema();

  const workspaceId = payload.data.workspaceId ?? null;

  if (workspaceId) {
    const access = await getWorkspaceAccess(workspaceId, userId);

    if (!access || access.role === "viewer") {
      return Response.json({ error: "Insufficient workspace permission" }, { status: 403 });
    }
  }

  const now = new Date();
  const folder = {
    id: nanoid(),
    workspaceId,
    userId,
    name: payload.data.name,
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(projectFolder).values(folder);

  return Response.json({ folder }, { status: 201 });
}
