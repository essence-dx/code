import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { workspaceNotificationDeliveryPreference, type WorkspaceNotificationDeliveryPreferenceRecord } from "@/db/schema";
import { normalizeWorkspaceNotificationDeliveryPreferences } from "@/features/workspaces/notification-delivery-preferences";
import { getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";
import type { WorkspaceNotificationDeliveryPreference } from "@/features/workspaces/types";

type ServiceResult<T> = T | { error: string; status: number };

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

export async function ensureWorkspaceNotificationDeliveryPreferenceSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS workspace_notification_delivery_preference (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        topic text NOT NULL,
        in_app_enabled integer NOT NULL DEFAULT 1,
        email_enabled integer NOT NULL DEFAULT 0,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_notification_delivery_preference_workspace_idx ON workspace_notification_delivery_preference(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS workspace_notification_delivery_preference_user_idx ON workspace_notification_delivery_preference(user_id)");
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS workspace_notification_delivery_preference_workspace_user_topic_idx ON workspace_notification_delivery_preference(workspace_id, user_id, topic)",
    );
  })();

  await schemaReady;
}

function toPreference(row: WorkspaceNotificationDeliveryPreferenceRecord): WorkspaceNotificationDeliveryPreference {
  return {
    emailEnabled: row.emailEnabled,
    inAppEnabled: row.inAppEnabled,
    topic: row.topic,
  };
}

export async function listWorkspaceNotificationDeliveryPreferences(input: {
  currentUserId: string;
  workspaceId: string;
}): Promise<ServiceResult<{ preferences: WorkspaceNotificationDeliveryPreference[] }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceNotificationDeliveryPreferenceSchema();

  const rows = await getDb()
    .select()
    .from(workspaceNotificationDeliveryPreference)
    .where(and(eq(workspaceNotificationDeliveryPreference.workspaceId, input.workspaceId), eq(workspaceNotificationDeliveryPreference.userId, input.currentUserId)));

  return {
    preferences: normalizeWorkspaceNotificationDeliveryPreferences(rows.map(toPreference)),
  };
}

export async function saveWorkspaceNotificationDeliveryPreferences(input: {
  currentUserId: string;
  preferences: WorkspaceNotificationDeliveryPreference[];
  workspaceId: string;
}): Promise<ServiceResult<{ preferences: WorkspaceNotificationDeliveryPreference[] }>> {
  const access = await getWorkspaceAccess(input.workspaceId, input.currentUserId);

  if (!access) {
    return { error: "Workspace access is required.", status: 403 };
  }

  await ensureWorkspaceNotificationDeliveryPreferenceSchema();

  const preferences = normalizeWorkspaceNotificationDeliveryPreferences(input.preferences);
  const existingRows = await getDb()
    .select()
    .from(workspaceNotificationDeliveryPreference)
    .where(and(eq(workspaceNotificationDeliveryPreference.workspaceId, input.workspaceId), eq(workspaceNotificationDeliveryPreference.userId, input.currentUserId)));
  const existingByTopic = new Map(existingRows.map((row) => [row.topic, row]));
  const now = new Date();

  for (const preference of preferences) {
    const existing = existingByTopic.get(preference.topic);

    if (existing) {
      await getDb()
        .update(workspaceNotificationDeliveryPreference)
        .set({
          emailEnabled: preference.emailEnabled,
          inAppEnabled: preference.inAppEnabled,
          updatedAt: now,
        })
        .where(eq(workspaceNotificationDeliveryPreference.id, existing.id));
    } else {
      await getDb().insert(workspaceNotificationDeliveryPreference).values({
        createdAt: now,
        emailEnabled: preference.emailEnabled,
        id: nanoid(),
        inAppEnabled: preference.inAppEnabled,
        topic: preference.topic,
        updatedAt: now,
        userId: input.currentUserId,
        workspaceId: input.workspaceId,
      });
    }
  }

  return { preferences };
}
