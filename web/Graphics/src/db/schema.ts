import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { DesignDocument } from "@/features/editor/types";

export type AdminAuditMetadata = Record<
  string,
  string | number | boolean | null
>;

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const designFile = sqliteTable(
  "design_file",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    document: text("document", { mode: "json" }).$type<DesignDocument>().notNull(),
    scope: text("scope").notNull().default("private"),
    teamName: text("team_name").notNull().default("Personal"),
    projectName: text("project_name").notNull().default("Drafts"),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    lastOpenedAt: integer("last_opened_at", { mode: "timestamp" }),
    trashedAt: integer("trashed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("design_file_owner_updated_idx").on(table.ownerId, table.updatedAt),
    index("design_file_owner_trash_idx").on(table.ownerId, table.trashedAt),
  ],
);

export type DesignFile = typeof designFile.$inferSelect;

export const designFileCollaborator = sqliteTable(
  "design_file_collaborator",
  {
    id: text("id").primaryKey(),
    fileId: text("file_id")
      .notNull()
      .references(() => designFile.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    invitedById: text("invited_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("viewer"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("design_file_collaborator_file_user_idx").on(
      table.fileId,
      table.userId,
    ),
    index("design_file_collaborator_file_idx").on(table.fileId),
    index("design_file_collaborator_user_idx").on(table.userId),
  ],
);

export type DesignFileCollaborator =
  typeof designFileCollaborator.$inferSelect;

export const designFileVersion = sqliteTable(
  "design_file_version",
  {
    id: text("id").primaryKey(),
    fileId: text("file_id")
      .notNull()
      .references(() => designFile.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    document: text("document", { mode: "json" }).$type<DesignDocument>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("design_file_version_file_created_idx").on(
      table.fileId,
      table.createdAt,
    ),
    index("design_file_version_owner_idx").on(table.ownerId),
  ],
);

export type DesignFileVersion = typeof designFileVersion.$inferSelect;

export const designFileShare = sqliteTable(
  "design_file_share",
  {
    id: text("id").primaryKey(),
    fileId: text("file_id")
      .notNull()
      .references(() => designFile.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    permissionPreset: text("permission_preset").notNull().default("handoff"),
    accessLevel: text("access_level").notNull().default("inspect"),
    allowComments: integer("allow_comments", { mode: "boolean" })
      .notNull()
      .default(false),
    allowDownload: integer("allow_download", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    disabledAt: integer("disabled_at", { mode: "timestamp" }),
  },
  (table) => [
    index("design_file_share_file_idx").on(table.fileId),
    index("design_file_share_owner_idx").on(table.ownerId),
  ],
);

export type DesignFileShare = typeof designFileShare.$inferSelect;

export const publicRouteEvent = sqliteTable(
  "public_route_event",
  {
    id: text("id").primaryKey(),
    shareId: text("share_id")
      .notNull()
      .references(() => designFileShare.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .references(() => designFile.id, { onDelete: "cascade" }),
    routeKind: text("route_kind").notNull(),
    tokenScope: text("token_scope").notNull(),
    referrerOrigin: text("referrer_origin"),
    referrerKind: text("referrer_kind").notNull().default("direct"),
    userAgentFamily: text("user_agent_family").notNull().default("unknown"),
    host: text("host"),
    viewportWidth: integer("viewport_width"),
    viewportHeight: integer("viewport_height"),
    retentionExpiresAt: integer("retention_expires_at", {
      mode: "timestamp",
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("public_route_event_share_kind_idx").on(
      table.shareId,
      table.routeKind,
      table.createdAt,
    ),
    index("public_route_event_file_created_idx").on(
      table.fileId,
      table.createdAt,
    ),
    index("public_route_event_retention_idx").on(table.retentionExpiresAt),
  ],
);

export type PublicRouteEvent = typeof publicRouteEvent.$inferSelect;

export const adminAuditEvent = sqliteTable(
  "admin_audit_event",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    targetLabel: text("target_label").notNull(),
    metadata: text("metadata", { mode: "json" })
      .$type<AdminAuditMetadata>()
      .notNull()
      .default(sql`'{}'`),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("admin_audit_event_actor_idx").on(table.actorId, table.createdAt),
    index("admin_audit_event_target_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt,
    ),
  ],
);

export type AdminAuditEvent = typeof adminAuditEvent.$inferSelect;
