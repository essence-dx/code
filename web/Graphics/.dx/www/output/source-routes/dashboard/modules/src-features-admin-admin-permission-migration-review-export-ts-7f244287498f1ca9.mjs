
export const dxSourceText = "import type {\n  AdminPermissionMigration,\n  AdminPermissionMigrationReviewReport,\n  AdminPermissionMigrationReviewRow,\n} from \"@/features/admin/admin-permission-migration-review-types\";\n\nexport function getAdminPermissionMigrationReviewJson(\n  report: AdminPermissionMigrationReviewReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminPermissionMigrationReviewCsv(\n  report: AdminPermissionMigrationReviewReport,\n) {\n  const rowHeader: Array<keyof AdminPermissionMigrationReviewRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"count\",\n    \"target\",\n    \"latestAt\",\n  ];\n  const migrationHeader: Array<keyof AdminPermissionMigration> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"surface\",\n    \"fileName\",\n    \"ownerEmail\",\n    \"currentAccess\",\n    \"targetAccess\",\n    \"risk\",\n    \"leastPrivilegeRecommendation\",\n    \"evidenceCount\",\n    \"latestAt\",\n  ];\n\n  return [\n    [\"section\", ...rowHeader].join(\",\"),\n    ...report.rows.map((row) =>\n      [\"review-row\", ...rowHeader.map((key) => row[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...migrationHeader].join(\",\"),\n    ...report.migrations.map((migration) =>\n      [\"migration\", ...migrationHeader.map((key) => migration[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminPermissionMigrationReviewMarkdown(\n  report: AdminPermissionMigrationReviewReport,\n) {\n  return [\n    \"# Granular Permission Migration Review\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Migrations: ${report.migrationCount}`,\n    `Files: ${report.fileMigrationCount}`,\n    `Shares: ${report.shareMigrationCount}`,\n    `Branches: ${report.branchMigrationCount}`,\n    `Libraries: ${report.libraryMigrationCount}`,\n    `Components: ${report.componentMigrationCount}`,\n    `Least privilege recommendations: ${report.leastPrivilegeRecommendationCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Migration Queue\",\n    \"\",\n    ...report.migrations.map((migration) =>\n      [\n        `- [${migration.status}] ${migration.fileName}`,\n        `  - Surface: ${migration.surface}`,\n        `  - Current: ${migration.currentAccess}`,\n        `  - Target: ${migration.targetAccess}`,\n        `  - Risk: ${migration.risk}`,\n        `  - Least privilege: ${migration.leastPrivilegeRecommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ]\n    .map(redactSensitive)\n    .join(\"\\n\");\n}\n\nfunction redactSensitive(value: string) {\n  return value\n    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, \"[redacted-email]\")\n    .replace(/\\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\\b/gi, \"[redacted-token]\")\n    .replace(/\\/share\\/[A-Za-z0-9_-]+/g, \"/share/[redacted-token]\");\n}\n\nfunction escapeCsvCell(value: string) {\n  if (!/[\",\\n\\r]/.test(value)) {\n    return value;\n  }\n\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-permission-migration-review-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-permission-migration-review-export-ts-7f244287498f1ca9.mjs",
  "kind": "ts",
  "hash": "7f244287498f1ca9",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-permission-migration-review-export.ts",
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
        "specifier": "@/features/admin/admin-permission-migration-review-types",
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
      "getAdminPermissionMigrationReviewJson",
      "getAdminPermissionMigrationReviewCsv",
      "getAdminPermissionMigrationReviewMarkdown"
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
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
