import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { project } from "./projects";

export const presentationResponse = sqliteTable(
  "presentation_response",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    pageId: text("page_id").notNull(),
    interactionId: text("interaction_id").notNull(),
    participantName: text("participant_name").notNull().default("Guest"),
    responseKind: text("response_kind").notNull(),
    answer: text("answer"),
    body: text("body"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("presentation_response_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("presentation_response_interaction_idx").on(
      table.projectId,
      table.pageId,
      table.interactionId,
    ),
  ],
);

export const presentationRemoteSession = sqliteTable(
  "presentation_remote_session",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    controlToken: text("control_token").notNull(),
    activeIndex: integer("active_index").notNull().default(0),
    slideCount: integer("slide_count").notNull().default(1),
    pageName: text("page_name").notNull().default("Slide"),
    status: text("status").notNull().default("active"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("presentation_remote_session_token_unique").on(
      table.controlToken,
    ),
    index("presentation_remote_session_project_user_idx").on(
      table.projectId,
      table.userId,
      table.updatedAt,
    ),
    index("presentation_remote_session_status_expires_idx").on(
      table.status,
      table.expiresAt,
    ),
  ],
);

export const presentationRemoteCommand = sqliteTable(
  "presentation_remote_command",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => presentationRemoteSession.id, {
        onDelete: "cascade",
      }),
    action: text("action").notNull(),
    slideIndex: integer("slide_index"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("presentation_remote_command_session_created_idx").on(
      table.sessionId,
      table.createdAt,
    ),
  ],
);
