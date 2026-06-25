import type { WorkbookDocument } from "@/features/workbooks/types";
import type {
  WorkbookCollaborationEventPayload,
} from "@/features/spreadsheet/workbook-collaboration";
import type { WorkbookPresenceSnapshot } from "@/features/spreadsheet/workbook-presence";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    image: text("image"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
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
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const rateLimit = sqliteTable("rateLimit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  lastRequest: integer("lastRequest").notNull(),
});

export const workbook = sqliteTable(
  "workbook",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    data: text("data", { mode: "json" }).$type<WorkbookDocument>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("workbook_owner_id_idx").on(table.ownerId),
    index("workbook_updated_at_idx").on(table.updatedAt),
  ],
);

export const workbookCollaborator = sqliteTable(
  "workbook_collaborator",
  {
    id: text("id").primaryKey(),
    workbookId: text("workbook_id")
      .notNull()
      .references(() => workbook.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull(),
    invitedByUserId: text("invited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("workbook_collaborator_workbook_email_unique").on(
      table.workbookId,
      table.email,
    ),
    index("workbook_collaborator_workbook_id_idx").on(table.workbookId),
    index("workbook_collaborator_user_id_idx").on(table.userId),
    index("workbook_collaborator_email_idx").on(table.email),
  ],
);

export const workbookShareLink = sqliteTable(
  "workbook_share_link",
  {
    id: text("id").primaryKey(),
    workbookId: text("workbook_id")
      .notNull()
      .references(() => workbook.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    role: text("role").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("workbook_share_link_token_unique").on(table.token),
    index("workbook_share_link_workbook_id_idx").on(table.workbookId),
  ],
);

export const workbookCollaborationEvent = sqliteTable(
  "workbook_collaboration_event",
  {
    serverSequence: integer("server_sequence").primaryKey({
      autoIncrement: true,
    }),
    id: text("id").notNull(),
    workbookId: text("workbook_id")
      .notNull()
      .references(() => workbook.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    clientMutationId: text("client_mutation_id").notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    payload: text("payload", { mode: "json" })
      .$type<WorkbookCollaborationEventPayload>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("workbook_collaboration_event_id_unique").on(table.id),
    uniqueIndex("workbook_collaboration_event_client_unique").on(
      table.workbookId,
      table.clientMutationId,
    ),
    index("workbook_collaboration_event_workbook_sequence_idx").on(
      table.workbookId,
      table.serverSequence,
    ),
    index("workbook_collaboration_event_user_id_idx").on(table.userId),
  ],
);

export const workbookCollaborationPresence = sqliteTable(
  "workbook_collaboration_presence",
  {
    id: text("id").primaryKey(),
    workbookId: text("workbook_id")
      .notNull()
      .references(() => workbook.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    snapshot: text("snapshot", { mode: "json" })
      .$type<WorkbookPresenceSnapshot>()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("workbook_collaboration_presence_client_unique").on(
      table.workbookId,
      table.clientId,
    ),
    index("workbook_collaboration_presence_workbook_updated_idx").on(
      table.workbookId,
      table.updatedAt,
    ),
    index("workbook_collaboration_presence_user_id_idx").on(table.userId),
  ],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorEmail: text("actor_email").notNull(),
    targetUserId: text("target_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    targetWorkbookId: text("target_workbook_id").references(() => workbook.id, {
      onDelete: "set null",
    }),
    metadata: text("metadata", { mode: "json" })
      .$type<Record<string, string | number | boolean | null>>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("audit_log_created_at_idx").on(table.createdAt),
    index("audit_log_category_idx").on(table.category),
    index("audit_log_actor_user_id_idx").on(table.actorUserId),
    index("audit_log_target_user_id_idx").on(table.targetUserId),
    index("audit_log_target_workbook_id_idx").on(table.targetWorkbookId),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  workbooks: many(workbook),
  workbookCollaborations: many(workbookCollaborator),
  workbookShareLinks: many(workbookShareLink),
  workbookCollaborationEvents: many(workbookCollaborationEvent),
  workbookCollaborationPresenceRows: many(workbookCollaborationPresence),
  auditLogs: many(auditLog),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const workbookRelations = relations(workbook, ({ many, one }) => ({
  owner: one(user, {
    fields: [workbook.ownerId],
    references: [user.id],
  }),
  collaborators: many(workbookCollaborator),
  shareLinks: many(workbookShareLink),
  collaborationEvents: many(workbookCollaborationEvent),
  collaborationPresenceRows: many(workbookCollaborationPresence),
}));

export const workbookCollaboratorRelations = relations(
  workbookCollaborator,
  ({ one }) => ({
    workbook: one(workbook, {
      fields: [workbookCollaborator.workbookId],
      references: [workbook.id],
    }),
    user: one(user, {
      fields: [workbookCollaborator.userId],
      references: [user.id],
    }),
    invitedBy: one(user, {
      fields: [workbookCollaborator.invitedByUserId],
      references: [user.id],
    }),
  }),
);

export const workbookShareLinkRelations = relations(
  workbookShareLink,
  ({ one }) => ({
    workbook: one(workbook, {
      fields: [workbookShareLink.workbookId],
      references: [workbook.id],
    }),
    createdBy: one(user, {
      fields: [workbookShareLink.createdByUserId],
      references: [user.id],
    }),
  }),
);

export const workbookCollaborationEventRelations = relations(
  workbookCollaborationEvent,
  ({ one }) => ({
    workbook: one(workbook, {
      fields: [workbookCollaborationEvent.workbookId],
      references: [workbook.id],
    }),
    user: one(user, {
      fields: [workbookCollaborationEvent.userId],
      references: [user.id],
    }),
  }),
);

export const workbookCollaborationPresenceRelations = relations(
  workbookCollaborationPresence,
  ({ one }) => ({
    workbook: one(workbook, {
      fields: [workbookCollaborationPresence.workbookId],
      references: [workbook.id],
    }),
    user: one(user, {
      fields: [workbookCollaborationPresence.userId],
      references: [user.id],
    }),
  }),
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(user, {
    fields: [auditLog.actorUserId],
    references: [user.id],
  }),
  targetUser: one(user, {
    fields: [auditLog.targetUserId],
    references: [user.id],
  }),
  targetWorkbook: one(workbook, {
    fields: [auditLog.targetWorkbookId],
    references: [workbook.id],
  }),
}));
