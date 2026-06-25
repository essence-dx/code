import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const brandColor = sqliteTable(
  "brand_color",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    color: text("color").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("brand_color_user_updated_idx").on(table.userId, table.updatedAt),
    uniqueIndex("brand_color_user_color_unique").on(table.userId, table.color),
  ],
);

export const brandLogo = sqliteTable(
  "brand_logo",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    dataUrl: text("data_url").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("brand_logo_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const brandFont = sqliteTable(
  "brand_font",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    fontFamily: text("font_family").notNull(),
    fontSize: integer("font_size").notNull(),
    fontWeight: integer("font_weight").notNull(),
    letterSpacing: real("letter_spacing").notNull(),
    lineHeight: real("line_height").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("brand_font_user_updated_idx").on(table.userId, table.updatedAt),
    uniqueIndex("brand_font_user_role_unique").on(table.userId, table.role),
  ],
);
