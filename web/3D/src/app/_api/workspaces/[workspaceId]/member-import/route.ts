import { headers } from "next/headers";
import { z } from "zod";
import { createWorkspaceMemberImportPlan, parseWorkspaceMemberImportCsv } from "@/features/workspaces/member-import-export";
import { createWorkspaceInvite, getWorkspaceDashboard } from "@/features/workspaces/server/workspace-service";
import { auth } from "@/lib/auth";

const importPayloadSchema = z.object({
  allowAdminInvites: z.boolean().optional(),
  csvContent: z.string().max(50_000),
});

async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function POST(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession();

  if (!session?.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = importPayloadSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return Response.json({ error: "Invalid member import payload" }, { status: 400 });
  }

  try {
    const { workspaceId } = await context.params;
    const workspace = await getWorkspaceDashboard(session.user.id, session.user.name, workspaceId);

    if (workspace.role !== "owner" && workspace.role !== "admin") {
      return Response.json({ error: "Only workspace owners and admins can import members." }, { status: 403 });
    }

    const plan = createWorkspaceMemberImportPlan({
      allowAdminInvites: payload.data.allowAdminInvites,
      rows: parseWorkspaceMemberImportCsv(payload.data.csvContent),
      workspace,
    });
    const createdInvites = [];
    const failedRows = [];

    for (const row of plan.invitesToCreate) {
      try {
        const invite = await createWorkspaceInvite({
          currentUserId: session.user.id,
          email: row.email,
          role: row.role,
          workspaceId,
        });

        createdInvites.push({
          email: invite.email,
          expiresAt: invite.expiresAt.toISOString(),
          id: invite.id,
          role: invite.role,
          sourceLine: row.sourceLine,
          token: invite.token,
        });
      } catch (error) {
        failedRows.push({
          email: row.email,
          error: error instanceof Error ? error.message : "Invite creation failed",
          sourceLine: row.sourceLine,
        });
      }
    }

    return Response.json(
      {
        createdInvites,
        failedRows,
        plan,
      },
      { status: failedRows.length > 0 ? 207 : 201 },
    );
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Member import failed" }, { status: 400 });
  }
}
