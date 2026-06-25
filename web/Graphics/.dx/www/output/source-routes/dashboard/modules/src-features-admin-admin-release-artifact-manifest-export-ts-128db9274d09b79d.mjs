
export const dxSourceText = "import type { AdminReleaseArtifactManifestReport } from \"@/features/admin/admin-release-artifact-manifest\";\n\nexport function getAdminReleaseArtifactManifestJson(\n  report: AdminReleaseArtifactManifestReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminReleaseArtifactManifestCsv(\n  report: AdminReleaseArtifactManifestReport,\n) {\n  return [\n    [\n      \"id\",\n      \"kind\",\n      \"status\",\n      \"label\",\n      \"file_name\",\n      \"byte_size\",\n      \"checksum\",\n      \"signature_status\",\n      \"source_status\",\n      \"source_score\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.artifacts.map((artifact) =>\n      [\n        artifact.id,\n        artifact.kind,\n        artifact.status,\n        artifact.label,\n        artifact.fileName,\n        artifact.byteSize,\n        artifact.checksum,\n        artifact.signatureStatus,\n        artifact.sourceStatus,\n        artifact.sourceScore,\n        artifact.detail,\n        artifact.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    \"\",\n    [\n      \"manifest_id\",\n      \"status\",\n      \"score\",\n      \"checksum\",\n      \"signature\",\n      \"signing_key_id\",\n      \"signed_artifacts\",\n      \"unsigned_artifacts\",\n      \"blocked_artifacts\",\n      \"total_bytes\",\n    ].join(\",\"),\n    [\n      report.manifestId,\n      report.status,\n      report.score,\n      report.checksum,\n      report.signature,\n      report.signing.keyId,\n      report.signedArtifactCount,\n      report.unsignedArtifactCount,\n      report.blockedArtifactCount,\n      report.totalByteSize,\n    ]\n      .map(escapeCsvCell)\n      .join(\",\"),\n    \"\",\n    [\"id\", \"status\", \"label\", \"value\", \"detail\", \"recommendation\"].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.status,\n        row.label,\n        row.value,\n        row.detail,\n        row.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminReleaseArtifactManifestMarkdown(\n  report: AdminReleaseArtifactManifestReport,\n) {\n  return [\n    \"# Signed Release Artifact Manifest\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Manifest: ${report.manifestId}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Checksum: ${report.checksum}`,\n    `Signature: ${report.signature ?? \"unsigned\"}`,\n    `Signing key: ${report.signing.keyId}`,\n    \"\",\n    \"## Summary\",\n    \"\",\n    `- Artifacts: ${report.artifactCount}`,\n    `- Signed artifacts: ${report.signedArtifactCount}`,\n    `- Unsigned artifacts: ${report.unsignedArtifactCount}`,\n    `- Required artifacts: ${report.requiredArtifactCount}`,\n    `- Blocked artifacts: ${report.blockedArtifactCount}`,\n    `- Total bytes: ${report.totalByteSize}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map(\n      (row) =>\n        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,\n    ),\n    \"\",\n    \"## Artifacts\",\n    \"\",\n    ...report.artifacts.map(\n      (artifact) =>\n        `- [${artifact.status}] ${artifact.kind} / ${artifact.label}: ${artifact.fileName}, ${artifact.byteSize} bytes, ${artifact.checksum}, ${artifact.signatureStatus}. ${artifact.detail}`,\n    ),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: boolean | number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-artifact-manifest-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-artifact-manifest-export-ts-128db9274d09b79d.mjs",
  "kind": "ts",
  "hash": "128db9274d09b79d",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-release-artifact-manifest-export.ts",
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
        "specifier": "@/features/admin/admin-release-artifact-manifest",
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
      "getAdminReleaseArtifactManifestJson",
      "getAdminReleaseArtifactManifestCsv",
      "getAdminReleaseArtifactManifestMarkdown"
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
