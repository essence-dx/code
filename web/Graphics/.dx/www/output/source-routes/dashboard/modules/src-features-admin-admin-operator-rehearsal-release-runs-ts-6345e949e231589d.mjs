import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-operator-rehearsal-core-ts-fa5f260ae178bc81.mjs";
export const dxSourceText = "import type { AccessibilityPrivacyReleaseChecklist } from \"@/features/admin/admin-accessibility-privacy-release\";\nimport {\n  createRun,\n  createStep,\n  findManifestArtifact,\n  findSmokeRows,\n  getRowsStatus,\n  type AdminOperatorRehearsalRun,\n} from \"@/features/admin/admin-operator-rehearsal-core\";\nimport type { RetentionPrivacyReport } from \"@/features/admin/admin-retention-privacy\";\nimport type { AdminReleaseArtifactManifestReport } from \"@/features/admin/admin-release-artifact-manifest\";\nimport type { AdminReleaseIncidentTimelineReport } from \"@/features/admin/admin-release-incident-timeline\";\nimport type { AdminRollbackReadinessReport } from \"@/features/admin/admin-rollback-readiness\";\nimport type { ProductionDeploySmokeReport } from \"@/features/editor/production-deploy-smoke\";\n\nexport function getRestoreRun({\n  generatedAt,\n  productionDeploySmoke,\n  releaseArtifactManifest,\n  rollbackReadiness,\n}: {\n  generatedAt: string;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n  rollbackReadiness: AdminRollbackReadinessReport;\n}): AdminOperatorRehearsalRun {\n  const runId = \"restore-drill\";\n  const databaseRow = rollbackReadiness.rows.find(\n    (row) => row.category === \"database\",\n  );\n  const versionRow = rollbackReadiness.rows.find(\n    (row) => row.category === \"versions\",\n  );\n  const deploymentRow = rollbackReadiness.rows.find(\n    (row) => row.category === \"deployment\",\n  );\n  const manifestRow = releaseArtifactManifest.rows.find(\n    (row) => row.id === \"release-manifest-signature-coverage\",\n  );\n\n  return createRun({\n    cadence: \"Every production release and before risky migrations\",\n    generatedAt,\n    id: runId,\n    kind: \"restore\",\n    label: \"Restore drill\",\n    objective:\n      \"Prove operators can restore database state, named design-file versions, and deployment links from release evidence.\",\n    ownerRole: \"Release operator\",\n    steps: [\n      createStep({\n        command: \"Export Admin > Release rollback readiness JSON.\",\n        evidence: databaseRow?.detail ?? \"Rollback database evidence is missing.\",\n        expectedResult:\n          \"Database kind, auth readiness, and active workspace counts are visible before restore.\",\n        id: \"restore-database-state\",\n        label: \"Confirm database restore source\",\n        ownerRole: \"Release operator\",\n        runId,\n        sourceId: databaseRow?.id ?? null,\n        status: databaseRow?.status ?? \"review\",\n      }),\n      createStep({\n        command: \"Export Admin > Release rollback readiness Markdown.\",\n        evidence: versionRow?.detail ?? \"Version restore anchor evidence is missing.\",\n        expectedResult:\n          \"Release-critical files have named version anchors or documented exclusions.\",\n        id: \"restore-version-anchors\",\n        label: \"Verify named version anchors\",\n        ownerRole: \"Design systems lead\",\n        runId,\n        sourceId: versionRow?.id ?? null,\n        status: versionRow?.status ?? \"review\",\n      }),\n      createStep({\n        command: productionDeploySmoke.commands[2] ?? null,\n        evidence:\n          deploymentRow?.detail ?? \"Deployment URL evidence is not configured.\",\n        expectedResult:\n          \"The active deployment URL is available for route probes and rollback comparison.\",\n        id: \"restore-deployment-link\",\n        label: \"Probe deployment rollback target\",\n        ownerRole: \"Release operator\",\n        runId,\n        sourceId: deploymentRow?.id ?? null,\n        status: deploymentRow?.status ?? \"review\",\n      }),\n      createStep({\n        command: \"Export signed release artifact manifest JSON.\",\n        evidence:\n          manifestRow?.detail ??\n          `${releaseArtifactManifest.artifactCount} artifacts are listed in the release manifest.`,\n        expectedResult:\n          \"Checksums and signatures can be archived beside restore evidence.\",\n        id: \"restore-manifest-signature\",\n        label: \"Archive signed manifest evidence\",\n        ownerRole: \"Release manager\",\n        runId,\n        sourceId: manifestRow?.id ?? releaseArtifactManifest.manifestId,\n        status: manifestRow?.status ?? releaseArtifactManifest.status,\n      }),\n    ],\n  });\n}\n\nexport function getImportExportRun({\n  generatedAt,\n  productionDeploySmoke,\n  releaseArtifactManifest,\n}: {\n  generatedAt: string;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n}): AdminOperatorRehearsalRun {\n  const runId = \"import-export-drill\";\n  const offlineVault = findManifestArtifact(\n    releaseArtifactManifest,\n    \"offline-vault\",\n  );\n  const supportBundle = findManifestArtifact(\n    releaseArtifactManifest,\n    \"support-bundle\",\n  );\n  const handoffSmoke = findSmokeRows(productionDeploySmoke, \"release-handoff\");\n  const manifestCoverage = releaseArtifactManifest.rows.find(\n    (row) => row.id === \"release-manifest-artifact-coverage\",\n  );\n\n  return createRun({\n    cadence: \"Before release handoff and before support bundle sharing\",\n    generatedAt,\n    id: runId,\n    kind: \"import-export\",\n    label: \"Import and export drill\",\n    objective:\n      \"Confirm offline vault, support bundle, and handoff exports can be generated, validated, and attached to release records.\",\n    ownerRole: \"Support lead\",\n    steps: [\n      createStep({\n        command: \"Export Admin > Support offline vault JSON.\",\n        evidence:\n          offlineVault?.detail ?? \"Offline vault package is absent from manifest.\",\n        expectedResult:\n          \"Offline vault payload has a checksum and includes design files, support evidence, and backup snapshots.\",\n        id: \"import-export-offline-vault\",\n        label: \"Export offline vault package\",\n        ownerRole: \"Support lead\",\n        runId,\n        sourceId: offlineVault?.id ?? null,\n        status: offlineVault?.status ?? \"blocked\",\n      }),\n      createStep({\n        command: \"Export Admin > Support bundle JSON.\",\n        evidence:\n          supportBundle?.detail ??\n          \"Support bundle package is absent from manifest.\",\n        expectedResult:\n          \"Support bundle can be exported with scoped users, files, shares, sessions, audit rows, and privacy settings.\",\n        id: \"import-export-support-bundle\",\n        label: \"Export support bundle\",\n        ownerRole: \"Support lead\",\n        runId,\n        sourceId: supportBundle?.id ?? null,\n        status: supportBundle?.status ?? \"blocked\",\n      }),\n      createStep({\n        command:\n          handoffSmoke[0]?.command ??\n          \"Export JSON and Handoff from the Extensions production panels.\",\n        evidence:\n          handoffSmoke[0]?.detail ??\n          \"Release handoff smoke coverage is not registered.\",\n        expectedResult:\n          \"Release handoff exports include performance, runtime, baseline, collaboration, and deploy-smoke evidence.\",\n        id: \"import-export-release-handoff\",\n        label: \"Exercise release handoff exports\",\n        ownerRole: \"Release manager\",\n        runId,\n        sourceId: handoffSmoke[0]?.id ?? null,\n        status: getRowsStatus(handoffSmoke.map((row) => row.status)),\n      }),\n      createStep({\n        command: \"Export signed release artifact manifest CSV.\",\n        evidence:\n          manifestCoverage?.detail ??\n          `${releaseArtifactManifest.artifactCount} manifest artifacts are present.`,\n        expectedResult:\n          \"All web, desktop, self-hosted, offline vault, and support bundle artifacts are listed before handoff.\",\n        id: \"import-export-manifest-coverage\",\n        label: \"Verify manifest coverage\",\n        ownerRole: \"Release manager\",\n        runId,\n        sourceId: manifestCoverage?.id ?? releaseArtifactManifest.manifestId,\n        status: manifestCoverage?.status ?? releaseArtifactManifest.status,\n      }),\n    ],\n  });\n}\n\nexport function getPublicSharePrivacyRun({\n  accessibilityPrivacyRelease,\n  generatedAt,\n  productionDeploySmoke,\n  releaseIncidentTimeline,\n  retentionPrivacy,\n  rollbackReadiness,\n}: {\n  accessibilityPrivacyRelease: AccessibilityPrivacyReleaseChecklist;\n  generatedAt: string;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  releaseIncidentTimeline: AdminReleaseIncidentTimelineReport;\n  retentionPrivacy: RetentionPrivacyReport;\n  rollbackReadiness: AdminRollbackReadinessReport;\n}): AdminOperatorRehearsalRun {\n  const runId = \"public-share-privacy-drill\";\n  const shareSmoke = findSmokeRows(productionDeploySmoke, \"share\");\n  const shareRows = accessibilityPrivacyRelease.rows.filter(\n    (row) => row.surface === \"share\",\n  );\n  const shareExposure = rollbackReadiness.rows.find(\n    (row) => row.category === \"shares\",\n  );\n  const shareCorrelation = releaseIncidentTimeline.correlations.find(\n    (correlation) => correlation.id === \"rollback-share-correlation\",\n  );\n\n  return createRun({\n    cadence: \"Before enabling public links after any restore or deploy\",\n    generatedAt,\n    id: runId,\n    kind: \"public-share-privacy\",\n    label: \"Public share privacy drill\",\n    objective:\n      \"Confirm public shares render without admin leakage, risky links are reviewable, and support evidence is redacted.\",\n    ownerRole: \"Privacy reviewer\",\n    steps: [\n      createStep({\n        command: shareSmoke[0]?.command ?? productionDeploySmoke.commands[2] ?? null,\n        evidence:\n          shareSmoke[0]?.detail ?? \"Public share route smoke is not registered.\",\n        expectedResult:\n          \"A public share loads without authenticated controls or admin-only data.\",\n        id: \"share-privacy-route-smoke\",\n        label: \"Probe public share route\",\n        ownerRole: \"Privacy reviewer\",\n        runId,\n        sourceId: shareSmoke[0]?.id ?? null,\n        status: getRowsStatus(shareSmoke.map((row) => row.status)),\n      }),\n      createStep({\n        command: \"Export Admin > Release accessibility and privacy checklist.\",\n        evidence:\n          shareRows.map((row) => `${row.label}: ${row.detail}`).join(\" \") ||\n          \"Share privacy release rows are not available.\",\n        expectedResult:\n          \"Share and support evidence privacy checks are visible with public route smoke evidence.\",\n        id: \"share-privacy-release-checklist\",\n        label: \"Review share privacy checklist\",\n        ownerRole: \"Privacy reviewer\",\n        runId,\n        sourceId: shareRows[0]?.id ?? null,\n        status: getRowsStatus(shareRows.map((row) => row.status)),\n      }),\n      createStep({\n        command: \"Export Admin > Release rollback readiness CSV.\",\n        evidence:\n          shareExposure?.detail ??\n          \"Share exposure evidence is missing from rollback readiness.\",\n        expectedResult:\n          \"Stale and elevated links are reviewed before restore or release.\",\n        id: \"share-privacy-exposure-review\",\n        label: \"Review public link exposure\",\n        ownerRole: \"Release operator\",\n        runId,\n        sourceId: shareExposure?.id ?? null,\n        status: shareExposure?.status ?? \"review\",\n      }),\n      createStep({\n        command: \"Export Admin > Governance retention privacy Markdown.\",\n        evidence: retentionPrivacy.supportBundleRedactionEnabled\n          ? `Support bundle privacy mode is ${retentionPrivacy.settings.supportBundlePrivacyMode}.`\n          : \"Support bundle redaction is disabled.\",\n        expectedResult:\n          \"Support evidence uses redacted or minimal mode before public-link diagnostics leave the workspace.\",\n        id: \"share-privacy-support-redaction\",\n        label: \"Confirm support evidence redaction\",\n        ownerRole: \"Support lead\",\n        runId,\n        sourceId: \"retention-privacy-support-redaction\",\n        status: retentionPrivacy.supportBundleRedactionEnabled ? \"ready\" : \"review\",\n      }),\n      createStep({\n        command: \"Export Admin > Release incident timeline Markdown.\",\n        evidence:\n          shareCorrelation?.detail ??\n          \"Rollback and share correlation evidence is unavailable.\",\n        expectedResult:\n          \"Share exposure and rollback evidence are correlated in the release incident timeline.\",\n        id: \"share-privacy-timeline-correlation\",\n        label: \"Check share timeline correlation\",\n        ownerRole: \"Release manager\",\n        runId,\n        sourceId: shareCorrelation?.id ?? null,\n        status: shareCorrelation?.status ?? releaseIncidentTimeline.status,\n      }),\n    ],\n  });\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-operator-rehearsal-release-runs.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operator-rehearsal-release-runs-ts-6345e949e231589d.mjs",
  "kind": "ts",
  "hash": "6345e949e231589d",
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
    "source_path": "src/features/admin/admin-operator-rehearsal-release-runs.ts",
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
        "specifier": "@/features/admin/admin-operator-rehearsal-core",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-retention-privacy",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-artifact-manifest",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-incident-timeline",
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
      "getRestoreRun",
      "getImportExportRun",
      "getPublicSharePrivacyRun"
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
