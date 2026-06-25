import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    ...timestamps,
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
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
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(table.providerId, table.accountId),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    plan: text("plan", { enum: ["free-local", "team-local"] }).notNull().default("free-local"),
    ...timestamps,
  },
  (table) => [
    index("workspaces_owner_id_idx").on(table.ownerId),
    uniqueIndex("workspaces_slug_unique").on(table.slug),
  ],
);

export const folders = sqliteTable(
  "folders",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    visibility: text("visibility", { enum: ["workspace", "private"] })
      .notNull()
      .default("workspace"),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("folders_workspace_id_idx").on(table.workspaceId),
    index("folders_owner_id_idx").on(table.ownerId),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
    folderAccess: text("folder_access", { enum: ["inherited", "private", "shared"] })
      .notNull()
      .default("inherited"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status", { enum: ["draft", "rendering", "exported", "archived"] })
      .notNull()
      .default("draft"),
    aspectRatio: text("aspect_ratio").notNull().default("16:9"),
    duration: integer("duration").notNull().default(0),
    thumbnailUrl: text("thumbnail_url"),
    projectJson: text("project_json").notNull(),
    ...timestamps,
  },
  (table) => [
    index("projects_workspace_id_idx").on(table.workspaceId),
    index("projects_owner_id_idx").on(table.ownerId),
    index("projects_folder_id_idx").on(table.folderId),
  ],
);

export const projectVersions = sqliteTable(
  "project_versions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    action: text("action", { enum: ["sync", "restore"] }).notNull().default("sync"),
    layerCount: integer("layer_count").notNull().default(0),
    mediaCount: integer("media_count").notNull().default(0),
    duration: integer("duration").notNull().default(0),
    versionJson: text("version_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("project_versions_project_created_idx").on(table.projectId, table.createdAt),
    index("project_versions_owner_created_idx").on(table.ownerId, table.createdAt),
  ],
);

export const projectAuditEvents = sqliteTable(
  "project_audit_events",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action", { enum: ["sync", "restore", "delete"] }).notNull(),
    detail: text("detail").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("project_audit_events_project_created_idx").on(table.projectId, table.createdAt),
    index("project_audit_events_owner_created_idx").on(table.ownerId, table.createdAt),
  ],
);

export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    role: text("role", { enum: ["owner", "editor", "viewer"] })
      .notNull()
      .default("viewer"),
    status: text("status", { enum: ["active", "removed"] })
      .notNull()
      .default("active"),
    ...timestamps,
  },
  (table) => [
    index("workspace_members_workspace_id_idx").on(table.workspaceId),
    index("workspace_members_user_id_idx").on(table.userId),
    uniqueIndex("workspace_members_workspace_email_unique").on(table.workspaceId, table.email),
  ],
);

export const workspaceInvitations = sqliteTable(
  "workspace_invitations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    invitedById: text("invited_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: ["owner", "editor", "viewer"] })
      .notNull()
      .default("viewer"),
    status: text("status", { enum: ["pending", "accepted", "revoked"] })
      .notNull()
      .default("pending"),
    token: text("token").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workspace_invitations_token_unique").on(table.token),
    index("workspace_invitations_workspace_status_idx").on(table.workspaceId, table.status),
    index("workspace_invitations_email_idx").on(table.email),
  ],
);

export const projectPermissionOverrides = sqliteTable(
  "project_permission_overrides",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    memberEmail: text("member_email").notNull(),
    role: text("role", { enum: ["owner", "editor", "viewer"] })
      .notNull()
      .default("viewer"),
    ...timestamps,
  },
  (table) => [
    index("project_permission_overrides_project_idx").on(table.projectId),
    uniqueIndex("project_permission_overrides_project_email_unique").on(table.projectId, table.memberEmail),
  ],
);

