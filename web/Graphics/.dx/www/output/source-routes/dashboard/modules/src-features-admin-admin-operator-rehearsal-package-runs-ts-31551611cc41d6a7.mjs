import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-operator-rehearsal-core-ts-fa5f260ae178bc81.mjs";
export const dxSourceText = "import {\n  createRun,\n  createStep,\n  findChannelPackage,\n  findManifestArtifact,\n  getRowsStatus,\n  type AdminOperatorRehearsalRun,\n} from \"@/features/admin/admin-operator-rehearsal-core\";\nimport type { AdminReleaseArtifactManifestReport } from \"@/features/admin/admin-release-artifact-manifest\";\nimport type { AdminReleaseChannelsReport } from \"@/features/admin/admin-release-channels\";\nimport type { AdminRollbackReadinessReport } from \"@/features/admin/admin-rollback-readiness\";\nimport type { AdminSelfHostedBackupReadinessReport } from \"@/features/admin/admin-self-hosted-backup-readiness\";\nimport type { ProductionDeploySmokeReport } from \"@/features/editor/production-deploy-smoke\";\n\nexport function getDesktopHandoffRun({\n  generatedAt,\n  releaseArtifactManifest,\n  releaseChannels,\n}: {\n  generatedAt: string;\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n  releaseChannels: AdminReleaseChannelsReport;\n}): AdminOperatorRehearsalRun {\n  const runId = \"desktop-package-handoff-drill\";\n  const desktopPackage = findChannelPackage(releaseChannels, \"desktop\");\n  const desktopArtifact = findManifestArtifact(releaseArtifactManifest, \"desktop\");\n  const staticExport = desktopPackage?.rows.find(\n    (row) => row.id === \"desktop-static-export\",\n  );\n  const bundleArtifacts = desktopPackage?.rows.find(\n    (row) => row.id === \"desktop-bundle-artifacts\",\n  );\n  const desktopApproval = desktopPackage?.rows.find(\n    (row) => row.id === \"desktop-approval\",\n  );\n  const desktopCommand = desktopPackage?.artifacts.find(\n    (artifact) => artifact.kind === \"command\" && artifact.label.includes(\"bundle\"),\n  );\n\n  return createRun({\n    cadence: \"Before desktop installer signing or handoff\",\n    generatedAt,\n    id: runId,\n    kind: \"desktop-handoff\",\n    label: \"Desktop package handoff drill\",\n    objective:\n      \"Confirm Tauri metadata, static export handoff, installer artifacts, and approval anchors are ready for desktop release operators.\",\n    ownerRole: \"Desktop release operator\",\n    steps: [\n      createStep({\n        command: desktopCommand?.value ?? \"bun run tauri:build\",\n        evidence:\n          desktopPackage?.rows\n            .map((row) => `${row.label}: ${row.detail}`)\n            .join(\" \") ?? \"Desktop release channel package is missing.\",\n        expectedResult:\n          \"Desktop package metadata and operator commands are visible in the release channel package.\",\n        id: \"desktop-handoff-channel-package\",\n        label: \"Review desktop release package\",\n        ownerRole: \"Desktop release operator\",\n        runId,\n        sourceId: desktopPackage?.channel ?? null,\n        status: desktopPackage?.status ?? \"blocked\",\n      }),\n      createStep({\n        command: \"Export signed release artifact manifest JSON.\",\n        evidence:\n          desktopArtifact?.detail ??\n          \"Desktop artifact is missing from signed release manifest.\",\n        expectedResult:\n          \"Desktop manifest artifact has checksum and signing evidence.\",\n        id: \"desktop-handoff-manifest-artifact\",\n        label: \"Verify desktop manifest artifact\",\n        ownerRole: \"Release manager\",\n        runId,\n        sourceId: desktopArtifact?.id ?? null,\n        status: desktopArtifact?.status ?? \"blocked\",\n      }),\n      createStep({\n        command: \"bun run build\",\n        evidence:\n          staticExport?.detail ?? \"Static export readiness row is unavailable.\",\n        expectedResult:\n          \"Next.js static export output is configured for the Tauri frontendDist handoff.\",\n        id: \"desktop-handoff-static-export\",\n        label: \"Confirm static export handoff\",\n        ownerRole: \"Desktop release operator\",\n        runId,\n        sourceId: staticExport?.id ?? null,\n        status: staticExport?.status ?? \"review\",\n      }),\n      createStep({\n        command: desktopCommand?.value ?? \"bun run tauri:build\",\n        evidence:\n          bundleArtifacts?.detail ??\n          \"Installer bundle artifact row is unavailable.\",\n        expectedResult:\n          \"Bundle targets and icons are ready for platform installer creation.\",\n        id: \"desktop-handoff-bundle-artifacts\",\n        label: \"Check installer bundle artifacts\",\n        ownerRole: \"Desktop release operator\",\n        runId,\n        sourceId: bundleArtifacts?.id ?? null,\n        status: bundleArtifacts?.status ?? \"review\",\n      }),\n      createStep({\n        command:\n          \"Save Admin > Release approval snapshot after desktop bundle verification.\",\n        evidence:\n          desktopApproval?.detail ??\n          \"Desktop approval anchor is missing from release channel rows.\",\n        expectedResult:\n          \"The desktop package has a release approval snapshot tied to commit and deployment evidence.\",\n        id: \"desktop-handoff-approval-anchor\",\n        label: \"Verify desktop approval anchor\",\n        ownerRole: \"Release manager\",\n        runId,\n        sourceId: desktopApproval?.id ?? null,\n        status: desktopApproval?.status ?? \"review\",\n      }),\n    ],\n  });\n}\n\nexport function getSelfHostedRecoveryRun({\n  generatedAt,\n  productionDeploySmoke,\n  releaseArtifactManifest,\n  releaseChannels,\n  rollbackReadiness,\n  selfHostedBackupReadiness,\n}: {\n  generatedAt: string;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n  releaseChannels: AdminReleaseChannelsReport;\n  rollbackReadiness: AdminRollbackReadinessReport;\n  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;\n}): AdminOperatorRehearsalRun {\n  const runId = \"self-hosted-recovery-drill\";\n  const selfHostedPackage = findChannelPackage(releaseChannels, \"self-hosted\");\n  const selfHostedArtifact = findManifestArtifact(\n    releaseArtifactManifest,\n    \"self-hosted\",\n  );\n  const backupRow = selfHostedBackupReadiness.rows.find(\n    (row) => row.kind === \"schedule\",\n  );\n  const smokeRows = productionDeploySmoke.rows.filter((row) => row.required);\n\n  return createRun({\n    cadence: \"Monthly and before self-hosted package publication\",\n    generatedAt,\n    id: runId,\n    kind: \"self-hosted-recovery\",\n    label: \"Self-hosted recovery drill\",\n    objective:\n      \"Confirm backup schedule, restore commands, package metadata, route smoke, and rollback evidence are ready for self-hosted operators.\",\n    ownerRole: \"Self-hosted operator\",\n    steps: [\n      createStep({\n        command:\n          selfHostedBackupReadiness.commands[0] ??\n          \"Export Admin > Governance self-hosted backup readiness.\",\n        evidence:\n          backupRow?.detail ??\n          \"Self-hosted backup schedule evidence is unavailable.\",\n        expectedResult:\n          \"Backup cadence, destination, and runnable restore command are documented.\",\n        id: \"self-hosted-recovery-backup-command\",\n        label: \"Run backup and restore command review\",\n        ownerRole: \"Self-hosted operator\",\n        runId,\n        sourceId: backupRow?.id ?? null,\n        status: backupRow?.status ?? selfHostedBackupReadiness.status,\n      }),\n      createStep({\n        command:\n          selfHostedPackage?.artifacts.find(\n            (artifact) => artifact.kind === \"command\",\n          )?.value ?? selfHostedBackupReadiness.commands[0] ?? null,\n        evidence:\n          selfHostedPackage?.rows\n            .map((row) => `${row.label}: ${row.detail}`)\n            .join(\" \") ?? \"Self-hosted release package is missing.\",\n        expectedResult:\n          \"Self-hosted package includes backup, smoke, rollback, approval, and deployment evidence.\",\n        id: \"self-hosted-recovery-channel-package\",\n        label: \"Review self-hosted package\",\n        ownerRole: \"Self-hosted operator\",\n        runId,\n        sourceId: selfHostedPackage?.channel ?? null,\n        status: selfHostedPackage?.status ?? \"blocked\",\n      }),\n      createStep({\n        command: \"Export signed release artifact manifest JSON.\",\n        evidence:\n          selfHostedArtifact?.detail ??\n          \"Self-hosted artifact is missing from signed release manifest.\",\n        expectedResult:\n          \"Self-hosted manifest artifact is archived with checksum and package metadata.\",\n        id: \"self-hosted-recovery-manifest-artifact\",\n        label: \"Verify self-hosted manifest artifact\",\n        ownerRole: \"Release manager\",\n        runId,\n        sourceId: selfHostedArtifact?.id ?? null,\n        status: selfHostedArtifact?.status ?? \"blocked\",\n      }),\n      createStep({\n        command: productionDeploySmoke.commands[2] ?? null,\n        evidence: `${productionDeploySmoke.requiredRouteCount} required routes are registered for recovery smoke coverage.`,\n        expectedResult:\n          \"Required auth, editor, admin, share, prototype, and release handoff routes are exercised after recovery.\",\n        id: \"self-hosted-recovery-route-smoke\",\n        label: \"Run required route smoke\",\n        ownerRole: \"Self-hosted operator\",\n        runId,\n        sourceId: \"required-production-smoke\",\n        status: getRowsStatus(smokeRows.map((row) => row.status)),\n      }),\n      createStep({\n        command: \"Export Admin > Release rollback readiness Markdown.\",\n        evidence: `${rollbackReadiness.versionAnchorCount} version anchors, ${rollbackReadiness.deploymentLinkCount} deployment links, and ${rollbackReadiness.shareAuditEventCount} share audit events are available.`,\n        expectedResult:\n          \"Recovered self-hosted workspace has design-file versions, public share review, and deployment rollback evidence.\",\n        id: \"self-hosted-recovery-rollback-evidence\",\n        label: \"Compare rollback readiness\",\n        ownerRole: \"Release operator\",\n        runId,\n        sourceId: \"rollback-readiness\",\n        status: rollbackReadiness.status,\n      }),\n    ],\n  });\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-operator-rehearsal-package-runs.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operator-rehearsal-package-runs-ts-31551611cc41d6a7.mjs",
  "kind": "ts",
  "hash": "31551611cc41d6a7",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-operator-rehearsal-core",
      "resolved_path": "src/features/admin/admin-operator-rehearsal-core.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operator-rehearsal-core-ts-fa5f260ae178bc81.mjs",
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
    "source_path": "src/features/admin/admin-operator-rehearsal-package-runs.ts",
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
        "specifier": "@/features/admin/admin-operator-rehearsal-core",
        "side_effect_only": false,
        "type_only": false
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
        "specifier": "@/features/admin/admin-self-hosted-backup-readiness",
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
      "getDesktopHandoffRun",
      "getSelfHostedRecoveryRun"
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
