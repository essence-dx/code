import { relations, sql } from "drizzle-orm"
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import type { DeckMaster } from "@/features/presentation/types"

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  banned: integer("banned", { mode: "boolean" }).notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  impersonatedBy: text("impersonated_by"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = sqliteTable("account", {
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
})

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
})

export const deck = sqliteTable("deck", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  theme: text("theme").notNull().default("studio"),
  master: text("master", { mode: "json" })
    .$type<DeckMaster>()
    .notNull()
    .default(sql`'{}'`),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const deckAsset = sqliteTable("deck_asset", {
  id: text("id").primaryKey(),
  deckId: text("deck_id")
    .notNull()
    .references(() => deck.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("image"),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  dataUrl: text("data_url").notNull(),
  storageProvider: text("storage_provider").notNull().default("database"),
  storageKey: text("storage_key"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const deckRevision = sqliteTable("deck_revision", {
  id: text("id").primaryKey(),
  deckId: text("deck_id")
    .notNull()
    .references(() => deck.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  theme: text("theme").notNull(),
  slideCount: integer("slide_count").notNull().default(0),
  snapshot: text("snapshot", { mode: "json" }).notNull(),
  source: text("source").notNull().default("manual"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const deckShare = sqliteTable("deck_share", {
  id: text("id").primaryKey(),
  deckId: text("deck_id")
    .notNull()
    .references(() => deck.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
  token: text("token").notNull().unique(),
  permission: text("permission").notNull().default("view"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  accessCodeHash: text("access_code_hash"),
  accessCodeSalt: text("access_code_salt"),
  allowDownloads: integer("allow_downloads", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const deckShareView = sqliteTable("deck_share_view", {
  id: text("id").primaryKey(),
  shareId: text("share_id")
    .notNull()
    .references(() => deckShare.id, { onDelete: "cascade" }),
  deckId: text("deck_id")
    .notNull()
    .references(() => deck.id, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  viewedAt: integer("viewed_at", { mode: "timestamp" }).notNull(),
})

export const deckCollaborator = sqliteTable(
  "deck_collaborator",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => deck.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    invitedEmail: text("invited_email").notNull(),
    role: text("role").notNull().default("viewer"),
    invitedById: text("invited_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("deck_collaborator_deck_user_unique").on(
      table.deckId,
      table.userId,
    ),
  ],
)

export const deckCollaboratorInvite = sqliteTable(
  "deck_collaborator_invite",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => deck.id, { onDelete: "cascade" }),
    invitedEmail: text("invited_email").notNull(),
    role: text("role").notNull().default("viewer"),
    status: text("status").notNull().default("pending"),
    invitedById: text("invited_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    acceptedById: text("accepted_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    acceptedAt: integer("accepted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("deck_collaborator_invite_deck_email_unique").on(
      table.deckId,
      table.invitedEmail,
    ),
  ],
)

export const notification = sqliteTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  deckId: text("deck_id").references(() => deck.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  sourceId: text("source_id"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href").notNull().default(""),
  readAt: integer("read_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const deckPresence = sqliteTable("deck_presence", {
  id: text("id").primaryKey(),
  deckId: text("deck_id")
    .notNull()
    .references(() => deck.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  slideId: text("slide_id"),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const deckCollaborationEvent = sqliteTable(
  "deck_collaboration_event",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => deck.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    type: text("type").notNull(),
    clientEventId: text("client_event_id").notNull(),
    payload: text("payload", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("deck_collaboration_event_client_unique").on(
      table.deckId,
      table.userId,
      table.clientEventId,
    ),
  ],
)

export const slide = sqliteTable("slide", {
  id: text("id").primaryKey(),
  deckId: text("deck_id")
    .notNull()
    .references(() => deck.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  sectionTitle: text("section_title").notNull().default(""),
  layout: text("layout").notNull(),
  background: text("background").notNull(),
  transition: text("transition").notNull().default("none"),
  transitionDurationMs: integer("transition_duration_ms").notNull().default(350),
  autoAdvanceAfterMs: integer("auto_advance_after_ms").notNull().default(0),
  rehearsalDurationMs: integer("rehearsal_duration_ms").notNull().default(0),
  elements: text("elements", { mode: "json" }).notNull(),
  comments: text("comments", { mode: "json" }).notNull().default([]),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  decks: many(deck),
  deckShares: many(deckShare),
  notifications: many(notification),
  presences: many(deckPresence),
  collaborationEvents: many(deckCollaborationEvent),
  deckCollaborations: many(deckCollaborator, {
    relationName: "deckCollaboratorUser",
  }),
  deckCollaboratorInvites: many(deckCollaborator, {
    relationName: "deckCollaboratorInviter",
  }),
  pendingDeckCollaboratorInvites: many(deckCollaboratorInvite, {
    relationName: "deckCollaboratorInviteInviter",
  }),
  acceptedDeckCollaboratorInvites: many(deckCollaboratorInvite, {
    relationName: "deckCollaboratorInviteAcceptedBy",
  }),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const deckRelations = relations(deck, ({ one, many }) => ({
  owner: one(user, {
    fields: [deck.ownerId],
    references: [user.id],
  }),
  assets: many(deckAsset),
  revisions: many(deckRevision),
  shares: many(deckShare),
  shareViews: many(deckShareView),
  collaborators: many(deckCollaborator),
  collaboratorInvites: many(deckCollaboratorInvite),
  slides: many(slide),
  notifications: many(notification),
  presences: many(deckPresence),
  collaborationEvents: many(deckCollaborationEvent),
}))

export const deckAssetRelations = relations(deckAsset, ({ one }) => ({
  deck: one(deck, {
    fields: [deckAsset.deckId],
    references: [deck.id],
  }),
}))

export const deckRevisionRelations = relations(deckRevision, ({ one }) => ({
  deck: one(deck, {
    fields: [deckRevision.deckId],
    references: [deck.id],
  }),
}))

export const deckShareRelations = relations(deckShare, ({ one, many }) => ({
  deck: one(deck, {
    fields: [deckShare.deckId],
    references: [deck.id],
  }),
  owner: one(user, {
    fields: [deckShare.ownerId],
    references: [user.id],
  }),
  views: many(deckShareView),
}))

export const deckShareViewRelations = relations(deckShareView, ({ one }) => ({
  deck: one(deck, {
    fields: [deckShareView.deckId],
    references: [deck.id],
  }),
  share: one(deckShare, {
    fields: [deckShareView.shareId],
    references: [deckShare.id],
  }),
}))

export const deckCollaboratorRelations = relations(
  deckCollaborator,
  ({ one }) => ({
    deck: one(deck, {
      fields: [deckCollaborator.deckId],
      references: [deck.id],
    }),
    user: one(user, {
      fields: [deckCollaborator.userId],
      references: [user.id],
      relationName: "deckCollaboratorUser",
    }),
    inviter: one(user, {
      fields: [deckCollaborator.invitedById],
      references: [user.id],
      relationName: "deckCollaboratorInviter",
    }),
  }),
)

export const deckCollaboratorInviteRelations = relations(
  deckCollaboratorInvite,
  ({ one }) => ({
    deck: one(deck, {
      fields: [deckCollaboratorInvite.deckId],
      references: [deck.id],
    }),
    inviter: one(user, {
      fields: [deckCollaboratorInvite.invitedById],
      references: [user.id],
      relationName: "deckCollaboratorInviteInviter",
    }),
    acceptedBy: one(user, {
      fields: [deckCollaboratorInvite.acceptedById],
      references: [user.id],
      relationName: "deckCollaboratorInviteAcceptedBy",
    }),
  }),
)

export const notificationRelations = relations(notification, ({ one }) => ({
  deck: one(deck, {
    fields: [notification.deckId],
    references: [deck.id],
  }),
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}))

export const deckPresenceRelations = relations(deckPresence, ({ one }) => ({
  deck: one(deck, {
    fields: [deckPresence.deckId],
    references: [deck.id],
  }),
  user: one(user, {
    fields: [deckPresence.userId],
    references: [user.id],
  }),
}))

export const deckCollaborationEventRelations = relations(
  deckCollaborationEvent,
  ({ one }) => ({
    deck: one(deck, {
      fields: [deckCollaborationEvent.deckId],
      references: [deck.id],
    }),
    user: one(user, {
      fields: [deckCollaborationEvent.userId],
      references: [user.id],
    }),
  }),
)

export const slideRelations = relations(slide, ({ one }) => ({
  deck: one(deck, {
    fields: [slide.deckId],
    references: [deck.id],
  }),
}))