export const workspaceAuditEvents = sqliteTable(
  "workspace_audit_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type", { enum: ["comment", "folder", "share", "member", "invite", "project-permission", "export-review", "project"] }).notNull(),
    targetId: text("target_id"),
    detail: text("detail").notNull(),
    ...timestamps,
  },
  (table) => [
    index("workspace_audit_events_workspace_created_idx").on(table.workspaceId, table.createdAt),
    index("workspace_audit_events_project_created_idx").on(table.projectId, table.createdAt),
  ],
);

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mediaType: text("media_type", { enum: ["video", "image", "audio"] }).notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    duration: integer("duration"),
    width: integer("width"),
    height: integer("height"),
    storageAdapter: text("storage_adapter", { enum: ["browser-opfs", "browser-indexeddb", "tauri-fs", "self-hosted-url"] })
      .notNull()
      .default("browser-indexeddb"),
    storageKey: text("storage_key").notNull(),
    checksum: text("checksum"),
    ...timestamps,
  },
  (table) => [
    index("media_assets_project_id_idx").on(table.projectId),
    index("media_assets_workspace_id_idx").on(table.workspaceId),
  ],
);

export const brandKits = sqliteTable(
  "brand_kits",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    colorsJson: text("colors_json").notNull().default("[]"),
    fontsJson: text("fonts_json").notNull().default("[]"),
    logosJson: text("logos_json").notNull().default("[]"),
    ...timestamps,
  },
  (table) => [index("brand_kits_workspace_id_idx").on(table.workspaceId)],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    time: integer("time"),
    timeEnd: integer("time_end"),
    layerId: text("layer_id"),
    canvasX: integer("canvas_x"),
    canvasY: integer("canvas_y"),
    resolvedAt: integer("resolved_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (table) => [index("comments_project_id_idx").on(table.projectId)],
);

export const templates = sqliteTable(
  "templates",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    aspectRatio: text("aspect_ratio").notNull(),
    templateJson: text("template_json").notNull(),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (table) => [index("templates_workspace_id_idx").on(table.workspaceId)],
);

export const exports = sqliteTable(
  "exports",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    format: text("format", { enum: ["mp4", "webm", "mov", "avi", "mpeg", "gif", "png", "jpg", "webp", "wav", "mp3", "m4a", "json"] }).notNull(),
    status: text("status", { enum: ["queued", "rendering", "complete", "failed", "cancelled"] })
      .notNull()
      .default("queued"),
    progress: integer("progress").notNull().default(0),
    outputName: text("output_name"),
    outputSize: integer("output_size"),
    error: text("error"),
    ...timestamps,
  },
  (table) => [
    index("exports_project_id_idx").on(table.projectId),
    index("exports_owner_id_idx").on(table.ownerId),
  ],
);

