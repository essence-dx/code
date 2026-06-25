
export const dxSourceText = "import type { AdminPluginPermissionGovernanceReport } from \"@/features/admin/admin-plugin-permission-governance\";\n\nexport function getAdminPluginPermissionGovernanceJson(\n  report: AdminPluginPermissionGovernanceReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminPluginPermissionGovernanceCsv(\n  report: AdminPluginPermissionGovernanceReport,\n) {\n  return [\n    [\n      \"id\",\n      \"status\",\n      \"kind\",\n      \"label\",\n      \"value\",\n      \"latest_at\",\n      \"target\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.status,\n        row.kind,\n        row.label,\n        row.value,\n        row.latestAt,\n        row.target,\n        row.detail,\n        row.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"activity_id\",\n      \"file_id\",\n      \"file_name\",\n      \"owner_email\",\n      \"actor_name\",\n      \"actor_email\",\n      \"label\",\n      \"detail\",\n      \"created_at\",\n    ].join(\",\"),\n    ...report.activities.map((activity) =>\n      [\n        activity.id,\n        activity.fileId,\n        activity.fileName,\n        activity.ownerEmail,\n        activity.actorName,\n        activity.actorEmail,\n        activity.label,\n        activity.detail,\n        activity.createdAt,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminPluginPermissionGovernanceMarkdown(\n  report: AdminPluginPermissionGovernanceReport,\n) {\n  return [\n    \"# Plugin Permission Governance\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,\n    \"\",\n    \"## Signals\",\n    \"\",\n    `- Installed extensions: ${report.manifestCount}`,\n    `- Permissions: ${report.permissionCount}`,\n    `- Write permissions: ${report.writePermissionCount}`,\n    `- Grant activity: ${report.grantActivityCount}`,\n    `- Run activity: ${report.runActivityCount}`,\n    `- Stale approvals: ${report.staleApprovalCount}`,\n    `- Risky write activity: ${report.riskyWriteActivityCount}`,\n    `- Unknown activity: ${report.unknownActivityCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n    \"\",\n    \"## Recent Extension Activity\",\n    \"\",\n    ...(report.activities.length > 0\n      ? report.activities.map(\n          (activity) =>\n            `- ${activity.createdAt}: ${activity.actorName} ${activity.label} in ${activity.fileName}`,\n        )\n      : [\"- No extension activity loaded.\"]),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-plugin-permission-governance-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-plugin-permission-governance-export-ts-f9383879366162ea.mjs",
  "kind": "ts",
  "hash": "f9383879366162ea",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-plugin-permission-governance-export.ts",
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
        "specifier": "@/features/admin/admin-plugin-permission-governance",
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
      "getAdminPluginPermissionGovernanceJson",
      "getAdminPluginPermissionGovernanceCsv",
      "getAdminPluginPermissionGovernanceMarkdown"
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
