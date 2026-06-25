
export const dxSourceText = "import type { AdminLibraryReleaseGateReport } from \"@/features/admin/admin-library-release-gates\";\n\nexport function getAdminLibraryReleaseGateJson(\n  report: AdminLibraryReleaseGateReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminLibraryReleaseGateCsv(\n  report: AdminLibraryReleaseGateReport,\n) {\n  return [\n    [\n      \"id\",\n      \"status\",\n      \"category\",\n      \"label\",\n      \"value\",\n      \"target\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.status,\n        row.category,\n        row.label,\n        row.value,\n        row.target,\n        row.detail,\n        row.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"file_id\",\n      \"file_name\",\n      \"owner_email\",\n      \"readiness_status\",\n      \"readiness_score\",\n      \"components\",\n      \"token_coverage\",\n      \"pending_updates\",\n      \"detached_instances\",\n    ].join(\",\"),\n    ...report.files.map((file) =>\n      [\n        file.fileId,\n        file.fileName,\n        file.ownerEmail,\n        file.readinessStatus,\n        file.readinessScore,\n        file.componentCount,\n        file.tokenCoveragePercent,\n        file.pendingUpdateInstanceCount,\n        file.detachedInstanceCount,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminLibraryReleaseGateMarkdown(\n  report: AdminLibraryReleaseGateReport,\n) {\n  return [\n    \"# Organization Library Release Gates\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Can release: ${report.canRelease ? \"yes\" : \"no\"}`,\n    `Gates: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,\n    \"\",\n    \"## Signals\",\n    \"\",\n    `- Library files: ${report.componentFileCount}`,\n    `- Components: ${report.componentCount}`,\n    `- Token coverage: ${report.tokenCoveragePercent}%`,\n    `- Release approval snapshots: ${report.releaseApprovalCount}`,\n    `- Latest approval: ${report.latestReleaseApprovalAt ?? \"none\"}`,\n    `- Rollback score: ${report.rollbackScore}`,\n    \"\",\n    \"## Gate Rows\",\n    \"\",\n    ...report.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n    \"\",\n    \"## Library Files\",\n    \"\",\n    ...(report.files.length > 0\n      ? report.files.map(\n          (file) =>\n            `- [${file.readinessStatus}] ${file.fileName}: readiness ${file.readinessScore}, ${file.componentCount} components, token coverage ${file.tokenCoveragePercent}%`,\n        )\n      : [\"- No component library files were found.\"]),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: boolean | number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-library-release-gates-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-library-release-gates-export-ts-f89f4ae5c41e2d25.mjs",
  "kind": "ts",
  "hash": "f89f4ae5c41e2d25",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-library-release-gates-export.ts",
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
        "specifier": "@/features/admin/admin-library-release-gates",
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
      "getAdminLibraryReleaseGateJson",
      "getAdminLibraryReleaseGateCsv",
      "getAdminLibraryReleaseGateMarkdown"
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
