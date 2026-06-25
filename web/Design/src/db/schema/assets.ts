import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const userAsset = sqliteTable(
  "user_asset",
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
    sourceProvider: text("source_provider"),
    sourceUrl: text("source_url"),
    authorName: text("author_name"),
    licenseName: text("license_name"),
    licenseUrl: text("license_url"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("user_asset_user_created_idx").on(table.userId, table.createdAt),
    index("user_asset_source_provider_idx").on(table.sourceProvider),
  ],
);
