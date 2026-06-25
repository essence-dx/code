
export const dxSourceText = "import type {\n  AdminExternalCommentNotificationWorkflowsReport,\n  AdminExternalCommentNotificationWorkflowRow,\n} from \"@/features/admin/admin-external-comment-notification-workflows-types\";\n\nexport function getAdminExternalCommentNotificationWorkflowsJson(\n  report: AdminExternalCommentNotificationWorkflowsReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminExternalCommentNotificationWorkflowsCsv(\n  report: AdminExternalCommentNotificationWorkflowsReport,\n) {\n  const rowHeader: Array<keyof AdminExternalCommentNotificationWorkflowRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"count\",\n    \"target\",\n    \"latestAt\",\n  ];\n\n  return [\n    [\"section\", ...rowHeader].join(\",\"),\n    ...report.rows.map((row) =>\n      [\"review-row\", ...rowHeader.map((key) => row[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\n      \"retry\",\n      \"status\",\n      \"file\",\n      \"recipient\",\n      \"kind\",\n      \"attempts\",\n      \"last_reason\",\n      \"last_attempt_at\",\n    ].join(\",\"),\n    ...report.retryQueue.map((item) =>\n      [\n        \"retry\",\n        item.status,\n        item.fileName,\n        item.recipientEmail,\n        item.kind,\n        item.attemptCount,\n        item.lastReason,\n        item.lastAttemptAt,\n      ]\n        .map((value) => escapeCsvCell(redactSensitive(String(value))))\n        .join(\",\"),\n    ),\n    [\n      \"mention\",\n      \"status\",\n      \"file\",\n      \"recipient\",\n      \"delivery_status\",\n      \"suppressed\",\n      \"latest_at\",\n    ].join(\",\"),\n    ...report.mentionRoutes.map((route) =>\n      [\n        \"mention\",\n        route.status,\n        route.fileName,\n        route.mentionedEmail,\n        route.deliveryStatus,\n        route.suppressed,\n        route.latestAt ?? \"\",\n      ]\n        .map((value) => escapeCsvCell(redactSensitive(String(value))))\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminExternalCommentNotificationWorkflowsMarkdown(\n  report: AdminExternalCommentNotificationWorkflowsReport,\n) {\n  return [\n    \"# External Comment Notification Workflows\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Files: ${report.fileCount}`,\n    `Deliveries: ${report.deliveryCount}`,\n    `Failed deliveries: ${report.failedDeliveryCount}`,\n    `Retry queue: ${report.retryQueueCount}`,\n    `Digest previews: ${report.digestPreviewCount}`,\n    `Mention routes: ${report.mentionRouteCount}`,\n    `Unrouted mentions: ${report.unroutedMentionCount}`,\n    `Suppressed recipients: ${report.suppressedRecipientCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Category: ${row.category}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Retry Queue\",\n    \"\",\n    ...report.retryQueue.map((item) =>\n      [\n        `- [${item.status}] ${item.fileName}`,\n        `  - Recipient: ${item.recipientEmail}`,\n        `  - Kind: ${item.kind}`,\n        `  - Attempts: ${item.attemptCount}`,\n        `  - Reason: ${item.lastReason}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Digest Previews\",\n    \"\",\n    ...report.digestPreviews.map((preview) =>\n      [\n        `- [${preview.status}] ${preview.subject}`,\n        `  - Recipient: ${preview.recipientEmail}`,\n        `  - Signals: ${preview.signalCount}`,\n        ...preview.lines.map((line) => `  - ${line}`),\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Suppression Controls\",\n    \"\",\n    ...report.suppressionControls.map((control) =>\n      [\n        `- [${control.status}] ${control.fileName}`,\n        `  - Muted: ${control.mutedEmail ?? \"file-level\"}`,\n        `  - Enabled: ${control.enabled ? \"yes\" : \"no\"}`,\n        `  - Mentions: ${control.mentionsEnabled ? \"yes\" : \"no\"}`,\n        `  - Reason: ${control.reason}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ]\n    .map(redactSensitive)\n    .join(\"\\n\");\n}\n\nfunction redactSensitive(value: string) {\n  return value\n    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, \"[redacted-email]\")\n    .replace(/\\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\\b/gi, \"[redacted-token]\")\n    .replace(/\\/share\\/[A-Za-z0-9_-]+/g, \"/share/[redacted-token]\");\n}\n\nfunction escapeCsvCell(value: string) {\n  if (!/[\",\\n\\r]/.test(value)) {\n    return value;\n  }\n\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-external-comment-notification-workflows-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-external-comment-notification-workflows-export-ts-ac8e78526848f35c.mjs",
  "kind": "ts",
  "hash": "ac8e78526848f35c",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-external-comment-notification-workflows-export.ts",
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
        "specifier": "@/features/admin/admin-external-comment-notification-workflows-types",
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
      "getAdminExternalCommentNotificationWorkflowsJson",
      "getAdminExternalCommentNotificationWorkflowsCsv",
      "getAdminExternalCommentNotificationWorkflowsMarkdown"
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
