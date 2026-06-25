import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-lib-forge-db-sqlite-core-ts-b21da59e31504108.mjs";
export const dxSourceText = "import { sql } from \"drizzle-orm\";\nimport {\n  index,\n  integer,\n  sqliteTable,\n  text,\n  uniqueIndex,\n} from \"drizzle-orm/sqlite-core\";\nimport type { DesignDocument } from \"@/features/editor/types\";\n\nexport type AdminAuditMetadata = Record<\n  string,\n  string | number | boolean | null\n>;\n\nexport const user = sqliteTable(\"user\", {\n  id: text(\"id\").primaryKey(),\n  name: text(\"name\").notNull(),\n  email: text(\"email\").notNull().unique(),\n  emailVerified: integer(\"email_verified\", { mode: \"boolean\" })\n    .notNull()\n    .default(false),\n  image: text(\"image\"),\n  createdAt: integer(\"created_at\", { mode: \"timestamp\" })\n    .notNull()\n    .default(sql`(unixepoch())`),\n  updatedAt: integer(\"updated_at\", { mode: \"timestamp\" })\n    .notNull()\n    .default(sql`(unixepoch())`),\n});\n\nexport const session = sqliteTable(\n  \"session\",\n  {\n    id: text(\"id\").primaryKey(),\n    expiresAt: integer(\"expires_at\", { mode: \"timestamp\" }).notNull(),\n    token: text(\"token\").notNull().unique(),\n    createdAt: integer(\"created_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n    updatedAt: integer(\"updated_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n    ipAddress: text(\"ip_address\"),\n    userAgent: text(\"user_agent\"),\n    userId: text(\"user_id\")\n      .notNull()\n      .references(() => user.id, { onDelete: \"cascade\" }),\n  },\n  (table) => [index(\"session_user_id_idx\").on(table.userId)],\n);\n\nexport const account = sqliteTable(\n  \"account\",\n  {\n    id: text(\"id\").primaryKey(),\n    accountId: text(\"account_id\").notNull(),\n    providerId: text(\"provider_id\").notNull(),\n    userId: text(\"user_id\")\n      .notNull()\n      .references(() => user.id, { onDelete: \"cascade\" }),\n    accessToken: text(\"access_token\"),\n    refreshToken: text(\"refresh_token\"),\n    idToken: text(\"id_token\"),\n    accessTokenExpiresAt: integer(\"access_token_expires_at\", {\n      mode: \"timestamp\",\n    }),\n    refreshTokenExpiresAt: integer(\"refresh_token_expires_at\", {\n      mode: \"timestamp\",\n    }),\n    scope: text(\"scope\"),\n    password: text(\"password\"),\n    createdAt: integer(\"created_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n    updatedAt: integer(\"updated_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n  },\n  (table) => [index(\"account_user_id_idx\").on(table.userId)],\n);\n\nexport const verification = sqliteTable(\"verification\", {\n  id: text(\"id\").primaryKey(),\n  identifier: text(\"identifier\").notNull(),\n  value: text(\"value\").notNull(),\n  expiresAt: integer(\"expires_at\", { mode: \"timestamp\" }).notNull(),\n  createdAt: integer(\"created_at\", { mode: \"timestamp\" })\n    .notNull()\n    .default(sql`(unixepoch())`),\n  updatedAt: integer(\"updated_at\", { mode: \"timestamp\" })\n    .notNull()\n    .default(sql`(unixepoch())`),\n});\n\nexport const designFile = sqliteTable(\n  \"design_file\",\n  {\n    id: text(\"id\").primaryKey(),\n    ownerId: text(\"owner_id\")\n      .notNull()\n      .references(() => user.id, { onDelete: \"cascade\" }),\n    name: text(\"name\").notNull(),\n    document: text(\"document\", { mode: \"json\" }).$type<DesignDocument>().notNull(),\n    scope: text(\"scope\").notNull().default(\"private\"),\n    teamName: text(\"team_name\").notNull().default(\"Personal\"),\n    projectName: text(\"project_name\").notNull().default(\"Drafts\"),\n    favorite: integer(\"favorite\", { mode: \"boolean\" }).notNull().default(false),\n    lastOpenedAt: integer(\"last_opened_at\", { mode: \"timestamp\" }),\n    trashedAt: integer(\"trashed_at\", { mode: \"timestamp\" }),\n    createdAt: integer(\"created_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n    updatedAt: integer(\"updated_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n  },\n  (table) => [\n    index(\"design_file_owner_updated_idx\").on(table.ownerId, table.updatedAt),\n    index(\"design_file_owner_trash_idx\").on(table.ownerId, table.trashedAt),\n  ],\n);\n\nexport type DesignFile = typeof designFile.$inferSelect;\n\nexport const designFileCollaborator = sqliteTable(\n  \"design_file_collaborator\",\n  {\n    id: text(\"id\").primaryKey(),\n    fileId: text(\"file_id\")\n      .notNull()\n      .references(() => designFile.id, { onDelete: \"cascade\" }),\n    userId: text(\"user_id\")\n      .notNull()\n      .references(() => user.id, { onDelete: \"cascade\" }),\n    invitedById: text(\"invited_by_id\")\n      .notNull()\n      .references(() => user.id, { onDelete: \"cascade\" }),\n    role: text(\"role\").notNull().default(\"viewer\"),\n    createdAt: integer(\"created_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n    updatedAt: integer(\"updated_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n  },\n  (table) => [\n    uniqueIndex(\"design_file_collaborator_file_user_idx\").on(\n      table.fileId,\n      table.userId,\n    ),\n    index(\"design_file_collaborator_file_idx\").on(table.fileId),\n    index(\"design_file_collaborator_user_idx\").on(table.userId),\n  ],\n);\n\nexport type DesignFileCollaborator =\n  typeof designFileCollaborator.$inferSelect;\n\nexport const designFileVersion = sqliteTable(\n  \"design_file_version\",\n  {\n    id: text(\"id\").primaryKey(),\n    fileId: text(\"file_id\")\n      .notNull()\n      .references(() => designFile.id, { onDelete: \"cascade\" }),\n    ownerId: text(\"owner_id\")\n      .notNull()\n      .references(() => user.id, { onDelete: \"cascade\" }),\n    name: text(\"name\").notNull(),\n    document: text(\"document\", { mode: \"json\" }).$type<DesignDocument>().notNull(),\n    createdAt: integer(\"created_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n  },\n  (table) => [\n    index(\"design_file_version_file_created_idx\").on(\n      table.fileId,\n      table.createdAt,\n    ),\n    index(\"design_file_version_owner_idx\").on(table.ownerId),\n  ],\n);\n\nexport type DesignFileVersion = typeof designFileVersion.$inferSelect;\n\nexport const designFileShare = sqliteTable(\n  \"design_file_share\",\n  {\n    id: text(\"id\").primaryKey(),\n    fileId: text(\"file_id\")\n      .notNull()\n      .references(() => designFile.id, { onDelete: \"cascade\" }),\n    ownerId: text(\"owner_id\")\n      .notNull()\n      .references(() => user.id, { onDelete: \"cascade\" }),\n    token: text(\"token\").notNull().unique(),\n    permissionPreset: text(\"permission_preset\").notNull().default(\"handoff\"),\n    accessLevel: text(\"access_level\").notNull().default(\"inspect\"),\n    allowComments: integer(\"allow_comments\", { mode: \"boolean\" })\n      .notNull()\n      .default(false),\n    allowDownload: integer(\"allow_download\", { mode: \"boolean\" })\n      .notNull()\n      .default(true),\n    createdAt: integer(\"created_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n    expiresAt: integer(\"expires_at\", { mode: \"timestamp\" }),\n    disabledAt: integer(\"disabled_at\", { mode: \"timestamp\" }),\n  },\n  (table) => [\n    index(\"design_file_share_file_idx\").on(table.fileId),\n    index(\"design_file_share_owner_idx\").on(table.ownerId),\n  ],\n);\n\nexport type DesignFileShare = typeof designFileShare.$inferSelect;\n\nexport const publicRouteEvent = sqliteTable(\n  \"public_route_event\",\n  {\n    id: text(\"id\").primaryKey(),\n    shareId: text(\"share_id\")\n      .notNull()\n      .references(() => designFileShare.id, { onDelete: \"cascade\" }),\n    fileId: text(\"file_id\")\n      .notNull()\n      .references(() => designFile.id, { onDelete: \"cascade\" }),\n    routeKind: text(\"route_kind\").notNull(),\n    tokenScope: text(\"token_scope\").notNull(),\n    referrerOrigin: text(\"referrer_origin\"),\n    referrerKind: text(\"referrer_kind\").notNull().default(\"direct\"),\n    userAgentFamily: text(\"user_agent_family\").notNull().default(\"unknown\"),\n    host: text(\"host\"),\n    viewportWidth: integer(\"viewport_width\"),\n    viewportHeight: integer(\"viewport_height\"),\n    retentionExpiresAt: integer(\"retention_expires_at\", {\n      mode: \"timestamp\",\n    }).notNull(),\n    createdAt: integer(\"created_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n  },\n  (table) => [\n    index(\"public_route_event_share_kind_idx\").on(\n      table.shareId,\n      table.routeKind,\n      table.createdAt,\n    ),\n    index(\"public_route_event_file_created_idx\").on(\n      table.fileId,\n      table.createdAt,\n    ),\n    index(\"public_route_event_retention_idx\").on(table.retentionExpiresAt),\n  ],\n);\n\nexport type PublicRouteEvent = typeof publicRouteEvent.$inferSelect;\n\nexport const adminAuditEvent = sqliteTable(\n  \"admin_audit_event\",\n  {\n    id: text(\"id\").primaryKey(),\n    actorId: text(\"actor_id\")\n      .notNull()\n      .references(() => user.id, { onDelete: \"cascade\" }),\n    actorEmail: text(\"actor_email\").notNull(),\n    action: text(\"action\").notNull(),\n    targetType: text(\"target_type\").notNull(),\n    targetId: text(\"target_id\").notNull(),\n    targetLabel: text(\"target_label\").notNull(),\n    metadata: text(\"metadata\", { mode: \"json\" })\n      .$type<AdminAuditMetadata>()\n      .notNull()\n      .default(sql`'{}'`),\n    createdAt: integer(\"created_at\", { mode: \"timestamp\" })\n      .notNull()\n      .default(sql`(unixepoch())`),\n  },\n  (table) => [\n    index(\"admin_audit_event_actor_idx\").on(table.actorId, table.createdAt),\n    index(\"admin_audit_event_target_idx\").on(\n      table.targetType,\n      table.targetId,\n      table.createdAt,\n    ),\n  ],\n);\n\nexport type AdminAuditEvent = typeof adminAuditEvent.$inferSelect;\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/db/schema.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-db-schema-ts-24b183fcc50e5ffb.mjs",
  "kind": "ts",
  "hash": "24b183fcc50e5ffb",
  "dependencies": [
    {
      "specifier": "drizzle-orm",
      "resolved_path": "src/lib/forge/db/drizzle-orm.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "drizzle-orm/sqlite-core",
      "resolved_path": "src/lib/forge/db/sqlite-core.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-db-sqlite-core-ts-b21da59e31504108.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    }
  ],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/db/schema.ts",
    "source_kind": "ts",
    "parser_backend": "oxc-parser",
    "diagnostics": 0,
    "compatibility_reference": {
      "upstream_crates": [
        "turbopack-ecmascript"
      ],
      "reference_only": true,
      "runtime_build_adoption": false,
      "public_runtime_dependency": false,
      "vendor_root": "vendor/next-rust",
      "vendor_commit": "f3f56ecec2f3f8cefa0f0a1323ea406740251d5c",
      "next_transform_references": [
        "next-custom-transforms::track_dynamic_imports",
        "next-custom-transforms::react_server_components"
      ],
      "copied_code": false
    },
    "output_model": {
      "contract": "dx.www.moduleGraph",
      "compiler_owns_output": true,
      "public_architecture": "DX-owned source graph analysis"
    },
    "runtime_boundaries": {
      "next_runtime_required": false,
      "react_runtime_required": false,
      "rsc_required": false,
      "node_modules_required": false
    },
    "directives": [],
    "static_imports": [
      {
        "specifier": "drizzle-orm",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "drizzle-orm/sqlite-core",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/types",
        "side_effect_only": false,
        "type_only": true
      }
    ],
    "dynamic_imports": [],
    "unresolved_dynamic_imports": [],
    "unsupported_dynamic_imports": [],
    "dynamic_import_analysis": {
      "status": "none-observed",
      "static_count": 0,
      "unresolved_count": 0,
      "unsupported_count": 0,
      "boundary": "source-owned dynamic import analysis; static specifiers become evidence, expressions remain unresolved, and unsupported call forms stay as adapter-boundary receipts"
    },
    "export_names": [
      "user",
      "session",
      "account",
      "verification",
      "designFile",
      "designFileCollaborator",
      "designFileVersion",
      "designFileShare",
      "publicRouteEvent",
      "adminAuditEvent"
    ],
    "jsx": false,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: false,
  transformKind: "metadata-only",
  exportNames: []
});
export const dxRuntimeExports = Object.freeze({});
export const dxLinkedDependencies = Object.freeze([dep0, dep1]);
export default dxSourceModule;
