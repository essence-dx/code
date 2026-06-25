import { headers } from "next/headers";
import { z } from "zod";
import { createWorkspace, listUserWorkspaces } from "@/features/workspaces/server/workspace-service";
import { auth } from "@/lib/auth";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

export async function GET() {
  const user = await getSessionUser();

  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await listUserWorkspaces(user.id, user.name);

  return Response.json({ workspaces });
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = createWorkspaceSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid workspace payload" }, { status: 400 });
  }

  try {
    const workspace = await createWorkspace({
      currentUserId: user.id,
      name: payload.data.name,
    });

    return Response.json({ workspace }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Workspace creation failed" }, { status: 400 });
  }
}
