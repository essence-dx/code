import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { project } from "./projects";

export const campaignBoard = sqliteTable(
  "campaign_board",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brief: text("brief").notNull().default(""),
    goal: text("goal").notNull().default(""),
    audience: text("audience").notNull().default(""),
    status: text("status").notNull().default("active"),
    primaryBrandColor: text("primary_brand_color"),
    brandLogoName: text("brand_logo_name"),
    brandFontFamily: text("brand_font_family"),
    launchAt: integer("launch_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("campaign_board_user_updated_idx").on(table.userId, table.updatedAt),
    index("campaign_board_user_status_idx").on(table.userId, table.status),
  ],
);

export const campaignDeliverable = sqliteTable(
  "campaign_deliverable",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaignBoard.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    role: text("role").notNull(),
    channel: text("channel").notNull(),
    status: text("status").notNull().default("planned"),
    approvalStatus: text("approval_status").notNull().default("draft"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("campaign_deliverable_campaign_idx").on(table.campaignId),
    index("campaign_deliverable_user_project_idx").on(
      table.userId,
      table.projectId,
    ),
    index("campaign_deliverable_user_status_idx").on(table.userId, table.status),
    index("campaign_deliverable_user_approval_idx").on(
      table.userId,
      table.approvalStatus,
    ),
  ],
);
