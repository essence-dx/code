import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const workspaceAuditLog = sqliteTable(
  "workspace_audit_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    summary: text("summary").notNull(),
    metadata: text("metadata").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workspace_audit_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("workspace_audit_user_action_idx").on(table.userId, table.action),
    index("workspace_audit_target_idx").on(table.targetType, table.targetId),
  ],
);
