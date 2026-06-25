import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { SongRightsMetadata } from "@/lib/library/rights";

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    image: text("image"),
    profileModerationStatus: text("profile_moderation_status", {
      enum: ["clean", "pending-review", "hidden"],
    })
      .notNull()
      .default("clean"),
    publicBio: text("public_bio").notNull().default(""),
    publicSocialLinks: text("public_social_links", { mode: "json" })
      .$type<Array<{ label: string; url: string }>>()
      .notNull()
      .default([]),
    featuredSongId: text("featured_song_id"),
    featuredPlaylistId: text("featured_playlist_id"),
    profileCommentsEnabled: integer("profile_comments_enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("user_email_idx").on(table.email)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_idx").on(table.token),
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
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const songs = sqliteTable(
  "songs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    artist: text("artist").notNull().default("essencefromexistence"),
    source: text("source", {
      enum: ["upload", "recording", "edit", "ai", "import"],
    }).notNull(),
    visibility: text("visibility", {
      enum: ["private", "link-only", "public"],
    })
      .notNull()
      .default("private"),
    moderationStatus: text("moderation_status", {
      enum: ["clean", "pending-review", "hidden"],
    })
      .notNull()
      .default("clean"),
    shareSlug: text("share_slug"),
    audioStorageKey: text("audio_storage_key"),
    coverImageUrl: text("cover_image_url"),
    lyrics: text("lyrics").notNull().default(""),
    stylePrompt: text("style_prompt").notNull().default(""),
    durationMs: integer("duration_ms").notNull().default(0),
    bpm: integer("bpm"),
    musicalKey: text("musical_key"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    rightsMetadata: text("rights_metadata", { mode: "json" })
      .$type<SongRightsMetadata>()
      .notNull()
      .default(sql`'{}'`),
    liked: integer("liked", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("songs_user_id_idx").on(table.userId),
    index("songs_created_at_idx").on(table.createdAt),
    uniqueIndex("songs_share_slug_idx").on(table.shareSlug),
  ],
);

export const playlists = sqliteTable(
  "playlists",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    visibility: text("visibility", {
      enum: ["private", "link-only", "public"],
    })
      .notNull()
      .default("private"),
    moderationStatus: text("moderation_status", {
      enum: ["clean", "pending-review", "hidden"],
    })
      .notNull()
      .default("clean"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [index("playlists_user_id_idx").on(table.userId)],
);

export const songAudioFiles = sqliteTable(
  "song_audio_files",
  {
    songId: text("song_id")
      .primaryKey()
      .references(() => songs.id, { onDelete: "cascade" }),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    dataBase64: text("data_base64").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [index("song_audio_files_updated_at_idx").on(table.updatedAt)],
);

export const hookPosts = sqliteTable(
  "hook_posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    sourceSongId: text("source_song_id"),
    songTitle: text("song_title").notNull(),
    artist: text("artist").notNull().default("essencefromexistence"),
    visibility: text("visibility", {
      enum: ["private", "public"],
    })
      .notNull()
      .default("private"),
    moderationStatus: text("moderation_status", {
      enum: ["clean", "pending-review", "hidden"],
    })
      .notNull()
      .default("clean"),
    videoStorageKey: text("video_storage_key"),
    videoType: text("video_type").notNull().default("video/webm"),
    videoByteSize: integer("video_byte_size").notNull().default(0),
    startMs: integer("start_ms").notNull().default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    overlayText: text("overlay_text").notNull().default(""),
    lyrics: text("lyrics").notNull().default(""),
    stylePrompt: text("style_prompt").notNull().default(""),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("hook_posts_user_id_idx").on(table.userId),
    index("hook_posts_public_idx").on(
      table.visibility,
      table.moderationStatus,
      table.updatedAt,
    ),
  ],
);

export const hookVideoFiles = sqliteTable(
  "hook_video_files",
  {
    hookId: text("hook_id")
      .primaryKey()
      .references(() => hookPosts.id, { onDelete: "cascade" }),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    dataBase64: text("data_base64").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [index("hook_video_files_updated_at_idx").on(table.updatedAt)],
);

export const playlistSongs = sqliteTable(
  "playlist_songs",
  {
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    songId: text("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    addedAt: integer("added_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [
    primaryKey({ columns: [table.playlistId, table.songId] }),
    index("playlist_songs_song_id_idx").on(table.songId),
  ],
);

export const studioProjects = sqliteTable(
  "studio_projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    bpm: integer("bpm").notNull().default(120),
    timeSignature: text("time_signature").notNull().default("4/4"),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [index("studio_projects_user_id_idx").on(table.userId)],
);

export const studioRegions = sqliteTable(
  "studio_regions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => studioProjects.id, { onDelete: "cascade" }),
    songId: text("song_id").references(() => songs.id, { onDelete: "set null" }),
    trackName: text("track_name").notNull(),
    startMs: integer("start_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    gainDb: real("gain_db").notNull().default(0),
    pan: real("pan").notNull().default(0),
    muted: integer("muted", { mode: "boolean" }).notNull().default(false),
    solo: integer("solo", { mode: "boolean" }).notNull().default(false),
    color: text("color").notNull().default("#6ee7b7"),
  },
  (table) => [index("studio_regions_project_id_idx").on(table.projectId)],
);

export const aiJobs = sqliteTable(
  "ai_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    kind: text("kind", {
      enum: [
        "chat",
        "lyrics",
        "style",
        "brief",
        "metadata",
        "playlist",
        "hook",
        "cover-art",
        "transcription",
        "audio",
        "sample",
        "stem",
        "stem-variation",
        "remaster",
        "remove-fx",
        "cover-remix",
        "extend",
        "replace-section",
        "midi",
        "warp-marker",
        "vocals",
        "instrumental",
        "persona",
        "model-training",
      ],
    }).notNull(),
    status: text("status", {
      enum: ["queued", "running", "succeeded", "failed", "disabled"],
    })
      .notNull()
      .default("queued"),
    provider: text("provider").notNull().default("unconfigured"),
    model: text("model").notNull().default(""),
    input: text("input", { mode: "json" }).$type<unknown>(),
    output: text("output", { mode: "json" }).$type<unknown>(),
    error: text("error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [
    index("ai_jobs_user_id_idx").on(table.userId),
    index("ai_jobs_kind_status_idx").on(table.kind, table.status),
  ],
);

export const contentReports = sqliteTable(
  "content_reports",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type", {
      enum: ["song", "profile", "playlist", "comment", "hook"],
    }).notNull(),
    targetId: text("target_id").notNull(),
    targetLabel: text("target_label").notNull().default(""),
    targetOwnerId: text("target_owner_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reporterUserId: text("reporter_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reporterEmail: text("reporter_email").notNull().default(""),
    reason: text("reason", {
      enum: [
        "spam",
        "harassment",
        "hate",
        "unsafe",
        "privacy",
        "copyright",
        "other",
      ],
    }).notNull(),
    details: text("details").notNull().default(""),
    status: text("status", {
      enum: ["open", "reviewing", "actioned", "dismissed"],
    })
      .notNull()
      .default("open"),
    adminNote: text("admin_note").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("content_reports_status_idx").on(table.status, table.createdAt),
    index("content_reports_target_idx").on(table.targetType, table.targetId),
    index("content_reports_owner_idx").on(table.targetOwnerId),
    index("content_reports_reporter_idx").on(table.reporterUserId),
  ],
);

export const publicComments = sqliteTable(
  "public_comments",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type", {
      enum: ["song", "playlist", "profile", "hook"],
    }).notNull(),
    targetId: text("target_id").notNull(),
    parentId: text("parent_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: text("status", {
      enum: ["visible", "hidden", "deleted"],
    })
      .notNull()
      .default("visible"),
    hiddenByUserId: text("hidden_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [
    index("public_comments_target_idx").on(
      table.targetType,
      table.targetId,
      table.status,
    ),
    index("public_comments_parent_idx").on(table.parentId),
    index("public_comments_user_idx").on(table.userId),
  ],
);

