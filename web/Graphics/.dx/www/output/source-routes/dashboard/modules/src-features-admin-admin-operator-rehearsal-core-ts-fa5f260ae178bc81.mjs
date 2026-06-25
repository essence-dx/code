
export const dxSourceText = "import type { AccessibilityPrivacyReleaseChecklist } from \"@/features/admin/admin-accessibility-privacy-release\";\nimport type { RetentionPrivacyReport } from \"@/features/admin/admin-retention-privacy\";\nimport type { AdminReleaseArtifactManifestReport } from \"@/features/admin/admin-release-artifact-manifest\";\nimport type {\n  AdminReleaseChannelKind,\n  AdminReleaseChannelsReport,\n} from \"@/features/admin/admin-release-channels\";\nimport type { AdminReleaseIncidentTimelineReport } from \"@/features/admin/admin-release-incident-timeline\";\nimport type { AdminRollbackReadinessReport } from \"@/features/admin/admin-rollback-readiness\";\nimport type { AdminSelfHostedBackupReadinessReport } from \"@/features/admin/admin-self-hosted-backup-readiness\";\nimport type {\n  ProductionDeploySmokeKind,\n  ProductionDeploySmokeReport,\n  ProductionDeploySmokeStatus,\n} from \"@/features/editor/production-deploy-smoke\";\n\nexport type AdminOperatorRehearsalKind =\n  | \"desktop-handoff\"\n  | \"import-export\"\n  | \"public-share-privacy\"\n  | \"restore\"\n  | \"self-hosted-recovery\";\n\nexport type AdminOperatorRehearsalStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type AdminOperatorRehearsalStep = {\n  id: string;\n  runId: string;\n  status: AdminOperatorRehearsalStatus;\n  label: string;\n  ownerRole: string;\n  evidence: string;\n  expectedResult: string;\n  command: string | null;\n  sourceId: string | null;\n};\n\nexport type AdminOperatorRehearsalRun = {\n  id: string;\n  kind: AdminOperatorRehearsalKind;\n  label: string;\n  objective: string;\n  cadence: string;\n  ownerRole: string;\n  status: AdminOperatorRehearsalStatus;\n  score: number;\n  lastEvidenceAt: string;\n  readyStepCount: number;\n  reviewStepCount: number;\n  blockedStepCount: number;\n  commandCount: number;\n  steps: AdminOperatorRehearsalStep[];\n  commands: string[];\n};\n\nexport type AdminOperatorRehearsalRow = {\n  id: string;\n  runId: string;\n  runLabel: string;\n  kind: AdminOperatorRehearsalKind;\n  status: AdminOperatorRehearsalStatus;\n  label: string;\n  ownerRole: string;\n  evidence: string;\n  expectedResult: string;\n  command: string | null;\n};\n\nexport type AdminOperatorRehearsalReport = {\n  generatedAt: string;\n  status: AdminOperatorRehearsalStatus;\n  score: number;\n  runCount: number;\n  readyRunCount: number;\n  reviewRunCount: number;\n  blockedRunCount: number;\n  stepCount: number;\n  readyStepCount: number;\n  reviewStepCount: number;\n  blockedStepCount: number;\n  commandCount: number;\n  runs: AdminOperatorRehearsalRun[];\n  rows: AdminOperatorRehearsalRow[];\n  commands: string[];\n};\n\nexport type AdminOperatorRehearsalInput = {\n  accessibilityPrivacyRelease: AccessibilityPrivacyReleaseChecklist;\n  generatedAt?: string;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n  releaseChannels: AdminReleaseChannelsReport;\n  releaseIncidentTimeline: AdminReleaseIncidentTimelineReport;\n  retentionPrivacy: RetentionPrivacyReport;\n  rollbackReadiness: AdminRollbackReadinessReport;\n  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;\n};\n\nexport function createRun({\n  cadence,\n  generatedAt,\n  id,\n  kind,\n  label,\n  objective,\n  ownerRole,\n  steps,\n}: {\n  cadence: string;\n  generatedAt: string;\n  id: string;\n  kind: AdminOperatorRehearsalKind;\n  label: string;\n  objective: string;\n  ownerRole: string;\n  steps: AdminOperatorRehearsalStep[];\n}): AdminOperatorRehearsalRun {\n  const readyStepCount = steps.filter((step) => step.status === \"ready\").length;\n  const reviewStepCount = steps.filter((step) => step.status === \"review\").length;\n  const blockedStepCount = steps.filter((step) => step.status === \"blocked\").length;\n  const commands = uniqueStrings(\n    steps.flatMap((step) => (step.command ? [step.command] : [])),\n  );\n\n  return {\n    id,\n    kind,\n    label,\n    objective,\n    cadence,\n    ownerRole,\n    status:\n      blockedStepCount > 0\n        ? \"blocked\"\n        : reviewStepCount > 0\n          ? \"review\"\n          : \"ready\",\n    score: Math.max(0, 100 - blockedStepCount * 20 - reviewStepCount * 7),\n    lastEvidenceAt: generatedAt,\n    readyStepCount,\n    reviewStepCount,\n    blockedStepCount,\n    commandCount: commands.length,\n    steps,\n    commands,\n  };\n}\n\nexport function createStep(input: AdminOperatorRehearsalStep) {\n  return input;\n}\n\nexport function findManifestArtifact(\n  report: AdminReleaseArtifactManifestReport,\n  kind: AdminReleaseArtifactManifestReport[\"artifacts\"][number][\"kind\"],\n) {\n  return report.artifacts.find((artifact) => artifact.kind === kind);\n}\n\nexport function findChannelPackage(\n  report: AdminReleaseChannelsReport,\n  channel: AdminReleaseChannelKind,\n) {\n  return report.packages.find((releasePackage) => releasePackage.channel === channel);\n}\n\nexport function findSmokeRows(\n  report: ProductionDeploySmokeReport,\n  kind: ProductionDeploySmokeKind,\n) {\n  return report.rows.filter((row) => row.kind === kind);\n}\n\nexport function getRowsStatus(\n  statuses: Array<AdminOperatorRehearsalStatus | ProductionDeploySmokeStatus>,\n): AdminOperatorRehearsalStatus {\n  if (statuses.length === 0) {\n    return \"review\";\n  }\n\n  if (statuses.includes(\"blocked\")) {\n    return \"blocked\";\n  }\n\n  return statuses.includes(\"review\") ? \"review\" : \"ready\";\n}\n\nexport function uniqueStrings(items: string[]) {\n  return Array.from(new Set(items.filter(Boolean)));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-operator-rehearsal-core.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operator-rehearsal-core-ts-fa5f260ae178bc81.mjs",
  "kind": "ts",
  "hash": "fa5f260ae178bc81",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-operator-rehearsal-core.ts",
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
        "specifier": "@/features/admin/admin-release-channels",
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
      "createRun",
      "createStep",
      "findManifestArtifact",
      "findChannelPackage",
      "findSmokeRows",
      "getRowsStatus",
      "uniqueStrings"
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
