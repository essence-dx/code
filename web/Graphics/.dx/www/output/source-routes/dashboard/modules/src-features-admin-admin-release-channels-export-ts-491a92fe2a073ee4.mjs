
export const dxSourceText = "import type { AdminReleaseChannelsReport } from \"@/features/admin/admin-release-channels\";\n\nexport function getAdminReleaseChannelsJson(report: AdminReleaseChannelsReport) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminReleaseChannelsCsv(report: AdminReleaseChannelsReport) {\n  return [\n    [\n      \"id\",\n      \"channel\",\n      \"status\",\n      \"label\",\n      \"value\",\n      \"artifact_count\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.channel,\n        row.status,\n        row.label,\n        row.value,\n        row.artifactCount,\n        row.detail,\n        row.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"channel\",\n      \"package_name\",\n      \"package_version\",\n      \"release_label\",\n      \"status\",\n      \"score\",\n      \"commit_sha\",\n      \"deployment_url\",\n      \"artifacts\",\n    ].join(\",\"),\n    ...report.packages.map((releasePackage) =>\n      [\n        releasePackage.channel,\n        releasePackage.packageName,\n        releasePackage.packageVersion,\n        releasePackage.releaseLabel,\n        releasePackage.status,\n        releasePackage.score,\n        releasePackage.commitSha,\n        releasePackage.deploymentUrl,\n        releasePackage.artifacts.length,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\"channel\", \"kind\", \"label\", \"required\", \"value\"].join(\",\"),\n    ...report.packages.flatMap((releasePackage) =>\n      releasePackage.artifacts.map((artifact) =>\n        [\n          artifact.channel,\n          artifact.kind,\n          artifact.label,\n          artifact.required,\n          artifact.value,\n        ]\n          .map(escapeCsvCell)\n          .join(\",\"),\n      ),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminReleaseChannelsMarkdown(\n  report: AdminReleaseChannelsReport,\n) {\n  return [\n    \"# Admin Release Channels\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Channels: ${report.readyChannelCount} ready, ${report.reviewChannelCount} review, ${report.blockedChannelCount} blocked`,\n    `Artifacts: ${report.artifactCount}`,\n    \"\",\n    \"## Packages\",\n    \"\",\n    ...report.packages.flatMap((releasePackage) => [\n      `### ${releasePackage.label}`,\n      \"\",\n      `- Package: ${releasePackage.packageName}`,\n      `- Version: ${releasePackage.packageVersion}`,\n      `- Release: ${releasePackage.releaseLabel}`,\n      `- Status: ${releasePackage.status}`,\n      `- Score: ${releasePackage.score}`,\n      `- Commit: ${releasePackage.commitSha}`,\n      `- Deployment: ${releasePackage.deploymentUrl}`,\n      \"\",\n      \"#### Review Rows\",\n      \"\",\n      ...releasePackage.rows.map(\n        (row) =>\n          `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,\n      ),\n      \"\",\n      \"#### Artifacts\",\n      \"\",\n      ...releasePackage.artifacts.map(\n        (artifact) =>\n          `- ${artifact.kind}${artifact.required ? \" required\" : \"\"}: ${artifact.label} - ${artifact.value}`,\n      ),\n      \"\",\n    ]),\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: boolean | number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-channels-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-channels-export-ts-491a92fe2a073ee4.mjs",
  "kind": "ts",
  "hash": "491a92fe2a073ee4",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-release-channels-export.ts",
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
        "specifier": "@/features/admin/admin-release-channels",
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
      "getAdminReleaseChannelsJson",
      "getAdminReleaseChannelsCsv",
      "getAdminReleaseChannelsMarkdown"
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