export const userBlocks = sqliteTable(
  "user_blocks",
  {
    id: text("id").primaryKey(),
    blockerUserId: text("blocker_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedUserId: text("blocked_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [
    index("user_blocks_blocker_idx").on(table.blockerUserId),
    index("user_blocks_blocked_idx").on(table.blockedUserId),
    uniqueIndex("user_blocks_unique_idx").on(
      table.blockerUserId,
      table.blockedUserId,
    ),
  ],
);

export const socialActions = sqliteTable(
  "social_actions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["like", "follow", "repost"],
    }).notNull(),
    targetType: text("target_type", {
      enum: ["song", "profile", "playlist", "hook"],
    }).notNull(),
    targetId: text("target_id").notNull(),
    targetLabel: text("target_label").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [
    index("social_actions_target_idx").on(
      table.targetType,
      table.targetId,
      table.kind,
    ),
    index("social_actions_user_idx").on(table.userId, table.kind),
    uniqueIndex("social_actions_unique_idx").on(
      table.userId,
      table.kind,
      table.targetType,
      table.targetId,
    ),
  ],
);

export const aiGenerations = sqliteTable(
  "ai_generations",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => aiJobs.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [index("ai_generations_job_id_idx").on(table.jobId)],
);

export const providerEvents = sqliteTable(
  "provider_events",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").references(() => aiJobs.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    eventType: text("event_type").notNull(),
    payload: text("payload", { mode: "json" }).$type<unknown>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [index("provider_events_job_id_idx").on(table.jobId)],
);

