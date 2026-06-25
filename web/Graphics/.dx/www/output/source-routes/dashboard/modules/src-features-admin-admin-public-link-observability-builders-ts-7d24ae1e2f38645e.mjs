import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-public-link-observability-utils-ts-187fbd80a04533e3.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-prototype-flow-diagnostics-ts-ea80d97ae57e141d.mjs";
export const dxSourceText = "import { getPrototypeFlowDiagnostics } from \"@/features/editor/prototype-flow-diagnostics\";\nimport type {\n  AdminPublicLinkObservabilityFile,\n  AdminPublicLinkObservabilityInput,\n  AdminPublicLinkObservabilityShare,\n  AdminPublicLinkStatus,\n  AdminPublicLinkSurface,\n  AdminPublicLinkSurfaceKind,\n} from \"@/features/admin/admin-public-link-observability-types\";\nimport {\n  getWorstPublicLinkStatus,\n  joinPublicLinkUrl,\n  publicLinkStatusWeight,\n} from \"@/features/admin/admin-public-link-observability-utils\";\n\nconst staleLinkDays = 30;\n\nexport function getPublicLinkSurfaces({\n  baseUrl,\n  filesById,\n  input,\n  now,\n  share,\n}: {\n  baseUrl: string;\n  filesById: Map<string, AdminPublicLinkObservabilityFile>;\n  input: AdminPublicLinkObservabilityInput;\n  now: number;\n  share: AdminPublicLinkObservabilityShare;\n}) {\n  const file = filesById.get(share.fileId);\n  const prototype = file ? getPrototypeFlowDiagnostics(file.document) : null;\n  const surfaces = [\n    toSurface({\n      baseUrl,\n      file,\n      input,\n      kind: \"handoff\",\n      now,\n      path: `/share/${share.token}`,\n      prototype,\n      share,\n    }),\n    prototype && (prototype.hotspotCount > 0 || share.accessLevel === \"prototype\")\n      ? toSurface({\n          baseUrl,\n          file,\n          input,\n          kind: \"prototype\",\n          now,\n          path: `/share/${share.token}/prototype`,\n          prototype,\n          share,\n        })\n      : null,\n    toSurface({\n      baseUrl,\n      file,\n      input,\n      kind: \"embed\",\n      now,\n      path: `/embed/${share.token}`,\n      prototype,\n      share,\n    }),\n  ];\n\n  return surfaces.filter(\n    (surface): surface is AdminPublicLinkSurface => Boolean(surface),\n  );\n}\n\nexport function sortPublicLinkSurfaces(\n  left: AdminPublicLinkSurface,\n  right: AdminPublicLinkSurface,\n) {\n  return (\n    publicLinkStatusWeight[left.status] - publicLinkStatusWeight[right.status] ||\n    kindWeight(left.kind) - kindWeight(right.kind) ||\n    left.fileName.localeCompare(right.fileName)\n  );\n}\n\nfunction toSurface({\n  baseUrl,\n  file,\n  input,\n  kind,\n  now,\n  path,\n  prototype,\n  share,\n}: {\n  baseUrl: string;\n  file: AdminPublicLinkObservabilityFile | undefined;\n  input: AdminPublicLinkObservabilityInput;\n  kind: AdminPublicLinkSurfaceKind;\n  now: number;\n  path: string;\n  prototype: ReturnType<typeof getPrototypeFlowDiagnostics> | null;\n  share: AdminPublicLinkObservabilityShare;\n}): AdminPublicLinkSurface {\n  const smoke = getSmokeForSurface(input.productionDeploySmoke, kind);\n  const publishChannel = input.publishChannels.channels.find(\n    (channel) => channel.shareId === share.id,\n  );\n  const expired = share.expiresAt\n    ? new Date(share.expiresAt).getTime() < now\n    : false;\n  const stale =\n    !share.expiresAt &&\n    new Date(share.createdAt).getTime() <\n      now - staleLinkDays * 24 * 60 * 60 * 1000;\n  const referrerNote =\n    input.referrerNotesByToken[share.token] ??\n    input.referrerNotesByToken[share.id] ??\n    input.referrerNotesByToken[share.fileId] ??\n    input.referrerNotesByToken[\"*\"] ??\n    null;\n  const blockers = [\n    !file ? \"Source file is outside the current admin file window.\" : \"\",\n    expired ? \"Public link is expired but still enabled.\" : \"\",\n    smoke.status === \"blocked\" ? \"Public route smoke is blocked.\" : \"\",\n    kind === \"prototype\" && prototype && prototype.brokenCount > 0\n      ? \"Prototype route has broken hotspot targets.\"\n      : \"\",\n  ].filter(Boolean);\n  const warnings = [\n    stale ? \"No-expiry public link is older than 30 days.\" : \"\",\n    !share.expiresAt ? \"No expiry is set.\" : \"\",\n    share.allowDownload ? \"Downloads are enabled.\" : \"\",\n    share.allowComments ? \"Comments are enabled.\" : \"\",\n    !referrerNote ? \"No referrer note is configured.\" : \"\",\n    smoke.status === \"review\" ? \"Public route smoke needs review.\" : \"\",\n    publishChannel?.approvalState !== \"approved\"\n      ? \"Publish channel approval is missing or needs review.\"\n      : \"\",\n    publishChannel?.rollbackState !== \"linked\"\n      ? \"Rollback link is missing or needs review.\"\n      : \"\",\n  ].filter(Boolean);\n  const status = getWorstPublicLinkStatus([\n    blockers.length > 0 ? \"blocked\" : \"ready\",\n    warnings.length > 0 ? \"review\" : \"ready\",\n    smoke.status,\n  ]);\n  const releaseSafe =\n    status === \"ready\" &&\n    Boolean(referrerNote) &&\n    Boolean(share.expiresAt) &&\n    !share.allowDownload;\n\n  return {\n    id: `${kind}-${share.id}`,\n    shareId: share.id,\n    token: share.token,\n    kind,\n    status,\n    label: `${share.fileName} ${formatKind(kind)}`,\n    fileId: share.fileId,\n    fileName: share.fileName,\n    ownerEmail: share.ownerEmail,\n    targetUrl: joinPublicLinkUrl(baseUrl, path),\n    routePath: path,\n    permissionPreset: share.permissionPreset,\n    smokeStatus: smoke.status,\n    smokeLabel: smoke.label,\n    expiryState: expired ? \"expired\" : share.expiresAt ? \"scheduled\" : \"never\",\n    stale,\n    allowComments: share.allowComments,\n    allowDownload: share.allowDownload,\n    referrerNote,\n    releaseSafe,\n    latestAt: share.createdAt,\n    blockerCount: blockers.length,\n    reviewCount: warnings.length,\n    blockers,\n    warnings,\n    recommendation:\n      status === \"ready\"\n        ? \"Public target is ready for release-safe publication.\"\n        : \"Refresh smoke, expiry, exposure, referrer, approval, and rollback evidence before publication.\",\n  };\n}\n\nfunction getSmokeForSurface(\n  report: AdminPublicLinkObservabilityInput[\"productionDeploySmoke\"],\n  kind: AdminPublicLinkSurfaceKind,\n) {\n  const smokeKind = kind === \"handoff\" ? \"share\" : kind;\n  const rows = report.rows.filter((row) => row.kind === smokeKind);\n\n  return {\n    status: getWorstPublicLinkStatus(\n      rows.map((row) => row.status as AdminPublicLinkStatus),\n      \"review\",\n    ),\n    label: rows[0]?.label ?? `${formatKind(kind)} route smoke`,\n  };\n}\n\nfunction formatKind(kind: AdminPublicLinkSurfaceKind) {\n  if (kind === \"handoff\") {\n    return \"handoff\";\n  }\n\n  return kind;\n}\n\nfunction kindWeight(kind: AdminPublicLinkSurfaceKind) {\n  const weights: Record<AdminPublicLinkSurfaceKind, number> = {\n    handoff: 0,\n    prototype: 1,\n    embed: 2,\n  };\n\n  return weights[kind];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-public-link-observability-builders.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-link-observability-builders-ts-7d24ae1e2f38645e.mjs",
  "kind": "ts",
  "hash": "7d24ae1e2f38645e",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-public-link-observability-utils",
      "resolved_path": "src/features/admin/admin-public-link-observability-utils.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-link-observability-utils-ts-187fbd80a04533e3.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/prototype-flow-diagnostics",
      "resolved_path": "src/features/editor/prototype-flow-diagnostics.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-prototype-flow-diagnostics-ts-ea80d97ae57e141d.mjs",
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
    "source_path": "src/features/admin/admin-public-link-observability-builders.ts",
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
        "specifier": "@/features/editor/prototype-flow-diagnostics",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-public-link-observability-types",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-public-link-observability-utils",
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
      "getPublicLinkSurfaces",
      "sortPublicLinkSurfaces"
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
