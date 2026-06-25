import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-release-archive-retention-core-ts-e5470a1e1adb5640.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-release-archive-retention-current-ts-4ef09d74fef5db2d.mjs";
export const dxSourceText = "import {\n  addDays,\n  createArchiveItem,\n  createArchivePackage,\n  searchable,\n  type AdminReleaseArchiveItem,\n  type AdminReleaseArchivePackage,\n} from \"@/features/admin/admin-release-archive-retention-core\";\nimport { getCurrentReleaseArchiveItems } from \"@/features/admin/admin-release-archive-retention-current\";\nimport type { AdminReleaseArchiveRetentionInput } from \"@/features/admin/admin-release-archive-retention\";\nimport type { AdminReleaseApprovalSnapshot } from \"@/features/admin/admin-release-approval-snapshots\";\n\nexport function getReleaseArchivePackages({\n  accessibilityPrivacyRelease,\n  desktopUpdateChannels,\n  generatedAt,\n  operatorRehearsals,\n  productionDeploySmoke,\n  releaseApprovalSnapshots,\n  releaseArtifactManifest,\n  releaseChannels,\n  retentionDays,\n  rollbackReadiness,\n}: Omit<AdminReleaseArchiveRetentionInput, \"retentionPrivacy\"> & {\n  generatedAt: string;\n  retentionDays: number;\n}): AdminReleaseArchivePackage[] {\n  const latestApproval = releaseApprovalSnapshots[0] ?? null;\n  const currentReleaseLabel =\n    latestApproval?.releaseLabel ??\n    releaseChannels.packages[0]?.releaseLabel ??\n    \"Current release\";\n\n  return [\n    createArchivePackage({\n      id: \"current-release-archive-package\",\n      label: \"Current release archive\",\n      releaseLabel: currentReleaseLabel,\n      items: getCurrentReleaseArchiveItems({\n        accessibilityPrivacyRelease,\n        desktopUpdateChannels,\n        latestApproval,\n        operatorRehearsals,\n        productionDeploySmoke,\n        releaseArtifactManifest,\n        releaseChannels,\n        retentionDays,\n        rollbackReadiness,\n      }),\n    }),\n    ...releaseApprovalSnapshots.slice(0, 10).map((snapshot) =>\n      createArchivePackage({\n        id: `approval-archive-${snapshot.id}`,\n        label: snapshot.releaseLabel,\n        releaseLabel: snapshot.releaseLabel,\n        items: getApprovalArchiveItems({\n          generatedAt,\n          retentionDays,\n          snapshot,\n        }),\n      }),\n    ),\n  ];\n}\n\nfunction getApprovalArchiveItems({\n  generatedAt,\n  retentionDays,\n  snapshot,\n}: {\n  generatedAt: string;\n  retentionDays: number;\n  snapshot: AdminReleaseApprovalSnapshot;\n}): AdminReleaseArchiveItem[] {\n  return [\n    createArchiveItem({\n      id: `approval-${snapshot.id}`,\n      kind: \"approval\",\n      status: getSnapshotArchiveStatus(snapshot),\n      label: \"Release approval snapshot\",\n      releaseLabel: snapshot.releaseLabel,\n      createdAt: snapshot.createdAt,\n      retentionUntil: addDays(snapshot.createdAt, retentionDays),\n      searchableText: searchable(\n        snapshot.releaseLabel,\n        snapshot.reviewerEmail,\n        snapshot.commitSha,\n        snapshot.deploymentUrl,\n        snapshot.rollbackNotes,\n        snapshot.smokeArtifacts.join(\" \"),\n      ),\n      summary: `${snapshot.reviewerEmail} approved ${snapshot.commitSha} with ${snapshot.smokeArtifacts.length} smoke artifacts.`,\n      recommendation:\n        \"Keep approval snapshots searchable by reviewer, commit, deployment URL, smoke artifacts, and rollback notes.\",\n      artifactCount: snapshot.smokeArtifacts.length + 1,\n      sourceId: snapshot.id,\n    }),\n    createArchiveItem({\n      id: `approval-smoke-${snapshot.id}`,\n      kind: \"smoke\",\n      status: snapshot.preflightStatus,\n      label: \"Approval smoke artifact references\",\n      releaseLabel: snapshot.releaseLabel,\n      createdAt: snapshot.createdAt,\n      retentionUntil: addDays(snapshot.createdAt, retentionDays),\n      searchableText: searchable(\n        snapshot.releaseLabel,\n        snapshot.smokeArtifacts.join(\" \"),\n        snapshot.deploymentUrl,\n        \"approval smoke artifacts\",\n      ),\n      summary: `${snapshot.smokeArtifacts.length} smoke artifact references were attached to the approval snapshot.`,\n      recommendation:\n        \"Ensure referenced smoke artifacts are stored beside the release archive package.\",\n      artifactCount: snapshot.smokeArtifacts.length,\n      sourceId: snapshot.id,\n    }),\n    createArchiveItem({\n      id: `approval-rollback-${snapshot.id}`,\n      kind: \"rollback\",\n      status: snapshot.incidentStatus,\n      label: \"Approval rollback notes\",\n      releaseLabel: snapshot.releaseLabel,\n      createdAt: snapshot.createdAt,\n      retentionUntil: addDays(generatedAt, retentionDays),\n      searchableText: searchable(\n        snapshot.releaseLabel,\n        snapshot.rollbackNotes,\n        \"approval rollback recovery notes\",\n      ),\n      summary: snapshot.rollbackNotes,\n      recommendation:\n        \"Keep rollback notes attached to the release archive until the retention window closes.\",\n      artifactCount: 1,\n      sourceId: snapshot.id,\n    }),\n  ];\n}\n\nfunction getSnapshotArchiveStatus(snapshot: AdminReleaseApprovalSnapshot) {\n  if (\n    snapshot.preflightStatus === \"blocked\" ||\n    snapshot.incidentStatus === \"blocked\"\n  ) {\n    return \"blocked\";\n  }\n\n  return snapshot.preflightStatus === \"review\" ||\n    snapshot.incidentStatus === \"review\"\n    ? \"review\"\n    : \"ready\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-archive-retention-packages.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-archive-retention-packages-ts-535a9aef7734f853.mjs",
  "kind": "ts",
  "hash": "535a9aef7734f853",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-release-archive-retention-core",
      "resolved_path": "src/features/admin/admin-release-archive-retention-core.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-archive-retention-core-ts-e5470a1e1adb5640.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-release-archive-retention-current",
      "resolved_path": "src/features/admin/admin-release-archive-retention-current.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-archive-retention-current-ts-4ef09d74fef5db2d.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    }
  ],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-release-archive-retention-packages.ts",
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
        "specifier": "@/features/admin/admin-release-archive-retention-core",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-release-archive-retention-current",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-release-archive-retention",
        "side_effect_only": false,
        "type_only": true
      },
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
      "getReleaseArchivePackages"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1]);
export default dxSourceModule;
