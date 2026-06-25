
export const dxSourceText = "import type {\n  SelfHostedSyncDiagnosticReport,\n  SelfHostedSyncDiagnosticRow,\n  SelfHostedSyncRepairCommand,\n} from \"@/features/admin/admin-self-hosted-sync-diagnostics\";\n\nexport function getSelfHostedSyncDiagnosticJson(\n  report: SelfHostedSyncDiagnosticReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getSelfHostedSyncDiagnosticCsv(\n  report: SelfHostedSyncDiagnosticReport,\n) {\n  const rowHeader: Array<keyof SelfHostedSyncDiagnosticRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"repairCommand\",\n    \"latestAt\",\n  ];\n  const commandHeader: Array<keyof SelfHostedSyncRepairCommand> = [\n    \"id\",\n    \"category\",\n    \"command\",\n    \"reason\",\n  ];\n\n  return [\n    [\n      \"generated_at\",\n      \"status\",\n      \"score\",\n      \"database_kind\",\n      \"database_auth_ready\",\n      \"desktop_channel\",\n      \"desktop_version_parity\",\n      \"browser_base_url\",\n      \"vercel_env\",\n      \"runtime\",\n      \"realtime_score\",\n      \"route_smoke_score\",\n      \"repair_command_count\",\n    ].join(\",\"),\n    [\n      report.generatedAt,\n      report.status,\n      report.score,\n      report.databaseKind,\n      report.databaseAuthReady,\n      report.desktopChannel,\n      report.desktopVersionParity,\n      report.browserBaseUrl,\n      report.vercelEnv,\n      report.runtime,\n      report.realtimeScore,\n      report.routeSmokeScore,\n      report.repairCommandCount,\n    ]\n      .map(escapeCsvCell)\n      .join(\",\"),\n    \"\",\n    [\"section\", ...rowHeader].join(\",\"),\n    ...report.rows.map((row) =>\n      [\"row\", ...rowHeader.map((key) => row[key])]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\"section\", ...commandHeader].join(\",\"),\n    ...report.repairCommands.map((command) =>\n      [\"command\", ...commandHeader.map((key) => command[key])]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getSelfHostedSyncDiagnosticMarkdown(\n  report: SelfHostedSyncDiagnosticReport,\n) {\n  return [\n    \"# Self-Hosted Sync Diagnostics\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,\n    \"\",\n    \"## Runtime Parity\",\n    \"\",\n    `- Database: ${report.databaseKind}`,\n    `- Database auth ready: ${formatBoolean(report.databaseAuthReady)}`,\n    `- Desktop channel: ${report.desktopChannel}`,\n    `- Desktop version parity: ${report.desktopVersionParity}`,\n    `- Browser base URL: ${report.browserBaseUrl}`,\n    `- Vercel environment: ${report.vercelEnv}`,\n    `- Runtime: ${report.runtime}`,\n    `- Realtime score: ${report.realtimeScore}`,\n    `- Route smoke score: ${report.routeSmokeScore}`,\n    \"\",\n    \"## Diagnostics\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Category: ${row.category}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Recommendation: ${row.recommendation}`,\n        `  - Repair: \\`${row.repairCommand}\\``,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Repair Commands\",\n    \"\",\n    ...report.repairCommands.map((command) =>\n      [\n        `- \\`${command.command}\\``,\n        `  - Category: ${command.category}`,\n        `  - Reason: ${command.reason}`,\n      ].join(\"\\n\"),\n    ),\n  ].join(\"\\n\");\n}\n\nfunction formatBoolean(value: boolean) {\n  return value ? \"yes\" : \"no\";\n}\n\nfunction escapeCsvCell(value: unknown) {\n  const text = String(value ?? \"\");\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-self-hosted-sync-diagnostics-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-self-hosted-sync-diagnostics-export-ts-508ceb20670be401.mjs",
  "kind": "ts",
  "hash": "508ceb20670be401",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-self-hosted-sync-diagnostics-export.ts",
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
        "specifier": "@/features/admin/admin-self-hosted-sync-diagnostics",
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
      "getSelfHostedSyncDiagnosticJson",
      "getSelfHostedSyncDiagnosticCsv",
      "getSelfHostedSyncDiagnosticMarkdown"
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
