
export const dxSourceText = "import type { AdminProductionMonitoringDigest } from \"@/features/admin/admin-production-monitoring-digest\";\n\nexport function getAdminProductionMonitoringDigestJson(\n  digest: AdminProductionMonitoringDigest,\n) {\n  return JSON.stringify(digest, null, 2);\n}\n\nexport function getAdminProductionMonitoringDigestCsv(\n  digest: AdminProductionMonitoringDigest,\n) {\n  return [\n    [\n      \"id\",\n      \"status\",\n      \"kind\",\n      \"label\",\n      \"value\",\n      \"latest_at\",\n      \"target\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...digest.rows.map((row) =>\n      [\n        row.id,\n        row.status,\n        row.kind,\n        row.label,\n        row.value,\n        row.latestAt,\n        row.target,\n        row.detail,\n        row.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\"action_id\", \"actor_email\", \"action\", \"target\", \"created_at\"].join(\",\"),\n    ...digest.recentActions.map((action) =>\n      [\n        action.id,\n        action.actorEmail,\n        action.action,\n        action.targetLabel,\n        action.createdAt,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminProductionMonitoringDigestMarkdown(\n  digest: AdminProductionMonitoringDigest,\n) {\n  return [\n    \"# Production Monitoring Digest\",\n    \"\",\n    `Generated: ${digest.generatedAt}`,\n    `Status: ${digest.status}`,\n    `Score: ${digest.score}`,\n    `Rows: ${digest.readyCount} ready, ${digest.reviewCount} review, ${digest.blockedCount} blocked`,\n    \"\",\n    \"## Signals\",\n    \"\",\n    `- Deploy smoke score: ${digest.deploySmokeScore}`,\n    `- Runtime score: ${digest.runtimeScore}`,\n    `- Runtime errors: ${digest.runtimeErrorCount}`,\n    `- Runtime warnings: ${digest.runtimeWarningCount}`,\n    `- Failed auth attempts: ${digest.failedAuthAttemptCount}`,\n    `- Failed email deliveries: ${digest.failedEmailDeliveryCount}`,\n    `- Rollback score: ${digest.rollbackScore}`,\n    `- Recent admin actions: ${digest.recentAdminActionCount}`,\n    `- High-impact admin actions: ${digest.highImpactAdminActionCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...digest.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n    \"\",\n    \"## Recent Admin Actions\",\n    \"\",\n    ...(digest.recentActions.length > 0\n      ? digest.recentActions.map(\n          (action) =>\n            `- ${action.createdAt}: ${action.actorEmail} ${action.action} on ${action.targetLabel}`,\n        )\n      : [\"- No recent admin actions loaded.\"]),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-production-monitoring-digest-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-production-monitoring-digest-export-ts-164b32cce149f6b9.mjs",
  "kind": "ts",
  "hash": "164b32cce149f6b9",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-production-monitoring-digest-export.ts",
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
        "specifier": "@/features/admin/admin-production-monitoring-digest",
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
      "getAdminProductionMonitoringDigestJson",
      "getAdminProductionMonitoringDigestCsv",
      "getAdminProductionMonitoringDigestMarkdown"
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
