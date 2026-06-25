import { headers } from "next/headers";
import { z } from "zod";
import { updateProjectHealthNotificationState } from "@/features/projects/server/project-health-notification-state-service";
import { auth } from "@/lib/auth";

const notificationStateSchema = z.object({
  action: z.enum(["dismiss", "read", "restore", "snooze"]),
  notificationId: z.string().trim().min(1).max(180),
  projectId: z.string().trim().min(1),
  snoozedUntil: z.string().datetime().nullable().optional(),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = notificationStateSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid notification state payload" }, { status: 400 });
  }

  const result = await updateProjectHealthNotificationState({
    action: payload.data.action,
    currentUserId: userId,
    notificationId: payload.data.notificationId,
    projectId: payload.data.projectId,
    snoozedUntil: payload.data.snoozedUntil ? new Date(payload.data.snoozedUntil) : null,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ state: result.state });
}
