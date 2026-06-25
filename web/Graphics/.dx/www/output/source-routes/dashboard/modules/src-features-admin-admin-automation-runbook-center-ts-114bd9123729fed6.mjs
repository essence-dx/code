
export const dxSourceText = "import type { AdminCollaborationEventIngestionReport } from \"@/features/admin/admin-collaboration-event-ingestion\";\nimport type { AdminDataLossPreventionReport } from \"@/features/admin/admin-data-loss-prevention\";\nimport type { AdminOperatorRehearsalReport } from \"@/features/admin/admin-operator-rehearsals\";\nimport type { AdminRealtimeHealthReport } from \"@/features/admin/admin-realtime-health-monitor\";\nimport type { AdminReleaseArchiveRetentionReport } from \"@/features/admin/admin-release-archive-retention\";\nimport type { ScopedPublicationApprovalReport } from \"@/features/admin/admin-scoped-publication-approvals\";\nimport type { SelfHostedSyncDiagnosticReport } from \"@/features/admin/admin-self-hosted-sync-diagnostics\";\nimport type { DeployEnvironmentPreflightReport } from \"@/features/admin/deploy-environment-preflight\";\nimport type { ProductionDeploySmokeReport } from \"@/features/editor/production-deploy-smoke\";\n\nexport type AdminAutomationRunbookStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type AdminAutomationRunbookCategory =\n  | \"evidence-bundle\"\n  | \"incident-drill\"\n  | \"repair-action\"\n  | \"scheduled-health\";\n\nexport type AdminAutomationRunbookRow = {\n  id: string;\n  category: AdminAutomationRunbookCategory;\n  status: AdminAutomationRunbookStatus;\n  label: string;\n  cadence: string;\n  owner: string;\n  evidence: string;\n  command: string;\n  latestAt: string | null;\n};\n\nexport type AdminAutomationRunbook = {\n  id: string;\n  category: AdminAutomationRunbookCategory;\n  status: AdminAutomationRunbookStatus;\n  title: string;\n  objective: string;\n  cadence: string;\n  owner: string;\n  rowCount: number;\n  commandCount: number;\n  blockedSignalCount: number;\n  reviewSignalCount: number;\n  evidenceBundle: string;\n  rows: AdminAutomationRunbookRow[];\n  commands: string[];\n};\n\nexport type AdminAutomationRunbookCenterReport = {\n  generatedAt: string;\n  status: AdminAutomationRunbookStatus;\n  score: number;\n  scheduledHealthCount: number;\n  repairActionCount: number;\n  incidentDrillCount: number;\n  evidenceBundleCount: number;\n  readyCount: number;\n  reviewCount: number;\n  blockedCount: number;\n  commandCount: number;\n  runbooks: AdminAutomationRunbook[];\n  rows: AdminAutomationRunbookRow[];\n  commands: string[];\n};\n\nexport type AdminAutomationRunbookCenterInput = {\n  collaborationEventIngestion: AdminCollaborationEventIngestionReport;\n  dataLossPrevention: AdminDataLossPreventionReport;\n  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;\n  generatedAt?: string;\n  operatorRehearsals: AdminOperatorRehearsalReport;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  realtimeHealth: AdminRealtimeHealthReport;\n  releaseArchiveRetention: AdminReleaseArchiveRetentionReport;\n  scopedPublicationApprovals: ScopedPublicationApprovalReport;\n  selfHostedSyncDiagnostics: SelfHostedSyncDiagnosticReport;\n};\n\nexport function getAdminAutomationRunbookCenterReport({\n  collaborationEventIngestion,\n  dataLossPrevention,\n  deployEnvironmentPreflight,\n  generatedAt = new Date().toISOString(),\n  operatorRehearsals,\n  productionDeploySmoke,\n  realtimeHealth,\n  releaseArchiveRetention,\n  scopedPublicationApprovals,\n  selfHostedSyncDiagnostics,\n}: AdminAutomationRunbookCenterInput): AdminAutomationRunbookCenterReport {\n  const runbooks = [\n    getScheduledHealthRunbook({\n      deployEnvironmentPreflight,\n      productionDeploySmoke,\n      realtimeHealth,\n    }),\n    getRepairActionRunbook({\n      dataLossPrevention,\n      scopedPublicationApprovals,\n      selfHostedSyncDiagnostics,\n    }),\n    getIncidentDrillRunbook({\n      collaborationEventIngestion,\n      operatorRehearsals,\n      realtimeHealth,\n    }),\n    getEvidenceBundleRunbook({\n      dataLossPrevention,\n      releaseArchiveRetention,\n      selfHostedSyncDiagnostics,\n    }),\n  ];\n  const rows = runbooks.flatMap((runbook) => runbook.rows).sort(sortRows);\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const commands = uniqueStrings(runbooks.flatMap((runbook) => runbook.commands));\n\n  return {\n    generatedAt,\n    status:\n      blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\",\n    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 6),\n    scheduledHealthCount: runbooks.filter(\n      (runbook) => runbook.category === \"scheduled-health\",\n    ).length,\n    repairActionCount: runbooks.filter(\n      (runbook) => runbook.category === \"repair-action\",\n    ).length,\n    incidentDrillCount: runbooks.filter(\n      (runbook) => runbook.category === \"incident-drill\",\n    ).length,\n    evidenceBundleCount: runbooks.filter(\n      (runbook) => runbook.category === \"evidence-bundle\",\n    ).length,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    commandCount: commands.length,\n    runbooks,\n    rows,\n    commands,\n  };\n}\n\nfunction getScheduledHealthRunbook({\n  deployEnvironmentPreflight,\n  productionDeploySmoke,\n  realtimeHealth,\n}: {\n  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  realtimeHealth: AdminRealtimeHealthReport;\n}): AdminAutomationRunbook {\n  return createRunbook({\n    category: \"scheduled-health\",\n    title: \"Scheduled health checks\",\n    objective:\n      \"Keep deployment, route smoke, and realtime health evidence fresh before operators approve external publication.\",\n    cadence: \"Every deployment and daily\",\n    owner: \"Release operator\",\n    evidenceBundle: \"health-check-evidence\",\n    rows: [\n      createRow({\n        id: \"scheduled-env-preflight\",\n        category: \"scheduled-health\",\n        status: deployEnvironmentPreflight.status,\n        label: \"Environment preflight\",\n        cadence: \"Daily\",\n        owner: \"Platform operator\",\n        evidence: `${deployEnvironmentPreflight.readyCount} ready, ${deployEnvironmentPreflight.reviewCount} review, and ${deployEnvironmentPreflight.blockedCount} blocked environment rows.`,\n        command:\n          deployEnvironmentPreflight.commands.find((command) =>\n            command.includes(\"env-preflight\"),\n          ) ?? \"bun run ops:env-preflight\",\n        latestAt: deployEnvironmentPreflight.generatedAt,\n      }),\n      createRow({\n        id: \"scheduled-route-smoke\",\n        category: \"scheduled-health\",\n        status: productionDeploySmoke.status,\n        label: \"Route smoke\",\n        cadence: \"After deploy\",\n        owner: \"Release operator\",\n        evidence: `${productionDeploySmoke.readyCount}/${productionDeploySmoke.routeCount} route checks are ready across ${productionDeploySmoke.requiredRouteCount} required routes.`,\n        command:\n          productionDeploySmoke.commands.find((command) =>\n            command.includes(\"post-deploy-smoke\"),\n          ) ?? \"bun run ops:post-deploy-smoke\",\n        latestAt: productionDeploySmoke.generatedAt,\n      }),\n      createRow({\n        id: \"scheduled-realtime-health\",\n        category: \"scheduled-health\",\n        status: realtimeHealth.status,\n        label: \"Realtime health monitor\",\n        cadence: \"Every 15 minutes\",\n        owner: \"Collaboration operator\",\n        evidence: `${realtimeHealth.monitoredRoomCount} rooms, ${realtimeHealth.offlineReplayQueueCount} offline replay items, and realtime score ${realtimeHealth.score}.`,\n        command: realtimeHealth.commands[0] ?? \"Export realtime health JSON.\",\n        latestAt: realtimeHealth.generatedAt,\n      }),\n    ],\n  });\n}\n\nfunction getRepairActionRunbook({\n  dataLossPrevention,\n  scopedPublicationApprovals,\n  selfHostedSyncDiagnostics,\n}: {\n  dataLossPrevention: AdminDataLossPreventionReport;\n  scopedPublicationApprovals: ScopedPublicationApprovalReport;\n  selfHostedSyncDiagnostics: SelfHostedSyncDiagnosticReport;\n}): AdminAutomationRunbook {\n  return createRunbook({\n    category: \"repair-action\",\n    title: \"Repair action queue\",\n    objective:\n      \"Turn blocked governance signals into repeatable operator repair actions with exportable evidence.\",\n    cadence: \"Every 30 minutes while review is open\",\n    owner: \"Governance operator\",\n    evidenceBundle: \"repair-action-evidence\",\n    rows: [\n      createRow({\n        id: \"repair-self-hosted-sync\",\n        category: \"repair-action\",\n        status: selfHostedSyncDiagnostics.status,\n        label: \"Self-hosted sync repair\",\n        cadence: \"Before self-hosted cutover\",\n        owner: \"Self-hosted operator\",\n        evidence: `${selfHostedSyncDiagnostics.blockedCount} blocked and ${selfHostedSyncDiagnostics.reviewCount} review sync diagnostics with ${selfHostedSyncDiagnostics.repairCommandCount} repair commands.`,\n        command:\n          selfHostedSyncDiagnostics.repairCommands.find(\n            (command) => command.category !== \"operator\",\n          )?.command ?? \"Export self-hosted sync diagnostics Markdown.\",\n        latestAt: selfHostedSyncDiagnostics.generatedAt,\n      }),\n      createRow({\n        id: \"repair-dlp\",\n        category: \"repair-action\",\n        status: dataLossPrevention.status,\n        label: \"Data-loss prevention repair\",\n        cadence: \"Before external export\",\n        owner: \"Security reviewer\",\n        evidence: `${dataLossPrevention.blockedCount} blocked and ${dataLossPrevention.reviewCount} review DLP rows across ${dataLossPrevention.sensitiveFindingCount} sensitive findings.`,\n        command:\n          dataLossPrevention.commands[0] ??\n          \"Export data-loss prevention evidence.\",\n        latestAt: dataLossPrevention.generatedAt,\n      }),\n      createRow({\n        id: \"repair-publication-approvals\",\n        category: \"repair-action\",\n        status: scopedPublicationApprovals.status,\n        label: \"Publication approval repair\",\n        cadence: \"Before channel publish\",\n        owner: \"Publication reviewer\",\n        evidence: `${scopedPublicationApprovals.missingApprovalCount} missing, ${scopedPublicationApprovals.staleApprovalCount} stale, and ${scopedPublicationApprovals.overdueScopeCount} overdue scoped approvals.`,\n        command:\n          scopedPublicationApprovals.commands[0] ??\n          \"Export scoped publication approval evidence.\",\n        latestAt: scopedPublicationApprovals.generatedAt,\n      }),\n    ],\n  });\n}\n\nfunction getIncidentDrillRunbook({\n  collaborationEventIngestion,\n  operatorRehearsals,\n  realtimeHealth,\n}: {\n  collaborationEventIngestion: AdminCollaborationEventIngestionReport;\n  operatorRehearsals: AdminOperatorRehearsalReport;\n  realtimeHealth: AdminRealtimeHealthReport;\n}): AdminAutomationRunbook {\n  return createRunbook({\n    category: \"incident-drill\",\n    title: \"Incident drills\",\n    objective:\n      \"Practice recovery for realtime replay, restore, import/export, public share privacy, desktop handoff, and self-hosted recovery.\",\n    cadence: \"Weekly and after incident\",\n    owner: \"Incident commander\",\n    evidenceBundle: \"incident-drill-evidence\",\n    rows: [\n      createRow({\n        id: \"drill-operator-rehearsals\",\n        category: \"incident-drill\",\n        status: operatorRehearsals.status,\n        label: \"Operator rehearsals\",\n        cadence: \"Weekly\",\n        owner: \"Release operator\",\n        evidence: `${operatorRehearsals.readyRunCount}/${operatorRehearsals.runCount} rehearsals ready with ${operatorRehearsals.commandCount} commands and ${operatorRehearsals.blockedStepCount} blocked steps.`,\n        command:\n          operatorRehearsals.commands[0] ??\n          \"Export operator rehearsals Markdown.\",\n        latestAt: operatorRehearsals.generatedAt,\n      }),\n      createRow({\n        id: \"drill-collaboration-replay\",\n        category: \"incident-drill\",\n        status: collaborationEventIngestion.status,\n        label: \"Collaboration replay drill\",\n        cadence: \"After collaboration incident\",\n        owner: \"Collaboration operator\",\n        evidence: `${collaborationEventIngestion.durableEventCount} retained collaboration events, ${collaborationEventIngestion.incidentCount} incidents, and ${collaborationEventIngestion.purgeCandidateCount} purge candidates.`,\n        command:\n          collaborationEventIngestion.commands[0] ??\n          \"Export collaboration event ingestion evidence.\",\n        latestAt: collaborationEventIngestion.generatedAt,\n      }),\n      createRow({\n        id: \"drill-realtime-reconnect\",\n        category: \"incident-drill\",\n        status: realtimeHealth.status,\n        label: \"Realtime reconnect drill\",\n        cadence: \"After reconnect anomaly\",\n        owner: \"Realtime operator\",\n        evidence: `${realtimeHealth.eventDriftCount} drift events, ${realtimeHealth.pendingSaveSignalCount} pending save signals, and reconnect quality ${realtimeHealth.reconnectQualityScore}.`,\n        command:\n          realtimeHealth.commands[1] ??\n          realtimeHealth.commands[0] ??\n          \"Export realtime health evidence.\",\n        latestAt: realtimeHealth.generatedAt,\n      }),\n    ],\n  });\n}\n\nfunction getEvidenceBundleRunbook({\n  dataLossPrevention,\n  releaseArchiveRetention,\n  selfHostedSyncDiagnostics,\n}: {\n  dataLossPrevention: AdminDataLossPreventionReport;\n  releaseArchiveRetention: AdminReleaseArchiveRetentionReport;\n  selfHostedSyncDiagnostics: SelfHostedSyncDiagnosticReport;\n}): AdminAutomationRunbook {\n  return createRunbook({\n    category: \"evidence-bundle\",\n    title: \"Evidence bundles\",\n    objective:\n      \"Keep release archive, DLP, and self-hosted sync evidence exportable for audits and future operators.\",\n    cadence: \"Before release approval\",\n    owner: \"Release evidence owner\",\n    evidenceBundle: \"release-evidence-bundle\",\n    rows: [\n      createRow({\n        id: \"bundle-release-archive\",\n        category: \"evidence-bundle\",\n        status: releaseArchiveRetention.status,\n        label: \"Release archive bundle\",\n        cadence: \"Before release approval\",\n        owner: \"Release evidence owner\",\n        evidence: `${releaseArchiveRetention.itemCount} archive items, ${releaseArchiveRetention.expiredCount} expired items, and ${releaseArchiveRetention.searchableCount} searchable evidence records.`,\n        command:\n          releaseArchiveRetention.commands[0] ??\n          \"Export release archive retention evidence.\",\n        latestAt: releaseArchiveRetention.generatedAt,\n      }),\n      createRow({\n        id: \"bundle-dlp\",\n        category: \"evidence-bundle\",\n        status: dataLossPrevention.status,\n        label: \"DLP evidence bundle\",\n        cadence: \"Before external handoff\",\n        owner: \"Security reviewer\",\n        evidence: `${dataLossPrevention.rows.length} DLP rows and ${dataLossPrevention.workflows.length} workflows available for export.`,\n        command: \"Export Admin > Governance data-loss prevention Markdown.\",\n        latestAt: dataLossPrevention.generatedAt,\n      }),\n      createRow({\n        id: \"bundle-self-hosted-sync\",\n        category: \"evidence-bundle\",\n        status: selfHostedSyncDiagnostics.status,\n        label: \"Self-hosted sync bundle\",\n        cadence: \"Before self-hosted package handoff\",\n        owner: \"Self-hosted operator\",\n        evidence: `${selfHostedSyncDiagnostics.rows.length} sync diagnostics and ${selfHostedSyncDiagnostics.repairCommandCount} repair commands available for export.`,\n        command: \"Export Admin > Governance self-hosted sync diagnostics JSON.\",\n        latestAt: selfHostedSyncDiagnostics.generatedAt,\n      }),\n    ],\n  });\n}\n\nfunction createRunbook({\n  category,\n  cadence,\n  evidenceBundle,\n  objective,\n  owner,\n  rows,\n  title,\n}: {\n  category: AdminAutomationRunbookCategory;\n  cadence: string;\n  evidenceBundle: string;\n  objective: string;\n  owner: string;\n  rows: AdminAutomationRunbookRow[];\n  title: string;\n}): AdminAutomationRunbook {\n  const blockedSignalCount = rows.filter((row) => row.status === \"blocked\").length;\n  const reviewSignalCount = rows.filter((row) => row.status === \"review\").length;\n  const commands = uniqueStrings(rows.map((row) => row.command));\n\n  return {\n    id: `${category}-runbook`,\n    category,\n    status:\n      blockedSignalCount > 0\n        ? \"blocked\"\n        : reviewSignalCount > 0\n          ? \"review\"\n          : \"ready\",\n    title,\n    objective,\n    cadence,\n    owner,\n    rowCount: rows.length,\n    commandCount: commands.length,\n    blockedSignalCount,\n    reviewSignalCount,\n    evidenceBundle,\n    rows,\n    commands,\n  };\n}\n\nfunction createRow(input: AdminAutomationRunbookRow) {\n  return input;\n}\n\nfunction sortRows(\n  first: AdminAutomationRunbookRow,\n  second: AdminAutomationRunbookRow,\n) {\n  return (\n    getStatusWeight(first.status) - getStatusWeight(second.status) ||\n    first.category.localeCompare(second.category)\n  );\n}\n\nfunction getStatusWeight(status: AdminAutomationRunbookStatus) {\n  if (status === \"blocked\") {\n    return 0;\n  }\n\n  if (status === \"review\") {\n    return 1;\n  }\n\n  return 2;\n}\n\nfunction uniqueStrings(items: Array<string | null | undefined>) {\n  return Array.from(new Set(items.filter((item): item is string => Boolean(item))));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-automation-runbook-center.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-automation-runbook-center-ts-114bd9123729fed6.mjs",
  "kind": "ts",
  "hash": "114bd9123729fed6",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-automation-runbook-center.ts",
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
        "specifier": "@/features/admin/admin-collaboration-event-ingestion",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-data-loss-prevention",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-operator-rehearsals",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-realtime-health-monitor",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-archive-retention",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-scoped-publication-approvals",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-self-hosted-sync-diagnostics",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/deploy-environment-preflight",
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
      "getAdminAutomationRunbookCenterReport"
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
