import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-public-route-analytics-utils-ts-b09cb0ba7a5d7bf6.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-public-route-analytics-types-ts-5f30779d6cf45d67.mjs";
export const dxSourceText = "import {\n  getEarliestPublicRouteAnalyticsIso,\n  getEventTime,\n  getLatestPublicRouteAnalyticsIso,\n  getWorstPublicRouteAnalyticsStatus,\n  publicRouteAnalyticsStatusWeight,\n  uniqueSortedPublicRouteValues,\n} from \"@/features/admin/admin-public-route-analytics-utils\";\nimport type {\n  AdminPublicRouteAnalyticsEvent,\n  AdminPublicRouteAnalyticsInput,\n  AdminPublicRouteAnalyticsReport,\n  AdminPublicRouteAnalyticsRoute,\n  AdminPublicRouteAnalyticsRow,\n  AdminPublicRouteAnalyticsShare,\n  AdminPublicRouteAnalyticsStatus,\n} from \"@/features/admin/admin-public-route-analytics-types\";\nimport {\n  publicRouteKinds,\n  type PublicRouteKind,\n} from \"@/features/public-route-analytics/types\";\n\nexport type {\n  AdminPublicRouteAnalyticsEvent,\n  AdminPublicRouteAnalyticsInput,\n  AdminPublicRouteAnalyticsReport,\n  AdminPublicRouteAnalyticsRoute,\n  AdminPublicRouteAnalyticsRow,\n  AdminPublicRouteAnalyticsRowCategory,\n  AdminPublicRouteAnalyticsShare,\n  AdminPublicRouteAnalyticsStatus,\n} from \"@/features/admin/admin-public-route-analytics-types\";\n\nconst dayMs = 24 * 60 * 60 * 1000;\n\nexport function getAdminPublicRouteAnalyticsReport({\n  events,\n  generatedAt = new Date().toISOString(),\n  now = Date.now(),\n  retentionDays,\n  shares,\n  storageAvailable,\n}: AdminPublicRouteAnalyticsInput): AdminPublicRouteAnalyticsReport {\n  const retainedEvents = events.filter(\n    (event) => new Date(event.retentionExpiresAt).getTime() >= now,\n  );\n  const expiredEvents = events.length - retainedEvents.length;\n  const activeShares = shares.filter((share) => !share.disabledAt);\n  const eventsByShareAndKind = groupEventsByShareAndKind(retainedEvents);\n  const routes = activeShares\n    .flatMap((share) =>\n      publicRouteKinds.map((routeKind) =>\n        toRoute({\n          events:\n            eventsByShareAndKind.get(getShareKindKey(share.id, routeKind)) ??\n            [],\n          now,\n          routeKind,\n          share,\n          storageAvailable,\n        }),\n      ),\n    )\n    .sort(sortPublicRouteAnalyticsRoutes);\n  const rows = getPublicRouteAnalyticsRows({\n    expiredEvents,\n    routes,\n    storageAvailable,\n  }).sort(sortPublicRouteAnalyticsRows);\n  const blockedCount = routes.filter((route) => route.status === \"blocked\").length;\n  const reviewCount = routes.filter((route) => route.status === \"review\").length;\n  const readyCount = routes.filter((route) => route.status === \"ready\").length;\n  const allRows =\n    rows.length > 0\n      ? rows\n      : [\n          {\n            id: \"public-route-analytics-ready\",\n            routeId: \"all\",\n            category: \"coverage\",\n            status: \"ready\",\n            label: \"Public route analytics ready\",\n            detail:\n              \"All active public share, prototype, and embed routes have recent privacy-safe route telemetry.\",\n            recommendation:\n              \"Export analytics evidence with public link observability before release approval.\",\n            count: retainedEvents.length,\n            latestAt: getLatestEventAt(retainedEvents),\n          } satisfies AdminPublicRouteAnalyticsRow,\n        ];\n\n  return {\n    generatedAt,\n    status: !storageAvailable\n      ? \"blocked\"\n      : getWorstPublicRouteAnalyticsStatus([\n          blockedCount > 0 ? \"blocked\" : \"ready\",\n          reviewCount > 0 || expiredEvents > 0 ? \"review\" : \"ready\",\n        ]),\n    score: Math.max(\n      0,\n      100 -\n        (storageAvailable ? 0 : 35) -\n        blockedCount * 14 -\n        reviewCount * 5 -\n        expiredEvents * 2,\n    ),\n    storageAvailable,\n    retentionDays,\n    activeShareCount: activeShares.length,\n    routeCount: routes.length,\n    eventCount: retainedEvents.length,\n    last24hEventCount: retainedEvents.filter(\n      (event) => now - getEventTime(event) <= dayMs,\n    ).length,\n    last7dEventCount: retainedEvents.filter(\n      (event) => now - getEventTime(event) <= dayMs * 7,\n    ).length,\n    shareRouteEventCount: countByRouteKind(retainedEvents, \"share\"),\n    prototypeRouteEventCount: countByRouteKind(retainedEvents, \"prototype\"),\n    embedRouteEventCount: countByRouteKind(retainedEvents, \"embed\"),\n    directReferrerCount: countByReferrerKind(retainedEvents, \"direct\"),\n    internalReferrerCount: countByReferrerKind(retainedEvents, \"internal\"),\n    externalReferrerCount: countByReferrerKind(retainedEvents, \"external\"),\n    unknownReferrerCount: countByReferrerKind(retainedEvents, \"unknown\"),\n    botEventCount: retainedEvents.filter(\n      (event) => event.userAgentFamily === \"bot\",\n    ).length,\n    retentionExpiredCount: expiredEvents,\n    missingCoverageCount: routes.filter((route) => route.eventCount === 0).length,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    routes,\n    rows: allRows,\n    commands: getPublicRouteAnalyticsCommands(retentionDays),\n  };\n}\n\nfunction toRoute({\n  events,\n  now,\n  routeKind,\n  share,\n  storageAvailable,\n}: {\n  events: AdminPublicRouteAnalyticsEvent[];\n  now: number;\n  routeKind: PublicRouteKind;\n  share: AdminPublicRouteAnalyticsShare;\n  storageAvailable: boolean;\n}): AdminPublicRouteAnalyticsRoute {\n  const latestAt = getLatestEventAt(events);\n  const last24hCount = events.filter(\n    (event) => now - getEventTime(event) <= dayMs,\n  ).length;\n  const last7dCount = events.filter(\n    (event) => now - getEventTime(event) <= dayMs * 7,\n  ).length;\n  const status = getRouteStatus({ events, last7dCount, storageAvailable });\n\n  return {\n    id: `${share.id}-${routeKind}`,\n    shareId: share.id,\n    fileId: share.fileId,\n    fileName: share.fileName,\n    ownerEmail: share.ownerEmail,\n    routeKind,\n    tokenScope: events[0]?.tokenScope ?? getShareTokenScope(share),\n    status,\n    eventCount: events.length,\n    last24hCount,\n    last7dCount,\n    referrerOrigins: uniqueSortedPublicRouteValues(\n      events.map((event) => event.referrerOrigin),\n    ).slice(0, 5),\n    referrerKinds: uniqueSortedPublicRouteValues(\n      events.map((event) => event.referrerKind),\n    ),\n    userAgentFamilies: uniqueSortedPublicRouteValues(\n      events.map((event) => event.userAgentFamily),\n    ),\n    hostnames: uniqueSortedPublicRouteValues(events.map((event) => event.host)),\n    latestAt,\n    earliestRetentionExpiresAt: events.reduce(\n      (earliest, event) =>\n        getEarliestPublicRouteAnalyticsIso(\n          earliest,\n          event.retentionExpiresAt,\n        ),\n      null as string | null,\n    ),\n    recommendation: getRouteRecommendation(status, events.length, routeKind),\n  };\n}\n\nfunction getPublicRouteAnalyticsRows({\n  expiredEvents,\n  routes,\n  storageAvailable,\n}: {\n  expiredEvents: number;\n  routes: AdminPublicRouteAnalyticsRoute[];\n  storageAvailable: boolean;\n}) {\n  const rows: AdminPublicRouteAnalyticsRow[] = [];\n\n  if (!storageAvailable) {\n    rows.push({\n      id: \"public-route-analytics-storage\",\n      routeId: \"storage\",\n      category: \"storage\",\n      status: \"blocked\",\n      label: \"Analytics storage unavailable\",\n      detail:\n        \"The public_route_event table is not readable yet, so admin aggregation is running without persisted route events.\",\n      recommendation:\n        \"Apply the Drizzle schema with the public_route_event table before release analytics signoff.\",\n      count: 0,\n      latestAt: null,\n    });\n  }\n\n  if (expiredEvents > 0) {\n    rows.push({\n      id: \"public-route-analytics-retention\",\n      routeId: \"retention\",\n      category: \"retention\",\n      status: \"review\",\n      label: \"Retention cleanup due\",\n      detail: `${expiredEvents} public route analytics events are past their retention window.`,\n      recommendation:\n        \"Purge expired route analytics rows before exporting the release evidence bundle.\",\n      count: expiredEvents,\n      latestAt: null,\n    });\n  }\n\n  for (const route of routes) {\n    if (route.eventCount === 0) {\n      rows.push({\n        id: `${route.id}-coverage`,\n        routeId: route.id,\n        category: \"coverage\",\n        status: route.status,\n        label: `${route.fileName} ${route.routeKind} coverage`,\n        detail: \"No retained route analytics events exist for this surface.\",\n        recommendation:\n          \"Open the public surface once after publication so release owners have route evidence.\",\n        count: 0,\n        latestAt: null,\n      });\n      continue;\n    }\n\n    if (route.last7dCount === 0) {\n      rows.push({\n        id: `${route.id}-stale`,\n        routeId: route.id,\n        category: \"capture\",\n        status: \"review\",\n        label: `${route.fileName} ${route.routeKind} stale analytics`,\n        detail: `${route.eventCount} events exist, but none were captured in the last 7 days.`,\n        recommendation:\n          \"Refresh this public route after the latest deploy or note why stale evidence is acceptable.\",\n        count: route.eventCount,\n        latestAt: route.latestAt,\n      });\n    }\n\n    if (route.referrerKinds.includes(\"external\")) {\n      rows.push({\n        id: `${route.id}-external-referrer`,\n        routeId: route.id,\n        category: \"referrer\",\n        status: \"review\",\n        label: `${route.fileName} ${route.routeKind} external referrer`,\n        detail: `External origins seen: ${route.referrerOrigins.join(\", \") || \"origin redacted\"}.`,\n        recommendation:\n          \"Confirm the external host is expected before keeping this public route enabled.\",\n        count: route.referrerOrigins.length,\n        latestAt: route.latestAt,\n      });\n    }\n  }\n\n  return rows;\n}\n\nfunction getRouteStatus({\n  events,\n  last7dCount,\n  storageAvailable,\n}: {\n  events: AdminPublicRouteAnalyticsEvent[];\n  last7dCount: number;\n  storageAvailable: boolean;\n}): AdminPublicRouteAnalyticsStatus {\n  if (!storageAvailable) {\n    return \"blocked\";\n  }\n\n  if (events.length === 0 || last7dCount === 0) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getRouteRecommendation(\n  status: AdminPublicRouteAnalyticsStatus,\n  eventCount: number,\n  routeKind: PublicRouteKind,\n) {\n  if (status === \"blocked\") {\n    return \"Repair analytics storage before using this route in release signoff.\";\n  }\n\n  if (eventCount === 0) {\n    return `Open the ${routeKind} route once to capture privacy-safe route evidence.`;\n  }\n\n  if (status === \"review\") {\n    return \"Refresh the route after deployment so the evidence is recent.\";\n  }\n\n  return \"Route telemetry is fresh enough for public release evidence.\";\n}\n\nfunction groupEventsByShareAndKind(events: AdminPublicRouteAnalyticsEvent[]) {\n  const grouped = new Map<string, AdminPublicRouteAnalyticsEvent[]>();\n\n  for (const event of events) {\n    const key = getShareKindKey(event.shareId, event.routeKind);\n    grouped.set(key, [...(grouped.get(key) ?? []), event]);\n  }\n\n  for (const [key, value] of grouped) {\n    grouped.set(\n      key,\n      value.sort((left, right) => getEventTime(right) - getEventTime(left)),\n    );\n  }\n\n  return grouped;\n}\n\nfunction getShareKindKey(shareId: string, routeKind: PublicRouteKind) {\n  return `${shareId}:${routeKind}`;\n}\n\nfunction getShareTokenScope(share: AdminPublicRouteAnalyticsShare) {\n  return [\n    share.permissionPreset,\n    share.accessLevel,\n    share.allowDownload ? \"download\" : \"no-download\",\n    share.allowComments ? \"comments\" : \"no-comments\",\n  ].join(\":\");\n}\n\nfunction countByRouteKind(\n  events: AdminPublicRouteAnalyticsEvent[],\n  routeKind: PublicRouteKind,\n) {\n  return events.filter((event) => event.routeKind === routeKind).length;\n}\n\nfunction countByReferrerKind(\n  events: AdminPublicRouteAnalyticsEvent[],\n  referrerKind: string,\n) {\n  return events.filter((event) => event.referrerKind === referrerKind).length;\n}\n\nfunction getLatestEventAt(events: AdminPublicRouteAnalyticsEvent[]) {\n  return events.reduce(\n    (latest, event) =>\n      getLatestPublicRouteAnalyticsIso(latest, event.createdAt),\n    null as string | null,\n  );\n}\n\nfunction sortPublicRouteAnalyticsRoutes(\n  left: AdminPublicRouteAnalyticsRoute,\n  right: AdminPublicRouteAnalyticsRoute,\n) {\n  return (\n    publicRouteAnalyticsStatusWeight[left.status] -\n      publicRouteAnalyticsStatusWeight[right.status] ||\n    right.eventCount - left.eventCount ||\n    left.fileName.localeCompare(right.fileName) ||\n    publicRouteKinds.indexOf(left.routeKind) -\n      publicRouteKinds.indexOf(right.routeKind)\n  );\n}\n\nfunction sortPublicRouteAnalyticsRows(\n  left: AdminPublicRouteAnalyticsRow,\n  right: AdminPublicRouteAnalyticsRow,\n) {\n  return (\n    publicRouteAnalyticsStatusWeight[left.status] -\n      publicRouteAnalyticsStatusWeight[right.status] ||\n    right.count - left.count ||\n    (right.latestAt ? new Date(right.latestAt).getTime() : 0) -\n      (left.latestAt ? new Date(left.latestAt).getTime() : 0)\n  );\n}\n\nfunction getPublicRouteAnalyticsCommands(retentionDays: number) {\n  return [\n    \"Keep public route analytics privacy-safe: no IP addresses, raw tokens, full referrers, or raw user agents.\",\n    `Retain public route analytics for ${retentionDays} days and purge expired rows before release evidence export.`,\n    \"Open every active share, prototype, and embed surface after deploy so the admin panel has fresh route evidence.\",\n    \"Review external referrer origins before approving public embeds or long-lived share links.\",\n    \"Export the analytics bundle with public link observability, publish channels, and access budget evidence.\",\n  ];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-public-route-analytics.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-route-analytics-ts-696cd325b6ccbbca.mjs",
  "kind": "ts",
  "hash": "696cd325b6ccbbca",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-public-route-analytics-utils",
      "resolved_path": "src/features/admin/admin-public-route-analytics-utils.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-route-analytics-utils-ts-b09cb0ba7a5d7bf6.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/public-route-analytics/types",
      "resolved_path": "src/features/public-route-analytics/types.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-public-route-analytics-types-ts-5f30779d6cf45d67.mjs",
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
    "source_path": "src/features/admin/admin-public-route-analytics.ts",
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
        "specifier": "@/features/admin/admin-public-route-analytics-utils",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-public-route-analytics-types",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/public-route-analytics/types",
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
      "getAdminPublicRouteAnalyticsReport"
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
