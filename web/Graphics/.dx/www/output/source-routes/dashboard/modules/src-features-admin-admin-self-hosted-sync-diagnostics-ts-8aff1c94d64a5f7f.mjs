
export const dxSourceText = "import type {\n  AdminDesktopUpdateChannelReport,\n  AdminDesktopUpdateChannelStatus,\n} from \"@/features/admin/admin-desktop-update-channel\";\nimport type {\n  AdminRealtimeHealthReport,\n  AdminRealtimeHealthStatus,\n} from \"@/features/admin/admin-realtime-health-monitor\";\nimport type {\n  AdminSelfHostedBackupReadinessReport,\n  AdminSelfHostedBackupReadinessStatus,\n} from \"@/features/admin/admin-self-hosted-backup-readiness\";\nimport type {\n  DeployEnvironmentPreflightReport,\n  DeployEnvironmentPreflightStatus,\n} from \"@/features/admin/deploy-environment-preflight\";\nimport type {\n  ProductionDeploySmokeReport,\n  ProductionDeploySmokeStatus,\n} from \"@/features/editor/production-deploy-smoke\";\n\nexport type SelfHostedSyncDiagnosticStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type SelfHostedSyncDiagnosticCategory =\n  | \"browser\"\n  | \"database\"\n  | \"desktop\"\n  | \"operator\"\n  | \"realtime\"\n  | \"vercel\";\n\nexport type SelfHostedSyncDiagnosticRow = {\n  id: string;\n  category: SelfHostedSyncDiagnosticCategory;\n  status: SelfHostedSyncDiagnosticStatus;\n  label: string;\n  value: string;\n  detail: string;\n  recommendation: string;\n  repairCommand: string;\n  latestAt: string | null;\n};\n\nexport type SelfHostedSyncRepairCommand = {\n  id: string;\n  category: SelfHostedSyncDiagnosticCategory;\n  command: string;\n  reason: string;\n};\n\nexport type SelfHostedSyncDiagnosticReport = {\n  generatedAt: string;\n  status: SelfHostedSyncDiagnosticStatus;\n  score: number;\n  readyCount: number;\n  reviewCount: number;\n  blockedCount: number;\n  databaseKind: AdminSelfHostedBackupReadinessReport[\"databaseKind\"];\n  databaseAuthReady: boolean;\n  desktopChannel: AdminDesktopUpdateChannelReport[\"activeChannel\"];\n  desktopVersionParity: string;\n  browserBaseUrl: string;\n  vercelEnv: string;\n  runtime: string;\n  realtimeScore: number;\n  routeSmokeScore: number;\n  repairCommandCount: number;\n  rows: SelfHostedSyncDiagnosticRow[];\n  repairCommands: SelfHostedSyncRepairCommand[];\n};\n\nexport type SelfHostedSyncDiagnosticInput = {\n  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;\n  desktopUpdateChannels: AdminDesktopUpdateChannelReport;\n  generatedAt?: string;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  realtimeHealth: AdminRealtimeHealthReport;\n  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;\n};\n\nexport function getSelfHostedSyncDiagnosticReport({\n  deployEnvironmentPreflight,\n  desktopUpdateChannels,\n  generatedAt = new Date().toISOString(),\n  productionDeploySmoke,\n  realtimeHealth,\n  selfHostedBackupReadiness,\n}: SelfHostedSyncDiagnosticInput): SelfHostedSyncDiagnosticReport {\n  const rows = [\n    getDatabaseRow(selfHostedBackupReadiness),\n    getDesktopRow(desktopUpdateChannels),\n    getBrowserRow(productionDeploySmoke, deployEnvironmentPreflight),\n    getVercelRow(deployEnvironmentPreflight),\n    getRealtimeRow(realtimeHealth),\n    getOperatorRow({\n      deployEnvironmentPreflight,\n      desktopUpdateChannels,\n      selfHostedBackupReadiness,\n    }),\n  ].sort(sortRows);\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const status: SelfHostedSyncDiagnosticStatus =\n    blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\";\n  const repairCommands = getRepairCommands(rows);\n\n  return {\n    generatedAt,\n    status,\n    score: Math.max(0, 100 - blockedCount * 20 - reviewCount * 7),\n    readyCount,\n    reviewCount,\n    blockedCount,\n    databaseKind: selfHostedBackupReadiness.databaseKind,\n    databaseAuthReady: selfHostedBackupReadiness.databaseAuthReady,\n    desktopChannel: desktopUpdateChannels.activeChannel,\n    desktopVersionParity: `${desktopUpdateChannels.currentVersion} -> ${desktopUpdateChannels.targetVersion}`,\n    browserBaseUrl: productionDeploySmoke.baseUrl,\n    vercelEnv: deployEnvironmentPreflight.vercelEnv,\n    runtime: deployEnvironmentPreflight.runtime,\n    realtimeScore: realtimeHealth.score,\n    routeSmokeScore: productionDeploySmoke.score,\n    repairCommandCount: repairCommands.length,\n    rows,\n    repairCommands,\n  };\n}\n\nfunction getDatabaseRow(\n  report: AdminSelfHostedBackupReadinessReport,\n): SelfHostedSyncDiagnosticRow {\n  const status = fromSharedStatus(report.status);\n  const value = report.databaseConfigured\n    ? report.databaseKind\n    : \"not configured\";\n\n  return {\n    id: \"self-hosted-sync-database\",\n    category: \"database\",\n    status,\n    label: \"Turso/libSQL sync source\",\n    value,\n    detail: report.databaseConfigured\n      ? `${report.databaseKind} is configured, auth is ${report.databaseAuthReady ? \"ready\" : \"missing\"}, backup schedule is ${report.backupScheduleConfigured ? \"configured\" : \"missing\"}, and ${report.versionAnchorCount} rollback version anchor${report.versionAnchorCount === 1 ? \"\" : \"s\"} are visible.`\n      : \"No Turso/libSQL database source is configured for self-hosted sync.\",\n    recommendation:\n      status === \"ready\"\n        ? \"Database source, auth, backup schedule, and version anchors are ready for self-hosted sync.\"\n        : \"Fix database auth, backup schedule, backup target, and named-version anchors before self-hosted cutover.\",\n    repairCommand:\n      report.commands.find((command) => command.includes(\"turso\")) ??\n      \"bun run db:push\",\n    latestAt: report.generatedAt,\n  };\n}\n\nfunction getDesktopRow(\n  report: AdminDesktopUpdateChannelReport,\n): SelfHostedSyncDiagnosticRow {\n  const status = fromDesktopStatus(report.status);\n  const packageLabel = `${report.packageCount} package${report.packageCount === 1 ? \"\" : \"s\"}`;\n\n  return {\n    id: \"self-hosted-sync-desktop\",\n    category: \"desktop\",\n    status,\n    label: \"Desktop package parity\",\n    value: `${report.currentVersion} -> ${report.targetVersion}`,\n    detail: `${report.activeChannel} channel has ${packageLabel}, rollout ${report.rolloutPercent}%, hold ${report.holdActive ? \"active\" : \"clear\"}, and ${report.blockedCount} blocked package row${report.blockedCount === 1 ? \"\" : \"s\"}.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Desktop update metadata matches the current release channel.\"\n        : \"Repair desktop feed, package signatures, or rollout holds before self-hosted desktop distribution.\",\n    repairCommand: \"bun run tauri:build\",\n    latestAt: report.generatedAt,\n  };\n}\n\nfunction getBrowserRow(\n  smoke: ProductionDeploySmokeReport,\n  preflight: DeployEnvironmentPreflightReport,\n): SelfHostedSyncDiagnosticRow {\n  const status = fromSharedStatus(smoke.status);\n  const originMatches =\n    preflight.appOrigin === \"not configured\" ||\n    smoke.baseUrl === \"https://<deployment-url>\" ||\n    preflight.appOrigin === smoke.baseUrl;\n\n  return {\n    id: \"self-hosted-sync-browser\",\n    category: \"browser\",\n    status: !originMatches && status === \"ready\" ? \"review\" : status,\n    label: \"Browser route parity\",\n    value: `${smoke.readyCount}/${smoke.routeCount} routes`,\n    detail: `${smoke.requiredRouteCount} required browser route${smoke.requiredRouteCount === 1 ? \"\" : \"s\"} are tracked. App origin is ${preflight.appOrigin}; smoke base URL is ${smoke.baseUrl}.`,\n    recommendation:\n      originMatches && status === \"ready\"\n        ? \"Browser route evidence matches the configured app origin.\"\n        : \"Refresh deployed route smoke against the same origin used by auth and public links.\",\n    repairCommand: \"bun run ops:post-deploy-smoke\",\n    latestAt: smoke.generatedAt,\n  };\n}\n\nfunction getVercelRow(\n  report: DeployEnvironmentPreflightReport,\n): SelfHostedSyncDiagnosticRow {\n  const status = fromSharedStatus(report.status);\n\n  return {\n    id: \"self-hosted-sync-vercel\",\n    category: \"vercel\",\n    status,\n    label: \"Vercel runtime parity\",\n    value: `${report.vercelEnv} / ${report.runtime}`,\n    detail: `${report.requiredCount} required env row${report.requiredCount === 1 ? \"\" : \"s\"}, ${report.secretCount} secret row${report.secretCount === 1 ? \"\" : \"s\"}, ${report.blockedCount} blocked and ${report.reviewCount} review preflight row${report.reviewCount === 1 ? \"\" : \"s\"}.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Vercel env and runtime preflight is ready for self-hosted parity comparison.\"\n        : \"Resolve missing envs, app origin drift, and runtime warnings before comparing self-hosted behavior.\",\n    repairCommand: \"bun run ops:env-preflight\",\n    latestAt: report.generatedAt,\n  };\n}\n\nfunction getRealtimeRow(\n  report: AdminRealtimeHealthReport,\n): SelfHostedSyncDiagnosticRow {\n  const status = fromRealtimeStatus(report.status);\n\n  return {\n    id: \"self-hosted-sync-realtime\",\n    category: \"realtime\",\n    status,\n    label: \"Realtime sync parity\",\n    value: `${report.score}/100`,\n    detail: `${report.monitoredRoomCount} monitored room${report.monitoredRoomCount === 1 ? \"\" : \"s\"}, ${report.offlineReplayQueueCount} offline replay item${report.offlineReplayQueueCount === 1 ? \"\" : \"s\"}, ${report.eventDriftCount} drift event${report.eventDriftCount === 1 ? \"\" : \"s\"}, and ${report.pendingSaveSignalCount} pending save signal${report.pendingSaveSignalCount === 1 ? \"\" : \"s\"}.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Realtime evidence is ready for browser, desktop, and self-hosted parity checks.\"\n        : \"Refresh collaboration rooms and resolve save/reconnect drift before self-hosted sync approval.\",\n    repairCommand: \"Export Admin > Governance workspace realtime health JSON.\",\n    latestAt: report.generatedAt,\n  };\n}\n\nfunction getOperatorRow({\n  deployEnvironmentPreflight,\n  desktopUpdateChannels,\n  selfHostedBackupReadiness,\n}: {\n  deployEnvironmentPreflight: DeployEnvironmentPreflightReport;\n  desktopUpdateChannels: AdminDesktopUpdateChannelReport;\n  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;\n}): SelfHostedSyncDiagnosticRow {\n  const commandCount =\n    deployEnvironmentPreflight.commands.length +\n    desktopUpdateChannels.commands.length +\n    selfHostedBackupReadiness.commands.length;\n  const status: SelfHostedSyncDiagnosticStatus =\n    commandCount >= 6 ? \"ready\" : commandCount > 0 ? \"review\" : \"blocked\";\n\n  return {\n    id: \"self-hosted-sync-operator-repairs\",\n    category: \"operator\",\n    status,\n    label: \"Operator repair commands\",\n    value: `${commandCount}`,\n    detail: `${commandCount} repair or verification command${commandCount === 1 ? \"\" : \"s\"} are available across env preflight, backup readiness, and desktop channel reports.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Repair commands are sufficient for a repeatable self-hosted parity runbook.\"\n        : \"Add explicit env, database, desktop, and route smoke repair commands before handoff.\",\n    repairCommand: \"Export Admin > Governance self-hosted sync diagnostics Markdown.\",\n    latestAt: selfHostedBackupReadiness.generatedAt,\n  };\n}\n\nfunction getRepairCommands(\n  rows: SelfHostedSyncDiagnosticRow[],\n): SelfHostedSyncRepairCommand[] {\n  return rows.map((row) => ({\n    id: `${row.id}-repair`,\n    category: row.category,\n    command: row.repairCommand,\n    reason:\n      row.status === \"ready\"\n        ? `${row.label} verification command.`\n        : row.recommendation,\n  }));\n}\n\nfunction fromSharedStatus(\n  status:\n    | AdminSelfHostedBackupReadinessStatus\n    | DeployEnvironmentPreflightStatus\n    | ProductionDeploySmokeStatus,\n): SelfHostedSyncDiagnosticStatus {\n  return status;\n}\n\nfunction fromDesktopStatus(\n  status: AdminDesktopUpdateChannelStatus,\n): SelfHostedSyncDiagnosticStatus {\n  return status;\n}\n\nfunction fromRealtimeStatus(\n  status: AdminRealtimeHealthStatus,\n): SelfHostedSyncDiagnosticStatus {\n  return status;\n}\n\nfunction sortRows(\n  first: SelfHostedSyncDiagnosticRow,\n  second: SelfHostedSyncDiagnosticRow,\n) {\n  return (\n    getStatusWeight(first.status) - getStatusWeight(second.status) ||\n    first.category.localeCompare(second.category)\n  );\n}\n\nfunction getStatusWeight(status: SelfHostedSyncDiagnosticStatus) {\n  if (status === \"blocked\") {\n    return 0;\n  }\n\n  if (status === \"review\") {\n    return 1;\n  }\n\n  return 2;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-self-hosted-sync-diagnostics.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-self-hosted-sync-diagnostics-ts-8aff1c94d64a5f7f.mjs",
  "kind": "ts",
  "hash": "8aff1c94d64a5f7f",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-self-hosted-sync-diagnostics.ts",
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
        "specifier": "@/features/admin/admin-desktop-update-channel",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-realtime-health-monitor",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-self-hosted-backup-readiness",
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
      "getSelfHostedSyncDiagnosticReport"
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