export const generatedAssets = sqliteTable(
  "generated_assets",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id").references(() => aiJobs.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    type: text("type", {
      enum: ["image", "audio", "lyrics", "transcript", "metadata", "stem", "midi"],
    }).notNull(),
    storageKey: text("storage_key"),
    mediaType: text("media_type").notNull().default("text/plain"),
    title: text("title").notNull(),
    textContent: text("text_content").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (table) => [
    index("generated_assets_job_id_idx").on(table.jobId),
    index("generated_assets_user_id_idx").on(table.userId),
  ],
);

export const songAnalysis = sqliteTable(
  "song_analysis",
  {
    songId: text("song_id")
      .primaryKey()
      .references(() => songs.id, { onDelete: "cascade" }),
    summary: text("summary").notNull().default(""),
    mood: text("mood").notNull().default(""),
    instruments: text("instruments", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    sections: text("sections", { mode: "json" }).$type<unknown[]>(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
);

export const userAiSettings = sqliteTable("user_ai_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  textModel: text("text_model").notNull().default(""),
  imageModel: text("image_model").notNull().default(""),
  audioProviderUrl: text("audio_provider_url").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`),
});

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  songs: many(songs),
  playlists: many(playlists),
  projects: many(studioProjects),
  aiSettings: one(userAiSettings),
}));

export const songRelations = relations(songs, ({ one, many }) => ({
  owner: one(user, {
    fields: [songs.userId],
    references: [user.id],
  }),
  playlistLinks: many(playlistSongs),
  analysis: one(songAnalysis),
  audioFile: one(songAudioFiles),
}));

export const songAudioFileRelations = relations(songAudioFiles, ({ one }) => ({
  song: one(songs, {
    fields: [songAudioFiles.songId],
    references: [songs.id],
  }),
}));

export const playlistRelations = relations(playlists, ({ one, many }) => ({
  owner: one(user, {
    fields: [playlists.userId],
    references: [user.id],
  }),
  songs: many(playlistSongs),
}));

export const contentReportRelations = relations(contentReports, ({ one }) => ({
  owner: one(user, {
    fields: [contentReports.targetOwnerId],
    references: [user.id],
    relationName: "contentReportOwner",
  }),
  reporter: one(user, {
    fields: [contentReports.reporterUserId],
    references: [user.id],
    relationName: "contentReportReporter",
  }),
}));

export const publicCommentRelations = relations(publicComments, ({ one }) => ({
  author: one(user, {
    fields: [publicComments.userId],
    references: [user.id],
  }),
  hiddenBy: one(user, {
    fields: [publicComments.hiddenByUserId],
    references: [user.id],
  }),
}));

export const userBlockRelations = relations(userBlocks, ({ one }) => ({
  blocked: one(user, {
    fields: [userBlocks.blockedUserId],
    references: [user.id],
    relationName: "blockedUser",
  }),
  blocker: one(user, {
    fields: [userBlocks.blockerUserId],
    references: [user.id],
    relationName: "blockerUser",
  }),
}));

export const socialActionRelations = relations(socialActions, ({ one }) => ({
  user: one(user, {
    fields: [socialActions.userId],
    references: [user.id],
  }),
}));

export const playlistSongRelations = relations(playlistSongs, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistSongs.playlistId],
    references: [playlists.id],
  }),
  song: one(songs, {
    fields: [playlistSongs.songId],
    references: [songs.id],
  }),
}));

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type HookPost = typeof hookPosts.$inferSelect;
export type AiJob = typeof aiJobs.$inferSelect;
export type AiJobKind = typeof aiJobs.$inferInsert["kind"];
export type ContentReport = typeof contentReports.$inferSelect;
export type PublicComment = typeof publicComments.$inferSelect;
export type SocialAction = typeof socialActions.$inferSelect;
export type UserBlock = typeof userBlocks.$inferSelect;
