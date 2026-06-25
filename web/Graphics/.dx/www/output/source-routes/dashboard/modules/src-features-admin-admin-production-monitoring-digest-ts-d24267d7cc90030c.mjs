
export const dxSourceText = "import type { AdminOperationalIncidentReport } from \"@/features/admin/admin-operational-incidents\";\nimport type { AdminRollbackReadinessReport } from \"@/features/admin/admin-rollback-readiness\";\nimport type { ProductionDeploySmokeReport } from \"@/features/editor/production-deploy-smoke\";\nimport type { RuntimeObservabilityReport } from \"@/features/editor/runtime-observability\";\n\nexport type AdminProductionMonitoringStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type AdminProductionMonitoringKind =\n  | \"admin-actions\"\n  | \"deploy-smoke\"\n  | \"incidents\"\n  | \"rollback\"\n  | \"runtime\";\n\nexport type AdminProductionMonitoringRow = {\n  id: string;\n  status: AdminProductionMonitoringStatus;\n  kind: AdminProductionMonitoringKind;\n  label: string;\n  value: string;\n  detail: string;\n  recommendation: string;\n  latestAt: string | null;\n  target: string | null;\n};\n\nexport type AdminProductionMonitoringAction = {\n  id: string;\n  actorEmail: string;\n  action: string;\n  targetLabel: string;\n  createdAt: string;\n};\n\nexport type AdminProductionMonitoringDigest = {\n  generatedAt: string;\n  status: AdminProductionMonitoringStatus;\n  score: number;\n  readyCount: number;\n  reviewCount: number;\n  blockedCount: number;\n  deploySmokeScore: number;\n  runtimeScore: number;\n  runtimeErrorCount: number;\n  runtimeWarningCount: number;\n  failedAuthAttemptCount: number;\n  failedEmailDeliveryCount: number;\n  rollbackScore: number;\n  recentAdminActionCount: number;\n  highImpactAdminActionCount: number;\n  latestAdminActionAt: string | null;\n  rows: AdminProductionMonitoringRow[];\n  recentActions: AdminProductionMonitoringAction[];\n};\n\nexport type AdminProductionMonitoringDigestInput = {\n  deploySmoke: ProductionDeploySmokeReport;\n  runtimeObservability: RuntimeObservabilityReport;\n  operationalIncidents: AdminOperationalIncidentReport;\n  rollbackReadiness: AdminRollbackReadinessReport;\n  auditEvents: AdminProductionMonitoringAction[];\n  generatedAt?: string;\n  now?: number;\n};\n\nconst RECENT_ACTION_WINDOW_DAYS = 7;\nconst HIGH_IMPACT_ACTIONS = new Set([\n  \"release.approval.snapshot\",\n  \"session.revoke\",\n  \"share.disable\",\n  \"share.restore\",\n  \"user.verify\",\n  \"workspace.policy.update\",\n  \"collaborator.role.approval.request\",\n  \"collaborator.role.approval.decision\",\n  \"collaborator.role.approval.reject\",\n]);\n\nexport function getAdminProductionMonitoringDigest({\n  deploySmoke,\n  runtimeObservability,\n  operationalIncidents,\n  rollbackReadiness,\n  auditEvents,\n  generatedAt = new Date().toISOString(),\n  now = Date.now(),\n}: AdminProductionMonitoringDigestInput): AdminProductionMonitoringDigest {\n  const recentActions = auditEvents\n    .filter((event) => isRecent(event.createdAt, now, RECENT_ACTION_WINDOW_DAYS))\n    .sort(sortActionsByCreatedAt)\n    .slice(0, 12);\n  const highImpactActions = recentActions.filter((event) =>\n    isHighImpactAction(event.action),\n  );\n  const rows = [\n    getDeploySmokeRow(deploySmoke),\n    getRuntimeRow(runtimeObservability),\n    getIncidentRow(operationalIncidents),\n    getRollbackRow(rollbackReadiness),\n    getAdminActionsRow(recentActions, highImpactActions),\n  ];\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const status: AdminProductionMonitoringStatus =\n    blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\";\n\n  return {\n    generatedAt,\n    status,\n    score: Math.max(0, 100 - blockedCount * 24 - reviewCount * 8),\n    readyCount,\n    reviewCount,\n    blockedCount,\n    deploySmokeScore: deploySmoke.score,\n    runtimeScore: runtimeObservability.score,\n    runtimeErrorCount: runtimeObservability.errorCount,\n    runtimeWarningCount: runtimeObservability.warningCount,\n    failedAuthAttemptCount: operationalIncidents.failedAuthAttemptCount,\n    failedEmailDeliveryCount: operationalIncidents.failedEmailDeliveryCount,\n    rollbackScore: rollbackReadiness.score,\n    recentAdminActionCount: recentActions.length,\n    highImpactAdminActionCount: highImpactActions.length,\n    latestAdminActionAt: recentActions[0]?.createdAt ?? null,\n    rows,\n    recentActions,\n  };\n}\n\nfunction getDeploySmokeRow(\n  deploySmoke: ProductionDeploySmokeReport,\n): AdminProductionMonitoringRow {\n  return {\n    id: \"deploy-smoke\",\n    status: deploySmoke.status,\n    kind: \"deploy-smoke\",\n    label: \"Deploy smoke\",\n    value: `${deploySmoke.score}`,\n    detail: `${deploySmoke.readyCount} ready, ${deploySmoke.reviewCount} review, and ${deploySmoke.blockedCount} blocked checks across ${deploySmoke.requiredRouteCount} required production routes.`,\n    recommendation:\n      deploySmoke.status === \"ready\"\n        ? \"Keep the route smoke artifact attached to the release packet.\"\n        : \"Run or refresh the deployed route smoke checks before approving the production release.\",\n    latestAt: deploySmoke.generatedAt,\n    target: deploySmoke.baseUrl,\n  };\n}\n\nfunction getRuntimeRow(\n  runtimeObservability: RuntimeObservabilityReport,\n): AdminProductionMonitoringRow {\n  return {\n    id: \"runtime-observability\",\n    status: runtimeObservability.status,\n    kind: \"runtime\",\n    label: \"Runtime issues\",\n    value: `${runtimeObservability.errorCount} errors`,\n    detail: runtimeObservability.captured\n      ? `${runtimeObservability.errorCount} runtime errors, ${runtimeObservability.warningCount} warnings, and ${runtimeObservability.infoCount} info signals were captured.`\n      : \"No browser runtime issue artifact is attached to the current admin digest.\",\n    recommendation:\n      runtimeObservability.status === \"ready\"\n        ? \"Attach the clean runtime artifact to release evidence.\"\n        : \"Run visual route probes or snapshot capture with runtime issue capture before release approval.\",\n    latestAt: latestRuntimeIssueAt(runtimeObservability),\n    target: runtimeObservability.rows.find((row) => row.status !== \"ready\")?.label ??\n      null,\n  };\n}\n\nfunction getIncidentRow(\n  operationalIncidents: AdminOperationalIncidentReport,\n): AdminProductionMonitoringRow {\n  return {\n    id: \"auth-email-incidents\",\n    status: operationalIncidents.status,\n    kind: \"incidents\",\n    label: \"Auth and email incidents\",\n    value: `${operationalIncidents.failedAuthAttemptCount}/${operationalIncidents.failedEmailDeliveryCount}`,\n    detail: `${operationalIncidents.failedAuthAttemptCount} failed auth attempts, ${operationalIncidents.failedEmailDeliveryCount} failed email deliveries, ${operationalIncidents.staleSessionCount} stale sessions, and ${operationalIncidents.riskyShareCount} risky shares are in the loaded operations window.`,\n    recommendation:\n      operationalIncidents.status === \"ready\"\n        ? \"Keep auth, email, session, and share incident review in the release checklist.\"\n        : \"Resolve blocked auth/email incidents and review session/share exposure before release approval.\",\n    latestAt: latestRowAt(operationalIncidents.rows),\n    target: operationalIncidents.rows.find((row) => row.status !== \"ready\")\n      ?.target ?? null,\n  };\n}\n\nfunction getRollbackRow(\n  rollbackReadiness: AdminRollbackReadinessReport,\n): AdminProductionMonitoringRow {\n  return {\n    id: \"rollback-readiness\",\n    status: rollbackReadiness.status,\n    kind: \"rollback\",\n    label: \"Rollback readiness\",\n    value: `${rollbackReadiness.score}`,\n    detail: `${rollbackReadiness.versionAnchorCount} version anchors, ${rollbackReadiness.filesWithoutVersions} files without versions, ${rollbackReadiness.staleShareCount} stale shares, and ${rollbackReadiness.deploymentLinkCount} deployment links are visible.`,\n    recommendation:\n      rollbackReadiness.status === \"ready\"\n        ? \"Pair rollback readiness with release approval and smoke evidence.\"\n        : \"Resolve rollback readiness review rows before treating production monitoring as release-ready.\",\n    latestAt: rollbackReadiness.generatedAt,\n    target: rollbackReadiness.rows.find((row) => row.status !== \"ready\")?.label ??\n      rollbackReadiness.deploymentUrls[0] ??\n      null,\n  };\n}\n\nfunction getAdminActionsRow(\n  recentActions: AdminProductionMonitoringAction[],\n  highImpactActions: AdminProductionMonitoringAction[],\n): AdminProductionMonitoringRow {\n  if (recentActions.length === 0) {\n    return {\n      id: \"recent-admin-actions-missing\",\n      status: \"review\",\n      kind: \"admin-actions\",\n      label: \"Recent admin actions\",\n      value: \"0\",\n      detail: `No admin audit actions were recorded in the last ${RECENT_ACTION_WINDOW_DAYS} days.`,\n      recommendation:\n        \"Confirm admin audit ingestion is working before relying on the digest for production monitoring.\",\n      latestAt: null,\n      target: null,\n    };\n  }\n\n  return {\n    id: \"recent-admin-actions\",\n    status: highImpactActions.length > 8 ? \"review\" : \"ready\",\n    kind: \"admin-actions\",\n    label: \"Recent admin actions\",\n    value: `${recentActions.length}`,\n    detail: `${recentActions.length} admin actions and ${highImpactActions.length} high-impact changes were recorded in the last ${RECENT_ACTION_WINDOW_DAYS} days.`,\n    recommendation:\n      highImpactActions.length > 8\n        ? \"Review the high-impact admin action burst before release approval.\"\n        : \"Use recent audit actions to confirm release, access, and share operations are traceable.\",\n    latestAt: recentActions[0]?.createdAt ?? null,\n    target: highImpactActions[0]?.targetLabel ?? recentActions[0]?.targetLabel ??\n      null,\n  };\n}\n\nfunction latestRuntimeIssueAt(report: RuntimeObservabilityReport) {\n  return report.issues\n    .map((issue) => issue.capturedAt)\n    .sort((left, right) => toTime(right) - toTime(left))[0] ?? null;\n}\n\nfunction latestRowAt(rows: Array<{ latestAt: string | null }>) {\n  return rows\n    .map((row) => row.latestAt)\n    .filter((value): value is string => Boolean(value))\n    .sort((left, right) => toTime(right) - toTime(left))[0] ?? null;\n}\n\nfunction isHighImpactAction(action: string) {\n  return HIGH_IMPACT_ACTIONS.has(action) || action.startsWith(\"release.\");\n}\n\nfunction isRecent(value: string, now: number, days: number) {\n  return toTime(value) >= now - days * 24 * 60 * 60 * 1000;\n}\n\nfunction sortActionsByCreatedAt(\n  first: AdminProductionMonitoringAction,\n  second: AdminProductionMonitoringAction,\n) {\n  return toTime(second.createdAt) - toTime(first.createdAt);\n}\n\nfunction toTime(value: string) {\n  return new Date(value).getTime();\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-production-monitoring-digest.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-production-monitoring-digest-ts-d24267d7cc90030c.mjs",
  "kind": "ts",
  "hash": "d24267d7cc90030c",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-production-monitoring-digest.ts",
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
        "specifier": "@/features/admin/admin-operational-incidents",
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
      },
      {
        "specifier": "@/features/editor/runtime-observability",
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
      "getAdminProductionMonitoringDigest"
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
