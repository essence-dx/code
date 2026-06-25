
export const dxSourceText = "import type { AdminDesktopUpdateChannelReport } from \"@/features/admin/admin-desktop-update-channel\";\n\nexport function getAdminDesktopUpdateChannelJson(\n  report: AdminDesktopUpdateChannelReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminDesktopUpdateChannelCsv(\n  report: AdminDesktopUpdateChannelReport,\n) {\n  return [\n    [\n      \"package_channel\",\n      \"row_id\",\n      \"status\",\n      \"label\",\n      \"value\",\n      \"artifact_count\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.packages.flatMap((updatePackage) =>\n      updatePackage.rows.map((row) =>\n        [\n          updatePackage.channel,\n          row.id,\n          row.status,\n          row.label,\n          row.value,\n          row.artifactCount,\n          row.detail,\n          row.recommendation,\n        ]\n          .map(escapeCsvCell)\n          .join(\",\"),\n      ),\n    ),\n    \"\",\n    [\n      \"channel\",\n      \"status\",\n      \"score\",\n      \"current_version\",\n      \"target_version\",\n      \"minimum_version\",\n      \"rollout_percent\",\n      \"feed_url\",\n      \"hold_active\",\n      \"hold_reason\",\n    ].join(\",\"),\n    ...report.packages.map((updatePackage) =>\n      [\n        updatePackage.channel,\n        updatePackage.status,\n        updatePackage.score,\n        updatePackage.currentVersion,\n        updatePackage.targetVersion,\n        updatePackage.minimumVersion,\n        updatePackage.rolloutPercent,\n        updatePackage.feedUrl,\n        updatePackage.hold.active,\n        updatePackage.hold.reason,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminDesktopUpdateChannelMarkdown(\n  report: AdminDesktopUpdateChannelReport,\n) {\n  return [\n    \"# Desktop Update Channel Readiness\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Active channel: ${report.activeChannel}`,\n    `Current version: ${report.currentVersion}`,\n    `Target version: ${report.targetVersion}`,\n    `Minimum version: ${report.minimumVersion}`,\n    `Rollout: ${report.rolloutPercent}%`,\n    `Hold: ${report.holdActive ? report.holdReason ?? \"active\" : \"none\"}`,\n    \"\",\n    \"## Channels\",\n    \"\",\n    ...report.packages.flatMap((updatePackage) => [\n      `### ${updatePackage.label}`,\n      \"\",\n      `- Status: ${updatePackage.status}`,\n      `- Score: ${updatePackage.score}`,\n      `- Rollout: ${updatePackage.rolloutPercent}%`,\n      `- Feed: ${updatePackage.feedUrl ?? \"manual package handoff\"}`,\n      `- Hold: ${updatePackage.hold.active ? updatePackage.hold.reason ?? \"active\" : \"none\"}`,\n      \"\",\n      ...updatePackage.rows.map(\n        (row) =>\n          `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,\n      ),\n      \"\",\n    ]),\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: boolean | number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-desktop-update-channel-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-desktop-update-channel-export-ts-34b6b151ecd26928.mjs",
  "kind": "ts",
  "hash": "34b6b151ecd26928",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-desktop-update-channel-export.ts",
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
        "specifier": "@/features/admin/admin-desktop-update-channel",
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
      "getAdminDesktopUpdateChannelJson",
      "getAdminDesktopUpdateChannelCsv",
      "getAdminDesktopUpdateChannelMarkdown"
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
