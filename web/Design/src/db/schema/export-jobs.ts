import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { project } from "./projects";

export const serverExportJob = sqliteTable(
  "server_export_job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    projectName: text("project_name").notNull(),
    format: text("format").notNull(),
    formatLabel: text("format_label").notNull(),
    fileName: text("file_name").notNull(),
    status: text("status").notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    artifactName: text("artifact_name"),
    artifactMimeType: text("artifact_mime_type"),
    artifactSizeBytes: integer("artifact_size_bytes"),
    artifactDataUrl: text("artifact_data_url"),
    failureMessage: text("failure_message"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
  (table) => [
    index("server_export_user_updated_idx").on(table.userId, table.updatedAt),
    index("server_export_project_updated_idx").on(
      table.projectId,
      table.updatedAt,
    ),
    index("server_export_user_status_idx").on(table.userId, table.status),
  ],
);
