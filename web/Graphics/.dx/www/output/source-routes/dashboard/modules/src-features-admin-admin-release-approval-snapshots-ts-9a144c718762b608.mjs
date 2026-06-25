
export const dxSourceText = "import type { AdminAuditMetadata } from \"@/db/schema\";\n\nexport const RELEASE_APPROVAL_ACTION = \"release.approval.snapshot\";\n\nexport type AdminReleaseApprovalSnapshotStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type AdminReleaseApprovalSnapshot = {\n  id: string;\n  releaseLabel: string;\n  reviewerEmail: string;\n  reviewerName: string;\n  commitSha: string;\n  deploymentUrl: string;\n  smokeArtifacts: string[];\n  rollbackNotes: string;\n  preflightStatus: AdminReleaseApprovalSnapshotStatus;\n  preflightScore: number;\n  incidentStatus: AdminReleaseApprovalSnapshotStatus;\n  incidentScore: number;\n  createdAt: string;\n};\n\nexport type AdminReleaseApprovalDefaults = {\n  commitSha: string;\n  deploymentUrl: string;\n};\n\nexport type ReleaseApprovalSnapshotInput = {\n  snapshotId: string;\n  releaseLabel: string;\n  reviewerEmail: string;\n  reviewerName: string;\n  commitSha: string;\n  deploymentUrl: string;\n  smokeArtifacts: string[];\n  rollbackNotes: string;\n  preflightStatus: AdminReleaseApprovalSnapshotStatus;\n  preflightScore: number;\n  incidentStatus: AdminReleaseApprovalSnapshotStatus;\n  incidentScore: number;\n};\n\ntype ReleaseApprovalAuditEvent = {\n  id: string;\n  actorEmail: string;\n  action: string;\n  targetLabel: string;\n  metadata: AdminAuditMetadata;\n  createdAt: string;\n};\n\nexport function getAdminReleaseApprovalSnapshots(\n  events: ReleaseApprovalAuditEvent[],\n): AdminReleaseApprovalSnapshot[] {\n  return events\n    .filter((event) => event.action === RELEASE_APPROVAL_ACTION)\n    .map(parseReleaseApprovalSnapshot)\n    .filter((snapshot): snapshot is AdminReleaseApprovalSnapshot =>\n      Boolean(snapshot),\n    )\n    .sort(\n      (left, right) =>\n        new Date(right.createdAt).getTime() -\n        new Date(left.createdAt).getTime(),\n    );\n}\n\nexport function createReleaseApprovalSnapshotMetadata({\n  snapshotId,\n  releaseLabel,\n  reviewerEmail,\n  reviewerName,\n  commitSha,\n  deploymentUrl,\n  smokeArtifacts,\n  rollbackNotes,\n  preflightStatus,\n  preflightScore,\n  incidentStatus,\n  incidentScore,\n}: ReleaseApprovalSnapshotInput): AdminAuditMetadata {\n  return {\n    snapshotId,\n    releaseLabel,\n    reviewerEmail,\n    reviewerName,\n    commitSha,\n    deploymentUrl,\n    smokeArtifactsText: smokeArtifacts.join(\"\\n\"),\n    smokeArtifactCount: smokeArtifacts.length,\n    rollbackNotes,\n    preflightStatus,\n    preflightScore,\n    incidentStatus,\n    incidentScore,\n  };\n}\n\nexport function parseSmokeArtifacts(value: string) {\n  return value\n    .split(/\\r?\\n/)\n    .map((item) => item.trim())\n    .filter(Boolean)\n    .slice(0, 20);\n}\n\nfunction parseReleaseApprovalSnapshot(\n  event: ReleaseApprovalAuditEvent,\n): AdminReleaseApprovalSnapshot | null {\n  const metadata = event.metadata;\n  const snapshotId = getString(metadata.snapshotId) || event.id;\n  const commitSha = getString(metadata.commitSha);\n  const deploymentUrl = getString(metadata.deploymentUrl);\n  const rollbackNotes = getString(metadata.rollbackNotes);\n\n  if (!commitSha || !deploymentUrl || !rollbackNotes) {\n    return null;\n  }\n\n  return {\n    id: snapshotId,\n    releaseLabel:\n      getString(metadata.releaseLabel) || event.targetLabel || \"Release\",\n    reviewerEmail: getString(metadata.reviewerEmail) || event.actorEmail,\n    reviewerName: getString(metadata.reviewerName) || event.actorEmail,\n    commitSha,\n    deploymentUrl,\n    smokeArtifacts: parseSmokeArtifacts(getString(metadata.smokeArtifactsText)),\n    rollbackNotes,\n    preflightStatus: getSnapshotStatus(metadata.preflightStatus),\n    preflightScore: getScore(metadata.preflightScore),\n    incidentStatus: getSnapshotStatus(metadata.incidentStatus),\n    incidentScore: getScore(metadata.incidentScore),\n    createdAt: event.createdAt,\n  };\n}\n\nfunction getString(value: AdminAuditMetadata[string]) {\n  return typeof value === \"string\" ? value.trim() : \"\";\n}\n\nfunction getScore(value: AdminAuditMetadata[string]) {\n  return typeof value === \"number\" && Number.isFinite(value) ? value : 0;\n}\n\nfunction getSnapshotStatus(\n  value: AdminAuditMetadata[string],\n): AdminReleaseApprovalSnapshotStatus {\n  return value === \"ready\" || value === \"review\" || value === \"blocked\"\n    ? value\n    : \"review\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-approval-snapshots.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-approval-snapshots-ts-9a144c718762b608.mjs",
  "kind": "ts",
  "hash": "9a144c718762b608",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-release-approval-snapshots.ts",
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
        "specifier": "@/db/schema",
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
      "getAdminReleaseApprovalSnapshots",
      "createReleaseApprovalSnapshotMetadata",
      "parseSmokeArtifacts",
      "RELEASE_APPROVAL_ACTION"
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
