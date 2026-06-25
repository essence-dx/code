import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-embed-security-policy-ts-29323cc2cf6b1c59.mjs";
export const dxSourceText = "import {\n  isEmbedOriginAllowed,\n  resolveEmbedSecurityPolicy,\n} from \"@/features/embed-security/policy\";\nimport type {\n  AdminEmbedSecurityInput,\n  AdminEmbedSecurityReport,\n  AdminEmbedSecurityRow,\n  AdminEmbedSecurityShare,\n  AdminEmbedSecurityStatus,\n  AdminEmbedSecurityTarget,\n} from \"@/features/admin/admin-embed-security-types\";\n\nexport type {\n  AdminEmbedSecurityAnalyticsRoute,\n  AdminEmbedSecurityInput,\n  AdminEmbedSecurityReport,\n  AdminEmbedSecurityRow,\n  AdminEmbedSecurityRowCategory,\n  AdminEmbedSecurityShare,\n  AdminEmbedSecurityStatus,\n  AdminEmbedSecurityTarget,\n} from \"@/features/admin/admin-embed-security-types\";\n\nconst statusWeight: Record<AdminEmbedSecurityStatus, number> = {\n  blocked: 0,\n  review: 1,\n  ready: 2,\n};\n\nexport function getAdminEmbedSecurityReport({\n  analyticsRoutes,\n  appOrigin,\n  env = process.env,\n  generatedAt = new Date().toISOString(),\n  shares,\n}: AdminEmbedSecurityInput): AdminEmbedSecurityReport {\n  const embedRoutesByShareId = new Map(\n    analyticsRoutes\n      .filter((route) => route.routeKind === \"embed\")\n      .map((route) => [route.shareId, route]),\n  );\n  const activeShares = shares.filter((share) => !share.disabledAt);\n  const targets = activeShares\n    .map((share) =>\n      toEmbedTarget({\n        appOrigin,\n        env,\n        route: embedRoutesByShareId.get(share.id),\n        share,\n      }),\n    )\n    .sort(sortEmbedSecurityTargets);\n  const rows = targets.flatMap(toEmbedSecurityRows).sort(sortEmbedSecurityRows);\n  const blockedCount = targets.filter((target) => target.status === \"blocked\").length;\n  const reviewCount = targets.filter((target) => target.status === \"review\").length;\n  const readyCount = targets.filter((target) => target.status === \"ready\").length;\n\n  return {\n    generatedAt,\n    status: getWorstStatus([\n      blockedCount > 0 ? \"blocked\" : \"ready\",\n      reviewCount > 0 ? \"review\" : \"ready\",\n    ]),\n    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),\n    embedShareCount: activeShares.length,\n    configuredAllowlistCount: targets.filter((target) => target.configured).length,\n    selfPolicyCount: targets.filter((target) => target.framePolicy === \"self\").length,\n    allowlistPolicyCount: targets.filter(\n      (target) => target.framePolicy === \"allowlist\",\n    ).length,\n    denyPolicyCount: targets.filter((target) => target.framePolicy === \"deny\").length,\n    strictSandboxCount: targets.filter(\n      (target) => target.sandboxPreset === \"strict\",\n    ).length,\n    trustedSandboxCount: targets.filter(\n      (target) => target.sandboxPreset === \"trusted\",\n    ).length,\n    observedOriginCount: sum(targets.map((target) => target.observedOrigins.length)),\n    allowedObservedOriginCount: sum(\n      targets.map((target) => target.allowedObservedOrigins.length),\n    ),\n    blockedObservedOriginCount: sum(\n      targets.map((target) => target.blockedObservedOrigins.length),\n    ),\n    missingHostEvidenceCount: targets.filter(\n      (target) => target.eventCount === 0,\n    ).length,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    targets,\n    rows:\n      rows.length > 0\n        ? rows\n        : [\n            {\n              id: \"embed-security-ready\",\n              targetId: \"all\",\n              category: \"evidence\",\n              status: \"ready\",\n              label: \"Embed host security ready\",\n              detail:\n                \"All active embed links have frame policy, sandbox, and recent host evidence coverage.\",\n              recommendation:\n                \"Export this evidence with public link and route analytics reports.\",\n              count: targets.length,\n              latestAt: getLatestTargetAt(targets),\n            },\n          ],\n    commands: getEmbedSecurityCommands(),\n  };\n}\n\nfunction toEmbedTarget({\n  appOrigin,\n  env,\n  route,\n  share,\n}: {\n  appOrigin?: string | null;\n  env: Record<string, string | undefined>;\n  route: AdminEmbedSecurityInput[\"analyticsRoutes\"][number] | undefined;\n  share: AdminEmbedSecurityShare;\n}): AdminEmbedSecurityTarget {\n  const policy = resolveEmbedSecurityPolicy({\n    env,\n    fileId: share.fileId,\n    shareId: share.id,\n    token: share.token,\n  });\n  const observedOrigins = uniqueValues(route?.referrerOrigins ?? []);\n  const allowedObservedOrigins = observedOrigins.filter((origin) =>\n    isEmbedOriginAllowed(origin, policy, appOrigin),\n  );\n  const blockedObservedOrigins = observedOrigins.filter(\n    (origin) => !isEmbedOriginAllowed(origin, policy, appOrigin),\n  );\n  const status = getTargetStatus({\n    blockedObservedOrigins,\n    configured: policy.configSource === \"env\",\n    eventCount: route?.eventCount ?? 0,\n    framePolicy: policy.framePolicy,\n    last7dCount: route?.last7dCount ?? 0,\n    sandboxPreset: policy.sandboxPreset,\n  });\n\n  return {\n    id: `embed-security-${share.id}`,\n    shareId: share.id,\n    fileId: share.fileId,\n    fileName: share.fileName,\n    ownerEmail: share.ownerEmail,\n    status,\n    framePolicy: policy.framePolicy,\n    sandboxPreset: policy.sandboxPreset,\n    sandboxAttributes: policy.sandboxAttributes,\n    allowedOrigins: policy.allowedOrigins,\n    configured: policy.configSource === \"env\",\n    observedOrigins,\n    allowedObservedOrigins,\n    blockedObservedOrigins,\n    hostnames: uniqueValues(route?.hostnames ?? []),\n    eventCount: route?.eventCount ?? 0,\n    last7dCount: route?.last7dCount ?? 0,\n    latestAt: route?.latestAt ?? null,\n    recommendation: getTargetRecommendation(status),\n  };\n}\n\nfunction toEmbedSecurityRows(target: AdminEmbedSecurityTarget) {\n  const rows: AdminEmbedSecurityRow[] = [];\n\n  if (!target.configured || target.framePolicy === \"self\") {\n    rows.push({\n      id: `${target.id}-allowlist`,\n      targetId: target.id,\n      category: \"allowlist\",\n      status: \"review\",\n      label: `${target.fileName} embed allowlist`,\n      detail:\n        target.framePolicy === \"self\"\n          ? \"This embed is limited to same-origin framing and has no external host allowlist.\"\n          : \"No token, share, file, or workspace allowlist configuration is attached.\",\n      recommendation:\n        \"Set ESSENCE_EMBED_HOST_ALLOWLISTS for expected external hosts before publishing an iframe snippet.\",\n      count: target.allowedOrigins.length,\n      latestAt: target.latestAt,\n    });\n  }\n\n  if (target.blockedObservedOrigins.length > 0) {\n    rows.push({\n      id: `${target.id}-blocked-hosts`,\n      targetId: target.id,\n      category: \"frame-policy\",\n      status: \"blocked\",\n      label: `${target.fileName} blocked host evidence`,\n      detail: `Observed origins outside policy: ${target.blockedObservedOrigins.join(\", \")}.`,\n      recommendation:\n        \"Add the host to the allowlist only if it is trusted, otherwise rotate or disable the public link.\",\n      count: target.blockedObservedOrigins.length,\n      latestAt: target.latestAt,\n    });\n  }\n\n  if (target.eventCount === 0 || target.last7dCount === 0) {\n    rows.push({\n      id: `${target.id}-evidence`,\n      targetId: target.id,\n      category: \"evidence\",\n      status: \"review\",\n      label: `${target.fileName} host evidence`,\n      detail:\n        target.eventCount === 0\n          ? \"No embed route analytics events exist for this link.\"\n          : \"Embed route analytics exists, but none was captured in the last 7 days.\",\n      recommendation:\n        \"Load the embed from the intended host after deployment so the release packet has fresh host evidence.\",\n      count: target.eventCount,\n      latestAt: target.latestAt,\n    });\n  }\n\n  if (target.sandboxPreset === \"trusted\") {\n    rows.push({\n      id: `${target.id}-sandbox`,\n      targetId: target.id,\n      category: \"sandbox\",\n      status: \"review\",\n      label: `${target.fileName} trusted sandbox`,\n      detail:\n        \"The trusted sandbox preset allows downloads, forms, popups, scripts, and same-origin access.\",\n      recommendation:\n        \"Use trusted sandbox only for owned hosts; otherwise downgrade to preview or interactive.\",\n      count: 1,\n      latestAt: target.latestAt,\n    });\n  }\n\n  return rows;\n}\n\nfunction getTargetStatus({\n  blockedObservedOrigins,\n  configured,\n  eventCount,\n  framePolicy,\n  last7dCount,\n  sandboxPreset,\n}: {\n  blockedObservedOrigins: string[];\n  configured: boolean;\n  eventCount: number;\n  framePolicy: string;\n  last7dCount: number;\n  sandboxPreset: string;\n}) {\n  return getWorstStatus([\n    blockedObservedOrigins.length > 0 ? \"blocked\" : \"ready\",\n    !configured || framePolicy === \"self\" ? \"review\" : \"ready\",\n    eventCount === 0 || last7dCount === 0 ? \"review\" : \"ready\",\n    sandboxPreset === \"trusted\" ? \"review\" : \"ready\",\n  ]);\n}\n\nfunction getTargetRecommendation(status: AdminEmbedSecurityStatus) {\n  if (status === \"blocked\") {\n    return \"Investigate observed external hosts before approving this embed.\";\n  }\n\n  if (status === \"review\") {\n    return \"Confirm allowlist, sandbox preset, frame policy, and fresh host evidence before publication.\";\n  }\n\n  return \"Embed policy and host evidence are ready for release approval.\";\n}\n\nfunction getWorstStatus(\n  statuses: AdminEmbedSecurityStatus[],\n  fallback: AdminEmbedSecurityStatus = \"ready\",\n) {\n  return (\n    statuses.sort((left, right) => statusWeight[left] - statusWeight[right])[0] ??\n    fallback\n  );\n}\n\nfunction sortEmbedSecurityTargets(\n  left: AdminEmbedSecurityTarget,\n  right: AdminEmbedSecurityTarget,\n) {\n  return (\n    statusWeight[left.status] - statusWeight[right.status] ||\n    right.blockedObservedOrigins.length - left.blockedObservedOrigins.length ||\n    left.fileName.localeCompare(right.fileName)\n  );\n}\n\nfunction sortEmbedSecurityRows(\n  left: AdminEmbedSecurityRow,\n  right: AdminEmbedSecurityRow,\n) {\n  return (\n    statusWeight[left.status] - statusWeight[right.status] ||\n    right.count - left.count ||\n    (right.latestAt ? new Date(right.latestAt).getTime() : 0) -\n      (left.latestAt ? new Date(left.latestAt).getTime() : 0)\n  );\n}\n\nfunction getLatestTargetAt(targets: AdminEmbedSecurityTarget[]) {\n  return targets.reduce((latest, target) => {\n    if (!latest) {\n      return target.latestAt;\n    }\n\n    if (!target.latestAt) {\n      return latest;\n    }\n\n    return new Date(target.latestAt).getTime() > new Date(latest).getTime()\n      ? target.latestAt\n      : latest;\n  }, null as string | null);\n}\n\nfunction uniqueValues(values: string[]) {\n  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));\n}\n\nfunction sum(values: number[]) {\n  return values.reduce((total, value) => total + value, 0);\n}\n\nfunction getEmbedSecurityCommands() {\n  return [\n    \"Configure ESSENCE_EMBED_HOST_ALLOWLISTS with token, share, file, or wildcard host rules for external iframe usage.\",\n    \"Keep frame policy at self for private/internal embeds and use allowlist only for trusted external hosts.\",\n    \"Prefer preview or interactive sandbox presets; reserve trusted for owned hosts with release approval.\",\n    \"Open each embed from the intended host after deployment so route analytics captures host evidence.\",\n    \"Export this report with public route analytics and public link observability before release signoff.\",\n  ];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-embed-security.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-embed-security-ts-50c4ed72eb15c12c.mjs",
  "kind": "ts",
  "hash": "50c4ed72eb15c12c",
  "dependencies": [
    {
      "specifier": "@/features/embed-security/policy",
      "resolved_path": "src/features/embed-security/policy.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-embed-security-policy-ts-29323cc2cf6b1c59.mjs",
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
    "source_path": "src/features/admin/admin-embed-security.ts",
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
        "specifier": "@/features/embed-security/policy",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-embed-security-types",
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
      "getAdminEmbedSecurityReport"
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
