
export const dxSourceText = "import type { AdminWorkspaceOperationsReport } from \"@/features/admin/admin-workspace-operations\";\n\nexport function getAdminWorkspaceOperationsJson(\n  report: AdminWorkspaceOperationsReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminWorkspaceOperationsCsv(\n  report: AdminWorkspaceOperationsReport,\n) {\n  return [\n    [\n      \"id\",\n      \"category\",\n      \"status\",\n      \"label\",\n      \"value\",\n      \"detail\",\n      \"recommendation\",\n      \"target\",\n      \"latest_at\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.category,\n        row.status,\n        row.label,\n        row.value,\n        row.detail,\n        row.recommendation,\n        row.target ?? \"\",\n        row.latestAt ?? \"\",\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminWorkspaceOperationsMarkdown(\n  report: AdminWorkspaceOperationsReport,\n) {\n  return [\n    \"# Workspace Operations Dashboard\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Storage: ${report.storageUsedPercent}%`,\n    `Database: ${report.databaseKind} (${report.databaseStatus})`,\n    `Failed email deliveries: ${report.failedEmailDeliveryCount}`,\n    `Deploy smoke age: ${\n      report.deploySmokeAgeHours === null\n        ? \"no release approval\"\n        : `${Math.round(report.deploySmokeAgeHours)} hours`\n    }`,\n    `Automation review count: ${report.automationReviewCount}`,\n    `Admin action queue: ${report.adminActionQueueCount}`,\n    \"\",\n    \"## Metrics\",\n    \"\",\n    ...report.metrics.map(\n      (metric) =>\n        `- [${metric.status}] ${metric.label}: ${metric.value} - ${metric.detail}`,\n    ),\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label} (${row.category}) - ${row.value}. ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: unknown) {\n  const text = String(value ?? \"\");\n\n  if (/[\",\\n\\r]/.test(text)) {\n    return `\"${text.replaceAll('\"', '\"\"')}\"`;\n  }\n\n  return text;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-workspace-operations-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-operations-export-ts-342ad40333c2d165.mjs",
  "kind": "ts",
  "hash": "342ad40333c2d165",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-workspace-operations-export.ts",
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
        "specifier": "@/features/admin/admin-workspace-operations",
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
      "getAdminWorkspaceOperationsJson",
      "getAdminWorkspaceOperationsCsv",
      "getAdminWorkspaceOperationsMarkdown"
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
