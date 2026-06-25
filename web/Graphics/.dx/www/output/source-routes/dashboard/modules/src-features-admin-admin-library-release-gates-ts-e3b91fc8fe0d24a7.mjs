import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-component-instance-review-ts-4669e9aae781b7e6.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-component-library-manifest-ts-444971281a505d23.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-editor-component-variable-coverage-ts-dfe8b461570365ce.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-editor-library-publish-readiness-ts-17559085fa982749.mjs";
export const dxSourceText = "import type { ComponentUsageAnalytics } from \"@/features/editor/component-analytics\";\nimport { getComponentInstanceReview } from \"@/features/editor/component-instance-review\";\nimport { getLocalLibraryStatus } from \"@/features/editor/component-library-manifest\";\nimport { getComponentVariableCoverageReport } from \"@/features/editor/component-variable-coverage\";\nimport {\n  getLibraryPublishReadiness,\n  type LibraryPublishReadinessStatus,\n} from \"@/features/editor/library-publish-readiness\";\nimport type { DesignDocument } from \"@/features/editor/types\";\nimport type { AdminReleaseApprovalSnapshot } from \"@/features/admin/admin-release-approval-snapshots\";\nimport type {\n  AdminRollbackReadinessReport,\n  AdminRollbackReadinessStatus,\n} from \"@/features/admin/admin-rollback-readiness\";\n\nexport type AdminLibraryReleaseGateStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type AdminLibraryReleaseGateCategory =\n  | \"components\"\n  | \"tokens\"\n  | \"approvals\"\n  | \"rollback\";\n\nexport type AdminLibraryReleaseGateRow = {\n  id: string;\n  status: AdminLibraryReleaseGateStatus;\n  category: AdminLibraryReleaseGateCategory;\n  label: string;\n  value: string;\n  detail: string;\n  recommendation: string;\n  target: string | null;\n};\n\nexport type AdminLibraryReleaseGateFile = {\n  fileId: string;\n  fileName: string;\n  ownerEmail: string;\n  componentCount: number;\n  readinessScore: number;\n  readinessStatus: AdminLibraryReleaseGateStatus;\n  readinessLabel: string;\n  readinessBlockedCount: number;\n  readinessReviewCount: number;\n  tokenCoveragePercent: number;\n  tokenBindablePropertyCount: number;\n  tokenBoundPropertyCount: number;\n  tokenMatchingRawPropertyCount: number;\n  pendingUpdateInstanceCount: number;\n  detachedInstanceCount: number;\n};\n\nexport type AdminLibraryReleaseGateReport = {\n  generatedAt: string;\n  status: AdminLibraryReleaseGateStatus;\n  score: number;\n  canRelease: boolean;\n  readyCount: number;\n  reviewCount: number;\n  blockedCount: number;\n  componentFileCount: number;\n  componentCount: number;\n  readyLibraryFileCount: number;\n  reviewLibraryFileCount: number;\n  blockedLibraryFileCount: number;\n  tokenCoveragePercent: number;\n  tokenBindablePropertyCount: number;\n  tokenBoundPropertyCount: number;\n  tokenMatchingRawPropertyCount: number;\n  releaseApprovalCount: number;\n  latestReleaseApprovalAt: string | null;\n  rollbackScore: number;\n  rows: AdminLibraryReleaseGateRow[];\n  files: AdminLibraryReleaseGateFile[];\n};\n\nexport type AdminLibraryReleaseGateFileInput = {\n  fileId: string;\n  fileName: string;\n  ownerEmail: string;\n  document: DesignDocument;\n};\n\nexport type AdminLibraryReleaseGateInput = {\n  files: AdminLibraryReleaseGateFileInput[];\n  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];\n  rollbackReadiness: AdminRollbackReadinessReport;\n  generatedAt?: string;\n};\n\nexport function getAdminLibraryReleaseGateReport({\n  files,\n  releaseApprovalSnapshots,\n  rollbackReadiness,\n  generatedAt = new Date().toISOString(),\n}: AdminLibraryReleaseGateInput): AdminLibraryReleaseGateReport {\n  const releaseFiles = files\n    .map(getLibraryFileGate)\n    .filter((file): file is AdminLibraryReleaseGateFile => Boolean(file))\n    .sort(sortLibraryFiles);\n  const rows = [\n    getComponentGateRow(releaseFiles),\n    getTokenGateRow(releaseFiles),\n    getApprovalGateRow(releaseApprovalSnapshots),\n    getRollbackGateRow(rollbackReadiness),\n  ];\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const status: AdminLibraryReleaseGateStatus =\n    blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\";\n  const tokenBindablePropertyCount = sum(\n    releaseFiles.map((file) => file.tokenBindablePropertyCount),\n  );\n  const tokenBoundPropertyCount = sum(\n    releaseFiles.map((file) => file.tokenBoundPropertyCount),\n  );\n\n  return {\n    generatedAt,\n    status,\n    score: Math.max(0, 100 - blockedCount * 25 - reviewCount * 10),\n    canRelease: status === \"ready\",\n    readyCount,\n    reviewCount,\n    blockedCount,\n    componentFileCount: releaseFiles.length,\n    componentCount: sum(releaseFiles.map((file) => file.componentCount)),\n    readyLibraryFileCount: releaseFiles.filter(\n      (file) => file.readinessStatus === \"ready\",\n    ).length,\n    reviewLibraryFileCount: releaseFiles.filter(\n      (file) => file.readinessStatus === \"review\",\n    ).length,\n    blockedLibraryFileCount: releaseFiles.filter(\n      (file) => file.readinessStatus === \"blocked\",\n    ).length,\n    tokenCoveragePercent: getPercent(\n      tokenBoundPropertyCount,\n      tokenBindablePropertyCount,\n    ),\n    tokenBindablePropertyCount,\n    tokenBoundPropertyCount,\n    tokenMatchingRawPropertyCount: sum(\n      releaseFiles.map((file) => file.tokenMatchingRawPropertyCount),\n    ),\n    releaseApprovalCount: releaseApprovalSnapshots.length,\n    latestReleaseApprovalAt: releaseApprovalSnapshots[0]?.createdAt ?? null,\n    rollbackScore: rollbackReadiness.score,\n    rows,\n    files: releaseFiles,\n  };\n}\n\nfunction getLibraryFileGate({\n  fileId,\n  fileName,\n  ownerEmail,\n  document,\n}: AdminLibraryReleaseGateFileInput): AdminLibraryReleaseGateFile | null {\n  const components = Object.values(document.components ?? {});\n\n  if (components.length === 0 && !document.libraryMetadata) {\n    return null;\n  }\n\n  const variableCoverage = getComponentVariableCoverageReport(\n    document,\n    components,\n  );\n  const instanceReview = getComponentInstanceReview(\n    components,\n    document.pages,\n    document.pendingLibraryComponentUpdates ?? {},\n  );\n  const publishReadiness = getLibraryPublishReadiness({\n    components,\n    analyticsByComponentId: {} as Record<string, ComponentUsageAnalytics>,\n    libraryMetadata: document.libraryMetadata,\n    libraryStatus: getLocalLibraryStatus(document),\n    instanceReview,\n    variableCoverage,\n  });\n\n  return {\n    fileId,\n    fileName,\n    ownerEmail,\n    componentCount: components.length,\n    readinessScore: publishReadiness.score,\n    readinessStatus: getReadinessGateStatus(\n      publishReadiness.blockedCount,\n      publishReadiness.reviewCount,\n    ),\n    readinessLabel: publishReadiness.label,\n    readinessBlockedCount: publishReadiness.blockedCount,\n    readinessReviewCount: publishReadiness.reviewCount,\n    tokenCoveragePercent: variableCoverage.coveragePercent,\n    tokenBindablePropertyCount: variableCoverage.bindablePropertyCount,\n    tokenBoundPropertyCount: variableCoverage.boundPropertyCount,\n    tokenMatchingRawPropertyCount: variableCoverage.matchingRawPropertyCount,\n    pendingUpdateInstanceCount: instanceReview.pendingUpdateInstanceCount,\n    detachedInstanceCount: instanceReview.detachedInstanceCount,\n  };\n}\n\nfunction getComponentGateRow(\n  files: AdminLibraryReleaseGateFile[],\n): AdminLibraryReleaseGateRow {\n  if (files.length === 0) {\n    return {\n      id: \"component-readiness-missing\",\n      status: \"blocked\",\n      category: \"components\",\n      label: \"Component readiness\",\n      value: \"No libraries\",\n      detail:\n        \"No files with component-library content were found in the loaded workspace window.\",\n      recommendation:\n        \"Create or load at least one component library file before approving an organization release.\",\n      target: null,\n    };\n  }\n\n  const blockedFiles = files.filter((file) => file.readinessStatus === \"blocked\");\n  const reviewFiles = files.filter((file) => file.readinessStatus === \"review\");\n  const readyFiles = files.filter((file) => file.readinessStatus === \"ready\");\n  const status: AdminLibraryReleaseGateStatus =\n    blockedFiles.length > 0\n      ? \"blocked\"\n      : reviewFiles.length > 0\n        ? \"review\"\n        : \"ready\";\n\n  return {\n    id: \"component-readiness\",\n    status,\n    category: \"components\",\n    label: \"Component readiness\",\n    value: `${readyFiles.length}/${files.length} ready`,\n    detail: `${readyFiles.length} ready, ${reviewFiles.length} review, and ${blockedFiles.length} blocked library file${files.length === 1 ? \"\" : \"s\"} across ${sum(files.map((file) => file.componentCount))} component${sum(files.map((file) => file.componentCount)) === 1 ? \"\" : \"s\"}.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Keep component readiness evidence attached to release approval exports.\"\n        : \"Resolve blocked publish-readiness items or add reviewer notes before release approval.\",\n    target: blockedFiles[0]?.fileName ?? reviewFiles[0]?.fileName ?? null,\n  };\n}\n\nfunction getTokenGateRow(\n  files: AdminLibraryReleaseGateFile[],\n): AdminLibraryReleaseGateRow {\n  const bindableCount = sum(\n    files.map((file) => file.tokenBindablePropertyCount),\n  );\n  const boundCount = sum(files.map((file) => file.tokenBoundPropertyCount));\n  const matchingRawCount = sum(\n    files.map((file) => file.tokenMatchingRawPropertyCount),\n  );\n  const coveragePercent = getPercent(boundCount, bindableCount);\n  const status = getTokenGateStatus({\n    componentFileCount: files.length,\n    bindableCount,\n    coveragePercent,\n    matchingRawCount,\n  });\n\n  return {\n    id: \"token-coverage\",\n    status,\n    category: \"tokens\",\n    label: \"Token coverage\",\n    value: `${coveragePercent}%`,\n    detail:\n      bindableCount === 0\n        ? \"Loaded library components do not expose variable-bindable visual properties.\"\n        : `${boundCount} of ${bindableCount} variable-bindable component properties are token-bound, with ${matchingRawCount} raw values matching existing variables.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Token coverage meets the organization release threshold.\"\n        : \"Bind component fills, strokes, typography, layout, and effect values to document variables before release.\",\n    target: files\n      .filter((file) => file.tokenCoveragePercent < 80)\n      .sort((first, second) => first.tokenCoveragePercent - second.tokenCoveragePercent)[0]\n      ?.fileName ?? null,\n  };\n}\n\nfunction getApprovalGateRow(\n  snapshots: AdminReleaseApprovalSnapshot[],\n): AdminLibraryReleaseGateRow {\n  const latest = snapshots[0];\n\n  if (!latest) {\n    return {\n      id: \"release-approval-missing\",\n      status: \"blocked\",\n      category: \"approvals\",\n      label: \"Release approval\",\n      value: \"Missing\",\n      detail:\n        \"No release approval snapshot has been recorded for the current production review window.\",\n      recommendation:\n        \"Save a release approval snapshot with commit, deployment URL, smoke artifacts, and rollback notes.\",\n      target: null,\n    };\n  }\n\n  const status = getApprovalStatus(latest);\n\n  return {\n    id: \"release-approval\",\n    status,\n    category: \"approvals\",\n    label: \"Release approval\",\n    value: `${snapshots.length} snapshot${snapshots.length === 1 ? \"\" : \"s\"}`,\n    detail: `${latest.releaseLabel} was approved by ${latest.reviewerEmail} with ${latest.smokeArtifacts.length} smoke artifact${latest.smokeArtifacts.length === 1 ? \"\" : \"s\"}.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Use the latest approval snapshot as the release audit anchor.\"\n        : \"Refresh the approval snapshot after preflight, incident, and smoke evidence are ready.\",\n    target: latest.deploymentUrl,\n  };\n}\n\nfunction getRollbackGateRow(\n  rollbackReadiness: AdminRollbackReadinessReport,\n): AdminLibraryReleaseGateRow {\n  const status = fromRollbackStatus(rollbackReadiness.status);\n\n  return {\n    id: \"rollback-evidence\",\n    status,\n    category: \"rollback\",\n    label: \"Rollback evidence\",\n    value: `${rollbackReadiness.score}`,\n    detail: `${rollbackReadiness.versionAnchorCount} version anchors, ${rollbackReadiness.staleShareCount} stale shares, ${rollbackReadiness.deploymentLinkCount} deployment links, and ${rollbackReadiness.database.activeFiles} active files are covered by rollback readiness.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Attach rollback readiness exports to the release approval packet.\"\n        : \"Resolve rollback blockers around versions, shares, database state, or deployment links before release.\",\n    target: rollbackReadiness.rows.find((row) => row.status !== \"ready\")?.label ??\n      rollbackReadiness.deploymentUrls[0] ??\n      null,\n  };\n}\n\nfunction getReadinessGateStatus(\n  blockedCount: number,\n  reviewCount: number,\n): AdminLibraryReleaseGateStatus {\n  if (blockedCount > 0) {\n    return \"blocked\";\n  }\n\n  if (reviewCount > 0) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getTokenGateStatus({\n  componentFileCount,\n  bindableCount,\n  coveragePercent,\n  matchingRawCount,\n}: {\n  componentFileCount: number;\n  bindableCount: number;\n  coveragePercent: number;\n  matchingRawCount: number;\n}): AdminLibraryReleaseGateStatus {\n  if (componentFileCount === 0) {\n    return \"blocked\";\n  }\n\n  if (bindableCount === 0 || coveragePercent >= 80) {\n    return \"ready\";\n  }\n\n  if (coveragePercent >= 40 || matchingRawCount > 0) {\n    return \"review\";\n  }\n\n  return \"blocked\";\n}\n\nfunction getApprovalStatus(\n  snapshot: AdminReleaseApprovalSnapshot,\n): AdminLibraryReleaseGateStatus {\n  if (\n    snapshot.preflightStatus === \"blocked\" ||\n    snapshot.incidentStatus === \"blocked\" ||\n    snapshot.smokeArtifacts.length === 0 ||\n    !snapshot.rollbackNotes.trim()\n  ) {\n    return \"blocked\";\n  }\n\n  if (snapshot.preflightStatus === \"review\" || snapshot.incidentStatus === \"review\") {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction fromRollbackStatus(\n  status: AdminRollbackReadinessStatus,\n): AdminLibraryReleaseGateStatus {\n  return status;\n}\n\nfunction sortLibraryFiles(\n  first: AdminLibraryReleaseGateFile,\n  second: AdminLibraryReleaseGateFile,\n) {\n  const statusDifference =\n    getStatusPriority(first.readinessStatus) -\n    getStatusPriority(second.readinessStatus);\n\n  if (statusDifference !== 0) {\n    return statusDifference;\n  }\n\n  return first.readinessScore - second.readinessScore ||\n    first.fileName.localeCompare(second.fileName);\n}\n\nfunction getStatusPriority(status: LibraryPublishReadinessStatus) {\n  if (status === \"blocked\") {\n    return 0;\n  }\n\n  if (status === \"review\") {\n    return 1;\n  }\n\n  return 2;\n}\n\nfunction getPercent(value: number, total: number) {\n  if (total === 0) {\n    return 100;\n  }\n\n  return Math.round((value / total) * 100);\n}\n\nfunction sum(values: number[]) {\n  return values.reduce((total, value) => total + value, 0);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-library-release-gates.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-library-release-gates-ts-e3b91fc8fe0d24a7.mjs",
  "kind": "ts",
  "hash": "e3b91fc8fe0d24a7",
  "dependencies": [
    {
      "specifier": "@/features/editor/component-instance-review",
      "resolved_path": "src/features/editor/component-instance-review.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-instance-review-ts-4669e9aae781b7e6.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/component-library-manifest",
      "resolved_path": "src/features/editor/component-library-manifest.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-library-manifest-ts-444971281a505d23.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/component-variable-coverage",
      "resolved_path": "src/features/editor/component-variable-coverage.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-variable-coverage-ts-dfe8b461570365ce.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/library-publish-readiness",
      "resolved_path": "src/features/editor/library-publish-readiness.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-library-publish-readiness-ts-17559085fa982749.mjs",
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
    "source_path": "src/features/admin/admin-library-release-gates.ts",
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
        "specifier": "@/features/editor/component-analytics",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/component-instance-review",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/component-library-manifest",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/component-variable-coverage",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/library-publish-readiness",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/types",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-approval-snapshots",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-rollback-readiness",
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
      "getAdminLibraryReleaseGateReport"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3]);
export default dxSourceModule;
