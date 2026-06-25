import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { project } from "./projects";

export const contentScheduleItem = sqliteTable(
  "content_schedule_item",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    channel: text("channel").notNull(),
    caption: text("caption").notNull().default(""),
    status: text("status").notNull().default("planned"),
    scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("content_schedule_user_scheduled_idx").on(
      table.userId,
      table.scheduledAt,
    ),
    index("content_schedule_user_status_idx").on(table.userId, table.status),
    index("content_schedule_project_idx").on(table.projectId),
  ],
);
