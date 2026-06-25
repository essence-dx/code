import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-release-archive-retention-core-ts-e5470a1e1adb5640.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-release-archive-retention-packages-ts-535a9aef7734f853.mjs";
export const dxSourceText = "import type { AccessibilityPrivacyReleaseChecklist } from \"@/features/admin/admin-accessibility-privacy-release\";\nimport type { AdminDesktopUpdateChannelReport } from \"@/features/admin/admin-desktop-update-channel\";\nimport {\n  getRowsScore,\n  getRowsStatus,\n  isExpired,\n  uniqueStrings,\n  type AdminReleaseArchiveRetentionReport,\n} from \"@/features/admin/admin-release-archive-retention-core\";\nimport { getReleaseArchivePackages } from \"@/features/admin/admin-release-archive-retention-packages\";\nimport type { AdminOperatorRehearsalReport } from \"@/features/admin/admin-operator-rehearsals\";\nimport type { AdminReleaseApprovalSnapshot } from \"@/features/admin/admin-release-approval-snapshots\";\nimport type { AdminReleaseArtifactManifestReport } from \"@/features/admin/admin-release-artifact-manifest\";\nimport type { AdminReleaseChannelsReport } from \"@/features/admin/admin-release-channels\";\nimport type { RetentionPrivacyReport } from \"@/features/admin/admin-retention-privacy\";\nimport type { AdminRollbackReadinessReport } from \"@/features/admin/admin-rollback-readiness\";\nimport type { ProductionDeploySmokeReport } from \"@/features/editor/production-deploy-smoke\";\n\nexport type {\n  AdminReleaseArchiveItem,\n  AdminReleaseArchiveItemKind,\n  AdminReleaseArchivePackage,\n  AdminReleaseArchiveRetentionReport,\n  AdminReleaseArchiveRetentionStatus,\n} from \"@/features/admin/admin-release-archive-retention-core\";\n\nexport type AdminReleaseArchiveRetentionInput = {\n  accessibilityPrivacyRelease: AccessibilityPrivacyReleaseChecklist;\n  desktopUpdateChannels: AdminDesktopUpdateChannelReport;\n  generatedAt?: string;\n  operatorRehearsals: AdminOperatorRehearsalReport;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n  releaseChannels: AdminReleaseChannelsReport;\n  retentionPrivacy: RetentionPrivacyReport;\n  rollbackReadiness: AdminRollbackReadinessReport;\n};\n\nexport function getAdminReleaseArchiveRetentionReport({\n  accessibilityPrivacyRelease,\n  desktopUpdateChannels,\n  generatedAt = new Date().toISOString(),\n  operatorRehearsals,\n  productionDeploySmoke,\n  releaseApprovalSnapshots,\n  releaseArtifactManifest,\n  releaseChannels,\n  retentionPrivacy,\n  rollbackReadiness,\n}: AdminReleaseArchiveRetentionInput): AdminReleaseArchiveRetentionReport {\n  const retentionDays = retentionPrivacy.settings.auditLogRetentionDays;\n  const packages = getReleaseArchivePackages({\n    accessibilityPrivacyRelease,\n    desktopUpdateChannels,\n    generatedAt,\n    operatorRehearsals,\n    productionDeploySmoke,\n    releaseApprovalSnapshots,\n    releaseArtifactManifest,\n    releaseChannels,\n    retentionDays,\n    rollbackReadiness,\n  });\n  const items = packages.flatMap((archivePackage) => archivePackage.items);\n  const now = new Date(generatedAt).getTime();\n  const readyCount = items.filter((item) => item.status === \"ready\").length;\n  const reviewCount = items.filter((item) => item.status === \"review\").length;\n  const blockedCount = items.filter((item) => item.status === \"blocked\").length;\n  const expiredCount = items.filter((item) =>\n    isExpired(item.retentionUntil, now),\n  ).length;\n  const commands = uniqueStrings([\n    \"Export Admin > Release archive retention JSON.\",\n    \"Export Admin > Release archive retention CSV.\",\n    \"Search the Release archive retention panel by release label, commit, deployment URL, package name, smoke artifact, privacy surface, or rollback note.\",\n    \"Store signed manifests, approvals, smoke reports, privacy checklists, and rollback bundles until the archive retention window closes.\",\n  ]);\n\n  return {\n    generatedAt,\n    status:\n      expiredCount > 0\n        ? \"review\"\n        : getRowsStatus(items.map((item) => item.status)),\n    score: Math.max(0, getRowsScore(items) - expiredCount * 4),\n    retentionDays,\n    packageCount: packages.length,\n    itemCount: items.length,\n    approvalCount: items.filter((item) => item.kind === \"approval\").length,\n    smokeCount: items.filter((item) => item.kind === \"smoke\").length,\n    privacyCount: items.filter((item) => item.kind === \"privacy\").length,\n    rollbackCount: items.filter((item) => item.kind === \"rollback\").length,\n    manifestCount: items.filter((item) => item.kind === \"manifest\").length,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    expiredCount,\n    searchableCount: items.filter((item) => item.searchableText.length > 0).length,\n    packages,\n    items,\n    commands,\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-archive-retention.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-archive-retention-ts-97128a5c013a9037.mjs",
  "kind": "ts",
  "hash": "97128a5c013a9037",
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
      "specifier": "@/features/admin/admin-release-archive-retention-packages",
      "resolved_path": "src/features/admin/admin-release-archive-retention-packages.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-archive-retention-packages-ts-535a9aef7734f853.mjs",
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
    "source_path": "src/features/admin/admin-release-archive-retention.ts",
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
        "specifier": "@/features/admin/admin-accessibility-privacy-release",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-desktop-update-channel",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-archive-retention-core",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-release-archive-retention-packages",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-operator-rehearsals",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-approval-snapshots",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-artifact-manifest",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-channels",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-retention-privacy",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-rollback-readiness",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/production-deploy-smoke",
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
      "getAdminReleaseArchiveRetentionReport"
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
