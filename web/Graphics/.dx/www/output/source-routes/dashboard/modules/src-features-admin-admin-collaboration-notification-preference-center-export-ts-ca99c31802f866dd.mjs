
export const dxSourceText = "import type {\n  AdminCollaborationNotificationPreferenceCenterReport,\n  AdminCollaborationNotificationPreferenceGap,\n  AdminCollaborationNotificationPreferenceRow,\n  AdminCollaborationNotificationPreferenceScope,\n} from \"@/features/admin/admin-collaboration-notification-preference-center-types\";\n\nexport function getAdminCollaborationNotificationPreferenceCenterJson(\n  report: AdminCollaborationNotificationPreferenceCenterReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminCollaborationNotificationPreferenceCenterCsv(\n  report: AdminCollaborationNotificationPreferenceCenterReport,\n) {\n  return [\n    toCsvRow([\n      \"kind\",\n      \"id\",\n      \"category\",\n      \"status\",\n      \"state\",\n      \"label\",\n      \"target\",\n      \"fileName\",\n      \"ownerRef\",\n      \"signalCount\",\n      \"blockedSignalCount\",\n      \"suppressed\",\n      \"exportReady\",\n      \"latestAt\",\n      \"recommendation\",\n    ]),\n    ...report.rows.map((row) => rowToCsv(row)),\n    ...report.preferences.map((preference) => preferenceToCsv(preference)),\n    ...report.alertGaps.map((gap) => gapToCsv(gap)),\n  ].join(\"\\n\");\n}\n\nexport function getAdminCollaborationNotificationPreferenceCenterMarkdown(\n  report: AdminCollaborationNotificationPreferenceCenterReport,\n) {\n  return [\n    \"# Collaboration Notification Preference Center\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Categories: ${report.categoryCount}`,\n    `Preference scopes: ${report.preferenceScopeCount}`,\n    `Alert gaps: ${report.alertGapCount}`,\n    `Digest recipients: ${report.digestRecipientCount}`,\n    \"\",\n    \"## Rows\",\n    ...report.rows.flatMap((row) => [\n      `- ${row.label}: ${row.status} (${row.value})`,\n      `  - Detail: ${row.detail}`,\n      `  - Recommendation: ${row.recommendation}`,\n    ]),\n    \"\",\n    \"## Preference Scopes\",\n    ...report.preferences.slice(0, 12).flatMap((preference) => [\n      `- ${preference.label}: ${preference.status}`,\n      `  - Category: ${formatCategory(preference.category)}`,\n      `  - State: ${preference.state}`,\n      `  - Signals: ${preference.signalCount} total / ${preference.blockedSignalCount} blocked`,\n      `  - Target: ${preference.target}`,\n      `  - Owner: ${preference.ownerRef}`,\n      `  - Recommendation: ${preference.recommendation}`,\n    ]),\n    \"\",\n    \"## Alert Gaps\",\n    ...(report.alertGaps.length > 0\n      ? report.alertGaps.slice(0, 12).flatMap((gap) => [\n          `- ${gap.label}: ${gap.status}`,\n          `  - Category: ${formatCategory(gap.category)}`,\n          `  - Target: ${gap.target}`,\n          `  - Detail: ${gap.detail}`,\n          `  - Command: ${gap.command}`,\n        ])\n      : [\"No collaboration notification preference gaps are open.\"]),\n    \"\",\n    \"## Commands\",\n    ...report.commands.map((command) => `- ${command}`),\n  ].join(\"\\n\");\n}\n\nfunction rowToCsv(row: AdminCollaborationNotificationPreferenceRow) {\n  return toCsvRow([\n    \"row\",\n    row.id,\n    row.category,\n    row.status,\n    \"\",\n    row.label,\n    row.target ?? \"\",\n    \"\",\n    \"\",\n    row.count,\n    \"\",\n    \"\",\n    \"\",\n    row.latestAt ?? \"\",\n    row.recommendation,\n  ]);\n}\n\nfunction preferenceToCsv(\n  preference: AdminCollaborationNotificationPreferenceScope,\n) {\n  return toCsvRow([\n    \"preference\",\n    preference.id,\n    preference.category,\n    preference.status,\n    preference.state,\n    preference.label,\n    preference.target,\n    preference.fileName ?? \"\",\n    preference.ownerRef,\n    preference.signalCount,\n    preference.blockedSignalCount,\n    preference.suppressed,\n    preference.exportReady,\n    preference.latestAt ?? \"\",\n    preference.recommendation,\n  ]);\n}\n\nfunction gapToCsv(gap: AdminCollaborationNotificationPreferenceGap) {\n  return toCsvRow([\n    \"gap\",\n    gap.id,\n    gap.category,\n    gap.status,\n    \"\",\n    gap.label,\n    gap.target,\n    \"\",\n    \"\",\n    \"\",\n    \"\",\n    \"\",\n    \"\",\n    gap.latestAt ?? \"\",\n    `${gap.detail} ${gap.command}`,\n  ]);\n}\n\nfunction toCsvRow(values: Array<boolean | number | string>) {\n  return values\n    .map((value) => {\n      const text = String(value);\n\n      if (/[\",\\n]/.test(text)) {\n        return `\"${text.replace(/\"/g, '\"\"')}\"`;\n      }\n\n      return text;\n    })\n    .join(\",\");\n}\n\nfunction formatCategory(value: string) {\n  return value.replace(/-/g, \" \");\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-collaboration-notification-preference-center-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-notification-preference-center-export-ts-ca99c31802f866dd.mjs",
  "kind": "ts",
  "hash": "ca99c31802f866dd",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-collaboration-notification-preference-center-export.ts",
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
        "specifier": "@/features/admin/admin-collaboration-notification-preference-center-types",
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
      "getAdminCollaborationNotificationPreferenceCenterJson",
      "getAdminCollaborationNotificationPreferenceCenterCsv",
      "getAdminCollaborationNotificationPreferenceCenterMarkdown"
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
