
export const dxSourceText = "import type { AdminLibraryRolloutMonitorReport } from \"@/features/admin/admin-library-rollout-monitor\";\n\nexport function getAdminLibraryRolloutMonitorJson(\n  report: AdminLibraryRolloutMonitorReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminLibraryRolloutMonitorCsv(\n  report: AdminLibraryRolloutMonitorReport,\n) {\n  return [\n    [\n      \"id\",\n      \"status\",\n      \"kind\",\n      \"label\",\n      \"value\",\n      \"latest_at\",\n      \"target\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.status,\n        row.kind,\n        row.label,\n        row.value,\n        row.latestAt,\n        row.target,\n        row.detail,\n        row.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"library_id\",\n      \"library_name\",\n      \"team_name\",\n      \"latest_version\",\n      \"published_file\",\n      \"subscribed_files\",\n      \"subscribed_components\",\n      \"subscribed_instances\",\n      \"update_available_components\",\n      \"pending_update_instances\",\n      \"detached_components\",\n      \"subscription_drift\",\n      \"adopted_latest_components\",\n      \"release_adoption_percent\",\n      \"latest_activity_at\",\n      \"status\",\n    ].join(\",\"),\n    ...report.libraries.map((library) =>\n      [\n        library.libraryId,\n        library.libraryName,\n        library.teamName,\n        library.latestVersion,\n        library.publishedFileName,\n        library.subscribedFileCount,\n        library.subscribedComponentCount,\n        library.subscribedInstanceCount,\n        library.updateAvailableComponentCount,\n        library.pendingUpdateInstanceCount,\n        library.detachedComponentCount,\n        library.subscriptionDriftCount,\n        library.adoptedLatestComponentCount,\n        library.releaseAdoptionPercent,\n        library.latestActivityAt,\n        library.status,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"file_id\",\n      \"file_name\",\n      \"owner_email\",\n      \"published_libraries\",\n      \"subscriptions\",\n      \"subscribed_components\",\n      \"subscribed_instances\",\n      \"update_available_components\",\n      \"pending_update_instances\",\n      \"detached_components\",\n      \"detached_instances\",\n      \"subscription_drift\",\n      \"orphan_subscriptions\",\n      \"adopted_latest_components\",\n      \"release_adoption_percent\",\n      \"latest_subscription_at\",\n      \"status\",\n    ].join(\",\"),\n    ...report.files.map((file) =>\n      [\n        file.fileId,\n        file.fileName,\n        file.ownerEmail,\n        file.publishedLibraryCount,\n        file.librarySubscriptionCount,\n        file.subscribedComponentCount,\n        file.subscribedInstanceCount,\n        file.updateAvailableComponentCount,\n        file.pendingUpdateInstanceCount,\n        file.detachedComponentCount,\n        file.detachedInstanceCount,\n        file.subscriptionDriftCount,\n        file.orphanSubscriptionCount,\n        file.adoptedLatestComponentCount,\n        file.releaseAdoptionPercent,\n        file.latestSubscriptionAt,\n        file.status,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminLibraryRolloutMonitorMarkdown(\n  report: AdminLibraryRolloutMonitorReport,\n) {\n  return [\n    \"# Organization Library Rollout Monitor\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,\n    \"\",\n    \"## Signals\",\n    \"\",\n    `- Published libraries: ${report.publishedLibraryCount}`,\n    `- Library subscriptions: ${report.librarySubscriptionCount}`,\n    `- Subscribed files: ${report.subscribedFileCount}`,\n    `- Subscribed components: ${report.subscribedComponentCount}`,\n    `- Subscribed instances: ${report.subscribedInstanceCount}`,\n    `- Available updates: ${report.updateAvailableComponentCount}`,\n    `- Pending update instances: ${report.pendingUpdateInstanceCount}`,\n    `- Detached components: ${report.detachedComponentCount}`,\n    `- Detached instances: ${report.detachedInstanceCount}`,\n    `- Subscription drift: ${report.subscriptionDriftCount}`,\n    `- Orphan subscriptions: ${report.orphanSubscriptionCount}`,\n    `- Release adoption: ${report.releaseAdoptionPercent}%`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n    \"\",\n    \"## Libraries\",\n    \"\",\n    ...(report.libraries.length > 0\n      ? report.libraries.map(\n          (library) =>\n            `- [${library.status}] ${library.libraryName} v${library.latestVersion}: ${library.releaseAdoptionPercent}% adoption, ${library.subscribedFileCount} files, ${library.subscribedComponentCount} components, ${library.updateAvailableComponentCount} updates, ${library.detachedComponentCount} detached.`,\n        )\n      : [\"- No library rollout rows loaded.\"]),\n    \"\",\n    \"## Files\",\n    \"\",\n    ...(report.files.length > 0\n      ? report.files.map(\n          (file) =>\n            `- [${file.status}] ${file.fileName}: ${file.releaseAdoptionPercent}% adoption, ${file.subscribedComponentCount} components, ${file.updateAvailableComponentCount} updates, ${file.detachedComponentCount} detached.`,\n        )\n      : [\"- No library files loaded.\"]),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-library-rollout-monitor-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-library-rollout-monitor-export-ts-eb93aed0d71645c3.mjs",
  "kind": "ts",
  "hash": "eb93aed0d71645c3",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-library-rollout-monitor-export.ts",
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
        "specifier": "@/features/admin/admin-library-rollout-monitor",
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
      "getAdminLibraryRolloutMonitorJson",
      "getAdminLibraryRolloutMonitorCsv",
      "getAdminLibraryRolloutMonitorMarkdown"
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
