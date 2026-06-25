import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const userNotification = sqliteTable(
  "user_notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    targetHref: text("target_href"),
    readAt: integer("read_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("user_notification_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("user_notification_user_read_idx").on(table.userId, table.readAt),
  ],
);
