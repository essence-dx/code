
export const dxSourceText = "import type {\n  AdminCommentReactionModerationItem,\n  AdminCommentReactionWorkflowComment,\n  AdminCommentReactionWorkflowRow,\n  AdminCommentReactionWorkflowsReport,\n} from \"@/features/admin/admin-comment-reaction-workflows-types\";\n\nexport function getAdminCommentReactionWorkflowsJson(\n  report: AdminCommentReactionWorkflowsReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminCommentReactionWorkflowsCsv(\n  report: AdminCommentReactionWorkflowsReport,\n) {\n  const rowHeader: Array<keyof AdminCommentReactionWorkflowRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"count\",\n    \"target\",\n    \"latestAt\",\n  ];\n  const commentHeader: Array<keyof AdminCommentReactionWorkflowComment> = [\n    \"id\",\n    \"status\",\n    \"fileName\",\n    \"pageName\",\n    \"commentId\",\n    \"resolved\",\n    \"assigneeEmail\",\n    \"reactionCount\",\n    \"acknowledgementCount\",\n    \"reactionNotificationCount\",\n    \"failedNotificationCount\",\n    \"moderationReviewCount\",\n    \"latestAt\",\n    \"recommendation\",\n  ];\n  const moderationHeader: Array<keyof AdminCommentReactionModerationItem> = [\n    \"id\",\n    \"status\",\n    \"fileName\",\n    \"pageName\",\n    \"commentId\",\n    \"reactionKind\",\n    \"actorName\",\n    \"actorEmail\",\n    \"reason\",\n    \"latestAt\",\n  ];\n\n  return [\n    [\"section\", ...rowHeader].join(\",\"),\n    ...report.rows.map((row) =>\n      [\"review-row\", ...rowHeader.map((key) => row[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...commentHeader].join(\",\"),\n    ...report.comments.map((comment) =>\n      [\"comment\", ...commentHeader.map((key) => comment[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...moderationHeader].join(\",\"),\n    ...report.moderationQueue.map((item) =>\n      [\"moderation\", ...moderationHeader.map((key) => item[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminCommentReactionWorkflowsMarkdown(\n  report: AdminCommentReactionWorkflowsReport,\n) {\n  return [\n    \"# Comment Reaction Workflows\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Comments: ${report.commentCount}`,\n    `Reactions: ${report.reactionCount}`,\n    `Acknowledgements: ${report.acknowledgementCount}`,\n    `Unacknowledged open comments: ${report.unacknowledgedOpenCommentCount}`,\n    `Notification routes: ${report.reactionNotificationRouteCount}`,\n    `Unrouted reaction notifications: ${report.unroutedReactionNotificationCount}`,\n    `Moderation review: ${report.moderationReviewCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Category: ${row.category}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Target: ${row.target ?? \"none\"}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Comments\",\n    \"\",\n    ...report.comments.map((comment) =>\n      [\n        `- [${comment.status}] ${comment.fileName} / ${comment.pageName}`,\n        `  - Acknowledgement: ${comment.acknowledgementCount}`,\n        `  - Reactions: ${comment.reactionCount}`,\n        `  - Notifications: ${comment.reactionNotificationCount} total / ${comment.failedNotificationCount} failed`,\n        `  - Moderation: ${comment.moderationReviewCount}`,\n        `  - Recommendation: ${comment.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Moderation Queue\",\n    \"\",\n    ...report.moderationQueue.map((item) =>\n      [\n        `- [${item.status}] ${item.fileName}`,\n        `  - Reaction: ${item.reactionKind}`,\n        `  - Actor: ${item.actorName} (${item.actorEmail ?? \"unknown\"})`,\n        `  - Reason: ${item.reason}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ]\n    .map(redactSensitive)\n    .join(\"\\n\");\n}\n\nfunction redactSensitive(value: string) {\n  return value\n    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, \"[redacted-email]\")\n    .replace(/\\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\\b/gi, \"[redacted-token]\")\n    .replace(/\\/share\\/[A-Za-z0-9_-]+/g, \"/share/[redacted-token]\");\n}\n\nfunction escapeCsvCell(value: string) {\n  if (!/[\",\\n\\r]/.test(value)) {\n    return value;\n  }\n\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-comment-reaction-workflows-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-comment-reaction-workflows-export-ts-d951fea5d2dab72d.mjs",
  "kind": "ts",
  "hash": "d951fea5d2dab72d",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-comment-reaction-workflows-export.ts",
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
        "specifier": "@/features/admin/admin-comment-reaction-workflows-types",
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
      "getAdminCommentReactionWorkflowsJson",
      "getAdminCommentReactionWorkflowsCsv",
      "getAdminCommentReactionWorkflowsMarkdown"
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
