
export const dxSourceText = "import type { AdminNotificationDigestSubscriptionsReport } from \"@/features/admin/admin-notification-digest-subscriptions\";\n\nexport function getAdminNotificationDigestSubscriptionsJson(\n  report: AdminNotificationDigestSubscriptionsReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminNotificationDigestSubscriptionsCsv(\n  report: AdminNotificationDigestSubscriptionsReport,\n) {\n  return [\n    [\n      \"id\",\n      \"status\",\n      \"kind\",\n      \"label\",\n      \"value\",\n      \"subscribed\",\n      \"routed\",\n      \"active_signal\",\n      \"latest_at\",\n      \"target\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.status,\n        row.kind,\n        row.label,\n        row.value,\n        row.subscribed,\n        row.routed,\n        row.activeSignal,\n        row.latestAt,\n        row.target,\n        row.detail,\n        row.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"recipient_count\",\n      \"subscribed_topics\",\n      \"frequency\",\n      \"channel\",\n      \"minimum_severity\",\n      \"include_resolved\",\n      \"active_signals\",\n      \"blocked_signals\",\n      \"unrouted_active_signals\",\n      \"updated_at\",\n      \"updated_by\",\n    ].join(\",\"),\n    [\n      report.recipientCount,\n      report.subscribedTopicCount,\n      report.settings.frequency,\n      report.settings.channel,\n      report.settings.minimumSeverity,\n      report.settings.includeResolved,\n      report.activeSignalCount,\n      report.blockedSignalCount,\n      report.unroutedActiveSignalCount,\n      report.settings.updatedAt,\n      report.settings.updatedBy,\n    ]\n      .map(escapeCsvCell)\n      .join(\",\"),\n  ].join(\"\\n\");\n}\n\nexport function getAdminNotificationDigestSubscriptionsMarkdown(\n  report: AdminNotificationDigestSubscriptionsReport,\n) {\n  return [\n    \"# Admin Notification Digest Subscriptions\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,\n    \"\",\n    \"## Settings\",\n    \"\",\n    `- Recipients: ${report.settings.recipients.join(\", \") || \"none\"}`,\n    `- Channel: ${report.settings.channel}`,\n    `- Frequency: ${report.settings.frequency}`,\n    `- Minimum severity: ${report.settings.minimumSeverity}`,\n    `- Include resolved: ${formatBoolean(report.settings.includeResolved)}`,\n    `- Updated at: ${report.settings.updatedAt ?? \"not saved\"}`,\n    `- Updated by: ${report.settings.updatedBy ?? \"not saved\"}`,\n    \"\",\n    \"## Signals\",\n    \"\",\n    `- Subscribed topics: ${report.subscribedTopicCount}`,\n    `- Active signals: ${report.activeSignalCount}`,\n    `- Blocked signals: ${report.blockedSignalCount}`,\n    `- Unrouted active signals: ${report.unroutedActiveSignalCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n  ].join(\"\\n\");\n}\n\nfunction formatBoolean(value: boolean) {\n  return value ? \"yes\" : \"no\";\n}\n\nfunction escapeCsvCell(value: boolean | number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-notification-digest-subscriptions-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-notification-digest-subscriptions-export-ts-ad40032762addce4.mjs",
  "kind": "ts",
  "hash": "ad40032762addce4",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-notification-digest-subscriptions-export.ts",
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
        "specifier": "@/features/admin/admin-notification-digest-subscriptions",
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
      "getAdminNotificationDigestSubscriptionsJson",
      "getAdminNotificationDigestSubscriptionsCsv",
      "getAdminNotificationDigestSubscriptionsMarkdown"
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
