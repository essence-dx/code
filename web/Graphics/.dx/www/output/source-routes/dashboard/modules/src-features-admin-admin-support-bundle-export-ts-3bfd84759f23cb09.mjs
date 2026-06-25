
export const dxSourceText = "import type { AdminSupportBundle } from \"@/features/admin/admin-support-bundle\";\n\nexport function getAdminSupportBundleJson(bundle: AdminSupportBundle) {\n  return JSON.stringify(bundle, null, 2);\n}\n\nexport function getAdminSupportBundleCsv(bundle: AdminSupportBundle) {\n  return [\n    [\"section\", \"id\", \"label\", \"status\", \"detail\"].join(\",\"),\n    ...bundle.findings.map((finding) =>\n      [\n        \"finding\",\n        finding.id,\n        finding.label,\n        finding.status,\n        `${finding.value} - ${finding.detail}`,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    [\n      \"privacy\",\n      bundle.privacy.mode,\n      \"support bundle privacy\",\n      bundle.privacy.emailsRedacted ? \"redacted\" : \"diagnostic\",\n      `retention ${bundle.privacy.retentionDays} days / network ${bundle.privacy.networkDetailsIncluded} / metadata ${bundle.privacy.auditMetadataIncluded}`,\n    ]\n      .map(escapeCsvCell)\n      .join(\",\"),\n    ...bundle.users.map((user) =>\n      [\n        \"user\",\n        user.id,\n        user.email,\n        user.emailVerified ? \"verified\" : \"pending\",\n        `${user.files} files / ${user.sessions} sessions`,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    ...bundle.files.map((file) =>\n      [\n        \"file\",\n        file.id,\n        file.name,\n        file.trashedAt ? \"trashed\" : \"active\",\n        `${file.ownerEmail} / ${file.publicShareCount} public shares / ${file.openCommentCount} open comments`,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    ...bundle.shares.map((share) =>\n      [\n        \"share\",\n        share.id,\n        share.fileName,\n        share.disabledAt ? \"disabled\" : \"active\",\n        `${share.permissionPreset} / downloads ${share.allowDownload} / comments ${share.allowComments} / expires ${share.expiresAt ?? \"never\"}`,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    ...bundle.sessions.map((session) =>\n      [\n        \"session\",\n        session.id,\n        session.userEmail,\n        new Date(session.expiresAt).getTime() <= Date.now()\n          ? \"expired\"\n          : \"active\",\n        `${session.userAgent ?? \"unknown agent\"} / ${session.ipAddress ?? \"unknown ip\"}`,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    ...bundle.notificationDeliveries.map((delivery) =>\n      [\n        \"notification\",\n        delivery.id,\n        delivery.recipientEmail,\n        delivery.status,\n        `${delivery.kind} / ${delivery.fileName}${delivery.reason ? ` / ${delivery.reason}` : \"\"}`,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    ...bundle.auditEvents.map((event) =>\n      [\n        \"audit\",\n        event.id,\n        event.action,\n        event.targetType,\n        `${event.actorEmail} / ${event.targetLabel} / ${event.createdAt}`,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    ...bundle.rollbackEvidence.rows.map((row) =>\n      [\n        \"rollback\",\n        row.id,\n        row.label,\n        row.status,\n        `${row.count} records / ${row.detail}`,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminSupportBundleMarkdown(bundle: AdminSupportBundle) {\n  return [\n    \"# Admin Support Bundle\",\n    \"\",\n    `Generated: ${bundle.generatedAt}`,\n    `Requested by: ${bundle.requestedBy}`,\n    `Scope: ${bundle.scope}`,\n    `Target: ${bundle.target.label}`,\n    `Status: ${bundle.status}`,\n    `Score: ${bundle.score}`,\n    \"\",\n    \"## Counts\",\n    \"\",\n    `- Users: ${bundle.summary.users}`,\n    `- Files: ${bundle.summary.files}`,\n    `- Shares: ${bundle.summary.shares}`,\n    `- Sessions: ${bundle.summary.sessions}`,\n    `- Audit events: ${bundle.summary.auditEvents}`,\n    `- Notification deliveries: ${bundle.summary.notificationDeliveries}`,\n    `- Failed notifications: ${bundle.summary.failedNotifications}`,\n    `- Rollback rows: ${bundle.summary.rollbackRows}`,\n    `- Rollback version anchors: ${bundle.summary.rollbackVersions}`,\n    \"\",\n    \"## Privacy\",\n    \"\",\n    `- Mode: ${bundle.privacy.mode}`,\n    `- Retention target: ${bundle.privacy.retentionDays} days`,\n    `- Emails redacted: ${formatBoolean(bundle.privacy.emailsRedacted)}`,\n    `- Network details included: ${formatBoolean(bundle.privacy.networkDetailsIncluded)}`,\n    `- Notification reasons included: ${formatBoolean(bundle.privacy.notificationReasonsIncluded)}`,\n    `- Audit metadata included: ${formatBoolean(bundle.privacy.auditMetadataIncluded)}`,\n    \"\",\n    \"## Findings\",\n    \"\",\n    ...bundle.findings.map(\n      (finding) =>\n        `- [${finding.status}] ${finding.label}: ${finding.value}. ${finding.detail}`,\n    ),\n    \"\",\n    \"## Users\",\n    \"\",\n    ...formatRows(\n      bundle.users.map(\n        (user) =>\n          `${user.email} (${user.emailVerified ? \"verified\" : \"pending\"}) - ${user.files} files, ${user.sessions} sessions`,\n      ),\n      \"No users matched this support scope.\",\n    ),\n    \"\",\n    \"## Files\",\n    \"\",\n    ...formatRows(\n      bundle.files.map(\n        (file) =>\n          `${file.name} by ${file.ownerEmail} - ${file.publicShareCount} public shares, ${file.openCommentCount} open comments`,\n      ),\n      \"No files matched this support scope.\",\n    ),\n    \"\",\n    \"## Public Shares\",\n    \"\",\n    ...formatRows(\n      bundle.shares.map(\n        (share) =>\n          `${share.fileName} (${share.permissionPreset}) - downloads ${share.allowDownload}, comments ${share.allowComments}, expires ${share.expiresAt ?? \"never\"}`,\n      ),\n      \"No public shares matched this support scope.\",\n    ),\n    \"\",\n    \"## Sessions\",\n    \"\",\n    ...formatRows(\n      bundle.sessions.map(\n        (session) =>\n          `${session.userEmail} - created ${session.createdAt}, expires ${session.expiresAt}`,\n      ),\n      \"No sessions matched this support scope.\",\n    ),\n    \"\",\n    \"## Notification Delivery\",\n    \"\",\n    ...formatRows(\n      bundle.notificationDeliveries.map(\n        (delivery) =>\n          `${delivery.status}: ${delivery.kind} to ${delivery.recipientEmail} for ${delivery.fileName}${delivery.reason ? ` (${delivery.reason})` : \"\"}`,\n      ),\n      \"No notification deliveries matched this support scope.\",\n    ),\n    \"\",\n    \"## Audit Events\",\n    \"\",\n    ...formatRows(\n      bundle.auditEvents.map(\n        (event) =>\n          `${event.createdAt}: ${event.actorEmail} ${event.action} ${event.targetType}/${event.targetLabel}`,\n      ),\n      \"No audit events matched this support scope.\",\n    ),\n    \"\",\n    \"## Rollback Evidence\",\n    \"\",\n    `- Status: ${bundle.rollbackEvidence.status}`,\n    `- Score: ${bundle.rollbackEvidence.score}`,\n    `- Database: ${bundle.rollbackEvidence.database.databaseKind}`,\n    `- Deployment links: ${bundle.rollbackEvidence.deploymentUrls.join(\", \") || \"none\"}`,\n    \"\",\n    ...bundle.rollbackEvidence.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n  ].join(\"\\n\");\n}\n\nfunction formatRows(rows: string[], emptyText: string) {\n  return rows.length > 0 ? rows.map((row) => `- ${row}`) : [`- ${emptyText}`];\n}\n\nfunction formatBoolean(value: boolean) {\n  return value ? \"yes\" : \"no\";\n}\n\nfunction escapeCsvCell(value: boolean | number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-support-bundle-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-support-bundle-export-ts-3bfd84759f23cb09.mjs",
  "kind": "ts",
  "hash": "3bfd84759f23cb09",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-support-bundle-export.ts",
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
        "specifier": "@/features/admin/admin-support-bundle",
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
      "getAdminSupportBundleJson",
      "getAdminSupportBundleCsv",
      "getAdminSupportBundleMarkdown"
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
