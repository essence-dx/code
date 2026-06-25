
export const dxSourceText = "import type { AdminPublicRouteAnalyticsReport } from \"@/features/admin/admin-public-route-analytics\";\n\nexport function getAdminPublicRouteAnalyticsJson(\n  report: AdminPublicRouteAnalyticsReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminPublicRouteAnalyticsCsv(\n  report: AdminPublicRouteAnalyticsReport,\n) {\n  const rows = [\n    [\n      \"route_id\",\n      \"status\",\n      \"file\",\n      \"owner\",\n      \"kind\",\n      \"events\",\n      \"last_24h\",\n      \"last_7d\",\n      \"token_scope\",\n      \"referrer_kinds\",\n      \"referrer_origins\",\n      \"user_agents\",\n      \"hosts\",\n      \"latest_at\",\n      \"retention_expires_at\",\n      \"recommendation\",\n    ],\n    ...report.routes.map((route) => [\n      route.id,\n      route.status,\n      route.fileName,\n      route.ownerEmail,\n      route.routeKind,\n      route.eventCount,\n      route.last24hCount,\n      route.last7dCount,\n      route.tokenScope,\n      route.referrerKinds.join(\"; \"),\n      route.referrerOrigins.join(\"; \"),\n      route.userAgentFamilies.join(\"; \"),\n      route.hostnames.join(\"; \"),\n      route.latestAt ?? \"\",\n      route.earliestRetentionExpiresAt ?? \"\",\n      route.recommendation,\n    ]),\n  ];\n\n  return rows\n    .map((row) => row.map((value) => csvEscape(String(value))).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getAdminPublicRouteAnalyticsMarkdown(\n  report: AdminPublicRouteAnalyticsReport,\n) {\n  const lines = [\n    \"# Public Route Analytics\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Storage available: ${report.storageAvailable ? \"yes\" : \"no\"}`,\n    `Retention: ${report.retentionDays} days`,\n    \"\",\n    \"## Metrics\",\n    \"\",\n    `- Active shares: ${report.activeShareCount}`,\n    `- Routes: ${report.routeCount}`,\n    `- Retained events: ${report.eventCount}`,\n    `- Last 24h events: ${report.last24hEventCount}`,\n    `- Last 7d events: ${report.last7dEventCount}`,\n    `- External referrers: ${report.externalReferrerCount}`,\n    `- Bot events: ${report.botEventCount}`,\n    `- Missing coverage: ${report.missingCoverageCount}`,\n    `- Retention expired: ${report.retentionExpiredCount}`,\n    \"\",\n    \"## Review Queue\",\n    \"\",\n    ...report.rows.slice(0, 20).map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Detail: ${row.detail}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- ${command}`),\n  ];\n\n  return lines.join(\"\\n\");\n}\n\nfunction csvEscape(value: string) {\n  if (!/[\",\\n]/.test(value)) {\n    return value;\n  }\n\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-public-route-analytics-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-route-analytics-export-ts-2d48d72171057efd.mjs",
  "kind": "ts",
  "hash": "2d48d72171057efd",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-public-route-analytics-export.ts",
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
        "specifier": "@/features/admin/admin-public-route-analytics",
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
      "getAdminPublicRouteAnalyticsJson",
      "getAdminPublicRouteAnalyticsCsv",
      "getAdminPublicRouteAnalyticsMarkdown"
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
