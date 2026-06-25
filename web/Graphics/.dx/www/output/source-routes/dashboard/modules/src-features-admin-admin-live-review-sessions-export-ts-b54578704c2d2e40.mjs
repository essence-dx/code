
export const dxSourceText = "import type {\n  AdminLiveReviewActionItem,\n  AdminLiveReviewAgendaItem,\n  AdminLiveReviewMinuteItem,\n  AdminLiveReviewSession,\n  AdminLiveReviewSessionRow,\n  AdminLiveReviewSessionsReport,\n} from \"@/features/admin/admin-live-review-sessions-types\";\n\nexport function getAdminLiveReviewSessionsJson(\n  report: AdminLiveReviewSessionsReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminLiveReviewSessionsCsv(\n  report: AdminLiveReviewSessionsReport,\n) {\n  const rowHeader: Array<keyof AdminLiveReviewSessionRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"count\",\n    \"target\",\n    \"latestAt\",\n  ];\n  const sessionHeader: Array<keyof AdminLiveReviewSession> = [\n    \"id\",\n    \"status\",\n    \"fileName\",\n    \"branchName\",\n    \"ownerRef\",\n    \"reviewerCount\",\n    \"openCommentCount\",\n    \"approvalScopeCount\",\n    \"publicShareCount\",\n    \"agendaItemCount\",\n    \"minutesItemCount\",\n    \"actionItemCount\",\n    \"blockerCount\",\n    \"latestAt\",\n    \"recommendation\",\n  ];\n  const agendaHeader: Array<keyof AdminLiveReviewAgendaItem> = [\n    \"id\",\n    \"sessionId\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"detail\",\n    \"ownerRef\",\n    \"dueAt\",\n    \"linkedId\",\n  ];\n  const minuteHeader: Array<keyof AdminLiveReviewMinuteItem> = [\n    \"id\",\n    \"sessionId\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"detail\",\n    \"ownerRef\",\n    \"createdAt\",\n    \"linkedId\",\n  ];\n  const actionHeader: Array<keyof AdminLiveReviewActionItem> = [\n    \"id\",\n    \"sessionId\",\n    \"source\",\n    \"status\",\n    \"label\",\n    \"detail\",\n    \"ownerRef\",\n    \"dueAt\",\n    \"linkedId\",\n  ];\n\n  return [\n    [\"section\", ...rowHeader].join(\",\"),\n    ...report.rows.map((row) =>\n      [\"review-row\", ...rowHeader.map((key) => row[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...sessionHeader].join(\",\"),\n    ...report.sessions.map((session) =>\n      [\"session\", ...sessionHeader.map((key) => session[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...agendaHeader].join(\",\"),\n    ...report.agendaItems.map((item) =>\n      [\"agenda\", ...agendaHeader.map((key) => item[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...minuteHeader].join(\",\"),\n    ...report.minutes.map((item) =>\n      [\"minutes\", ...minuteHeader.map((key) => item[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...actionHeader].join(\",\"),\n    ...report.actionItems.map((item) =>\n      [\"action-item\", ...actionHeader.map((key) => item[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminLiveReviewSessionsMarkdown(\n  report: AdminLiveReviewSessionsReport,\n) {\n  return [\n    \"# Live Review Sessions\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Sessions: ${report.sessionCount}`,\n    `Agenda items: ${report.agendaItemCount}`,\n    `Minutes: ${report.minutesItemCount}`,\n    `action items: ${report.actionItemCount}`,\n    `Branches: ${report.linkedBranchCount}`,\n    `Comments: ${report.linkedCommentCount}`,\n    `Approvals: ${report.linkedApprovalCount}`,\n    `Public shares: ${report.linkedPublicShareCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Category: ${row.category}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Target: ${row.target ?? \"none\"}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Sessions\",\n    \"\",\n    ...report.sessions.map((session) =>\n      [\n        `- [${session.status}] ${session.fileName} / ${session.branchName}`,\n        `  - Owner: ${session.ownerRef}`,\n        `  - Agenda: ${session.agendaItemCount}`,\n        `  - Minutes: ${session.minutesItemCount}`,\n        `  - Action items: ${session.actionItemCount}`,\n        `  - Public shares: ${session.publicShareCount}`,\n        `  - Recommendation: ${session.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Agenda\",\n    \"\",\n    ...report.agendaItems.map((item) =>\n      [\n        `- [${item.status}] ${item.label}`,\n        `  - Category: ${item.category}`,\n        `  - Owner: ${item.ownerRef}`,\n        `  - Detail: ${item.detail}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Minutes\",\n    \"\",\n    ...report.minutes.map((item) =>\n      [\n        `- [${item.status}] ${item.label}`,\n        `  - Category: ${item.category}`,\n        `  - Owner: ${item.ownerRef}`,\n        `  - Detail: ${item.detail}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Action Items\",\n    \"\",\n    ...report.actionItems.map((item) =>\n      [\n        `- [${item.status}] ${item.label}`,\n        `  - Source: ${item.source}`,\n        `  - Owner: ${item.ownerRef}`,\n        `  - Detail: ${item.detail}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ]\n    .map(redactSensitive)\n    .join(\"\\n\");\n}\n\nfunction redactSensitive(value: string) {\n  return value\n    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, \"[redacted-email]\")\n    .replace(/\\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\\b/gi, \"[redacted-token]\")\n    .replace(/\\/share\\/[A-Za-z0-9_-]+/g, \"/share/[redacted-token]\");\n}\n\nfunction escapeCsvCell(value: string) {\n  if (!/[\",\\n\\r]/.test(value)) {\n    return value;\n  }\n\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-live-review-sessions-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-live-review-sessions-export-ts-b54578704c2d2e40.mjs",
  "kind": "ts",
  "hash": "b54578704c2d2e40",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-live-review-sessions-export.ts",
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
        "specifier": "@/features/admin/admin-live-review-sessions-types",
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
      "getAdminLiveReviewSessionsJson",
      "getAdminLiveReviewSessionsCsv",
      "getAdminLiveReviewSessionsMarkdown"
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
