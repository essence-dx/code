
export const dxSourceText = "import type {\n  ScopedPublicationApprovalReport,\n  ScopedPublicationApprovalRow,\n  ScopedPublicationApprovalScope,\n} from \"@/features/admin/admin-scoped-publication-approvals\";\n\nexport function getScopedPublicationApprovalJson(\n  report: ScopedPublicationApprovalReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getScopedPublicationApprovalCsv(\n  report: ScopedPublicationApprovalReport,\n) {\n  const scopeHeader: Array<keyof ScopedPublicationApprovalScope> = [\n    \"scopeKey\",\n    \"teamName\",\n    \"projectName\",\n    \"status\",\n    \"approvalState\",\n    \"reviewerSummary\",\n    \"slaStatus\",\n    \"slaDueAt\",\n    \"fileCount\",\n    \"channelCount\",\n    \"readyChannelCount\",\n    \"blockedChannelCount\",\n    \"rollbackAnchorCount\",\n    \"branchRequestCount\",\n    \"branchBlockerCount\",\n    \"releaseEvidenceDiffCount\",\n    \"latestActivityAt\",\n    \"recommendation\",\n  ];\n  const rowHeader: Array<keyof ScopedPublicationApprovalRow> = [\n    \"id\",\n    \"scopeKey\",\n    \"teamName\",\n    \"projectName\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"latestAt\",\n  ];\n\n  return [\n    [\"section\", ...scopeHeader],\n    ...report.scopes.map((scope) => [\n      \"scope\",\n      ...scopeHeader.map((key) => scope[key]),\n    ]),\n    [],\n    [\"section\", ...rowHeader],\n    ...report.rows.map((row) => [\"row\", ...rowHeader.map((key) => row[key])]),\n  ]\n    .map((row) => row.map(escapeCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getScopedPublicationApprovalMarkdown(\n  report: ScopedPublicationApprovalReport,\n) {\n  return [\n    \"# Scoped Publication Approvals\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Scopes: ${report.scopeCount}`,\n    `Approved scopes: ${report.approvedScopeCount}`,\n    `Missing approvals: ${report.missingApprovalCount}`,\n    `Stale approvals: ${report.staleApprovalCount}`,\n    `Overdue scopes: ${report.overdueScopeCount}`,\n    `Release evidence diffs: ${report.releaseEvidenceDiffCount}`,\n    \"\",\n    \"## Scopes\",\n    \"\",\n    ...report.scopes.map((scope) =>\n      [\n        `- [${scope.status}] ${scope.scopeKey}`,\n        `  - Approval: ${scope.approvalState}`,\n        `  - Reviewer: ${scope.reviewerSummary}`,\n        `  - SLA: ${scope.slaStatus}${scope.slaDueAt ? ` due ${scope.slaDueAt}` : \"\"}`,\n        `  - Channels: ${scope.readyChannelCount}/${scope.channelCount}`,\n        `  - Rollback anchors: ${scope.rollbackAnchorCount}`,\n        `  - Evidence diffs: ${scope.releaseEvidenceDiffCount}`,\n        `  - Recommendation: ${scope.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- ${command}`),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: unknown) {\n  const text = Array.isArray(value) ? value.join(\"; \") : String(value ?? \"\");\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-scoped-publication-approvals-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-scoped-publication-approvals-export-ts-cd02b1a6e624e6d8.mjs",
  "kind": "ts",
  "hash": "cd02b1a6e624e6d8",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-scoped-publication-approvals-export.ts",
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
        "specifier": "@/features/admin/admin-scoped-publication-approvals",
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
      "getScopedPublicationApprovalJson",
      "getScopedPublicationApprovalCsv",
      "getScopedPublicationApprovalMarkdown"
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
