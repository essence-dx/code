import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-workspace-operations-rows-ts-d4122855166854ae.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-workspace-operations-utils-ts-d690ef4b2a2e106a.mjs";
export const dxSourceText = "import {\n  getAdminActionQueueRow,\n  getAutomationRunRow,\n  getDatabaseHealthRow,\n  getDeploySmokeRow,\n  getEmailDeliveryRow,\n  getOperationsCommands,\n  getStorageBudgetRow,\n  getStorageVersionRow,\n} from \"@/features/admin/admin-workspace-operations-rows\";\nimport type {\n  AdminWorkspaceOperationsInput,\n  AdminWorkspaceOperationsMetric,\n  AdminWorkspaceOperationsReport,\n} from \"@/features/admin/admin-workspace-operations-types\";\nimport {\n  DEFAULT_WORKSPACE_OPERATIONS_STORAGE_BUDGET_BYTES,\n  formatWorkspaceOperationsBytes,\n  getAgeHours,\n  getDocumentByteSize,\n  getLatestDate,\n  getWorstStatus,\n  isRecent,\n} from \"@/features/admin/admin-workspace-operations-utils\";\n\nexport type {\n  AdminWorkspaceOperationsCategory,\n  AdminWorkspaceOperationsInput,\n  AdminWorkspaceOperationsMetric,\n  AdminWorkspaceOperationsReport,\n  AdminWorkspaceOperationsRow,\n  AdminWorkspaceOperationsStatus,\n  WorkspaceOperationsAuditEvent,\n  WorkspaceOperationsFile,\n  WorkspaceOperationsNotification,\n} from \"@/features/admin/admin-workspace-operations-types\";\n\nexport function getAdminWorkspaceOperationsReport({\n  auditEvents,\n  database,\n  deployEnvironmentPreflight,\n  files,\n  generatedAt = new Date().toISOString(),\n  notificationDeliveries,\n  notificationDigestSubscriptions,\n  now = Date.now(),\n  operatorRehearsals,\n  productionDeploySmoke,\n  productionMonitoringDigest,\n  releaseApprovalSnapshots,\n  roleChangeApprovals,\n  rollbackReadiness,\n  storageBudgetBytes = DEFAULT_WORKSPACE_OPERATIONS_STORAGE_BUDGET_BYTES,\n}: AdminWorkspaceOperationsInput): AdminWorkspaceOperationsReport {\n  const activeFiles = files.filter((file) => !file.trashedAt);\n  const trashedFiles = files.filter((file) => file.trashedAt);\n  const storageUsedBytes = files.reduce(\n    (total, file) => total + getDocumentByteSize(file.document),\n    0,\n  );\n  const safeStorageBudgetBytes = Math.max(1, storageBudgetBytes);\n  const storageUsedPercent = Math.round(\n    (storageUsedBytes / safeStorageBudgetBytes) * 100,\n  );\n  const failedEmailDeliveries = notificationDeliveries.filter(\n    (delivery) => delivery.status === \"failed\",\n  );\n  const latestDeliveryAt = getLatestDate(\n    notificationDeliveries.map((delivery) => delivery.createdAt),\n  );\n  const latestApproval = releaseApprovalSnapshots[0] ?? null;\n  const deploySmokeAgeHours = latestApproval\n    ? getAgeHours(latestApproval.createdAt, now)\n    : null;\n  const recentAdminActions = auditEvents.filter((event) =>\n    isRecent(event.createdAt, now, 7),\n  );\n  const automationReviewCount =\n    operatorRehearsals.reviewRunCount + operatorRehearsals.blockedRunCount;\n  const adminActionQueueCount =\n    roleChangeApprovals.pendingCount +\n    notificationDigestSubscriptions.unroutedActiveSignalCount +\n    productionMonitoringDigest.blockedCount +\n    productionMonitoringDigest.reviewCount;\n  const rows = [\n    getStorageBudgetRow({\n      activeFileCount: activeFiles.length,\n      budgetBytes: safeStorageBudgetBytes,\n      storageUsedBytes,\n      storageUsedPercent,\n      trashedFileCount: trashedFiles.length,\n    }),\n    getStorageVersionRow({\n      activeFileCount: activeFiles.length,\n      rollbackReadiness,\n    }),\n    getDatabaseHealthRow({\n      database,\n      deployEnvironmentPreflight,\n    }),\n    getEmailDeliveryRow({\n      deployEnvironmentPreflight,\n      failedEmailDeliveries,\n      latestDeliveryAt,\n      notificationDeliveries,\n      notificationDigestSubscriptions,\n    }),\n    getDeploySmokeRow({\n      deploySmokeAgeHours,\n      latestApproval,\n      productionDeploySmoke,\n    }),\n    getAutomationRunRow({\n      operatorRehearsals,\n    }),\n    getAdminActionQueueRow({\n      adminActionQueueCount,\n      notificationDigestSubscriptions,\n      productionMonitoringDigest,\n      recentAdminActions,\n      roleChangeApprovals,\n    }),\n  ];\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const status = getWorstStatus(\n    rows.map((row) => row.status),\n    \"ready\",\n  );\n  const databaseStatus =\n    rows.find((row) => row.id === \"database-health\")?.status ?? \"review\";\n\n  return {\n    generatedAt,\n    status,\n    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),\n    storageBudgetBytes: safeStorageBudgetBytes,\n    storageUsedBytes,\n    storageUsedPercent,\n    activeFileCount: activeFiles.length,\n    trashedFileCount: trashedFiles.length,\n    versionCount: database.versions,\n    databaseKind: database.databaseKind,\n    databaseStatus,\n    failedEmailDeliveryCount: failedEmailDeliveries.length,\n    deploySmokeAgeHours,\n    automationReviewCount,\n    adminActionQueueCount,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    metrics: getWorkspaceOperationsMetrics({\n      adminActionQueueCount,\n      automationReviewCount,\n      databaseStatus,\n      failedEmailDeliveryCount: failedEmailDeliveries.length,\n      productionDeploySmoke,\n      recentAdminActionCount: recentAdminActions.length,\n      reportRows: rows,\n      storageBudgetBytes: safeStorageBudgetBytes,\n      storageUsedBytes,\n      storageUsedPercent,\n      database,\n      deploySmokeAgeHours,\n      notificationDeliveryCount: notificationDeliveries.length,\n      operatorRunCount: operatorRehearsals.runCount,\n    }),\n    rows,\n    commands: getOperationsCommands({\n      deployEnvironmentPreflight,\n      operatorRehearsals,\n      productionDeploySmoke,\n    }),\n  };\n}\n\nfunction getWorkspaceOperationsMetrics({\n  adminActionQueueCount,\n  automationReviewCount,\n  database,\n  databaseStatus,\n  deploySmokeAgeHours,\n  failedEmailDeliveryCount,\n  notificationDeliveryCount,\n  operatorRunCount,\n  productionDeploySmoke,\n  recentAdminActionCount,\n  reportRows,\n  storageBudgetBytes,\n  storageUsedBytes,\n  storageUsedPercent,\n}: {\n  adminActionQueueCount: number;\n  automationReviewCount: number;\n  database: AdminWorkspaceOperationsInput[\"database\"];\n  databaseStatus: AdminWorkspaceOperationsReport[\"databaseStatus\"];\n  deploySmokeAgeHours: number | null;\n  failedEmailDeliveryCount: number;\n  notificationDeliveryCount: number;\n  operatorRunCount: number;\n  productionDeploySmoke: AdminWorkspaceOperationsInput[\"productionDeploySmoke\"];\n  recentAdminActionCount: number;\n  reportRows: AdminWorkspaceOperationsReport[\"rows\"];\n  storageBudgetBytes: number;\n  storageUsedBytes: number;\n  storageUsedPercent: number;\n}): AdminWorkspaceOperationsMetric[] {\n  return [\n    {\n      id: \"storage\",\n      label: \"Storage used\",\n      value: `${storageUsedPercent}%`,\n      detail: `${formatWorkspaceOperationsBytes(storageUsedBytes)} of ${formatWorkspaceOperationsBytes(storageBudgetBytes)}`,\n      status: reportRows[0]?.status ?? \"review\",\n    },\n    {\n      id: \"database\",\n      label: \"Database\",\n      value: database.databaseKind,\n      detail: `${database.activeFiles} files, ${database.versions} versions`,\n      status: databaseStatus,\n    },\n    {\n      id: \"email\",\n      label: \"Email failed\",\n      value: `${failedEmailDeliveryCount}`,\n      detail: `${notificationDeliveryCount} delivery attempts loaded`,\n      status:\n        reportRows.find((row) => row.id === \"email-delivery\")?.status ??\n        \"review\",\n    },\n    {\n      id: \"deploy-smoke\",\n      label: \"Smoke age\",\n      value:\n        deploySmokeAgeHours === null\n          ? \"No approval\"\n          : `${Math.round(deploySmokeAgeHours)}h`,\n      detail: `${productionDeploySmoke.readyCount} ready, ${productionDeploySmoke.reviewCount} review, ${productionDeploySmoke.blockedCount} blocked`,\n      status:\n        reportRows.find((row) => row.id === \"deploy-smoke-recency\")?.status ??\n        \"review\",\n    },\n    {\n      id: \"automation\",\n      label: \"Automation review\",\n      value: `${automationReviewCount}`,\n      detail: `${operatorRunCount} operator rehearsals`,\n      status:\n        reportRows.find((row) => row.id === \"automation-runs\")?.status ??\n        \"review\",\n    },\n    {\n      id: \"admin-queue\",\n      label: \"Admin queue\",\n      value: `${adminActionQueueCount}`,\n      detail: `${recentAdminActionCount} admin actions in 7 days`,\n      status:\n        reportRows.find((row) => row.id === \"admin-action-queue\")?.status ??\n        \"review\",\n    },\n  ];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-workspace-operations.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-operations-ts-c6baedd4d6bfd586.mjs",
  "kind": "ts",
  "hash": "c6baedd4d6bfd586",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-workspace-operations-rows",
      "resolved_path": "src/features/admin/admin-workspace-operations-rows.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-operations-rows-ts-d4122855166854ae.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-workspace-operations-utils",
      "resolved_path": "src/features/admin/admin-workspace-operations-utils.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-operations-utils-ts-d690ef4b2a2e106a.mjs",
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
    "source_path": "src/features/admin/admin-workspace-operations.ts",
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
        "specifier": "@/features/admin/admin-workspace-operations-rows",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-workspace-operations-types",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-workspace-operations-utils",
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
      "getAdminWorkspaceOperationsReport"
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
