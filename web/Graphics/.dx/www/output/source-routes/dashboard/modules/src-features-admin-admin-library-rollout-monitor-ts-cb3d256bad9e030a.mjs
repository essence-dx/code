import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-library-rollout-monitor-analysis-ts-0ae85dcdbf2f4491.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-library-rollout-monitor-rows-ts-ddacf1467a817c36.mjs";
export const dxSourceText = "import {\n  getLatestLibraries,\n  getPercent,\n  getPublishedLibraries,\n  getRolloutFile,\n  getRolloutLibraries,\n  sortRolloutFiles,\n  sum,\n} from \"@/features/admin/admin-library-rollout-monitor-analysis\";\nimport {\n  getAvailableUpdatesRow,\n  getDetachedComponentsRow,\n  getReleaseAdoptionRow,\n  getSubscriptionCoverageRow,\n  getSubscriptionDriftRow,\n} from \"@/features/admin/admin-library-rollout-monitor-rows\";\nimport type { DesignDocument } from \"@/features/editor/types\";\n\nexport type AdminLibraryRolloutStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type AdminLibraryRolloutKind =\n  | \"adoption\"\n  | \"detached\"\n  | \"drift\"\n  | \"subscriptions\"\n  | \"updates\";\n\nexport type AdminLibraryRolloutRow = {\n  id: string;\n  status: AdminLibraryRolloutStatus;\n  kind: AdminLibraryRolloutKind;\n  label: string;\n  value: string;\n  detail: string;\n  recommendation: string;\n  target: string | null;\n  latestAt: string | null;\n};\n\nexport type AdminLibraryRolloutFile = {\n  fileId: string;\n  fileName: string;\n  ownerEmail: string;\n  publishedLibraryCount: number;\n  librarySubscriptionCount: number;\n  subscribedComponentCount: number;\n  subscribedInstanceCount: number;\n  updateAvailableComponentCount: number;\n  pendingUpdateInstanceCount: number;\n  detachedComponentCount: number;\n  detachedInstanceCount: number;\n  subscriptionDriftCount: number;\n  orphanSubscriptionCount: number;\n  adoptedLatestComponentCount: number;\n  releaseAdoptionPercent: number;\n  latestSubscriptionAt: string | null;\n  status: AdminLibraryRolloutStatus;\n};\n\nexport type AdminLibraryRolloutLibrary = {\n  libraryId: string;\n  libraryName: string;\n  teamName: string;\n  latestVersion: number;\n  publishedFileName: string | null;\n  subscribedFileCount: number;\n  subscribedComponentCount: number;\n  subscribedInstanceCount: number;\n  updateAvailableComponentCount: number;\n  pendingUpdateInstanceCount: number;\n  detachedComponentCount: number;\n  subscriptionDriftCount: number;\n  adoptedLatestComponentCount: number;\n  releaseAdoptionPercent: number;\n  latestActivityAt: string | null;\n  status: AdminLibraryRolloutStatus;\n};\n\nexport type AdminLibraryRolloutMonitorReport = {\n  generatedAt: string;\n  status: AdminLibraryRolloutStatus;\n  score: number;\n  readyCount: number;\n  reviewCount: number;\n  blockedCount: number;\n  publishedLibraryCount: number;\n  librarySubscriptionCount: number;\n  subscribedFileCount: number;\n  subscribedComponentCount: number;\n  subscribedInstanceCount: number;\n  updateAvailableComponentCount: number;\n  pendingUpdateInstanceCount: number;\n  detachedComponentCount: number;\n  detachedInstanceCount: number;\n  subscriptionDriftCount: number;\n  orphanSubscriptionCount: number;\n  adoptedLatestComponentCount: number;\n  releaseAdoptionPercent: number;\n  rows: AdminLibraryRolloutRow[];\n  libraries: AdminLibraryRolloutLibrary[];\n  files: AdminLibraryRolloutFile[];\n};\n\nexport type AdminLibraryRolloutFileInput = {\n  fileId: string;\n  fileName: string;\n  ownerEmail: string;\n  document: DesignDocument;\n};\n\nexport type AdminLibraryRolloutMonitorInput = {\n  files: AdminLibraryRolloutFileInput[];\n  generatedAt?: string;\n};\n\nexport function getAdminLibraryRolloutMonitorReport({\n  files,\n  generatedAt = new Date().toISOString(),\n}: AdminLibraryRolloutMonitorInput): AdminLibraryRolloutMonitorReport {\n  const publishedLibraries = getPublishedLibraries(files);\n  const latestLibraries = getLatestLibraries(publishedLibraries);\n  const rolloutFiles = files\n    .map((file) => getRolloutFile(file, latestLibraries))\n    .filter((file): file is AdminLibraryRolloutFile => Boolean(file))\n    .sort(sortRolloutFiles);\n  const rolloutLibraries = getRolloutLibraries({\n    files,\n    latestLibraries,\n  });\n  const rows = [\n    getSubscriptionCoverageRow({\n      rolloutLibraries,\n      rolloutFiles,\n      publishedLibraries,\n    }),\n    getSubscriptionDriftRow(rolloutFiles),\n    getAvailableUpdatesRow(rolloutFiles),\n    getDetachedComponentsRow(rolloutFiles),\n    getReleaseAdoptionRow({ rolloutFiles, publishedLibraries }),\n  ];\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const status: AdminLibraryRolloutStatus =\n    blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\";\n  const subscribedComponentCount = sum(\n    rolloutFiles.map((file) => file.subscribedComponentCount),\n  );\n  const adoptedLatestComponentCount = sum(\n    rolloutFiles.map((file) => file.adoptedLatestComponentCount),\n  );\n\n  return {\n    generatedAt,\n    status,\n    score: Math.max(0, 100 - blockedCount * 24 - reviewCount * 8),\n    readyCount,\n    reviewCount,\n    blockedCount,\n    publishedLibraryCount: publishedLibraries.length,\n    librarySubscriptionCount: sum(\n      rolloutFiles.map((file) => file.librarySubscriptionCount),\n    ),\n    subscribedFileCount: rolloutFiles.filter(\n      (file) =>\n        file.librarySubscriptionCount > 0 || file.subscribedComponentCount > 0,\n    ).length,\n    subscribedComponentCount,\n    subscribedInstanceCount: sum(\n      rolloutFiles.map((file) => file.subscribedInstanceCount),\n    ),\n    updateAvailableComponentCount: sum(\n      rolloutFiles.map((file) => file.updateAvailableComponentCount),\n    ),\n    pendingUpdateInstanceCount: sum(\n      rolloutFiles.map((file) => file.pendingUpdateInstanceCount),\n    ),\n    detachedComponentCount: sum(\n      rolloutFiles.map((file) => file.detachedComponentCount),\n    ),\n    detachedInstanceCount: sum(\n      rolloutFiles.map((file) => file.detachedInstanceCount),\n    ),\n    subscriptionDriftCount: sum(\n      rolloutFiles.map((file) => file.subscriptionDriftCount),\n    ),\n    orphanSubscriptionCount: sum(\n      rolloutFiles.map((file) => file.orphanSubscriptionCount),\n    ),\n    adoptedLatestComponentCount,\n    releaseAdoptionPercent: getPercent(\n      adoptedLatestComponentCount,\n      subscribedComponentCount,\n    ),\n    rows,\n    libraries: rolloutLibraries,\n    files: rolloutFiles,\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-library-rollout-monitor.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-library-rollout-monitor-ts-cb3d256bad9e030a.mjs",
  "kind": "ts",
  "hash": "cb3d256bad9e030a",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-library-rollout-monitor-analysis",
      "resolved_path": "src/features/admin/admin-library-rollout-monitor-analysis.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-library-rollout-monitor-analysis-ts-0ae85dcdbf2f4491.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-library-rollout-monitor-rows",
      "resolved_path": "src/features/admin/admin-library-rollout-monitor-rows.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-library-rollout-monitor-rows-ts-ddacf1467a817c36.mjs",
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
    "source_path": "src/features/admin/admin-library-rollout-monitor.ts",
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
        "specifier": "@/features/admin/admin-library-rollout-monitor-analysis",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-library-rollout-monitor-rows",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/types",
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
      "getAdminLibraryRolloutMonitorReport"
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
