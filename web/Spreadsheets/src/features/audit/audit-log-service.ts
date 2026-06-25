import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditLog } from "@/db/schema";

export type AuditLogCategory =
  | "auth"
  | "admin"
  | "workbook"
  | "import"
  | "export"
  | "destructive";

export type AuditLogMetadata = Record<
  string,
  string | number | boolean | null
>;

export type AuditLogActor = {
  id?: string | null;
  email?: string | null;
};

export type AuditLogInput = {
  category: AuditLogCategory;
  action: string;
  summary: string;
  actor?: AuditLogActor | null;
  targetUserId?: string | null;
  targetWorkbookId?: string | null;
  metadata?: AuditLogMetadata;
};

export type AuditLogRow = {
  id: string;
  category: AuditLogCategory;
  action: string;
  summary: string;
  actorEmail: string;
  targetUserId: string | null;
  targetWorkbookId: string | null;
  metadata: AuditLogMetadata;
  createdAt: string;
};

let auditLogTableReady: Promise<void> | null = null;

function ensureAuditLogTable() {
  auditLogTableReady ??= (async () => {
    const db = getDb();

    await db.run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY NOT NULL,
        category TEXT NOT NULL,
        action TEXT NOT NULL,
        summary TEXT NOT NULL,
        actor_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        actor_email TEXT NOT NULL,
        target_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        target_workbook_id TEXT REFERENCES workbook(id) ON DELETE SET NULL,
        metadata TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    await db.run(
      "CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS audit_log_category_idx ON audit_log(category)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS audit_log_actor_user_id_idx ON audit_log(actor_user_id)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS audit_log_target_user_id_idx ON audit_log(target_user_id)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS audit_log_target_workbook_id_idx ON audit_log(target_workbook_id)",
    );
  })();

  return auditLogTableReady;
}

function toAuditLogRow(row: typeof auditLog.$inferSelect): AuditLogRow {
  return {
    id: row.id,
    category: row.category as AuditLogCategory,
    action: row.action,
    summary: row.summary,
    actorEmail: row.actorEmail,
    targetUserId: row.targetUserId,
    targetWorkbookId: row.targetWorkbookId,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function logAuditEvent(input: AuditLogInput) {
  try {
    await ensureAuditLogTable();
    await getDb().insert(auditLog).values({
      id: crypto.randomUUID(),
      category: input.category,
      action: input.action,
      summary: input.summary,
      actorUserId: input.actor?.id ?? null,
      actorEmail: input.actor?.email ?? "System",
      targetUserId: input.targetUserId ?? null,
      targetWorkbookId: input.targetWorkbookId ?? null,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Audit log write failed.", error);
  }
}

export async function listAuditLogs({
  userId,
  isAdmin,
  limit = 50,
}: {
  userId: string;
  isAdmin: boolean;
  limit?: number;
}) {
  await ensureAuditLogTable();

  const rows = isAdmin
    ? await getDb()
        .select()
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
    : await getDb()
        .select()
        .from(auditLog)
        .where(
          or(
            eq(auditLog.actorUserId, userId),
            eq(auditLog.targetUserId, userId),
          ),
        )
        .orderBy(desc(auditLog.createdAt))
        .limit(limit);

  return rows.map(toAuditLogRow);
}

export async function listWorkbookAuditLogs({
  userId,
  workbookId,
  limit = 30,
}: {
  userId: string;
  workbookId: string;
  limit?: number;
}) {
  await ensureAuditLogTable();

  const rows = await getDb()
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.targetWorkbookId, workbookId),
        or(eq(auditLog.actorUserId, userId), eq(auditLog.targetUserId, userId)),
      ),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);

  return rows.map(toAuditLogRow);
}
