import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-activity-operation-conflicts-ts-40cf3fb3fa8c2477.mjs";
export const dxSourceText = "import type {\n  DesignActivityEvent,\n  DesignActivityKind,\n} from \"@/features/editor/types\";\nimport { getOperationConflictRows } from \"@/features/editor/activity-operation-conflicts\";\n\nexport type ActivityConflictReviewStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type ActivityConflictReviewKind =\n  | \"burst\"\n  | \"comment\"\n  | \"destructive\"\n  | \"export\"\n  | \"import\"\n  | \"operation\"\n  | \"target\"\n  | \"version\";\n\nexport type ActivityConflictReviewRow = {\n  id: string;\n  status: ActivityConflictReviewStatus;\n  kind: ActivityConflictReviewKind;\n  label: string;\n  detail: string;\n  eventCount: number;\n  targetId?: string;\n  actorNames: string[];\n  latestActivityAt?: string;\n  operationLabels?: string[];\n  eventIds?: string[];\n  resolutionHint?: string;\n};\n\nexport type ActivityConflictReviewReport = {\n  score: number;\n  eventCount: number;\n  actorCount: number;\n  operationConflictCount: number;\n  targetConflictCount: number;\n  burstCount: number;\n  destructiveCount: number;\n  staleExportCount: number;\n  importAfterExportCount: number;\n  versionAfterExportCount: number;\n  blockedCount: number;\n  reviewCount: number;\n  readyCount: number;\n  latestActivityAt: string | null;\n  rows: ActivityConflictReviewRow[];\n};\n\nconst rapidTargetWindowMs = 5 * 60 * 1000;\nconst recentBurstWindowMs = 15 * 60 * 1000;\nconst recentBurstReviewCount = 10;\nconst recentBurstBlockedCount = 18;\nconst targetChangeReviewCount = 3;\nconst destructiveLabels = [\n  \"clear\",\n  \"delete\",\n  \"detach\",\n  \"import\",\n  \"remove\",\n  \"restore\",\n];\nconst handoffKinds = new Set<DesignActivityKind>([\n  \"branch\",\n  \"component\",\n  \"comment\",\n  \"import\",\n  \"library\",\n  \"page\",\n  \"version\",\n]);\n\nexport function getActivityConflictReview(\n  events: DesignActivityEvent[],\n): ActivityConflictReviewReport {\n  const sortedEvents = [...events].sort(\n    (first, second) =>\n      getActivityTime(second.createdAt) - getActivityTime(first.createdAt),\n  );\n  const rows: ActivityConflictReviewRow[] = [];\n  const latestEvent = sortedEvents[0];\n  const latestExport = sortedEvents.find((event) => event.kind === \"export\");\n  const latestImport = sortedEvents.find((event) => event.kind === \"import\");\n  const latestVersion = sortedEvents.find((event) => event.kind === \"version\");\n  const latestExportTime = latestExport\n    ? getActivityTime(latestExport.createdAt)\n    : null;\n\n  rows.push(...getOperationConflictRows(sortedEvents));\n  rows.push(...getTargetConflictRows(sortedEvents));\n\n  const burstEvents = getRecentWindowEvents(\n    sortedEvents,\n    recentBurstWindowMs,\n    latestEvent?.createdAt,\n  );\n\n  if (burstEvents.length >= recentBurstReviewCount) {\n    rows.push({\n      id: \"recent-activity-burst\",\n      status:\n        burstEvents.length >= recentBurstBlockedCount ? \"blocked\" : \"review\",\n      kind: \"burst\",\n      label: \"Activity burst needs review\",\n      detail: `${burstEvents.length} events happened within ${formatMinutes(recentBurstWindowMs)}.`,\n      eventCount: burstEvents.length,\n      actorNames: getActorNames(burstEvents),\n      latestActivityAt: burstEvents[0]?.createdAt,\n    });\n  }\n\n  const destructiveEvents = sortedEvents.filter(isDestructiveEvent);\n\n  if (destructiveEvents.length > 0) {\n    const recentDestructiveEvents = destructiveEvents.slice(0, 6);\n\n    rows.push({\n      id: \"destructive-activity\",\n      status:\n        recentDestructiveEvents.some((event) => event.kind === \"import\") ||\n        recentDestructiveEvents.length >= 3\n          ? \"blocked\"\n          : \"review\",\n      kind: \"destructive\",\n      label: \"Destructive activity recorded\",\n      detail: recentDestructiveEvents\n        .map((event) => `${event.label}${event.detail ? ` (${event.detail})` : \"\"}`)\n        .join(\"; \"),\n      eventCount: destructiveEvents.length,\n      actorNames: getActorNames(destructiveEvents),\n      latestActivityAt: destructiveEvents[0]?.createdAt,\n    });\n  }\n\n  if (latestExport && latestExportTime !== null) {\n    const changesAfterExport = sortedEvents.filter(\n      (event) =>\n        getActivityTime(event.createdAt) > latestExportTime &&\n        isHandoffChangeEvent(event),\n    );\n\n    if (changesAfterExport.length > 0) {\n      rows.push({\n        id: \"stale-export\",\n        status: \"review\",\n        kind: \"export\",\n        label: \"Latest export is stale\",\n        detail: `${changesAfterExport.length} handoff event${changesAfterExport.length === 1 ? \"\" : \"s\"} happened after the latest export.`,\n        eventCount: changesAfterExport.length,\n        actorNames: getActorNames(changesAfterExport),\n        latestActivityAt: changesAfterExport[0]?.createdAt,\n      });\n    }\n  }\n\n  if (\n    latestImport &&\n    latestExport &&\n    getActivityTime(latestImport.createdAt) > getActivityTime(latestExport.createdAt)\n  ) {\n    rows.push({\n      id: \"import-after-export\",\n      status: \"review\",\n      kind: \"import\",\n      label: \"Import happened after export\",\n      detail: \"The latest export no longer reflects the current imported document state.\",\n      eventCount: 1,\n      actorNames: [latestImport.actorName],\n      latestActivityAt: latestImport.createdAt,\n    });\n  }\n\n  if (\n    latestVersion &&\n    latestExport &&\n    getActivityTime(latestVersion.createdAt) >\n      getActivityTime(latestExport.createdAt)\n  ) {\n    rows.push({\n      id: \"version-after-export\",\n      status: \"blocked\",\n      kind: \"version\",\n      label: \"Version action happened after export\",\n      detail: \"Export again after version merge, restore, or snapshot work.\",\n      eventCount: 1,\n      actorNames: [latestVersion.actorName],\n      latestActivityAt: latestVersion.createdAt,\n    });\n  }\n\n  rows.push(...getCommentRiskRows(sortedEvents));\n\n  if (rows.length === 0) {\n    rows.push({\n      id: \"activity-conflicts-ready\",\n      status: \"ready\",\n      kind: \"target\",\n      label: events.length > 0 ? \"No conflict patterns\" : \"No activity yet\",\n      detail:\n        events.length > 0\n          ? \"Recent activity has no stale export, destructive, burst, operation, or repeated-target review items.\"\n          : \"Activity conflict review will update after document work starts.\",\n      eventCount: events.length,\n      actorNames: getActorNames(events),\n      latestActivityAt: latestEvent?.createdAt,\n    });\n  }\n\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const operationConflictCount = rows.filter((row) => row.kind === \"operation\")\n    .length;\n  const targetConflictCount = rows.filter((row) => row.kind === \"target\").length;\n  const burstCount = rows.filter((row) => row.kind === \"burst\").length;\n  const staleExportCount = rows.filter((row) => row.kind === \"export\").length;\n  const importAfterExportCount = rows.filter((row) => row.kind === \"import\")\n    .length;\n  const versionAfterExportCount = rows.filter((row) => row.kind === \"version\")\n    .length;\n\n  return {\n    score: Math.max(0, 100 - blockedCount * 20 - reviewCount * 7),\n    eventCount: events.length,\n    actorCount: getActorNames(events).length,\n    operationConflictCount,\n    targetConflictCount,\n    burstCount,\n    destructiveCount: destructiveEvents.length,\n    staleExportCount,\n    importAfterExportCount,\n    versionAfterExportCount,\n    blockedCount,\n    reviewCount,\n    readyCount,\n    latestActivityAt: latestEvent?.createdAt ?? null,\n    rows,\n  };\n}\n\nexport function getActivityConflictReviewCsv(\n  report: ActivityConflictReviewReport,\n  rows: ActivityConflictReviewRow[] = report.rows,\n) {\n  const header: Array<keyof ActivityConflictReviewRow> = [\n    \"id\",\n    \"status\",\n    \"kind\",\n    \"label\",\n    \"detail\",\n    \"eventCount\",\n    \"targetId\",\n    \"actorNames\",\n    \"latestActivityAt\",\n    \"operationLabels\",\n    \"eventIds\",\n    \"resolutionHint\",\n  ];\n\n  return [\n    [\n      \"score\",\n      \"events\",\n      \"actors\",\n      \"operation_conflicts\",\n      \"target_conflicts\",\n      \"bursts\",\n      \"destructive_events\",\n      \"stale_exports\",\n      \"blocked\",\n      \"review\",\n    ].join(\",\"),\n    [\n      report.score,\n      report.eventCount,\n      report.actorCount,\n      report.operationConflictCount,\n      report.targetConflictCount,\n      report.burstCount,\n      report.destructiveCount,\n      report.staleExportCount,\n      report.blockedCount,\n      report.reviewCount,\n    ]\n      .map(escapeCsvCell)\n      .join(\",\"),\n    \"\",\n    header.join(\",\"),\n    ...rows.map((row) =>\n      header\n        .map((key) =>\n          escapeCsvCell(\n            Array.isArray(row[key]) ? row[key].join(\"; \") : row[key],\n          ),\n        )\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getActivityConflictReviewMarkdown(\n  report: ActivityConflictReviewReport,\n  rows: ActivityConflictReviewRow[] = report.rows,\n) {\n  return [\n    \"# Activity Conflict Review\",\n    \"\",\n    `Score: ${report.score}`,\n    `Events: ${report.eventCount}`,\n    `Actors: ${report.actorCount}`,\n    `Operation conflicts: ${report.operationConflictCount}`,\n    `Target conflicts: ${report.targetConflictCount}`,\n    `Activity bursts: ${report.burstCount}`,\n    `Destructive events: ${report.destructiveCount}`,\n    `Stale exports: ${report.staleExportCount}`,\n    `Last activity: ${report.latestActivityAt ?? \"No activity\"}`,\n    \"\",\n    \"## Review Queue\",\n    ...(rows.length > 0\n      ? rows.map(\n          (row) =>\n            `- [${row.status}] ${row.label}: ${row.detail}${row.targetId ? ` (target ${row.targetId})` : \"\"}${row.resolutionHint ? ` Hint: ${row.resolutionHint}` : \"\"}`,\n        )\n      : [\"- No activity conflict review rows.\"]),\n  ].join(\"\\n\");\n}\n\nfunction getTargetConflictRows(events: DesignActivityEvent[]) {\n  const rows: ActivityConflictReviewRow[] = [];\n  const groups = new Map<string, DesignActivityEvent[]>();\n\n  for (const event of events) {\n    if (!event.targetId || event.kind === \"export\") {\n      continue;\n    }\n\n    groups.set(event.targetId, [...(groups.get(event.targetId) ?? []), event]);\n  }\n\n  for (const [targetId, targetEvents] of groups) {\n    const conflictWindow = getFirstDenseWindow(\n      targetEvents,\n      rapidTargetWindowMs,\n      targetChangeReviewCount,\n    );\n\n    if (!conflictWindow) {\n      continue;\n    }\n\n    const actors = getActorNames(conflictWindow);\n    const hasDestructiveAction = conflictWindow.some(isDestructiveEvent);\n\n    rows.push({\n      id: `target-conflict-${targetId}`,\n      status: actors.length > 1 || hasDestructiveAction ? \"blocked\" : \"review\",\n      kind: \"target\",\n      label: \"Repeated target changes\",\n      detail: `${conflictWindow.length} activity events touched this target within ${formatMinutes(rapidTargetWindowMs)}.`,\n      eventCount: conflictWindow.length,\n      targetId,\n      actorNames: actors,\n      latestActivityAt: conflictWindow[0]?.createdAt,\n    });\n  }\n\n  return rows.slice(0, 8);\n}\n\nfunction getCommentRiskRows(events: DesignActivityEvent[]) {\n  const commentDeletes = events.filter(\n    (event) =>\n      event.kind === \"comment\" &&\n      /delete|remove|clear/i.test(`${event.label} ${event.detail ?? \"\"}`),\n  );\n\n  if (commentDeletes.length === 0) {\n    return [];\n  }\n\n  return [\n    {\n      id: \"comment-history-risk\",\n      status: \"review\",\n      kind: \"comment\",\n      label: \"Comment history changed\",\n      detail: `${commentDeletes.length} comment deletion or assignment-clearing event${commentDeletes.length === 1 ? \"\" : \"s\"} may affect review traceability.`,\n      eventCount: commentDeletes.length,\n      actorNames: getActorNames(commentDeletes),\n      latestActivityAt: commentDeletes[0]?.createdAt,\n    } satisfies ActivityConflictReviewRow,\n  ];\n}\n\nfunction getFirstDenseWindow(\n  events: DesignActivityEvent[],\n  windowMs: number,\n  minCount: number,\n) {\n  const chronologicalEvents = [...events].sort(\n    (first, second) =>\n      getActivityTime(first.createdAt) - getActivityTime(second.createdAt),\n  );\n\n  for (let index = 0; index < chronologicalEvents.length; index += 1) {\n    const start = getActivityTime(chronologicalEvents[index]?.createdAt);\n    const windowEvents = chronologicalEvents.filter((event) => {\n      const time = getActivityTime(event.createdAt);\n\n      return time >= start && time <= start + windowMs;\n    });\n\n    if (windowEvents.length >= minCount) {\n      return windowEvents.sort(\n        (first, second) =>\n          getActivityTime(second.createdAt) - getActivityTime(first.createdAt),\n      );\n    }\n  }\n\n  return null;\n}\n\nfunction getRecentWindowEvents(\n  events: DesignActivityEvent[],\n  windowMs: number,\n  latestCreatedAt?: string,\n) {\n  if (!latestCreatedAt) {\n    return [];\n  }\n\n  const latestTime = getActivityTime(latestCreatedAt);\n\n  return events.filter(\n    (event) => latestTime - getActivityTime(event.createdAt) <= windowMs,\n  );\n}\n\nfunction isDestructiveEvent(event: DesignActivityEvent) {\n  const text = `${event.kind} ${event.label} ${event.detail ?? \"\"}`.toLowerCase();\n\n  return destructiveLabels.some((label) => text.includes(label));\n}\n\nfunction isHandoffChangeEvent(event: DesignActivityEvent) {\n  return handoffKinds.has(event.kind);\n}\n\nfunction getActorNames(events: DesignActivityEvent[]) {\n  return Array.from(\n    new Set(events.map((event) => event.actorName.trim()).filter(Boolean)),\n  );\n}\n\nfunction getActivityTime(value?: string) {\n  if (!value) {\n    return 0;\n  }\n\n  const time = new Date(value).getTime();\n\n  return Number.isFinite(time) ? time : 0;\n}\n\nfunction formatMinutes(value: number) {\n  return `${Math.round(value / 60000)} minutes`;\n}\n\nfunction escapeCsvCell(\n  value: boolean | number | string | null | undefined,\n) {\n  if (value === null || value === undefined) {\n    return \"\";\n  }\n\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replace(/\"/g, '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/activity-conflict-review.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-activity-conflict-review-ts-f07c5a271cb9f63a.mjs",
  "kind": "ts",
  "hash": "f07c5a271cb9f63a",
  "dependencies": [
    {
      "specifier": "@/features/editor/activity-operation-conflicts",
      "resolved_path": "src/features/editor/activity-operation-conflicts.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-activity-operation-conflicts-ts-40cf3fb3fa8c2477.mjs",
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
    "source_path": "src/features/editor/activity-conflict-review.ts",
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
        "specifier": "@/features/editor/types",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/activity-operation-conflicts",
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
      "getActivityConflictReview",
      "getActivityConflictReviewCsv",
      "getActivityConflictReviewMarkdown"
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
