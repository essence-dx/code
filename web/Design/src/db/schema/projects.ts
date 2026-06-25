import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const projectFolder = sqliteTable(
  "project_folder",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_folder_user_updated_idx").on(table.userId, table.updatedAt),
    uniqueIndex("project_folder_user_name_unique").on(table.userId, table.name),
  ],
);

export const project = sqliteTable(
  "project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    folderId: text("folder_id").references(() => projectFolder.id, {
      onDelete: "set null",
    }),
    sourceProjectId: text("source_project_id"),
    variantProfileId: text("variant_profile_id"),
    variantName: text("variant_name"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    document: text("document").notNull(),
    thumbnail: text("thumbnail"),
    publicShareId: text("public_share_id"),
    editShareId: text("edit_share_id"),
    editSharePermission: text("edit_share_permission")
      .notNull()
      .default("edit"),
    approvalStatus: text("approval_status").notNull().default("draft"),
    starred: integer("starred", { mode: "boolean" }).notNull().default(false),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_user_folder_idx").on(table.userId, table.folderId),
    index("project_source_project_idx").on(table.sourceProjectId),
    index("project_user_variant_idx").on(table.userId, table.variantProfileId),
    index("project_user_approval_idx").on(table.userId, table.approvalStatus),
    index("project_user_starred_idx").on(table.userId, table.starred),
    index("project_user_updated_idx").on(table.userId, table.updatedAt),
    uniqueIndex("project_public_share_id_unique").on(table.publicShareId),
    uniqueIndex("project_edit_share_id_unique").on(table.editShareId),
  ],
);

export const designTemplate = sqliteTable(
  "design_template",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    document: text("document").notNull(),
    thumbnail: text("thumbnail"),
    isBrandTemplate: integer("is_brand_template", { mode: "boolean" })
      .notNull()
      .default(false),
    isTeamTemplate: integer("is_team_template", { mode: "boolean" })
      .notNull()
      .default(false),
    approvalStatus: text("approval_status").notNull().default("draft"),
    marketplaceStatus: text("marketplace_status").notNull().default("draft"),
    marketplaceCollection: text("marketplace_collection"),
    marketplaceSeason: text("marketplace_season"),
    marketplaceReviewNote: text("marketplace_review_note")
      .notNull()
      .default(""),
    marketplacePublishedAt: integer("marketplace_published_at", {
      mode: "timestamp",
    }),
    marketplaceUseCount: integer("marketplace_use_count").notNull().default(0),
    marketplaceViewCount: integer("marketplace_view_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("design_template_user_updated_idx").on(table.userId, table.updatedAt),
    index("design_template_user_brand_idx").on(
      table.userId,
      table.isBrandTemplate,
    ),
    index("design_template_team_updated_idx").on(
      table.isTeamTemplate,
      table.updatedAt,
    ),
    index("design_template_approval_idx").on(table.userId, table.approvalStatus),
    index("design_template_marketplace_status_idx").on(
      table.marketplaceStatus,
      table.updatedAt,
    ),
    index("design_template_marketplace_collection_idx").on(
      table.marketplaceCollection,
      table.marketplaceStatus,
    ),
    index("design_template_marketplace_usage_idx").on(
      table.marketplaceUseCount,
    ),
  ],
);

export const projectVersion = sqliteTable(
  "project_version",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    document: text("document").notNull(),
    thumbnail: text("thumbnail"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_version_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("project_version_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const projectComment = sqliteTable(
  "project_comment",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    pageId: text("page_id").notNull(),
    elementId: text("element_id"),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    mentions: text("mentions").notNull().default("[]"),
    resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
    taskStatus: text("task_status").notNull().default("none"),
    taskAssigneeName: text("task_assignee_name"),
    taskDueAt: integer("task_due_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_comment_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("project_comment_project_page_idx").on(table.projectId, table.pageId),
    index("project_comment_project_task_idx").on(
      table.projectId,
      table.taskStatus,
    ),
    index("project_comment_task_due_idx").on(table.taskStatus, table.taskDueAt),
  ],
);

export const projectCommentReaction = sqliteTable(
  "project_comment_reaction",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    commentId: text("comment_id")
      .notNull()
      .references(() => projectComment.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reaction: text("reaction").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_comment_reaction_project_idx").on(table.projectId),
    uniqueIndex("project_comment_reaction_user_unique").on(
      table.commentId,
      table.userId,
      table.reaction,
    ),
  ],
);

export const projectPresence = sqliteTable(
  "project_presence",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userName: text("user_name").notNull(),
    color: text("color").notNull(),
    pageId: text("page_id").notNull(),
    cursorX: real("cursor_x"),
    cursorY: real("cursor_y"),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("project_presence_project_seen_idx").on(
      table.projectId,
      table.lastSeenAt,
    ),
    uniqueIndex("project_presence_user_unique").on(
      table.projectId,
      table.userId,
    ),
  ],
);
