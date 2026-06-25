import { desc, eq } from "drizzle-orm";
import { adminAuditEvent } from "@/db/schema";
import type { getDb } from "@/db/client";
import {
  WORKSPACE_POLICY_ACTION,
  getWorkspacePolicySettingsFromEvents,
  type WorkspacePolicySettings,
} from "@/features/admin/workspace-policy";

export async function getWorkspacePolicySettingsFromDb(
  db: ReturnType<typeof getDb>,
): Promise<WorkspacePolicySettings> {
  const rows = await db
    .select({
      action: adminAuditEvent.action,
      actorEmail: adminAuditEvent.actorEmail,
      metadata: adminAuditEvent.metadata,
      createdAt: adminAuditEvent.createdAt,
    })
    .from(adminAuditEvent)
    .where(eq(adminAuditEvent.action, WORKSPACE_POLICY_ACTION))
    .orderBy(desc(adminAuditEvent.createdAt))
    .limit(1);

  return getWorkspacePolicySettingsFromEvents(rows);
}
