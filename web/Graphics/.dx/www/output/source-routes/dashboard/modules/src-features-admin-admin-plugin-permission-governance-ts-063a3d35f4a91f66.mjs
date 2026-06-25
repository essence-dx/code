import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-editor-plugin-api-ts-bc630d1a7d02d822.mjs";
export const dxSourceText = "import {\n  builtInPluginManifests,\n  type EditorPluginManifest,\n  type EditorPluginPermission,\n} from \"@/features/editor/editor-plugin-api\";\n\nexport type AdminPluginPermissionGovernanceStatus =\n  | \"ready\"\n  | \"review\"\n  | \"blocked\";\n\nexport type AdminPluginPermissionGovernanceKind =\n  | \"activity\"\n  | \"capability\"\n  | \"grant\"\n  | \"manifest\"\n  | \"stale\";\n\nexport type AdminPluginPermissionGovernanceRow = {\n  id: string;\n  status: AdminPluginPermissionGovernanceStatus;\n  kind: AdminPluginPermissionGovernanceKind;\n  label: string;\n  value: string;\n  detail: string;\n  recommendation: string;\n  target: string | null;\n  latestAt: string | null;\n};\n\nexport type AdminPluginPermissionGovernanceActivity = {\n  id: string;\n  fileId: string;\n  fileName: string;\n  ownerEmail: string;\n  actorName: string;\n  actorEmail: string | null;\n  label: string;\n  detail: string | null;\n  createdAt: string;\n};\n\nexport type AdminPluginPermissionGovernanceReport = {\n  generatedAt: string;\n  status: AdminPluginPermissionGovernanceStatus;\n  score: number;\n  readyCount: number;\n  reviewCount: number;\n  blockedCount: number;\n  manifestCount: number;\n  permissionCount: number;\n  writePermissionCount: number;\n  grantActivityCount: number;\n  runActivityCount: number;\n  staleApprovalCount: number;\n  riskyWriteActivityCount: number;\n  unknownActivityCount: number;\n  rows: AdminPluginPermissionGovernanceRow[];\n  activities: AdminPluginPermissionGovernanceActivity[];\n};\n\nexport type AdminPluginPermissionGovernanceInput = {\n  manifests?: EditorPluginManifest[];\n  activities: AdminPluginPermissionGovernanceActivity[];\n  generatedAt?: string;\n  now?: number;\n};\n\nconst STALE_APPROVAL_DAYS = 30;\nconst RISKY_WRITE_REVIEW_DAYS = 7;\n\nexport function getAdminPluginPermissionGovernanceReport({\n  manifests = builtInPluginManifests,\n  activities,\n  generatedAt = new Date().toISOString(),\n  now = Date.now(),\n}: AdminPluginPermissionGovernanceInput): AdminPluginPermissionGovernanceReport {\n  const sortedActivities = [...activities].sort(sortActivitiesByCreatedAt);\n  const grantActivities = sortedActivities.filter(isGrantActivity);\n  const runActivities = sortedActivities.filter(isRunActivity);\n  const staleApprovals = grantActivities.filter(\n    (activity) => toTime(activity.createdAt) < now - daysToMilliseconds(STALE_APPROVAL_DAYS),\n  );\n  const riskyWriteActivities = sortedActivities.filter((activity) =>\n    isRiskyWriteActivity(activity, manifests, now),\n  );\n  const unknownActivities = sortedActivities.filter(\n    (activity) => !isKnownPluginActivity(activity, manifests),\n  );\n  const rows = [\n    getManifestInventoryRow(manifests),\n    getWriteCapabilityRow(manifests),\n    getGrantAuditRow(grantActivities),\n    getStaleApprovalRow(staleApprovals),\n    getRiskyWriteRow(riskyWriteActivities),\n    getUnknownActivityRow(unknownActivities),\n  ];\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const status: AdminPluginPermissionGovernanceStatus =\n    blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\";\n\n  return {\n    generatedAt,\n    status,\n    score: Math.max(0, 100 - blockedCount * 24 - reviewCount * 8),\n    readyCount,\n    reviewCount,\n    blockedCount,\n    manifestCount: manifests.length,\n    permissionCount: manifests.reduce(\n      (total, manifest) => total + manifest.permissions.length,\n      0,\n    ),\n    writePermissionCount: getWritePermissionCount(manifests),\n    grantActivityCount: grantActivities.length,\n    runActivityCount: runActivities.length,\n    staleApprovalCount: staleApprovals.length,\n    riskyWriteActivityCount: riskyWriteActivities.length,\n    unknownActivityCount: unknownActivities.length,\n    rows,\n    activities: sortedActivities.slice(0, 20),\n  };\n}\n\nfunction getManifestInventoryRow(\n  manifests: EditorPluginManifest[],\n): AdminPluginPermissionGovernanceRow {\n  const permissionCount = manifests.reduce(\n    (total, manifest) => total + manifest.permissions.length,\n    0,\n  );\n\n  if (manifests.length === 0) {\n    return {\n      id: \"plugin-manifest-inventory-missing\",\n      status: \"blocked\",\n      kind: \"manifest\",\n      label: \"Installed extensions\",\n      value: \"0\",\n      detail: \"No installed editor extension manifests are available to audit.\",\n      recommendation:\n        \"Register extension manifests before granting plugin capabilities.\",\n      target: null,\n      latestAt: null,\n    };\n  }\n\n  return {\n    id: \"plugin-manifest-inventory\",\n    status: \"ready\",\n    kind: \"manifest\",\n    label: \"Installed extensions\",\n    value: `${manifests.length}`,\n    detail: `${manifests.length} extension manifest${manifests.length === 1 ? \"\" : \"s\"} expose ${permissionCount} permission request${permissionCount === 1 ? \"\" : \"s\"}.`,\n    recommendation:\n      \"Keep manifest permission declarations small and review new permissions before release.\",\n    target: manifests.map((manifest) => manifest.name).join(\", \"),\n    latestAt: null,\n  };\n}\n\nfunction getWriteCapabilityRow(\n  manifests: EditorPluginManifest[],\n): AdminPluginPermissionGovernanceRow {\n  const writeManifests = manifests.filter((manifest) =>\n    manifest.permissions.includes(\"write-layer-state\"),\n  );\n\n  return {\n    id: \"write-capabilities\",\n    status: writeManifests.length > 0 ? \"review\" : \"ready\",\n    kind: \"capability\",\n    label: \"Write-capable permissions\",\n    value: `${writeManifests.length}`,\n    detail:\n      writeManifests.length > 0\n        ? `${writeManifests.map((manifest) => manifest.name).join(\", \")} can request layer write capabilities.`\n        : \"No installed extensions request layer write capabilities.\",\n    recommendation:\n      writeManifests.length > 0\n        ? \"Review write-capable extension grants periodically and verify run activity before release.\"\n        : \"Keep write-capable plugin permissions disabled unless the workflow needs them.\",\n    target: writeManifests[0]?.name ?? null,\n    latestAt: null,\n  };\n}\n\nfunction getGrantAuditRow(\n  grants: AdminPluginPermissionGovernanceActivity[],\n): AdminPluginPermissionGovernanceRow {\n  const latest = grants[0];\n\n  return {\n    id: \"grant-audit-coverage\",\n    status: grants.length > 0 ? \"ready\" : \"review\",\n    kind: \"grant\",\n    label: \"Grant audit coverage\",\n    value: `${grants.length}`,\n    detail:\n      grants.length > 0\n        ? `${grants.length} plugin permission grant event${grants.length === 1 ? \"\" : \"s\"} were captured in design activity.`\n        : \"No plugin permission grant events are visible in the loaded design activity window.\",\n    recommendation:\n      grants.length > 0\n        ? \"Use grant activity alongside browser-local grants when reviewing extension access.\"\n        : \"Grant plugin permissions once through the Extensions panel so future admin reviews have an activity anchor.\",\n    target: latest ? `${latest.fileName} / ${latest.label}` : null,\n    latestAt: latest?.createdAt ?? null,\n  };\n}\n\nfunction getStaleApprovalRow(\n  staleApprovals: AdminPluginPermissionGovernanceActivity[],\n): AdminPluginPermissionGovernanceRow {\n  const latest = staleApprovals[0];\n\n  return {\n    id: \"stale-plugin-approvals\",\n    status: staleApprovals.length > 0 ? \"review\" : \"ready\",\n    kind: \"stale\",\n    label: \"Stale approvals\",\n    value: `${staleApprovals.length}`,\n    detail:\n      staleApprovals.length > 0\n        ? `${staleApprovals.length} plugin grant approval${staleApprovals.length === 1 ? \"\" : \"s\"} are older than ${STALE_APPROVAL_DAYS} days.`\n        : `No plugin grant approvals older than ${STALE_APPROVAL_DAYS} days were found.`,\n    recommendation:\n      staleApprovals.length > 0\n        ? \"Revoke and re-grant stale plugin approvals during release hardening.\"\n        : \"Keep stale approval review in the release checklist.\",\n    target: latest ? `${latest.fileName} / ${latest.label}` : null,\n    latestAt: latest?.createdAt ?? null,\n  };\n}\n\nfunction getRiskyWriteRow(\n  writeActivities: AdminPluginPermissionGovernanceActivity[],\n): AdminPluginPermissionGovernanceRow {\n  const latest = writeActivities[0];\n\n  return {\n    id: \"risky-write-activity\",\n    status: writeActivities.length > 0 ? \"review\" : \"ready\",\n    kind: \"activity\",\n    label: \"Risky write activity\",\n    value: `${writeActivities.length}`,\n    detail:\n      writeActivities.length > 0\n        ? `${writeActivities.length} write-capable plugin run${writeActivities.length === 1 ? \"\" : \"s\"} happened in the last ${RISKY_WRITE_REVIEW_DAYS} days.`\n        : `No write-capable plugin runs were captured in the last ${RISKY_WRITE_REVIEW_DAYS} days.`,\n    recommendation:\n      writeActivities.length > 0\n        ? \"Review recent write-capable plugin runs before approving production release evidence.\"\n        : \"Keep write-capable plugin activity visible in document history.\",\n    target: latest ? `${latest.fileName} / ${latest.label}` : null,\n    latestAt: latest?.createdAt ?? null,\n  };\n}\n\nfunction getUnknownActivityRow(\n  unknownActivities: AdminPluginPermissionGovernanceActivity[],\n): AdminPluginPermissionGovernanceRow {\n  const latest = unknownActivities[0];\n\n  return {\n    id: \"unknown-plugin-activity\",\n    status: unknownActivities.length > 0 ? \"blocked\" : \"ready\",\n    kind: \"activity\",\n    label: \"Unknown plugin activity\",\n    value: `${unknownActivities.length}`,\n    detail:\n      unknownActivities.length > 0\n        ? `${unknownActivities.length} extension activity event${unknownActivities.length === 1 ? \"\" : \"s\"} do not map to known plugin manifests or governance operations.`\n        : \"All loaded extension activity maps to known plugin or governance operations.\",\n    recommendation:\n      unknownActivities.length > 0\n        ? \"Investigate unknown extension activity before release approval.\"\n        : \"Keep unknown extension activity blocked in admin release review.\",\n    target: latest ? `${latest.fileName} / ${latest.label}` : null,\n    latestAt: latest?.createdAt ?? null,\n  };\n}\n\nfunction isGrantActivity(activity: AdminPluginPermissionGovernanceActivity) {\n  return normalizedLabel(activity).startsWith(\"granted \");\n}\n\nfunction isRunActivity(activity: AdminPluginPermissionGovernanceActivity) {\n  return normalizedLabel(activity).startsWith(\"ran \");\n}\n\nfunction isRiskyWriteActivity(\n  activity: AdminPluginPermissionGovernanceActivity,\n  manifests: EditorPluginManifest[],\n  now: number,\n) {\n  if (!isRunActivity(activity)) {\n    return false;\n  }\n\n  if (toTime(activity.createdAt) < now - daysToMilliseconds(RISKY_WRITE_REVIEW_DAYS)) {\n    return false;\n  }\n\n  return getWritePluginNames(manifests).some((pluginName) =>\n    normalizedLabel(activity).includes(pluginName.toLowerCase()),\n  );\n}\n\nfunction isKnownPluginActivity(\n  activity: AdminPluginPermissionGovernanceActivity,\n  manifests: EditorPluginManifest[],\n) {\n  const label = normalizedLabel(activity);\n  const knownPluginNames = manifests.map((manifest) => manifest.name.toLowerCase());\n  const isKnownPlugin = knownPluginNames.some((name) => label.includes(name));\n\n  return (\n    isKnownPlugin ||\n    label.includes(\"plugin governance\") ||\n    label.includes(\"stale plugin\") ||\n    label.includes(\"plugin grant\")\n  );\n}\n\nfunction getWritePermissionCount(manifests: EditorPluginManifest[]) {\n  return manifests.reduce(\n    (count, manifest) =>\n      count + manifest.permissions.filter(isWritePermission).length,\n    0,\n  );\n}\n\nfunction getWritePluginNames(manifests: EditorPluginManifest[]) {\n  return manifests\n    .filter((manifest) => manifest.permissions.some(isWritePermission))\n    .map((manifest) => manifest.name);\n}\n\nfunction isWritePermission(permission: EditorPluginPermission) {\n  return permission === \"write-layer-state\";\n}\n\nfunction normalizedLabel(activity: AdminPluginPermissionGovernanceActivity) {\n  return `${activity.label} ${activity.detail ?? \"\"}`.toLowerCase();\n}\n\nfunction sortActivitiesByCreatedAt(\n  first: AdminPluginPermissionGovernanceActivity,\n  second: AdminPluginPermissionGovernanceActivity,\n) {\n  return toTime(second.createdAt) - toTime(first.createdAt);\n}\n\nfunction toTime(value: string) {\n  return new Date(value).getTime();\n}\n\nfunction daysToMilliseconds(days: number) {\n  return days * 24 * 60 * 60 * 1000;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-plugin-permission-governance.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-plugin-permission-governance-ts-063a3d35f4a91f66.mjs",
  "kind": "ts",
  "hash": "063a3d35f4a91f66",
  "dependencies": [
    {
      "specifier": "@/features/editor/editor-plugin-api",
      "resolved_path": "src/features/editor/editor-plugin-api.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-editor-plugin-api-ts-bc630d1a7d02d822.mjs",
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
    "source_path": "src/features/admin/admin-plugin-permission-governance.ts",
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
        "specifier": "@/features/editor/editor-plugin-api",
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
      "getAdminPluginPermissionGovernanceReport"
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
