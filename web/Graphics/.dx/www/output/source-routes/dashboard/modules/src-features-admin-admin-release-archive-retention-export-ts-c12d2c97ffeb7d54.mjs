
export const dxSourceText = "import type { AdminReleaseArchiveRetentionReport } from \"@/features/admin/admin-release-archive-retention\";\n\nexport function getAdminReleaseArchiveRetentionJson(\n  report: AdminReleaseArchiveRetentionReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminReleaseArchiveRetentionCsv(\n  report: AdminReleaseArchiveRetentionReport,\n) {\n  return [\n    [\n      \"package_id\",\n      \"package_label\",\n      \"item_id\",\n      \"kind\",\n      \"status\",\n      \"label\",\n      \"release_label\",\n      \"created_at\",\n      \"retention_until\",\n      \"artifact_count\",\n      \"summary\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.packages.flatMap((archivePackage) =>\n      archivePackage.items.map((item) =>\n        [\n          archivePackage.id,\n          archivePackage.label,\n          item.id,\n          item.kind,\n          item.status,\n          item.label,\n          item.releaseLabel,\n          item.createdAt,\n          item.retentionUntil,\n          item.artifactCount,\n          item.summary,\n          item.recommendation,\n        ]\n          .map(escapeCsvCell)\n          .join(\",\"),\n      ),\n    ),\n    \"\",\n    [\n      \"package_id\",\n      \"status\",\n      \"score\",\n      \"label\",\n      \"release_label\",\n      \"created_at\",\n      \"retention_until\",\n      \"item_count\",\n    ].join(\",\"),\n    ...report.packages.map((archivePackage) =>\n      [\n        archivePackage.id,\n        archivePackage.status,\n        archivePackage.score,\n        archivePackage.label,\n        archivePackage.releaseLabel,\n        archivePackage.createdAt,\n        archivePackage.retentionUntil,\n        archivePackage.itemCount,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminReleaseArchiveRetentionMarkdown(\n  report: AdminReleaseArchiveRetentionReport,\n) {\n  return [\n    \"# Release Archive Retention\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Retention days: ${report.retentionDays}`,\n    `Packages: ${report.packageCount}`,\n    `Items: ${report.itemCount}`,\n    `Searchable items: ${report.searchableCount}`,\n    \"\",\n    \"## Packages\",\n    \"\",\n    ...report.packages.flatMap((archivePackage) => [\n      `### ${archivePackage.label}`,\n      \"\",\n      `- Status: ${archivePackage.status}`,\n      `- Score: ${archivePackage.score}`,\n      `- Release: ${archivePackage.releaseLabel}`,\n      `- Retention until: ${archivePackage.retentionUntil}`,\n      \"\",\n      ...archivePackage.items.map(\n        (item) =>\n          `- [${item.status}] ${item.kind} / ${item.label}: ${item.summary} Retain until ${item.retentionUntil}. Recommendation: ${item.recommendation}`,\n      ),\n      \"\",\n    ]),\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- ${command}`),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: boolean | number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-archive-retention-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-archive-retention-export-ts-c12d2c97ffeb7d54.mjs",
  "kind": "ts",
  "hash": "c12d2c97ffeb7d54",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-release-archive-retention-export.ts",
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
        "specifier": "@/features/admin/admin-release-archive-retention",
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
      "getAdminReleaseArchiveRetentionJson",
      "getAdminReleaseArchiveRetentionCsv",
      "getAdminReleaseArchiveRetentionMarkdown"
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
