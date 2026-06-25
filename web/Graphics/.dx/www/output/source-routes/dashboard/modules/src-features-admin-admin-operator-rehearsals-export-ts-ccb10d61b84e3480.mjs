
export const dxSourceText = "import type { AdminOperatorRehearsalReport } from \"@/features/admin/admin-operator-rehearsals\";\n\nexport function getAdminOperatorRehearsalsJson(\n  report: AdminOperatorRehearsalReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminOperatorRehearsalsCsv(\n  report: AdminOperatorRehearsalReport,\n) {\n  return [\n    [\n      \"run_id\",\n      \"run_label\",\n      \"kind\",\n      \"step_id\",\n      \"status\",\n      \"step_label\",\n      \"owner_role\",\n      \"evidence\",\n      \"expected_result\",\n      \"command\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.runId,\n        row.runLabel,\n        row.kind,\n        row.id,\n        row.status,\n        row.label,\n        row.ownerRole,\n        row.evidence,\n        row.expectedResult,\n        row.command,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"run_id\",\n      \"kind\",\n      \"status\",\n      \"score\",\n      \"ready_steps\",\n      \"review_steps\",\n      \"blocked_steps\",\n      \"commands\",\n      \"cadence\",\n      \"objective\",\n    ].join(\",\"),\n    ...report.runs.map((run) =>\n      [\n        run.id,\n        run.kind,\n        run.status,\n        run.score,\n        run.readyStepCount,\n        run.reviewStepCount,\n        run.blockedStepCount,\n        run.commandCount,\n        run.cadence,\n        run.objective,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminOperatorRehearsalsMarkdown(\n  report: AdminOperatorRehearsalReport,\n) {\n  return [\n    \"# Operator Rehearsal Runs\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Runs: ${report.readyRunCount} ready, ${report.reviewRunCount} review, ${report.blockedRunCount} blocked`,\n    `Steps: ${report.readyStepCount} ready, ${report.reviewStepCount} review, ${report.blockedStepCount} blocked`,\n    \"\",\n    \"## Runs\",\n    \"\",\n    ...report.runs.flatMap((run) => [\n      `### ${run.label}`,\n      \"\",\n      `Status: ${run.status}`,\n      `Score: ${run.score}`,\n      `Owner: ${run.ownerRole}`,\n      `Cadence: ${run.cadence}`,\n      `Objective: ${run.objective}`,\n      \"\",\n      \"Steps:\",\n      \"\",\n      ...run.steps.map(\n        (step) =>\n          `- [${step.status}] ${step.label}: ${step.evidence} Expected: ${step.expectedResult}${step.command ? ` Command: \\`${step.command}\\`` : \"\"}`,\n      ),\n      \"\",\n    ]),\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-operator-rehearsals-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operator-rehearsals-export-ts-ccb10d61b84e3480.mjs",
  "kind": "ts",
  "hash": "ccb10d61b84e3480",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-operator-rehearsals-export.ts",
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
        "specifier": "@/features/admin/admin-operator-rehearsals",
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
      "getAdminOperatorRehearsalsJson",
      "getAdminOperatorRehearsalsCsv",
      "getAdminOperatorRehearsalsMarkdown"
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
