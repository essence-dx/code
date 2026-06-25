import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-release-archive-retention-core-ts-e5470a1e1adb5640.mjs";
export const dxSourceText = "import type { AccessibilityPrivacyReleaseChecklist } from \"@/features/admin/admin-accessibility-privacy-release\";\nimport type { AdminDesktopUpdateChannelReport } from \"@/features/admin/admin-desktop-update-channel\";\nimport type { AdminReleaseArchiveItem } from \"@/features/admin/admin-release-archive-retention-core\";\nimport {\n  addDays,\n  createArchiveItem,\n  searchable,\n} from \"@/features/admin/admin-release-archive-retention-core\";\nimport type { AdminOperatorRehearsalReport } from \"@/features/admin/admin-operator-rehearsals\";\nimport type { AdminReleaseApprovalSnapshot } from \"@/features/admin/admin-release-approval-snapshots\";\nimport type { AdminReleaseArtifactManifestReport } from \"@/features/admin/admin-release-artifact-manifest\";\nimport type { AdminReleaseChannelsReport } from \"@/features/admin/admin-release-channels\";\nimport type { AdminRollbackReadinessReport } from \"@/features/admin/admin-rollback-readiness\";\nimport type { ProductionDeploySmokeReport } from \"@/features/editor/production-deploy-smoke\";\n\nexport function getCurrentReleaseArchiveItems({\n  accessibilityPrivacyRelease,\n  desktopUpdateChannels,\n  latestApproval,\n  operatorRehearsals,\n  productionDeploySmoke,\n  releaseArtifactManifest,\n  releaseChannels,\n  retentionDays,\n  rollbackReadiness,\n}: {\n  accessibilityPrivacyRelease: AccessibilityPrivacyReleaseChecklist;\n  desktopUpdateChannels: AdminDesktopUpdateChannelReport;\n  latestApproval: AdminReleaseApprovalSnapshot | null;\n  operatorRehearsals: AdminOperatorRehearsalReport;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n  releaseChannels: AdminReleaseChannelsReport;\n  retentionDays: number;\n  rollbackReadiness: AdminRollbackReadinessReport;\n}): AdminReleaseArchiveItem[] {\n  const releaseLabel =\n    latestApproval?.releaseLabel ??\n    releaseChannels.packages[0]?.releaseLabel ??\n    \"Current release\";\n\n  return [\n    createArchiveItem({\n      id: `manifest-${releaseArtifactManifest.manifestId}`,\n      kind: \"manifest\",\n      status: releaseArtifactManifest.status,\n      label: \"Signed artifact manifest\",\n      releaseLabel,\n      createdAt: releaseArtifactManifest.generatedAt,\n      retentionUntil: addDays(releaseArtifactManifest.generatedAt, retentionDays),\n      searchableText: searchable(\n        releaseLabel,\n        releaseArtifactManifest.manifestId,\n        releaseArtifactManifest.checksum,\n        releaseArtifactManifest.signature,\n        \"signed manifest desktop web self-hosted offline vault support bundle\",\n      ),\n      summary: `${releaseArtifactManifest.artifactCount} artifacts, ${releaseArtifactManifest.signedArtifactCount} signed, ${releaseArtifactManifest.blockedArtifactCount} blocked.`,\n      recommendation:\n        \"Archive manifest JSON, CSV, checksum, and signature with each release record.\",\n      artifactCount: releaseArtifactManifest.artifactCount,\n      sourceId: releaseArtifactManifest.manifestId,\n    }),\n    createArchiveItem({\n      id: \"packages-release-channels\",\n      kind: \"package\",\n      status: releaseChannels.status,\n      label: \"Release channel packages\",\n      releaseLabel,\n      createdAt: releaseChannels.generatedAt,\n      retentionUntil: addDays(releaseChannels.generatedAt, retentionDays),\n      searchableText: searchable(\n        releaseLabel,\n        ...releaseChannels.packages.map(\n          (releasePackage) => releasePackage.packageName,\n        ),\n        \"web desktop self-hosted package release channels\",\n      ),\n      summary: `${releaseChannels.channelCount} channels, ${releaseChannels.artifactCount} artifacts, ${releaseChannels.commandCount} commands.`,\n      recommendation:\n        \"Keep web, desktop, and self-hosted package exports searchable by channel, version, and commit.\",\n      artifactCount: releaseChannels.artifactCount,\n      sourceId: \"release-channels\",\n    }),\n    createArchiveItem({\n      id: \"smoke-production-routes\",\n      kind: \"smoke\",\n      status: productionDeploySmoke.status,\n      label: \"Production smoke reports\",\n      releaseLabel,\n      createdAt: productionDeploySmoke.generatedAt,\n      retentionUntil: addDays(productionDeploySmoke.generatedAt, retentionDays),\n      searchableText: searchable(\n        releaseLabel,\n        productionDeploySmoke.baseUrl,\n        productionDeploySmoke.shareToken,\n        \"auth editor admin share prototype release handoff smoke\",\n      ),\n      summary: `${productionDeploySmoke.readyCount} ready, ${productionDeploySmoke.reviewCount} review, and ${productionDeploySmoke.blockedCount} blocked route checks.`,\n      recommendation:\n        \"Archive route-health JSON and Markdown beside the deployment URL and share token used for smoke checks.\",\n      artifactCount: productionDeploySmoke.rows.length,\n      sourceId: \"production-deploy-smoke\",\n    }),\n    createArchiveItem({\n      id: \"privacy-release-checklist\",\n      kind: \"privacy\",\n      status: accessibilityPrivacyRelease.status,\n      label: \"Privacy and accessibility checklist\",\n      releaseLabel,\n      createdAt: accessibilityPrivacyRelease.generatedAt,\n      retentionUntil: addDays(\n        accessibilityPrivacyRelease.generatedAt,\n        retentionDays,\n      ),\n      searchableText: searchable(\n        releaseLabel,\n        \"privacy accessibility editor admin share prototype checklist\",\n        accessibilityPrivacyRelease.score,\n      ),\n      summary: `${accessibilityPrivacyRelease.readyCount} ready, ${accessibilityPrivacyRelease.reviewCount} review, and ${accessibilityPrivacyRelease.blockedCount} blocked release checks.`,\n      recommendation:\n        \"Keep privacy and accessibility release exports searchable by surface and release score.\",\n      artifactCount: accessibilityPrivacyRelease.rows.length,\n      sourceId: \"accessibility-privacy-release\",\n    }),\n    createArchiveItem({\n      id: \"rollback-readiness-bundle\",\n      kind: \"rollback\",\n      status: rollbackReadiness.status,\n      label: \"Rollback readiness bundle\",\n      releaseLabel,\n      createdAt: rollbackReadiness.generatedAt,\n      retentionUntil: addDays(rollbackReadiness.generatedAt, retentionDays),\n      searchableText: searchable(\n        releaseLabel,\n        \"rollback restore versions shares database deployment\",\n        rollbackReadiness.deploymentUrls.join(\" \"),\n      ),\n      summary: `${rollbackReadiness.versionAnchorCount} version anchors, ${rollbackReadiness.deploymentLinkCount} deployment links, and ${rollbackReadiness.shareAuditEventCount} share audit events.`,\n      recommendation:\n        \"Archive rollback readiness with deployment links, share exposure, and version restore anchors.\",\n      artifactCount:\n        rollbackReadiness.rows.length + rollbackReadiness.latestVersions.length,\n      sourceId: \"rollback-readiness\",\n    }),\n    createArchiveItem({\n      id: \"operator-rehearsal-bundle\",\n      kind: \"operator-rehearsal\",\n      status: operatorRehearsals.status,\n      label: \"Operator rehearsal bundle\",\n      releaseLabel,\n      createdAt: operatorRehearsals.generatedAt,\n      retentionUntil: addDays(operatorRehearsals.generatedAt, retentionDays),\n      searchableText: searchable(\n        releaseLabel,\n        \"operator rehearsal restore import export share privacy desktop self-hosted\",\n      ),\n      summary: `${operatorRehearsals.runCount} drills, ${operatorRehearsals.stepCount} steps, and ${operatorRehearsals.commandCount} commands.`,\n      recommendation:\n        \"Archive rehearsal exports so future release operators can replay the exact handoff drill.\",\n      artifactCount: operatorRehearsals.stepCount,\n      sourceId: \"operator-rehearsals\",\n    }),\n    createArchiveItem({\n      id: \"desktop-update-channel-bundle\",\n      kind: \"desktop-update\",\n      status: desktopUpdateChannels.status,\n      label: \"Desktop update channel bundle\",\n      releaseLabel,\n      createdAt: desktopUpdateChannels.generatedAt,\n      retentionUntil: addDays(desktopUpdateChannels.generatedAt, retentionDays),\n      searchableText: searchable(\n        releaseLabel,\n        desktopUpdateChannels.activeChannel,\n        desktopUpdateChannels.currentVersion,\n        desktopUpdateChannels.targetVersion,\n        \"desktop update stable beta canary rollout hold\",\n      ),\n      summary: `${desktopUpdateChannels.packageCount} update channels, active ${desktopUpdateChannels.activeChannel}, rollout ${desktopUpdateChannels.rolloutPercent}%.`,\n      recommendation:\n        \"Archive desktop update-channel readiness before increasing rollout exposure.\",\n      artifactCount: desktopUpdateChannels.rows.length,\n      sourceId: \"desktop-update-channels\",\n    }),\n  ];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-archive-retention-current.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-archive-retention-current-ts-4ef09d74fef5db2d.mjs",
  "kind": "ts",
  "hash": "4ef09d74fef5db2d",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-release-archive-retention-core",
      "resolved_path": "src/features/admin/admin-release-archive-retention-core.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-archive-retention-core-ts-e5470a1e1adb5640.mjs",
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
    "source_path": "src/features/admin/admin-release-archive-retention-current.ts",
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
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-archive-retention-core",
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
      "getCurrentReleaseArchiveItems"
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
export const dxLinkedDependencies = Object.freeze([dep0]);
export default dxSourceModule;
