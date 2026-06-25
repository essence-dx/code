
export const dxSourceText = "import type { RetentionPrivacyReport } from \"@/features/admin/admin-retention-privacy\";\n\nexport function getRetentionPrivacyJson(report: RetentionPrivacyReport) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getRetentionPrivacyCsv(report: RetentionPrivacyReport) {\n  return [\n    [\n      \"id\",\n      \"status\",\n      \"kind\",\n      \"label\",\n      \"value\",\n      \"retained_count\",\n      \"eligible_for_cleanup\",\n      \"latest_at\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.status,\n        row.kind,\n        row.label,\n        row.value,\n        row.retainedCount,\n        row.eligibleForCleanupCount,\n        row.latestAt,\n        row.detail,\n        row.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"audit_retention_days\",\n      \"collaboration_retention_days\",\n      \"notification_retention_days\",\n      \"support_bundle_retention_days\",\n      \"support_bundle_privacy_mode\",\n      \"include_network_details\",\n      \"include_notification_reasons\",\n      \"include_audit_metadata\",\n    ].join(\",\"),\n    [\n      report.settings.auditLogRetentionDays,\n      report.settings.collaborationPresenceRetentionDays,\n      report.settings.notificationDeliveryRetentionDays,\n      report.settings.supportBundleRetentionDays,\n      report.settings.supportBundlePrivacyMode,\n      report.settings.includeSupportBundleNetworkDetails,\n      report.settings.includeSupportBundleNotificationReasons,\n      report.settings.includeSupportBundleAuditMetadata,\n    ]\n      .map(escapeCsvCell)\n      .join(\",\"),\n  ].join(\"\\n\");\n}\n\nexport function getRetentionPrivacyMarkdown(report: RetentionPrivacyReport) {\n  return [\n    \"# Retention And Privacy Controls\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,\n    \"\",\n    \"## Settings\",\n    \"\",\n    `- Audit log retention: ${report.settings.auditLogRetentionDays} days`,\n    `- Collaboration presence retention: ${report.settings.collaborationPresenceRetentionDays} days`,\n    `- Notification delivery retention: ${report.settings.notificationDeliveryRetentionDays} days`,\n    `- Support bundle retention: ${report.settings.supportBundleRetentionDays} days`,\n    `- Support bundle privacy mode: ${report.settings.supportBundlePrivacyMode}`,\n    `- Include support bundle network details: ${formatBoolean(report.settings.includeSupportBundleNetworkDetails)}`,\n    `- Include support bundle notification reasons: ${formatBoolean(report.settings.includeSupportBundleNotificationReasons)}`,\n    `- Include support bundle audit metadata: ${formatBoolean(report.settings.includeSupportBundleAuditMetadata)}`,\n    `- Updated at: ${report.settings.updatedAt ?? \"not saved\"}`,\n    `- Updated by: ${report.settings.updatedBy ?? \"not saved\"}`,\n    \"\",\n    \"## Signals\",\n    \"\",\n    `- Audit events retained: ${report.retainedAuditEventCount}`,\n    `- Audit events eligible for cleanup: ${report.auditEventsEligibleForCleanup}`,\n    `- Collaboration presence events retained: ${report.retainedCollaborationPresenceEventCount}`,\n    `- Collaboration chat messages retained: ${report.retainedCollaborationChatMessageCount}`,\n    `- Collaboration records eligible for cleanup: ${report.collaborationRecordsEligibleForCleanup}`,\n    `- Notification deliveries retained: ${report.retainedNotificationDeliveryCount}`,\n    `- Notification deliveries eligible for cleanup: ${report.notificationDeliveriesEligibleForCleanup}`,\n    `- Sensitive session records in support scope: ${report.supportBundleSensitiveSessionCount}`,\n    `- Sensitive audit metadata rows in support scope: ${report.supportBundleSensitiveAuditMetadataCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n  ].join(\"\\n\");\n}\n\nfunction formatBoolean(value: boolean) {\n  return value ? \"yes\" : \"no\";\n}\n\nfunction escapeCsvCell(value: boolean | number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-retention-privacy-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-retention-privacy-export-ts-ef90e0f4e6be7dda.mjs",
  "kind": "ts",
  "hash": "ef90e0f4e6be7dda",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-retention-privacy-export.ts",
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
        "specifier": "@/features/admin/admin-retention-privacy",
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
      "getRetentionPrivacyJson",
      "getRetentionPrivacyCsv",
      "getRetentionPrivacyMarkdown"
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
