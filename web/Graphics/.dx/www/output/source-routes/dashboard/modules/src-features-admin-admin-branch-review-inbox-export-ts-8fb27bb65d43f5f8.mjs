
export const dxSourceText = "import type {\n  AdminBranchReviewInboxReport,\n  AdminBranchReviewInboxRow,\n} from \"@/features/admin/admin-branch-review-inbox\";\n\nexport function getAdminBranchReviewInboxJson(\n  report: AdminBranchReviewInboxReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminBranchReviewInboxCsv(\n  report: AdminBranchReviewInboxReport,\n) {\n  const header: Array<keyof AdminBranchReviewInboxRow> = [\n    \"id\",\n    \"status\",\n    \"category\",\n    \"branchName\",\n    \"reviewerSummary\",\n    \"label\",\n    \"detail\",\n    \"recommendation\",\n    \"dueDate\",\n    \"latestAt\",\n    \"blockerCount\",\n  ];\n\n  return [header, ...report.rows.map((row) => header.map((key) => row[key]))]\n    .map((row) => row.map(escapeCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getAdminBranchReviewInboxMarkdown(\n  report: AdminBranchReviewInboxReport,\n) {\n  return [\n    \"# Branch Review Request Inbox\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Requests: ${report.requestCount}`,\n    `Reviewers: ${report.reviewerCount}`,\n    `Overdue: ${report.overdueCount}`,\n    `Due soon: ${report.dueSoonCount}`,\n    `Merge ready: ${report.mergeReadyCount}`,\n    `Blockers: ${report.blockerCount}`,\n    `Evidence anchors: ${report.evidenceCount}`,\n    \"\",\n    \"## Requests\",\n    \"\",\n    ...report.requests.map((request) =>\n      [\n        `- [${request.status}] ${request.branchName} (${request.mergeIntent})`,\n        `  - Reviewers: ${request.reviewerSummary}`,\n        `  - SLA: ${request.slaStatus}${request.dueDate ? ` due ${request.dueDate}` : \"\"}`,\n        `  - Merge readiness: ${request.mergeReadiness}`,\n        `  - Blockers: ${request.blockers.length > 0 ? request.blockers.join(\"; \") : \"none\"}`,\n        `  - Evidence: ${request.evidence.length > 0 ? request.evidence.join(\", \") : \"none\"}`,\n        `  - Recommendation: ${request.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- ${command}`),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: unknown) {\n  const text = String(value ?? \"\");\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-branch-review-inbox-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-branch-review-inbox-export-ts-8fb27bb65d43f5f8.mjs",
  "kind": "ts",
  "hash": "8fb27bb65d43f5f8",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-branch-review-inbox-export.ts",
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
        "specifier": "@/features/admin/admin-branch-review-inbox",
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
      "getAdminBranchReviewInboxJson",
      "getAdminBranchReviewInboxCsv",
      "getAdminBranchReviewInboxMarkdown"
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
