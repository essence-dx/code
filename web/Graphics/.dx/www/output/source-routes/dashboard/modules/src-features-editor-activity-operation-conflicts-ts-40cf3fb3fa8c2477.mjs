
export const dxSourceText = "import type { DesignActivityEvent } from \"@/features/editor/types\";\nimport type { ActivityConflictReviewRow } from \"@/features/editor/activity-conflict-review\";\n\nconst simultaneousOperationWindowMs = 2 * 60 * 1000;\nconst maxOperationConflictRows = 8;\nconst minimumOperationConflictEvents = 2;\n\ntype OperationWindow = {\n  events: DesignActivityEvent[];\n  actorNames: string[];\n  operationLabels: string[];\n  operationFamilies: string[];\n  score: number;\n};\n\nconst operationFamilies = [\n  {\n    label: \"Geometry\",\n    pattern: /align|bounds|distribut|frame|guide|layout|move|nudge|position|resize|rotate|scale|snap/i,\n  },\n  {\n    label: \"Style\",\n    pattern: /blend|blur|color|effect|fill|font|gradient|opacity|shadow|stroke|text style|typography/i,\n  },\n  {\n    label: \"Structure\",\n    pattern: /add|boolean|component|delete|detach|duplicate|group|import|instance|layer|mask|paste|remove|reorder|restore|ungroup/i,\n  },\n  {\n    label: \"Content\",\n    pattern: /assignment|comment|copy|mention|rename|reply|text|version/i,\n  },\n  {\n    label: \"Handoff\",\n    pattern: /code connect|dev mode|export|handoff|prototype|resource|share|snapshot/i,\n  },\n];\n\nexport function getOperationConflictRows(\n  events: DesignActivityEvent[],\n): ActivityConflictReviewRow[] {\n  const groups = groupEventsByTarget(events.filter(isReviewableOperationEvent));\n  const rows: ActivityConflictReviewRow[] = [];\n\n  for (const [targetId, targetEvents] of groups) {\n    const operationWindow = getBestOperationWindow(targetEvents);\n\n    if (!operationWindow) {\n      continue;\n    }\n\n    const latestEvents = [...operationWindow.events].sort(\n      (first, second) =>\n        getActivityTime(second.createdAt) - getActivityTime(first.createdAt),\n    );\n    const hasDestructiveAction = latestEvents.some(isDestructiveOperation);\n    const status =\n      hasDestructiveAction ||\n      operationWindow.actorNames.length > 1 ||\n      operationWindow.operationFamilies.length >= 3\n        ? \"blocked\"\n        : \"review\";\n\n    rows.push({\n      id: `operation-conflict-${targetId}`,\n      status,\n      kind: \"operation\",\n      label:\n        operationWindow.actorNames.length > 1\n          ? \"Simultaneous collaborator operations\"\n          : \"Rapid operation sequence\",\n      detail: getOperationConflictDetail(operationWindow),\n      eventCount: operationWindow.events.length,\n      targetId,\n      actorNames: operationWindow.actorNames,\n      latestActivityAt: latestEvents[0]?.createdAt,\n      operationLabels: operationWindow.operationLabels,\n      eventIds: latestEvents.map((event) => event.id),\n      resolutionHint: getOperationResolutionHint(\n        operationWindow,\n        hasDestructiveAction,\n      ),\n    });\n  }\n\n  return rows\n    .sort((first, second) => {\n      const statusScore =\n        getStatusWeight(second.status) - getStatusWeight(first.status);\n\n      if (statusScore !== 0) {\n        return statusScore;\n      }\n\n      return (\n        getActivityTime(second.latestActivityAt) -\n        getActivityTime(first.latestActivityAt)\n      );\n    })\n    .slice(0, maxOperationConflictRows);\n}\n\nfunction groupEventsByTarget(events: DesignActivityEvent[]) {\n  const groups = new Map<string, DesignActivityEvent[]>();\n\n  for (const event of events) {\n    if (!event.targetId) {\n      continue;\n    }\n\n    groups.set(event.targetId, [...(groups.get(event.targetId) ?? []), event]);\n  }\n\n  return groups;\n}\n\nfunction getBestOperationWindow(events: DesignActivityEvent[]) {\n  const chronologicalEvents = [...events].sort(\n    (first, second) =>\n      getActivityTime(first.createdAt) - getActivityTime(second.createdAt),\n  );\n  let bestWindow: OperationWindow | null = null;\n\n  for (let index = 0; index < chronologicalEvents.length; index += 1) {\n    const startTime = getActivityTime(chronologicalEvents[index]?.createdAt);\n    const windowEvents = chronologicalEvents.filter((event) => {\n      const eventTime = getActivityTime(event.createdAt);\n\n      return (\n        eventTime >= startTime &&\n        eventTime <= startTime + simultaneousOperationWindowMs\n      );\n    });\n\n    if (windowEvents.length < minimumOperationConflictEvents) {\n      continue;\n    }\n\n    const operationLabels = getOperationLabels(windowEvents);\n    const actorNames = getActorNames(windowEvents);\n\n    if (operationLabels.length < 2 && actorNames.length < 2) {\n      continue;\n    }\n\n    const operationFamilies = getOperationFamilies(windowEvents);\n    const score =\n      windowEvents.length +\n      operationLabels.length * 4 +\n      actorNames.length * 3 +\n      operationFamilies.length * 2 +\n      (windowEvents.some(isDestructiveOperation) ? 6 : 0);\n    const operationWindow = {\n      events: windowEvents,\n      actorNames,\n      operationLabels,\n      operationFamilies,\n      score,\n    };\n\n    if (!bestWindow || operationWindow.score > bestWindow.score) {\n      bestWindow = operationWindow;\n    }\n  }\n\n  return bestWindow;\n}\n\nfunction getOperationConflictDetail(operationWindow: OperationWindow) {\n  const families =\n    operationWindow.operationFamilies.length > 0\n      ? operationWindow.operationFamilies.join(\", \")\n      : \"mixed\";\n  const operations = operationWindow.operationLabels.slice(0, 4).join(\", \");\n\n  return `${operationWindow.events.length} ${families.toLowerCase()} operation${operationWindow.events.length === 1 ? \"\" : \"s\"} touched the same target within ${formatMinutes(simultaneousOperationWindowMs)}: ${operations}.`;\n}\n\nfunction getOperationResolutionHint(\n  operationWindow: OperationWindow,\n  hasDestructiveAction: boolean,\n) {\n  if (hasDestructiveAction) {\n    return \"Review the final layer state against version history before exporting or branching.\";\n  }\n\n  if (operationWindow.actorNames.length > 1) {\n    return \"Confirm the intended last-writer result with the listed collaborators before handoff.\";\n  }\n\n  return \"Check the operation order and keep the current activity row with the design handoff.\";\n}\n\nfunction getOperationLabels(events: DesignActivityEvent[]) {\n  return Array.from(new Set(events.map(getOperationLabel))).slice(0, 6);\n}\n\nfunction getOperationFamilies(events: DesignActivityEvent[]) {\n  const text = events\n    .map((event) => `${event.kind} ${event.label} ${event.detail ?? \"\"}`)\n    .join(\" \");\n\n  return operationFamilies\n    .filter((family) => family.pattern.test(text))\n    .map((family) => family.label);\n}\n\nfunction getOperationLabel(event: DesignActivityEvent) {\n  const text = event.label.trim() || event.kind;\n\n  return text.length > 48 ? `${text.slice(0, 45)}...` : text;\n}\n\nfunction getActorNames(events: DesignActivityEvent[]) {\n  return Array.from(\n    new Set(events.map((event) => event.actorName.trim()).filter(Boolean)),\n  );\n}\n\nfunction isReviewableOperationEvent(event: DesignActivityEvent) {\n  return Boolean(event.targetId) && event.kind !== \"export\";\n}\n\nfunction isDestructiveOperation(event: DesignActivityEvent) {\n  return /clear|delete|detach|import|remove|restore/i.test(\n    `${event.kind} ${event.label} ${event.detail ?? \"\"}`,\n  );\n}\n\nfunction getStatusWeight(status: ActivityConflictReviewRow[\"status\"]) {\n  if (status === \"blocked\") {\n    return 2;\n  }\n\n  return status === \"review\" ? 1 : 0;\n}\n\nfunction getActivityTime(value?: string) {\n  if (!value) {\n    return 0;\n  }\n\n  const time = new Date(value).getTime();\n\n  return Number.isFinite(time) ? time : 0;\n}\n\nfunction formatMinutes(value: number) {\n  return `${Math.round(value / 60000)} minutes`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/activity-operation-conflicts.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-activity-operation-conflicts-ts-40cf3fb3fa8c2477.mjs",
  "kind": "ts",
  "hash": "40cf3fb3fa8c2477",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/activity-operation-conflicts.ts",
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
        "specifier": "@/features/editor/activity-conflict-review",
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
      "getOperationConflictRows"
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