export const hostedReviewLinks = sqliteTable(
  "hosted_review_links",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    permission: text("permission", { enum: ["comment-only", "view", "download"] })
      .notNull()
      .default("comment-only"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    title: text("title").notNull(),
    exportName: text("export_name"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("hosted_review_links_token_unique").on(table.token),
    index("hosted_review_links_owner_id_idx").on(table.ownerId),
    index("hosted_review_links_project_id_idx").on(table.projectId),
    index("hosted_review_links_expires_at_idx").on(table.expiresAt),
  ],
);

export const hostedReviewComments = sqliteTable(
  "hosted_review_comments",
  {
    id: text("id").primaryKey(),
    linkId: text("link_id")
      .notNull()
      .references(() => hostedReviewLinks.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    reviewerName: text("reviewer_name").notNull().default("Reviewer"),
    reviewerEmail: text("reviewer_email"),
    body: text("body").notNull(),
    time: integer("time"),
    anchorLabel: text("anchor_label"),
    resolvedAt: integer("resolved_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (table) => [
    index("hosted_review_comments_link_id_idx").on(table.linkId),
    index("hosted_review_comments_project_id_idx").on(table.projectId),
    index("hosted_review_comments_created_at_idx").on(table.createdAt),
  ],
);

export const aiUsageEvents = sqliteTable(
  "ai_usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    action: text("action", {
      enum: [
        "script",
        "captions",
        "b-roll",
        "video-project",
        "repurpose",
        "edit-plan",
        "transcript-cleanup",
        "smart-cut",
        "subtitle-style",
        "subtitle-translation",
        "image",
        "image-edit",
        "voiceover",
        "audio-cleanup",
        "video-enhancement",
        "scene-video",
      ],
    }).notNull(),
    model: text("model").notNull(),
    status: text("status", { enum: ["complete", "failed", "rate_limited"] }).notNull(),
    promptChars: integer("prompt_chars").notNull().default(0),
    outputChars: integer("output_chars").notNull().default(0),
    error: text("error"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("ai_usage_events_user_created_idx").on(table.userId, table.createdAt),
    index("ai_usage_events_action_created_idx").on(table.action, table.createdAt),
  ],
);

export const aiGenerationRecords = sqliteTable(
  "ai_generation_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    usageEventId: text("usage_event_id").references(() => aiUsageEvents.id, { onDelete: "set null" }),
    action: text("action", {
      enum: [
        "script",
        "captions",
        "b-roll",
        "video-project",
        "repurpose",
        "edit-plan",
        "transcript-cleanup",
        "smart-cut",
        "subtitle-style",
        "subtitle-translation",
        "image",
        "image-edit",
        "voiceover",
        "audio-cleanup",
        "video-enhancement",
        "scene-video",
      ],
    }).notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status", { enum: ["complete", "failed", "rate_limited"] }).notNull(),
    safetyStatus: text("safety_status", { enum: ["allowed", "blocked", "flagged"] })
      .notNull()
      .default("allowed"),
    safetyReason: text("safety_reason"),
    promptText: text("prompt_text").notNull(),
    promptChars: integer("prompt_chars").notNull().default(0),
    outputChars: integer("output_chars").notNull().default(0),
    outputSummary: text("output_summary"),
    outputAssetKind: text("output_asset_kind", { enum: ["none", "caption", "image", "audio", "video", "project", "stock"] })
      .notNull()
      .default("none"),
    outputAssetName: text("output_asset_name"),
    error: text("error"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("ai_generation_records_user_created_idx").on(table.userId, table.createdAt),
    index("ai_generation_records_project_created_idx").on(table.projectId, table.createdAt),
    index("ai_generation_records_action_created_idx").on(table.action, table.createdAt),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  workspaces: many(workspaces),
  projects: many(projects),
  aiUsageEvents: many(aiUsageEvents),
  aiGenerationRecords: many(aiGenerationRecords),
}));

export const workspaceRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(user, {
    fields: [workspaces.ownerId],
    references: [user.id],
  }),
  folders: many(folders),
  projects: many(projects),
  mediaAssets: many(mediaAssets),
  brandKits: many(brandKits),
  workspaceMembers: many(workspaceMembers),
  workspaceInvitations: many(workspaceInvitations),
  workspaceAuditEvents: many(workspaceAuditEvents),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  owner: one(user, {
    fields: [projects.ownerId],
    references: [user.id],
  }),
  folder: one(folders, {
    fields: [projects.folderId],
    references: [folders.id],
  }),
  mediaAssets: many(mediaAssets),
  projectVersions: many(projectVersions),
  projectAuditEvents: many(projectAuditEvents),
  projectPermissionOverrides: many(projectPermissionOverrides),
  workspaceAuditEvents: many(workspaceAuditEvents),
  comments: many(comments),
  exports: many(exports),
  hostedReviewLinks: many(hostedReviewLinks),
  hostedReviewComments: many(hostedReviewComments),
  aiGenerationRecords: many(aiGenerationRecords),
}));

export const schema = {
  user,
  session,
  account,
  verification,
  workspaces,
  folders,
  projects,
  projectVersions,
  projectAuditEvents,
  workspaceMembers,
  workspaceInvitations,
  projectPermissionOverrides,
  workspaceAuditEvents,
  mediaAssets,
  brandKits,
  comments,
  templates,
  exports,
  hostedReviewLinks,
  hostedReviewComments,
  aiUsageEvents,
  aiGenerationRecords,
  userRelations,
  workspaceRelations,
  projectRelations,
};

export type DbSchema = typeof schema;
