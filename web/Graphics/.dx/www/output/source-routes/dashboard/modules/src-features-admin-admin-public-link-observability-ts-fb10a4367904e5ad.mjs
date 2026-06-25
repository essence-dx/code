import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-public-link-observability-builders-ts-7d24ae1e2f38645e.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-public-link-observability-rows-ts-05b7aedae85efee6.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-admin-admin-public-link-observability-utils-ts-187fbd80a04533e3.mjs";
export const dxSourceText = "import {\n  getPublicLinkSurfaces,\n  sortPublicLinkSurfaces,\n} from \"@/features/admin/admin-public-link-observability-builders\";\nimport {\n  getEmptyPublicLinkObservabilityRow,\n  sortPublicLinkRows,\n  toPublicLinkObservabilityRows,\n} from \"@/features/admin/admin-public-link-observability-rows\";\nimport type {\n  AdminPublicLinkObservabilityInput,\n  AdminPublicLinkObservabilityReport,\n} from \"@/features/admin/admin-public-link-observability-types\";\n\nexport type {\n  AdminPublicLinkObservabilityFile,\n  AdminPublicLinkObservabilityInput,\n  AdminPublicLinkObservabilityReport,\n  AdminPublicLinkObservabilityRow,\n  AdminPublicLinkObservabilityShare,\n  AdminPublicLinkRowCategory,\n  AdminPublicLinkStatus,\n  AdminPublicLinkSurface,\n  AdminPublicLinkSurfaceKind,\n} from \"@/features/admin/admin-public-link-observability-types\";\n\nexport { normalizePublicLinkReferrerNotes } from \"@/features/admin/admin-public-link-observability-utils\";\n\nexport function getAdminPublicLinkObservabilityReport({\n  baseUrl,\n  files,\n  generatedAt = new Date().toISOString(),\n  now = Date.now(),\n  productionDeploySmoke,\n  publishChannels,\n  referrerNotesByToken,\n  shares,\n}: AdminPublicLinkObservabilityInput): AdminPublicLinkObservabilityReport {\n  const activeShares = shares.filter((share) => !share.disabledAt);\n  const filesById = new Map(\n    files.filter((file) => !file.trashedAt).map((file) => [file.fileId, file]),\n  );\n  const surfaces = activeShares\n    .flatMap((share) =>\n      getPublicLinkSurfaces({\n        baseUrl,\n        filesById,\n        input: {\n          baseUrl,\n          files,\n          generatedAt,\n          now,\n          productionDeploySmoke,\n          publishChannels,\n          referrerNotesByToken,\n          shares,\n        },\n        now,\n        share,\n      }),\n    )\n    .sort(sortPublicLinkSurfaces);\n  const rows = surfaces.flatMap(toPublicLinkObservabilityRows).sort(sortPublicLinkRows);\n  const blockedCount = surfaces.filter((surface) => surface.status === \"blocked\").length;\n  const reviewCount = surfaces.filter((surface) => surface.status === \"review\").length;\n  const readyCount = surfaces.filter((surface) => surface.status === \"ready\").length;\n\n  return {\n    generatedAt,\n    status: blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\",\n    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 5),\n    activeShareCount: activeShares.length,\n    surfaceCount: surfaces.length,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    embedSurfaceCount: surfaces.filter((surface) => surface.kind === \"embed\").length,\n    prototypeSurfaceCount: surfaces.filter((surface) => surface.kind === \"prototype\").length,\n    staleLinkCount: surfaces.filter((surface) => surface.stale).length,\n    noExpiryCount: surfaces.filter((surface) => surface.expiryState === \"never\").length,\n    downloadExposureCount: surfaces.filter((surface) => surface.allowDownload).length,\n    commentExposureCount: surfaces.filter((surface) => surface.allowComments).length,\n    missingReferrerNoteCount: surfaces.filter((surface) => !surface.referrerNote).length,\n    releaseSafeCount: surfaces.filter((surface) => surface.releaseSafe).length,\n    routeSmokeBlockedCount: surfaces.filter(\n      (surface) => surface.smokeStatus === \"blocked\",\n    ).length,\n    surfaces,\n    rows: rows.length > 0 ? rows : [getEmptyPublicLinkObservabilityRow()],\n    commands: getPublicLinkObservabilityCommands(),\n  };\n}\n\nfunction getPublicLinkObservabilityCommands() {\n  return [\n    \"Run public route smoke for share, prototype, and embed targets before release approval.\",\n    \"Set expiries and referrer notes for public links that leave the workspace.\",\n    \"Disable download exposure unless a release handoff explicitly needs source exports.\",\n    \"Use /embed/[token] for iframe surfaces and track the host in referrer notes.\",\n    \"Export this report with the publish channel and access budget governance packet.\",\n  ];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-public-link-observability.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-link-observability-ts-fb10a4367904e5ad.mjs",
  "kind": "ts",
  "hash": "fb10a4367904e5ad",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-public-link-observability-builders",
      "resolved_path": "src/features/admin/admin-public-link-observability-builders.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-link-observability-builders-ts-7d24ae1e2f38645e.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-public-link-observability-rows",
      "resolved_path": "src/features/admin/admin-public-link-observability-rows.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-link-observability-rows-ts-05b7aedae85efee6.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-public-link-observability-utils",
      "resolved_path": "src/features/admin/admin-public-link-observability-utils.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-link-observability-utils-ts-187fbd80a04533e3.mjs",
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
    "source_path": "src/features/admin/admin-public-link-observability.ts",
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
        "specifier": "@/features/admin/admin-public-link-observability-builders",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-public-link-observability-rows",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-public-link-observability-types",
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
      "getAdminPublicLinkObservabilityReport"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2]);
export default dxSourceModule;
