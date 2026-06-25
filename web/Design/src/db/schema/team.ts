import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const teamWorkspace = sqliteTable(
  "team_workspace",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("team_workspace_owner_updated_idx").on(
      table.ownerId,
      table.updatedAt,
    ),
  ],
);

export const teamWorkspaceMember = sqliteTable(
  "team_workspace_member",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => teamWorkspace.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("team_workspace_member_user_updated_idx").on(
      table.userId,
      table.updatedAt,
    ),
    index("team_workspace_member_workspace_role_idx").on(
      table.workspaceId,
      table.role,
    ),
    uniqueIndex("team_workspace_member_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
  ],
);

export const teamWorkspaceInvite = sqliteTable(
  "team_workspace_invite",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => teamWorkspace.id, { onDelete: "cascade" }),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    acceptedByUserId: text("accepted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    role: text("role").notNull().default("member"),
    token: text("token").notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp" }),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("team_workspace_invite_email_idx").on(table.email),
    index("team_workspace_invite_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    uniqueIndex("team_workspace_invite_token_unique").on(table.token),
  ],
);
