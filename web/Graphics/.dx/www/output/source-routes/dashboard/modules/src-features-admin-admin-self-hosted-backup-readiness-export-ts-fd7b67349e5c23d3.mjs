
export const dxSourceText = "import type { AdminSelfHostedBackupReadinessReport } from \"@/features/admin/admin-self-hosted-backup-readiness\";\n\nexport function getAdminSelfHostedBackupReadinessJson(\n  report: AdminSelfHostedBackupReadinessReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminSelfHostedBackupReadinessCsv(\n  report: AdminSelfHostedBackupReadinessReport,\n) {\n  return [\n    [\n      \"id\",\n      \"status\",\n      \"kind\",\n      \"label\",\n      \"value\",\n      \"latest_at\",\n      \"target\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.status,\n        row.kind,\n        row.label,\n        row.value,\n        row.latestAt,\n        row.target,\n        row.detail,\n        row.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"database_kind\",\n      \"database_configured\",\n      \"database_auth_ready\",\n      \"backup_schedule_configured\",\n      \"backup_target_configured\",\n      \"backup_command_configured\",\n      \"version_anchors\",\n      \"files_without_versions\",\n      \"active_shares\",\n      \"stale_shares\",\n      \"elevated_shares\",\n      \"release_approvals\",\n      \"deploy_smoke_score\",\n      \"rollback_score\",\n    ].join(\",\"),\n    [\n      report.databaseKind,\n      report.databaseConfigured,\n      report.databaseAuthReady,\n      report.backupScheduleConfigured,\n      report.backupTargetConfigured,\n      report.backupCommandConfigured,\n      report.versionAnchorCount,\n      report.filesWithoutVersions,\n      report.activeShareCount,\n      report.staleShareCount,\n      report.elevatedShareCount,\n      report.releaseApprovalCount,\n      report.deploySmokeScore,\n      report.rollbackScore,\n    ]\n      .map(escapeCsvCell)\n      .join(\",\"),\n    \"\",\n    [\"command\"].join(\",\"),\n    ...report.commands.map((command) => [command].map(escapeCsvCell).join(\",\")),\n  ].join(\"\\n\");\n}\n\nexport function getAdminSelfHostedBackupReadinessMarkdown(\n  report: AdminSelfHostedBackupReadinessReport,\n) {\n  return [\n    \"# Self-Hosted Backup Readiness\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,\n    \"\",\n    \"## Signals\",\n    \"\",\n    `- Database: ${report.databaseKind}`,\n    `- Database configured: ${formatBoolean(report.databaseConfigured)}`,\n    `- Database auth ready: ${formatBoolean(report.databaseAuthReady)}`,\n    `- Backup schedule configured: ${formatBoolean(report.backupScheduleConfigured)}`,\n    `- Backup target configured: ${formatBoolean(report.backupTargetConfigured)}`,\n    `- Backup command configured: ${formatBoolean(report.backupCommandConfigured)}`,\n    `- Version anchors: ${report.versionAnchorCount}`,\n    `- Files without versions: ${report.filesWithoutVersions}`,\n    `- Active shares: ${report.activeShareCount}`,\n    `- Stale shares: ${report.staleShareCount}`,\n    `- Elevated shares: ${report.elevatedShareCount}`,\n    `- Release approvals: ${report.releaseApprovalCount}`,\n    `- Deploy smoke score: ${report.deploySmokeScore}`,\n    `- Rollback score: ${report.rollbackScore}`,\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n  ].join(\"\\n\");\n}\n\nfunction formatBoolean(value: boolean) {\n  return value ? \"yes\" : \"no\";\n}\n\nfunction escapeCsvCell(value: boolean | number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-self-hosted-backup-readiness-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-self-hosted-backup-readiness-export-ts-fd7b67349e5c23d3.mjs",
  "kind": "ts",
  "hash": "fd7b67349e5c23d3",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-self-hosted-backup-readiness-export.ts",
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
        "specifier": "@/features/admin/admin-self-hosted-backup-readiness",
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
      "getAdminSelfHostedBackupReadinessJson",
      "getAdminSelfHostedBackupReadinessCsv",
      "getAdminSelfHostedBackupReadinessMarkdown"
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
