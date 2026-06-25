import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { project } from "./projects";

export const websitePublish = sqliteTable(
  "website_publish",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    seoTitle: text("seo_title").notNull(),
    seoDescription: text("seo_description").notNull().default(""),
    model: text("model").notNull(),
    status: text("status").notNull().default("published"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("website_publish_slug_unique").on(table.slug),
    uniqueIndex("website_publish_project_unique").on(table.projectId),
    index("website_publish_user_updated_idx").on(table.userId, table.updatedAt),
    index("website_publish_status_idx").on(table.status),
  ],
);

export const websiteFormSubmission = sqliteTable(
  "website_form_submission",
  {
    id: text("id").primaryKey(),
    publishId: text("publish_id")
      .notNull()
      .references(() => websitePublish.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    sectionId: text("section_id").notNull(),
    payload: text("payload").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("website_submission_publish_created_idx").on(
      table.publishId,
      table.createdAt,
    ),
    index("website_submission_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const websiteAnalyticsEvent = sqliteTable(
  "website_analytics_event",
  {
    id: text("id").primaryKey(),
    publishId: text("publish_id")
      .notNull()
      .references(() => websitePublish.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    sectionId: text("section_id"),
    target: text("target"),
    path: text("path").notNull().default(""),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("website_analytics_publish_created_idx").on(
      table.publishId,
      table.createdAt,
    ),
    index("website_analytics_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("website_analytics_type_created_idx").on(
      table.publishId,
      table.eventType,
      table.createdAt,
    ),
  ],
);

export const websiteCustomDomain = sqliteTable(
  "website_custom_domain",
  {
    id: text("id").primaryKey(),
    publishId: text("publish_id")
      .notNull()
      .references(() => websitePublish.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    status: text("status").notNull().default("pending"),
    verificationName: text("verification_name").notNull(),
    verificationValue: text("verification_value").notNull(),
    verifiedAt: integer("verified_at", { mode: "timestamp" }),
    platformStatus: text("platform_status").notNull().default("manual"),
    platformError: text("platform_error"),
    platformAttachedAt: integer("platform_attached_at", {
      mode: "timestamp",
    }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("website_custom_domain_unique").on(table.domain),
    index("website_custom_domain_publish_idx").on(table.publishId),
    index("website_custom_domain_user_updated_idx").on(
      table.userId,
      table.updatedAt,
    ),
    index("website_custom_domain_status_idx").on(table.status),
  ],
);
