import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-workspace-operations-utils-ts-d690ef4b2a2e106a.mjs";
export const dxSourceText = "import type { DeployEnvironmentPreflightReport } from \"@/features/admin/deploy-environment-preflight\";\nimport type { AdminNotificationDigestSubscriptionsReport } from \"@/features/admin/admin-notification-digest-subscriptions\";\nimport type { AdminOperatorRehearsalReport } from \"@/features/admin/admin-operator-rehearsals\";\nimport type { AdminProductionMonitoringDigest } from \"@/features/admin/admin-production-monitoring-digest\";\nimport type {\n  AdminRollbackDatabaseSummary,\n  AdminRollbackReadinessReport,\n} from \"@/features/admin/admin-rollback-readiness\";\nimport type { AdminReleaseApprovalSnapshot } from \"@/features/admin/admin-release-approval-snapshots\";\nimport type { RoleChangeApprovalQueue } from \"@/features/admin/admin-role-change-approval\";\nimport type { ProductionDeploySmokeReport } from \"@/features/editor/production-deploy-smoke\";\nimport type {\n  AdminWorkspaceOperationsRow,\n  WorkspaceOperationsAuditEvent,\n  WorkspaceOperationsNotification,\n} from \"@/features/admin/admin-workspace-operations-types\";\nimport {\n  DEPLOY_SMOKE_BLOCKED_HOURS,\n  DEPLOY_SMOKE_REVIEW_HOURS,\n  formatWorkspaceOperationsBytes,\n  getWorstStatus,\n  uniqueStrings,\n} from \"@/features/admin/admin-workspace-operations-utils\";\n\nexport function getStorageBudgetRow({\n  activeFileCount,\n  budgetBytes,\n  storageUsedBytes,\n  storageUsedPercent,\n  trashedFileCount,\n}: {\n  activeFileCount: number;\n  budgetBytes: number;\n  storageUsedBytes: number;\n  storageUsedPercent: number;\n  trashedFileCount: number;\n}): AdminWorkspaceOperationsRow {\n  const status =\n    storageUsedPercent >= 95\n      ? \"blocked\"\n      : storageUsedPercent >= 75\n        ? \"review\"\n        : \"ready\";\n\n  return {\n    id: \"storage-budget\",\n    category: \"storage\",\n    status,\n    label: \"Workspace storage budget\",\n    value: `${storageUsedPercent}%`,\n    detail: `${formatWorkspaceOperationsBytes(storageUsedBytes)} stored across ${activeFileCount} active files and ${trashedFileCount} trashed files. Budget is ${formatWorkspaceOperationsBytes(budgetBytes)}.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Keep monitoring document payload growth during asset-heavy releases.\"\n        : \"Archive large inactive files, clear stale trash, or raise ESSENCE_WORKSPACE_STORAGE_BUDGET_BYTES before the next release.\",\n    target: \"ESSENCE_WORKSPACE_STORAGE_BUDGET_BYTES\",\n    latestAt: null,\n  };\n}\n\nexport function getStorageVersionRow({\n  activeFileCount,\n  rollbackReadiness,\n}: {\n  activeFileCount: number;\n  rollbackReadiness: AdminRollbackReadinessReport;\n}): AdminWorkspaceOperationsRow {\n  const status =\n    activeFileCount > 0 && rollbackReadiness.filesWithoutVersions > 0\n      ? \"review\"\n      : \"ready\";\n\n  return {\n    id: \"storage-version-anchors\",\n    category: \"storage\",\n    status,\n    label: \"Version anchors\",\n    value: `${rollbackReadiness.versionAnchorCount}`,\n    detail: `${rollbackReadiness.filesWithoutVersions} active files do not have named rollback anchors.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Keep named versions attached to release-sensitive design files.\"\n        : \"Create a named version before high-risk file edits or production release approval.\",\n    target: \"Release rollback readiness\",\n    latestAt: rollbackReadiness.latestVersions[0]?.createdAt ?? null,\n  };\n}\n\nexport function getDatabaseHealthRow({\n  database,\n  deployEnvironmentPreflight,\n}: {\n  database: AdminRollbackDatabaseSummary;\n  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;\n}): AdminWorkspaceOperationsRow {\n  const preflightRows = deployEnvironmentPreflight.rows.filter(\n    (row) => row.category === \"database\",\n  );\n  const preflightStatus = getWorstStatus(\n    preflightRows.map((row) => row.status),\n    \"ready\",\n  );\n  const status = getWorstStatus(\n    [\n      database.configured ? \"ready\" : \"blocked\",\n      database.authTokenRequired && !database.authTokenConfigured\n        ? \"blocked\"\n        : \"ready\",\n      preflightStatus,\n    ],\n    \"ready\",\n  );\n\n  return {\n    id: \"database-health\",\n    category: \"database\",\n    status,\n    label: \"Database health\",\n    value: database.databaseKind,\n    detail: `${database.users} users, ${database.sessions} sessions, ${database.accounts} accounts, ${database.activeFiles} active files, ${database.activeShares} shares, and ${database.versions} versions.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Keep Turso credentials synced across local, preview, and production.\"\n        : \"Fix database URL/auth token readiness before releasing admin or editor changes.\",\n    target: preflightRows.find((row) => row.status !== \"ready\")?.label ?? null,\n    latestAt: null,\n  };\n}\n\nexport function getEmailDeliveryRow({\n  deployEnvironmentPreflight,\n  failedEmailDeliveries,\n  latestDeliveryAt,\n  notificationDeliveries,\n  notificationDigestSubscriptions,\n}: {\n  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;\n  failedEmailDeliveries: WorkspaceOperationsNotification[];\n  latestDeliveryAt: string | null;\n  notificationDeliveries: WorkspaceOperationsNotification[];\n  notificationDigestSubscriptions: AdminNotificationDigestSubscriptionsReport;\n}): AdminWorkspaceOperationsRow {\n  const emailPreflightStatus = getWorstStatus(\n    deployEnvironmentPreflight.rows\n      .filter((row) => row.category === \"email\")\n      .map((row) => row.status),\n    \"ready\",\n  );\n  const status = getWorstStatus(\n    [\n      emailPreflightStatus,\n      failedEmailDeliveries.length > 0 ? \"review\" : \"ready\",\n      notificationDigestSubscriptions.unroutedActiveSignalCount > 0\n        ? \"review\"\n        : \"ready\",\n    ],\n    \"ready\",\n  );\n\n  return {\n    id: \"email-delivery\",\n    category: \"email\",\n    status,\n    label: \"Email delivery\",\n    value: `${failedEmailDeliveries.length} failed`,\n    detail: `${notificationDeliveries.length} recent comment deliveries, ${notificationDigestSubscriptions.activeSignalCount} active digest signals, and ${notificationDigestSubscriptions.unroutedActiveSignalCount} unrouted signals.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Keep Brevo sender and digest routing attached to release approvals.\"\n        : \"Repair Brevo envs, failed delivery reasons, or unrouted digest subscriptions.\",\n    target:\n      failedEmailDeliveries[0]?.reason ??\n      deployEnvironmentPreflight.rows.find(\n        (row) => row.category === \"email\" && row.status !== \"ready\",\n      )?.label ??\n      null,\n    latestAt: latestDeliveryAt,\n  };\n}\n\nexport function getDeploySmokeRow({\n  deploySmokeAgeHours,\n  latestApproval,\n  productionDeploySmoke,\n}: {\n  deploySmokeAgeHours: number | null;\n  latestApproval: AdminReleaseApprovalSnapshot | null;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n}): AdminWorkspaceOperationsRow {\n  const recencyStatus =\n    deploySmokeAgeHours === null\n      ? \"review\"\n      : deploySmokeAgeHours >= DEPLOY_SMOKE_BLOCKED_HOURS\n        ? \"blocked\"\n        : deploySmokeAgeHours >= DEPLOY_SMOKE_REVIEW_HOURS\n          ? \"review\"\n          : \"ready\";\n  const artifactStatus =\n    latestApproval && latestApproval.smokeArtifacts.length === 0\n      ? \"review\"\n      : \"ready\";\n  const status = getWorstStatus(\n    [productionDeploySmoke.status, recencyStatus, artifactStatus],\n    \"ready\",\n  );\n\n  return {\n    id: \"deploy-smoke-recency\",\n    category: \"deploy-smoke\",\n    status,\n    label: \"Deploy smoke recency\",\n    value:\n      deploySmokeAgeHours === null\n        ? \"No approval\"\n        : `${Math.round(deploySmokeAgeHours)}h`,\n    detail: latestApproval\n      ? `Latest release approval ${latestApproval.releaseLabel} has ${latestApproval.smokeArtifacts.length} smoke artifacts. Current route checklist is ${productionDeploySmoke.score}/100.`\n      : `No release approval snapshot is attached. Current route checklist is ${productionDeploySmoke.score}/100.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Keep the latest deploy smoke artifact attached to the release approval snapshot.\"\n        : \"Run a fresh deployed route smoke and save a release approval snapshot with smoke artifacts.\",\n    target: latestApproval?.deploymentUrl ?? productionDeploySmoke.baseUrl,\n    latestAt: latestApproval?.createdAt ?? productionDeploySmoke.generatedAt,\n  };\n}\n\nexport function getAutomationRunRow({\n  operatorRehearsals,\n}: {\n  operatorRehearsals: AdminOperatorRehearsalReport;\n}): AdminWorkspaceOperationsRow {\n  return {\n    id: \"automation-runs\",\n    category: \"automation\",\n    status: operatorRehearsals.status,\n    label: \"Automation and rehearsal runs\",\n    value: `${operatorRehearsals.readyRunCount}/${operatorRehearsals.runCount}`,\n    detail: `${operatorRehearsals.reviewRunCount} review and ${operatorRehearsals.blockedRunCount} blocked rehearsals across ${operatorRehearsals.stepCount} steps.`,\n    recommendation:\n      operatorRehearsals.status === \"ready\"\n        ? \"Keep rehearsal evidence fresh for restore, import/export, privacy, desktop, and self-hosted recovery.\"\n        : \"Run the blocked rehearsal commands and attach the result to the release archive.\",\n    target:\n      operatorRehearsals.rows.find((row) => row.status !== \"ready\")?.label ??\n      null,\n    latestAt: operatorRehearsals.generatedAt,\n  };\n}\n\nexport function getAdminActionQueueRow({\n  adminActionQueueCount,\n  notificationDigestSubscriptions,\n  productionMonitoringDigest,\n  recentAdminActions,\n  roleChangeApprovals,\n}: {\n  adminActionQueueCount: number;\n  notificationDigestSubscriptions: AdminNotificationDigestSubscriptionsReport;\n  productionMonitoringDigest: AdminProductionMonitoringDigest;\n  recentAdminActions: WorkspaceOperationsAuditEvent[];\n  roleChangeApprovals: RoleChangeApprovalQueue;\n}): AdminWorkspaceOperationsRow {\n  const status =\n    roleChangeApprovals.pendingCount > 0 ||\n    notificationDigestSubscriptions.unroutedActiveSignalCount > 0 ||\n    productionMonitoringDigest.blockedCount > 0\n      ? \"review\"\n      : \"ready\";\n\n  return {\n    id: \"admin-action-queue\",\n    category: \"admin-queue\",\n    status,\n    label: \"Admin action queue\",\n    value: `${adminActionQueueCount}`,\n    detail: `${roleChangeApprovals.pendingCount} pending role changes, ${notificationDigestSubscriptions.unroutedActiveSignalCount} unrouted digest signals, and ${recentAdminActions.length} recent admin actions.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Keep pending governance decisions empty before release signoff.\"\n        : \"Resolve pending role changes, route active digest signals, and review blocked monitoring rows.\",\n    target:\n      roleChangeApprovals.requests.find((request) => request.status === \"pending\")\n        ?.targetEmail ??\n      productionMonitoringDigest.rows.find((row) => row.status !== \"ready\")\n        ?.label ??\n      null,\n    latestAt: recentAdminActions[0]?.createdAt ?? null,\n  };\n}\n\nexport function getOperationsCommands({\n  deployEnvironmentPreflight,\n  operatorRehearsals,\n  productionDeploySmoke,\n}: {\n  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;\n  operatorRehearsals: AdminOperatorRehearsalReport;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n}) {\n  return uniqueStrings([\n    \"bun run typecheck\",\n    ...deployEnvironmentPreflight.commands,\n    ...productionDeploySmoke.commands,\n    ...operatorRehearsals.commands.slice(0, 6),\n  ]);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-workspace-operations-rows.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-operations-rows-ts-d4122855166854ae.mjs",
  "kind": "ts",
  "hash": "d4122855166854ae",
  "dependencies": [
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
    "source_path": "src/features/admin/admin-workspace-operations-rows.ts",
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
        "specifier": "@/features/admin/deploy-environment-preflight",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-notification-digest-subscriptions",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-operator-rehearsals",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-production-monitoring-digest",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-rollback-readiness",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-approval-snapshots",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-role-change-approval",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/production-deploy-smoke",
        "side_effect_only": false,
        "type_only": true
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
      "getStorageBudgetRow",
      "getStorageVersionRow",
      "getDatabaseHealthRow",
      "getEmailDeliveryRow",
      "getDeploySmokeRow",
      "getAutomationRunRow",
      "getAdminActionQueueRow",
      "getOperationsCommands"
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
