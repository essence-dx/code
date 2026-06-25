
export const dxSourceText = "import type {\n  AdminRealtimeHealthReport,\n  AdminRealtimeHealthRow,\n} from \"@/features/admin/admin-realtime-health-monitor\";\n\nexport function getAdminRealtimeHealthJson(report: AdminRealtimeHealthReport) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminRealtimeHealthCsv(report: AdminRealtimeHealthReport) {\n  const header: Array<keyof AdminRealtimeHealthRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"target\",\n    \"latestAt\",\n  ];\n\n  return [header, ...report.rows.map((row) => header.map((key) => row[key]))]\n    .map((row) => row.map(escapeCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getAdminRealtimeHealthMarkdown(\n  report: AdminRealtimeHealthReport,\n) {\n  return [\n    \"# Workspace Realtime Health Monitor\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Active files: ${report.activeFileCount}`,\n    `Monitored rooms: ${report.monitoredRoomCount}`,\n    `Stale rooms: ${report.staleRoomCount}`,\n    `Average room age: ${report.averageRoomAgeMinutes ?? \"none\"}`,\n    `Max room age: ${report.maxRoomAgeMinutes ?? \"none\"}`,\n    `Reconnect quality: ${report.reconnectQualityScore}`,\n    `Pending save signals: ${report.pendingSaveSignalCount}`,\n    `Failed notifications: ${report.failedNotificationDeliveryCount}`,\n    `Route analytics anomalies: ${report.routeAnalyticsAnomalyCount}`,\n    \"\",\n    \"## Health Rows\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Category: ${row.category}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Recommendation: ${row.recommendation}`,\n        `  - Target: ${row.target ?? \"none\"}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- ${command}`),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: unknown) {\n  const text = String(value ?? \"\");\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-realtime-health-monitor-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-realtime-health-monitor-export-ts-b7005984ad75283d.mjs",
  "kind": "ts",
  "hash": "b7005984ad75283d",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-realtime-health-monitor-export.ts",
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
        "specifier": "@/features/admin/admin-realtime-health-monitor",
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
      "getAdminRealtimeHealthJson",
      "getAdminRealtimeHealthCsv",
      "getAdminRealtimeHealthMarkdown"
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
