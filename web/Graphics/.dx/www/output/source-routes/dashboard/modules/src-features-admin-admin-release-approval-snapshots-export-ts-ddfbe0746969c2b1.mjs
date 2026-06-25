
export const dxSourceText = "import type { AdminReleaseApprovalSnapshot } from \"@/features/admin/admin-release-approval-snapshots\";\n\nexport function getAdminReleaseApprovalSnapshotsJson(\n  snapshots: AdminReleaseApprovalSnapshot[],\n) {\n  return JSON.stringify(snapshots, null, 2);\n}\n\nexport function getAdminReleaseApprovalSnapshotsCsv(\n  snapshots: AdminReleaseApprovalSnapshot[],\n) {\n  return [\n    [\n      \"id\",\n      \"release_label\",\n      \"reviewer_email\",\n      \"commit_sha\",\n      \"deployment_url\",\n      \"smoke_artifacts\",\n      \"rollback_notes\",\n      \"preflight_status\",\n      \"preflight_score\",\n      \"incident_status\",\n      \"incident_score\",\n      \"created_at\",\n    ].join(\",\"),\n    ...snapshots.map((snapshot) =>\n      [\n        snapshot.id,\n        snapshot.releaseLabel,\n        snapshot.reviewerEmail,\n        snapshot.commitSha,\n        snapshot.deploymentUrl,\n        snapshot.smokeArtifacts.join(\"\\n\"),\n        snapshot.rollbackNotes,\n        snapshot.preflightStatus,\n        snapshot.preflightScore,\n        snapshot.incidentStatus,\n        snapshot.incidentScore,\n        snapshot.createdAt,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminReleaseApprovalSnapshotsMarkdown(\n  snapshots: AdminReleaseApprovalSnapshot[],\n) {\n  if (snapshots.length === 0) {\n    return [\n      \"# Release Approval Snapshots\",\n      \"\",\n      \"No release approval snapshots have been recorded.\",\n    ].join(\"\\n\");\n  }\n\n  return [\n    \"# Release Approval Snapshots\",\n    \"\",\n    `Snapshots: ${snapshots.length}`,\n    \"\",\n    ...snapshots.flatMap((snapshot) => [\n      `## ${snapshot.releaseLabel}`,\n      \"\",\n      `- Created: ${snapshot.createdAt}`,\n      `- Reviewer: ${snapshot.reviewerName} <${snapshot.reviewerEmail}>`,\n      `- Commit: ${snapshot.commitSha}`,\n      `- Deployment: ${snapshot.deploymentUrl}`,\n      `- Preflight: ${snapshot.preflightStatus} ${snapshot.preflightScore}`,\n      `- Incident review: ${snapshot.incidentStatus} ${snapshot.incidentScore}`,\n      `- Smoke artifacts: ${snapshot.smokeArtifacts.length}`,\n      \"\",\n      \"### Smoke Artifacts\",\n      \"\",\n      ...(snapshot.smokeArtifacts.length > 0\n        ? snapshot.smokeArtifacts.map((artifact) => `- ${artifact}`)\n        : [\"- None recorded\"]),\n      \"\",\n      \"### Rollback Notes\",\n      \"\",\n      snapshot.rollbackNotes,\n      \"\",\n    ]),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: number | string | null | undefined) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-approval-snapshots-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-approval-snapshots-export-ts-ddfbe0746969c2b1.mjs",
  "kind": "ts",
  "hash": "ddfbe0746969c2b1",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-release-approval-snapshots-export.ts",
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
        "specifier": "@/features/admin/admin-release-approval-snapshots",
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
      "getAdminReleaseApprovalSnapshotsJson",
      "getAdminReleaseApprovalSnapshotsCsv",
      "getAdminReleaseApprovalSnapshotsMarkdown"
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
