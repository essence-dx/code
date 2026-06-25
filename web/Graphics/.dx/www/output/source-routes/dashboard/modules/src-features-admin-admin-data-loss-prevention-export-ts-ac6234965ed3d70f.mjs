
export const dxSourceText = "import type {\n  AdminDataLossPreventionReport,\n  AdminDataLossPreventionRow,\n  AdminDataLossPreventionWorkflow,\n} from \"@/features/admin/admin-data-loss-prevention\";\n\nexport function getAdminDataLossPreventionJson(\n  report: AdminDataLossPreventionReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminDataLossPreventionCsv(\n  report: AdminDataLossPreventionReport,\n) {\n  const rowHeader: Array<keyof AdminDataLossPreventionRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"workflow\",\n    \"latestAt\",\n  ];\n  const workflowHeader: Array<keyof AdminDataLossPreventionWorkflow> = [\n    \"id\",\n    \"status\",\n    \"title\",\n    \"scope\",\n    \"owner\",\n    \"evidence\",\n    \"action\",\n  ];\n\n  return [\n    [\n      \"generated_at\",\n      \"status\",\n      \"score\",\n      \"active_files\",\n      \"sensitive_findings\",\n      \"sensitive_files\",\n      \"export_events\",\n      \"sensitive_export_events\",\n      \"download_exposure\",\n      \"embed_review\",\n      \"plugin_risk\",\n      \"public_route_risk\",\n      \"support_bundle_sensitive\",\n    ].join(\",\"),\n    [\n      report.generatedAt,\n      report.status,\n      report.score,\n      report.activeFileCount,\n      report.sensitiveFindingCount,\n      report.sensitiveFileCount,\n      report.exportEventCount,\n      report.sensitiveExportEventCount,\n      report.downloadExposureCount,\n      report.embedReviewCount,\n      report.pluginRiskCount,\n      report.publicRouteRiskCount,\n      report.supportBundleSensitiveCount,\n    ]\n      .map(escapeCsvCell)\n      .join(\",\"),\n    \"\",\n    [\"section\", ...rowHeader].join(\",\"),\n    ...report.rows.map((row) =>\n      [\"row\", ...rowHeader.map((key) => row[key])]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\"section\", ...workflowHeader].join(\",\"),\n    ...report.workflows.map((workflow) =>\n      [\"workflow\", ...workflowHeader.map((key) => workflow[key])]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\"command\"].join(\",\"),\n    ...report.commands.map((command) =>\n      [command].map(escapeCsvCell).join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminDataLossPreventionMarkdown(\n  report: AdminDataLossPreventionReport,\n) {\n  return [\n    \"# Data-Loss Prevention\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,\n    \"\",\n    \"## Signals\",\n    \"\",\n    `- Active files: ${report.activeFileCount}`,\n    `- Sensitive findings: ${report.sensitiveFindingCount}`,\n    `- Sensitive files: ${report.sensitiveFileCount}`,\n    `- Export events: ${report.exportEventCount}`,\n    `- Sensitive export events: ${report.sensitiveExportEventCount}`,\n    `- Public download exposure: ${report.downloadExposureCount}`,\n    `- Embed review signals: ${report.embedReviewCount}`,\n    `- Plugin risk signals: ${report.pluginRiskCount}`,\n    `- Public route risk signals: ${report.publicRouteRiskCount}`,\n    `- Support bundle sensitive records: ${report.supportBundleSensitiveCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Category: ${row.category}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Workflow: ${row.workflow}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Workflows\",\n    \"\",\n    ...report.workflows.map((workflow) =>\n      [\n        `- [${workflow.status}] ${workflow.title}`,\n        `  - Scope: ${workflow.scope}`,\n        `  - Owner: ${workflow.owner}`,\n        `  - Evidence: ${workflow.evidence}`,\n        `  - Action: ${workflow.action}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- ${command}`),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: unknown) {\n  const text = String(value ?? \"\");\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-data-loss-prevention-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-data-loss-prevention-export-ts-ac6234965ed3d70f.mjs",
  "kind": "ts",
  "hash": "ac6234965ed3d70f",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-data-loss-prevention-export.ts",
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
        "specifier": "@/features/admin/admin-data-loss-prevention",
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
      "getAdminDataLossPreventionJson",
      "getAdminDataLossPreventionCsv",
      "getAdminDataLossPreventionMarkdown"
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
