import { headers } from "next/headers";
import { z } from "zod";
import {
  listWorkspaceNotificationDeliveryPreferences,
  saveWorkspaceNotificationDeliveryPreferences,
} from "@/features/workspaces/server/workspace-notification-preferences-service";
import { workspaceNotificationTopicSchema } from "@/features/workspaces/types";
import { auth } from "@/lib/auth";

const preferenceSchema = z.object({
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  topic: workspaceNotificationTopicSchema,
});

const updatePreferencesSchema = z.object({
  preferences: z.array(preferenceSchema).min(1),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const currentUserId = await getSessionUserId();

  if (!currentUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await context.params;
  const result = await listWorkspaceNotificationDeliveryPreferences({ currentUserId, workspaceId });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ preferences: result.preferences });
}

export async function PUT(request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const currentUserId = await getSessionUserId();

  if (!currentUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = updatePreferencesSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid notification preference payload" }, { status: 400 });
  }

  const { workspaceId } = await context.params;
  const result = await saveWorkspaceNotificationDeliveryPreferences({
    currentUserId,
    preferences: payload.data.preferences,
    workspaceId,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ preferences: result.preferences });
}
