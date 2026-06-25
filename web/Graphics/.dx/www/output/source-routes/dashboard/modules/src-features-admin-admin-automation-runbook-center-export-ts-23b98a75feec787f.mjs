
export const dxSourceText = "import type {\n  AdminAutomationRunbook,\n  AdminAutomationRunbookCenterReport,\n  AdminAutomationRunbookRow,\n} from \"@/features/admin/admin-automation-runbook-center\";\n\nexport function getAdminAutomationRunbookCenterJson(\n  report: AdminAutomationRunbookCenterReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminAutomationRunbookCenterCsv(\n  report: AdminAutomationRunbookCenterReport,\n) {\n  const runbookHeader: Array<keyof AdminAutomationRunbook> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"title\",\n    \"objective\",\n    \"cadence\",\n    \"owner\",\n    \"rowCount\",\n    \"commandCount\",\n    \"blockedSignalCount\",\n    \"reviewSignalCount\",\n    \"evidenceBundle\",\n  ];\n  const rowHeader: Array<keyof AdminAutomationRunbookRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"cadence\",\n    \"owner\",\n    \"evidence\",\n    \"command\",\n    \"latestAt\",\n  ];\n\n  return [\n    [\n      \"generated_at\",\n      \"status\",\n      \"score\",\n      \"scheduled_health\",\n      \"repair_actions\",\n      \"incident_drills\",\n      \"evidence_bundles\",\n      \"ready\",\n      \"review\",\n      \"blocked\",\n      \"commands\",\n    ].join(\",\"),\n    [\n      report.generatedAt,\n      report.status,\n      report.score,\n      report.scheduledHealthCount,\n      report.repairActionCount,\n      report.incidentDrillCount,\n      report.evidenceBundleCount,\n      report.readyCount,\n      report.reviewCount,\n      report.blockedCount,\n      report.commandCount,\n    ]\n      .map(escapeCsvCell)\n      .join(\",\"),\n    \"\",\n    [\"section\", ...runbookHeader].join(\",\"),\n    ...report.runbooks.map((runbook) =>\n      [\"runbook\", ...runbookHeader.map((key) => runbook[key])]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\"section\", ...rowHeader].join(\",\"),\n    ...report.rows.map((row) =>\n      [\"row\", ...rowHeader.map((key) => row[key])]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\"command\"].join(\",\"),\n    ...report.commands.map((command) =>\n      [command].map(escapeCsvCell).join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminAutomationRunbookCenterMarkdown(\n  report: AdminAutomationRunbookCenterReport,\n) {\n  return [\n    \"# Automation Runbook Center\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,\n    `Commands: ${report.commandCount}`,\n    \"\",\n    \"## Runbooks\",\n    \"\",\n    ...report.runbooks.map((runbook) =>\n      [\n        `- [${runbook.status}] ${runbook.title}`,\n        `  - Category: ${runbook.category}`,\n        `  - Cadence: ${runbook.cadence}`,\n        `  - Owner: ${runbook.owner}`,\n        `  - Objective: ${runbook.objective}`,\n        `  - Evidence bundle: ${runbook.evidenceBundle}`,\n        `  - Signals: ${runbook.blockedSignalCount} blocked, ${runbook.reviewSignalCount} review`,\n        `  - Commands: ${runbook.commandCount}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Rows\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Category: ${row.category}`,\n        `  - Cadence: ${row.cadence}`,\n        `  - Owner: ${row.owner}`,\n        `  - Evidence: ${row.evidence}`,\n        `  - Command: \\`${row.command}\\``,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: unknown) {\n  const text = Array.isArray(value)\n    ? value.join(\"; \")\n    : typeof value === \"object\" && value\n      ? JSON.stringify(value)\n      : String(value ?? \"\");\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-automation-runbook-center-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-automation-runbook-center-export-ts-23b98a75feec787f.mjs",
  "kind": "ts",
  "hash": "23b98a75feec787f",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-automation-runbook-center-export.ts",
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
        "specifier": "@/features/admin/admin-automation-runbook-center",
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
      "getAdminAutomationRunbookCenterJson",
      "getAdminAutomationRunbookCenterCsv",
      "getAdminAutomationRunbookCenterMarkdown"
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
