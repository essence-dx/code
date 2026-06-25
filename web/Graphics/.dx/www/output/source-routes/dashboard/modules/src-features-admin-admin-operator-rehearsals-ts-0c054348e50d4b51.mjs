import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-operator-rehearsal-core-ts-fa5f260ae178bc81.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-operator-rehearsal-package-runs-ts-31551611cc41d6a7.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-admin-admin-operator-rehearsal-release-runs-ts-6345e949e231589d.mjs";
export const dxSourceText = "import {\n  uniqueStrings,\n  type AdminOperatorRehearsalInput,\n  type AdminOperatorRehearsalReport,\n} from \"@/features/admin/admin-operator-rehearsal-core\";\nimport {\n  getDesktopHandoffRun,\n  getSelfHostedRecoveryRun,\n} from \"@/features/admin/admin-operator-rehearsal-package-runs\";\nimport {\n  getImportExportRun,\n  getPublicSharePrivacyRun,\n  getRestoreRun,\n} from \"@/features/admin/admin-operator-rehearsal-release-runs\";\n\nexport type {\n  AdminOperatorRehearsalInput,\n  AdminOperatorRehearsalKind,\n  AdminOperatorRehearsalReport,\n  AdminOperatorRehearsalRow,\n  AdminOperatorRehearsalRun,\n  AdminOperatorRehearsalStatus,\n  AdminOperatorRehearsalStep,\n} from \"@/features/admin/admin-operator-rehearsal-core\";\n\nexport function getAdminOperatorRehearsalReport({\n  accessibilityPrivacyRelease,\n  generatedAt = new Date().toISOString(),\n  productionDeploySmoke,\n  releaseArtifactManifest,\n  releaseChannels,\n  releaseIncidentTimeline,\n  retentionPrivacy,\n  rollbackReadiness,\n  selfHostedBackupReadiness,\n}: AdminOperatorRehearsalInput): AdminOperatorRehearsalReport {\n  const runs = [\n    getRestoreRun({\n      generatedAt,\n      productionDeploySmoke,\n      releaseArtifactManifest,\n      rollbackReadiness,\n    }),\n    getImportExportRun({\n      generatedAt,\n      productionDeploySmoke,\n      releaseArtifactManifest,\n    }),\n    getPublicSharePrivacyRun({\n      accessibilityPrivacyRelease,\n      generatedAt,\n      productionDeploySmoke,\n      releaseIncidentTimeline,\n      retentionPrivacy,\n      rollbackReadiness,\n    }),\n    getDesktopHandoffRun({\n      generatedAt,\n      releaseArtifactManifest,\n      releaseChannels,\n    }),\n    getSelfHostedRecoveryRun({\n      generatedAt,\n      productionDeploySmoke,\n      releaseArtifactManifest,\n      releaseChannels,\n      rollbackReadiness,\n      selfHostedBackupReadiness,\n    }),\n  ];\n  const rows = runs.flatMap((run) =>\n    run.steps.map((step) => ({\n      id: step.id,\n      runId: run.id,\n      runLabel: run.label,\n      kind: run.kind,\n      status: step.status,\n      label: step.label,\n      ownerRole: step.ownerRole,\n      evidence: step.evidence,\n      expectedResult: step.expectedResult,\n      command: step.command,\n    })),\n  );\n  const readyRunCount = runs.filter((run) => run.status === \"ready\").length;\n  const reviewRunCount = runs.filter((run) => run.status === \"review\").length;\n  const blockedRunCount = runs.filter((run) => run.status === \"blocked\").length;\n  const readyStepCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewStepCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedStepCount = rows.filter((row) => row.status === \"blocked\").length;\n  const commands = uniqueStrings(runs.flatMap((run) => run.commands));\n\n  return {\n    generatedAt,\n    status:\n      blockedRunCount > 0 ? \"blocked\" : reviewRunCount > 0 ? \"review\" : \"ready\",\n    score: Math.max(0, 100 - blockedRunCount * 18 - reviewRunCount * 6),\n    runCount: runs.length,\n    readyRunCount,\n    reviewRunCount,\n    blockedRunCount,\n    stepCount: rows.length,\n    readyStepCount,\n    reviewStepCount,\n    blockedStepCount,\n    commandCount: commands.length,\n    runs,\n    rows,\n    commands,\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-operator-rehearsals.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operator-rehearsals-ts-0c054348e50d4b51.mjs",
  "kind": "ts",
  "hash": "0c054348e50d4b51",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-operator-rehearsal-core",
      "resolved_path": "src/features/admin/admin-operator-rehearsal-core.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operator-rehearsal-core-ts-fa5f260ae178bc81.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-operator-rehearsal-package-runs",
      "resolved_path": "src/features/admin/admin-operator-rehearsal-package-runs.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operator-rehearsal-package-runs-ts-31551611cc41d6a7.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-operator-rehearsal-release-runs",
      "resolved_path": "src/features/admin/admin-operator-rehearsal-release-runs.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operator-rehearsal-release-runs-ts-6345e949e231589d.mjs",
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
    "source_path": "src/features/admin/admin-operator-rehearsals.ts",
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
        "specifier": "@/features/admin/admin-operator-rehearsal-package-runs",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-operator-rehearsal-release-runs",
        "side_effect_only": false,
        "type_only": false
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
      "getAdminOperatorRehearsalReport"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2]);
export default dxSourceModule;
